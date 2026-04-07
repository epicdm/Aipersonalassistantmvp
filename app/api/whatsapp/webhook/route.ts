// app/api/whatsapp/webhook/route.ts
// Phase 2 refactor: this file is now pure orchestration (~130 lines).
// All business logic lives in app/lib/webhook/.
//
// Execution order (unchanged from original):
//   1. Verify Meta signature
//   2. Parse envelope  → ParsedMessage
//   3. Multi-tenant proxy  (if tenant found, proxy + return)
//   4. Typing indicator
//   5. Extract text  (handles voice, interactive, media)
//   6. Onboarding interactive-button replies  (before dedup)
//   7. Onboarding keyword trigger
//   8. Dedup check  (skip already-processed messageIds)
//   9. Session detection
//  10. Dispatch to handler
import { NextRequest, NextResponse } from 'next/server'
import { parseWebhookBody, extractText, checkDedup } from '@/app/lib/webhook/ingress'
import { resolveTenant, proxyToTenantContainer } from '@/app/lib/webhook/tenant-router'
import { detectSession } from '@/app/lib/webhook/session-detector'
import {
  handleOnboardingButton,
  handleOnboardingKeyword,
  dispatchMessage,
} from '@/app/lib/webhook/message-handler'
import { sendTypingIndicator } from '@/app/lib/whatsapp'

const VERIFY_TOKEN = process.env.META_WA_VERIFY_TOKEN || 'epic-wa-2026'

const ONBOARDING_KEYWORDS = [
  'signup',
  'sign up',
  'get started',
  'new agent',
  'set up',
  'setup',
  'i want an agent',
  'isola',
  'hello',
  'hi',
]

async function processWebhook(body: any): Promise<void> {
  // ── 1. Parse envelope ──────────────────────────────────────────────────────
  const parsed = parseWebhookBody(body)
  if (!parsed) return

  // ── 2. Multi-tenant routing ────────────────────────────────────────────────
  // If this phone_number_id belongs to an isola tenant container, proxy the
  // raw webhook body to that container and stop processing here.
  // BFF's own agents are not in tenant_registry and fall through below.
  const tenant = await resolveTenant(parsed.incomingPhoneId)
  if (tenant) {
    await proxyToTenantContainer(tenant, body, parsed.incomingPhoneId)
    return
  }

  // ── 3. Typing indicator ────────────────────────────────────────────────────
  if (parsed.metaMessageId) {
    await sendTypingIndicator(parsed.metaMessageId, parsed.incomingPhoneId)
  }

  // ── 4. Extract text (async — may transcribe voice) ─────────────────────────
  const extracted = await extractText(parsed)
  if (!extracted) return
  const { text, wasVoiceNote } = extracted

  const lowerText = text.toLowerCase().trim()

  // ── 5. Onboarding button replies ───────────────────────────────────────────
  // Processed before dedup: interactive replies are idempotent from Meta's side.
  if (
    parsed.messageType === 'interactive' &&
    parsed.rawMessage.interactive?.type === 'button_reply'
  ) {
    const btnId = parsed.rawMessage.interactive.button_reply?.id || ''
    const handled = await handleOnboardingButton(btnId, parsed.from, parsed.incomingPhoneId)
    if (handled) return
  }

  // ── 6. Onboarding keyword trigger ──────────────────────────────────────────
  if (ONBOARDING_KEYWORDS.some((kw) => lowerText.includes(kw))) {
    await handleOnboardingKeyword(parsed.from, parsed.contactName, parsed.incomingPhoneId)
    return
  }

  // ── 7. Dedup ───────────────────────────────────────────────────────────────
  if (await checkDedup(parsed.metaMessageId)) return

  console.log(`[WA] ${parsed.from}: ${text}`)

  // ── 8. Session detection ───────────────────────────────────────────────────
  const session = await detectSession(parsed.from, text, parsed.messageType, parsed.rawMessage)

  // ── 9. Dispatch ────────────────────────────────────────────────────────────
  await dispatchMessage(session, parsed, text, wasVoiceNote)
}

// ── HTTP handlers (unchanged) ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  // Verify Meta signature before processing
  const rawBody = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('x-hub-signature-256') || ''

  if (!signature) {
    console.error('[WA webhook] Missing X-Hub-Signature-256 header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }
  const { verifyMetaSignature } = await import('@/app/lib/meta-verify')
  if (!verifyMetaSignature(rawBody, signature)) {
    console.error('[WA webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  processWebhook(body).catch((error) => console.error('[WA webhook]', error))
  return NextResponse.json({ ok: true })
}
