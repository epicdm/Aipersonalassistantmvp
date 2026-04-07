// app/api/chatwoot/webhook/route.ts
// Receives events from Chatwoot and forwards human-agent replies to WhatsApp.
//
// Configure in Chatwoot: Settings → Integrations → Webhooks
//   URL: https://bff.epic.dm/api/chatwoot/webhook?secret=CHATWOOT_WEBHOOK_SECRET
//   Events: message_created, conversation_status_changed
//
// Required env vars:
//   CHATWOOT_WEBHOOK_SECRET   — shared secret to validate incoming webhooks
//   META_WA_TOKEN             — WhatsApp token for sending messages
//   META_PHONE_ID             — default phone_number_id if none found

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { parseChatwootWebhook, verifyChatwootSecret } from '@/app/lib/chatwoot/webhook-ingest'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

export const dynamic = 'force-dynamic'

async function processChatwootEvent(body: any): Promise<void> {
  const event = parseChatwootWebhook(body)

  if (event.type === 'unknown') return

  if (event.type === 'message_created') {
    // Only forward outgoing messages sent by a human agent (not a bot, not API)
    // message_type: 0=incoming, 1=outgoing
    const isOutgoing = event.messageType === 1
    const isHumanAgent = event.senderType === 'user'

    if (!isOutgoing || !isHumanAgent) return
    if (!event.content.trim()) return

    // Find the Isola conversation by Chatwoot conversation ID
    const conversation = await prisma.conversation
      .findFirst({
        where: { chatwootConversationId: String(event.conversationId) },
        include: { agent: { select: { id: true, config: true, ownerPhone: true } } },
      })
      .catch(() => null)

    if (!conversation?.phone) {
      console.warn(`[chatwoot-wh] No Isola conversation for Chatwoot conv ${event.conversationId}`)
      return
    }

    const effectivePhoneId =
      (conversation.agent?.config as any)?.phoneNumberId ||
      process.env.META_PHONE_ID

    // Send the human agent's reply to the customer via WhatsApp
    await sendWhatsAppMessage(conversation.phone, event.content, effectivePhoneId)

    console.log(
      `[chatwoot-wh] Forwarded human reply to ${conversation.phone}: "${event.content.slice(0, 60)}"`,
    )

    // Record the message in BFF DB
    await prisma.whatsAppMessage
      .create({
        data: {
          agentId: conversation.agentId,
          phone: conversation.phone,
          role: 'assistant',
          content: event.content,
          sessionType: 'customer',
          escalationFlag: 'human_reply',
        },
      })
      .catch(() => null)

    // Update conversation last activity
    await prisma.conversation
      .update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastMessagePreview: event.content.slice(0, 180) },
      })
      .catch(() => null)

    return
  }

  if (event.type === 'conversation_status_changed') {
    if (event.status !== 'resolved') return

    // Mark the Isola conversation as closed
    const updated = await prisma.conversation
      .updateMany({
        where: {
          chatwootConversationId: String(event.conversationId),
          status: { not: 'closed' },
        },
        data: { status: 'closed' },
      })
      .catch(() => null)

    if (updated?.count) {
      console.log(`[chatwoot-wh] Closed Isola conversation for Chatwoot conv ${event.conversationId}`)
    }
    return
  }
}

export async function POST(req: NextRequest) {
  // Verify secret (set in Chatwoot webhook URL as ?secret=...)
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!verifyChatwootSecret(secret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Process fire-and-forget — Chatwoot expects fast 200
  processChatwootEvent(body).catch((err) => console.error('[chatwoot-wh]', err))

  return NextResponse.json({ ok: true })
}
