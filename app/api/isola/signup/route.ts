/**
 * POST /api/isola/signup
 * Canonical Path A: Public endpoint called from isola.epic.dm/demo after Meta Embedded Signup.
 *
 * Flow (CEO-reviewed sequencing — code exchange BEFORE port allocation):
 *   1. Validate input
 *   2. Exchange OAuth code for business token (Meta API)
 *   3. Register phone number with Meta
 *   4. Subscribe WABA to webhook
 *   5. Fetch business_id from WABA (graceful degradation)
 *   6. Idempotency check (duplicate waPhoneNumberId → 409)
 *   7. Encrypt token (AES-256-GCM)
 *   8. Allocate container port via Postgres SEQUENCE
 *   9. Write TenantRegistry (status=provisioning)
 *  10. Call OCMT to spin up isola-tenant container
 *  11. Return 202 (OCMT will PATCH /api/provision when container is healthy)
 *
 * Body: { code, phoneNumberId, wabaId, displayPhone, template, businessName }
 * No auth required — this is the public B2B signup entry point.
 */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { encryptToken } from '@/app/lib/crypto'
import { alertEric } from '@/app/lib/alert'

export const dynamic = 'force-dynamic'

const META_APP_ID     = process.env.META_APP_ID     || ''
const META_APP_SECRET = process.env.META_APP_SECRET || ''
const OCMT_URL        = process.env.OCMT_URL        || 'http://66.118.37.12:4000'
const BASE_URL        = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bff.epic.dm'

function safeJson(res: Response): Promise<any> {
  return res.json().catch(() => null)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Validate input ───────────────────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { code, phoneNumberId, wabaId, displayPhone, template = 'professional', businessName } = body

  if (!phoneNumberId || !wabaId) {
    return NextResponse.json({ error: 'Missing phoneNumberId or wabaId' }, { status: 400 })
  }
  if (!code && !META_APP_ID) {
    return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 })
  }

  // ── 2. Exchange code for business token ─────────────────────────────────
  let wabaToken = ''
  if (code && META_APP_ID && META_APP_SECRET) {
    try {
      const tokenRes = await fetch(
        `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}`,
        { signal: AbortSignal.timeout(15000) }
      )
      const tokenData = await safeJson(tokenRes)
      if (!tokenData || !tokenData.access_token) {
        const errMsg = tokenData?.error?.message || `Meta returned status ${tokenRes.status}`
        console.error('[signup] Code exchange failed:', errMsg)
        return NextResponse.json({ error: `Code exchange failed: ${errMsg}` }, { status: 400 })
      }
      wabaToken = tokenData.access_token
    } catch (err: any) {
      console.error('[signup] Code exchange network error:', err.message)
      return NextResponse.json({ error: 'Unable to reach Meta — please try again' }, { status: 503 })
    }
  }

  if (!wabaToken) {
    return NextResponse.json({ error: 'No token obtained — code exchange required' }, { status: 400 })
  }

  // ── 3. Register phone number ────────────────────────────────────────────
  try {
    const regRes = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wabaToken}`,
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', pin: '290909' }),
        signal: AbortSignal.timeout(15000),
      }
    )
    const regData = await safeJson(regRes)
    console.log('[signup] Register result:', regData?.success || regData?.error?.message || regRes.status)
  } catch (err: any) {
    console.error('[signup] Phone registration failed:', err.message)
    return NextResponse.json({ error: 'Phone registration failed — please try again' }, { status: 503 })
  }

  // ── 4. Subscribe WABA to webhook ────────────────────────────────────────
  try {
    const subRes = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${wabaToken}` },
        signal: AbortSignal.timeout(15000),
      }
    )
    const subData = await safeJson(subRes)
    console.log('[signup] Subscribe result:', subData?.success || subData?.error?.message || subRes.status)
  } catch (err: any) {
    console.error('[signup] WABA subscription failed:', err.message)
    return NextResponse.json({ error: 'Webhook subscription failed — please try again' }, { status: 503 })
  }

  // ── 5. Fetch business_id (graceful degradation) ─────────────────────────
  let businessId: string | null = null
  let fetchedBusinessName: string | null = businessName || null
  try {
    const bizRes = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}?fields=id,name,business`,
      {
        headers: { Authorization: `Bearer ${wabaToken}` },
        signal: AbortSignal.timeout(10000),
      }
    )
    const bizData = await safeJson(bizRes)
    if (bizData?.business?.id) {
      businessId = bizData.business.id
    }
    if (bizData?.business?.name && !fetchedBusinessName) {
      fetchedBusinessName = bizData.business.name
    }
    console.log('[signup] Business info:', { businessId, businessName: fetchedBusinessName })
  } catch (err: any) {
    console.warn('[signup] Could not fetch business_id (non-fatal):', err.message)
  }

  // ── 6. Idempotency check ────────────────────────────────────────────────
  const existing = await prisma.tenantRegistry.findUnique({
    where: { waPhoneNumberId: phoneNumberId },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'This WhatsApp number is already provisioned', tenantId: existing.tenantId },
      { status: 409 }
    )
  }

  // ── 7. Encrypt token ───────────────────────────────────────────────────
  let tokenEncrypted: string
  try {
    tokenEncrypted = encryptToken(wabaToken)
  } catch (err: any) {
    console.error('[signup] Encryption failed:', err.message)
    await alertEric(`Signup encryption failed: ${err.message}`)
    return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 })
  }

  // ── 8. Allocate container port ──────────────────────────────────────────
  let containerPort: number
  try {
    const result = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('tenant_port_seq')`
    containerPort = Number(result[0].nextval)
  } catch (err: any) {
    console.error('[signup] Port exhaustion:', err.message)
    await alertEric('Port sequence exhausted. Cannot provision new tenants. Migrate OCMT to Traefik label routing.')
    return NextResponse.json(
      { error: 'Service at capacity — contact support', support: process.env.SUPPORT_PHONE || '' },
      { status: 503 }
    )
  }

  // ── 9. Write TenantRegistry ─────────────────────────────────────────────
  const tenantId = crypto.randomUUID()
  const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days

  try {
    await prisma.tenantRegistry.create({
      data: {
        tenantId,
        waPhoneNumberId: phoneNumberId,
        containerPort,
        tokenEncrypted,
        tokenExpiresAt,
        tokenType: 'expiring',
        template,
        status: 'provisioning',
        businessId,
        wabaId,
        displayPhone: displayPhone || null,
        businessName: fetchedBusinessName,
      },
    })
  } catch (err: any) {
    console.error('[signup] DB write failed after port allocation:', err.message)
    console.error('[signup] LEAKED PORT:', containerPort, '— manual cleanup may be needed')
    await alertEric(`Signup DB write failed. Leaked port ${containerPort}. Error: ${err.message}`)
    return NextResponse.json({ error: 'Internal error — our team has been alerted' }, { status: 500 })
  }

  // ── 10. Call OCMT ───────────────────────────────────────────────────────
  try {
    const ocmtRes = await fetch(`${OCMT_URL}/api/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        waPhoneNumberId: phoneNumberId,
        waToken: wabaToken,
        template,
        containerPort,
        healthCallbackUrl: `${BASE_URL}/api/provision`,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!ocmtRes.ok) {
      const errText = await ocmtRes.text().catch(() => '(no body)')
      console.error('[signup] OCMT returned', ocmtRes.status, errText)
      await alertEric(`Signup OCMT failed for ${fetchedBusinessName || phoneNumberId}: OCMT ${ocmtRes.status}`)
      await prisma.tenantRegistry.update({ where: { tenantId }, data: { status: 'failed' } })
      return NextResponse.json(
        { error: 'Agent provisioning failed — our team has been alerted', support: process.env.SUPPORT_PHONE || '' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('[signup] OCMT unreachable:', err.message)
    await alertEric(`OCMT unreachable during signup for ${fetchedBusinessName || phoneNumberId}. Is deepseek:4000 up?`)
    await prisma.tenantRegistry.update({ where: { tenantId }, data: { status: 'failed' } })
    return NextResponse.json(
      { error: 'Provisioning service temporarily unavailable — try again in a few minutes', support: process.env.SUPPORT_PHONE || '' },
      { status: 503 }
    )
  }

  // ── 11. Async enrichment (pull FB page data if token allows) ─────────────
  // Fire-and-forget: don't block the signup response
  import('@/app/lib/business-enrichment').then(async ({ enrichFromFacebook, sendEnrichmentConfirmation, seedAgentKnowledge }) => {
    try {
      const enriched = await enrichFromFacebook(wabaToken, displayPhone)
      if (enriched) {
        // Update tenant with enriched data
        await prisma.tenantRegistry.update({
          where: { tenantId },
          data: {
            businessName: enriched.pageName,
            template: enriched.template,
          },
        })
        // Send confirmation to WhatsApp (if we have the customer's phone)
        if (displayPhone) {
          const phone = displayPhone.replace(/\D/g, '')
          if (phone.length >= 10) {
            await sendEnrichmentConfirmation(phone, enriched)
          }
        }
        console.log('[signup] Enrichment complete:', enriched.pageName, '→', enriched.template)
      }
    } catch (err: any) {
      console.error('[signup] Enrichment failed (non-blocking):', err.message)
    }
  }).catch(() => {})

  // ── 12. Return 202 ─────────────────────────────────────────────────────
  console.log('[signup] Tenant provisioning started:', { tenantId, phoneNumberId, containerPort, businessId })

  return NextResponse.json({
    ok: true,
    tenantId,
    message: 'Your WhatsApp agent is being set up. This usually takes 30–60 seconds.',
  }, { status: 202 })
}
