/**
 * POST /api/provision
 * Embedded Signup callback handler. Called after Meta OAuth completes.
 * Verifies Meta signature, encrypts WA token, allocates port via SEQUENCE,
 * writes tenant_registry row, calls OCMT to spin up isola-tenant container.
 *
 * PATCH /api/provision
 * Called by OCMT when container /health returns OK. Sets status=active.
 * BFF webhook handler ignores tenants with status != active.
 *
 * Required env vars:
 *   META_APP_SECRET      — for X-Hub-Signature-256 verification
 *   TENANT_MASTER_KEY    — AES-256 master key for token encryption
 *   OCMT_URL             — e.g. http://66.118.37.12:4000
 *   ERIC_PHONE           — WhatsApp number to alert on failure
 *   META_WA_TOKEN        — token for sending alert messages
 *   META_PHONE_ID        — phone number ID for sending alert messages
 *   NEXT_PUBLIC_BASE_URL — e.g. https://bff.epic.dm
 *   SUPPORT_PHONE        — shown to users on provisioning failure
 */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { verifyMetaSignature } from '@/app/lib/meta-verify'
import { encryptToken } from '@/app/lib/crypto'
import { alertEric } from '@/app/lib/alert'

const OCMT_URL = process.env.OCMT_URL || 'http://66.118.37.12:4000'

// POST — Embedded Signup callback (called by your demo page after Meta OAuth)
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Verify Meta signature before reading any data
  const rawBody  = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('x-hub-signature-256') || ''

  if (!verifyMetaSignature(rawBody, signature)) {
    console.error('[provision] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { waPhoneNumberId?: string; waToken?: string; template?: string; businessName?: string }
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { waPhoneNumberId, waToken, template = 'professional', businessName } = body

  if (!waPhoneNumberId || !waToken) {
    return NextResponse.json({ error: 'Missing waPhoneNumberId or waToken' }, { status: 400 })
  }

  // 2. Idempotency check — duplicate signup returns existing tenant
  const existing = await prisma.tenantRegistry.findUnique({
    where: { waPhoneNumberId },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'This WhatsApp number is already provisioned', tenantId: existing.tenantId },
      { status: 409 }
    )
  }

  // 3. Allocate container port atomically via Postgres SEQUENCE
  let containerPort: number
  try {
    const result = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('tenant_port_seq')`
    containerPort = Number(result[0].nextval)
  } catch (err: any) {
    // SEQUENCE is exhausted (hit MAXVALUE 3299) — hard ceiling at 100 tenants
    console.error('[provision] Port exhaustion:', err.message)
    await alertEric('🚨 Isola port sequence exhausted. Cannot provision new tenants. Migrate OCMT to Traefik label routing immediately.')
    return NextResponse.json(
      { error: 'Service at capacity — contact support', support: process.env.SUPPORT_PHONE || '' },
      { status: 503 }
    )
  }

  // 4. Encrypt WA token
  let tokenEncrypted: string
  try {
    tokenEncrypted = encryptToken(waToken)
  } catch (err: any) {
    console.error('[provision] Encryption failed:', err.message)
    return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 })
  }

  const tenantId = crypto.randomUUID()

  // 5. Write tenant_registry with status=provisioning (BFF ignores until active)
  await prisma.tenantRegistry.create({
    data: { tenantId, waPhoneNumberId, containerPort, tokenEncrypted, template, status: 'provisioning' },
  })

  // 6. Call OCMT to spin up isola-tenant container
  // OCMT will call PATCH /api/provision with { tenantId, status: 'active' } when healthy
  try {
    const ocmtRes = await fetch(`${OCMT_URL}/api/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        waPhoneNumberId,
        waToken,     // plaintext — OCMT injects into container env at runtime, never logs
        template,
        containerPort,
        healthCallbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://bff.epic.dm'}/api/provision`,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!ocmtRes.ok) {
      const errText = await ocmtRes.text().catch(() => '(no body)')
      console.error('[provision] OCMT returned', ocmtRes.status, errText)
      await alertEric(`🚨 Isola provision failed for ${businessName || waPhoneNumberId}: OCMT ${ocmtRes.status}. Check OCMT logs on deepseek.`)
      await prisma.tenantRegistry.update({ where: { tenantId }, data: { status: 'inactive' } })
      return NextResponse.json(
        { error: 'Provisioning failed — our team has been alerted', support: process.env.SUPPORT_PHONE || '' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('[provision] OCMT unreachable:', err.message)
    await alertEric(`🚨 OCMT unreachable during provision for ${businessName || waPhoneNumberId}. Is deepseek:4000 up?`)
    await prisma.tenantRegistry.update({ where: { tenantId }, data: { status: 'inactive' } })
    return NextResponse.json(
      { error: 'Provisioning service temporarily unavailable — try again in a few minutes', support: process.env.SUPPORT_PHONE || '' },
      { status: 503 }
    )
  }

  return NextResponse.json({
    ok: true,
    tenantId,
    message: 'Your WhatsApp agent is being set up. This usually takes 30–60 seconds.',
  })
}

// PATCH — Called by OCMT when container /health returns OK
// Sets status=active so BFF webhook handler starts routing to this tenant
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null)
  if (!body?.tenantId || !body?.status) {
    return NextResponse.json({ error: 'Missing tenantId or status' }, { status: 400 })
  }

  if (!['active', 'inactive'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status — must be active or inactive' }, { status: 400 })
  }

  try {
    await prisma.tenantRegistry.update({
      where: { tenantId: body.tenantId },
      data: { status: body.status },
    })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
