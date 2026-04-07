// app/lib/chatwoot/message-sync.ts
// Push a single message into a Chatwoot conversation.
import { addMessage } from './app-api'

/**
 * Push an inbound (customer → agent) message to Chatwoot.
 * Phase 3: we only push customer messages. AI replies are NOT pushed yet
 * (Phase 4 will add full bidirectional mirror once loop-prevention is ready).
 */
export async function pushIncomingMessage(
  accountId: string,
  token: string,
  chatwootConversationId: string,
  content: string,
): Promise<void> {
  await addMessage(accountId, token, Number(chatwootConversationId), content, 'incoming')
}

/**
 * Push an outbound (agent → customer) message to Chatwoot.
 * Phase 4: call this after the AI reply is sent to WhatsApp.
 * Currently unused — reserved for Phase 4.
 */
export async function pushOutgoingMessage(
  accountId: string,
  token: string,
  chatwootConversationId: string,
  content: string,
): Promise<void> {
  await addMessage(accountId, token, Number(chatwootConversationId), content, 'outgoing')
}
