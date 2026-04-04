/**
 * POST /api/whatsapp/account-update
 * Meta account_update webhook — receives quality rating changes, restrictions, bans.
 * Subscription configured once in Meta App Dashboard > Webhooks > WhatsApp Business Account.
 *
 * GET — Meta webhook verification challenge (same pattern as main webhook).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { verifyMetaSignature } from '@/app/lib/meta-verify'
import { alertEric } from '@/app/lib/alert'

export const dynamic = 'force-dynamic'

const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'epic-wa-2026'

// GET — Meta verification challenge
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge || '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// POST — account_update events from Meta
export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('x-hub-signature-256') || ''

  if (!verifyMetaSignature(rawBody, signature)) {
    console.error('[account-update] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entries = body?.entry || []

  for (const entry of entries) {
    const changes = entry?.changes || []
    for (const change of changes) {
      const field = change?.field
      const value = change?.value

      if (!value) continue

      const phoneNumberId = value?.display_phone_number
        ? undefined // phone-level events don't always have phone_number_id
        : undefined
      const wabaId = entry?.id

      console.log('[account-update]', { field, wabaId, event: value?.event || value?.current_limit || 'unknown' })

      // Find tenant by WABA ID
      const tenant = wabaId
        ? await prisma.tenantRegistry.findFirst({ where: { wabaId: String(wabaId) } }).catch(() => null)
        : null

      switch (field) {
        case 'account_update': {
          const event = value?.event
          if (event === 'DISABLED' || event === 'FLAGGED') {
            if (tenant) {
              await prisma.tenantRegistry.update({
                where: { tenantId: tenant.tenantId },
                data: { status: 'suspended' },
              })
            }
            await alertEric(`Account ${event} for WABA ${wabaId}${tenant ? ` (tenant ${tenant.tenantId})` : ''}. Reason: ${value?.ban_info?.waba_ban_state || 'unknown'}`)
          }
          break
        }

        case 'phone_number_quality_update': {
          const quality = value?.current_limit
          console.log('[account-update] Quality change:', { wabaId, quality })
          // Log quality change — use console since AgentActivity requires a valid agentId (cuid)
        // and tenantId is a UUID. Tenant event logging will be added when tenant-to-agent mapping exists.
        console.log('[account-update] Quality change logged:', { tenantId: tenant?.tenantId, wabaId, quality })
          break
        }

        case 'phone_number_name_update': {
          console.log('[account-update] Name update:', { wabaId, status: value?.decision })
          break
        }

        default:
          console.log('[account-update] Unhandled field:', field)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
