// app/lib/chatwoot/webhook-ingest.ts
// Parse and validate incoming Chatwoot webhook payloads.
//
// Chatwoot sends webhooks for events like message_created and
// conversation_status_changed. We verify the payload and return
// a typed event object.
//
// Chatwoot webhook auth: set CHATWOOT_WEBHOOK_SECRET in settings
// and pass it as ?secret= query param in the webhook URL, e.g.:
//   https://bff.epic.dm/api/chatwoot/webhook?secret=MY_SECRET

export type ChatwootMessageCreatedEvent = {
  type: 'message_created'
  accountId: number
  conversationId: number
  messageId: number
  content: string
  /** message_type 0=incoming, 1=outgoing, 2=activity */
  messageType: number
  /** sender.type: 'user' (human agent), 'agent_bot', 'contact' */
  senderType: string | null
  senderId: number | null
}

export type ChatwootConversationStatusEvent = {
  type: 'conversation_status_changed'
  accountId: number
  conversationId: number
  status: string
}

export type ChatwootEvent =
  | ChatwootMessageCreatedEvent
  | ChatwootConversationStatusEvent
  | { type: 'unknown'; raw: any }

/** Parse a raw Chatwoot webhook body into a typed event. */
export function parseChatwootWebhook(body: any): ChatwootEvent {
  const event = body?.event

  if (event === 'message_created') {
    return {
      type: 'message_created',
      accountId: body?.account?.id ?? 0,
      conversationId: body?.conversation?.id ?? 0,
      messageId: body?.message?.id ?? 0,
      content: body?.message?.content ?? '',
      messageType: body?.message?.message_type ?? 0,
      senderType: body?.message?.sender?.type ?? null,
      senderId: body?.message?.sender?.id ?? null,
    }
  }

  if (event === 'conversation_status_changed') {
    return {
      type: 'conversation_status_changed',
      accountId: body?.account?.id ?? 0,
      conversationId: body?.conversation?.id ?? 0,
      status: body?.conversation?.status ?? 'open',
    }
  }

  return { type: 'unknown', raw: body }
}

/**
 * Verify the Chatwoot webhook secret.
 * Configure Chatwoot webhook URL as:
 *   https://bff.epic.dm/api/chatwoot/webhook?secret=CHATWOOT_WEBHOOK_SECRET
 */
export function verifyChatwootSecret(secret: string | null): boolean {
  const expected = process.env.CHATWOOT_WEBHOOK_SECRET
  if (!expected) return true // not configured — allow all (dev mode)
  return secret === expected
}
