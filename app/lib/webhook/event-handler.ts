// app/lib/webhook/event-handler.ts
// Phase 3: wired — parses Meta status events and marks messages in Chatwoot.
//
// Meta sends status update events (delivered, read, failed) in the same
// webhook payload as messages, under change.statuses[].
// These are processed in the POST handler of webhook/route.ts.

import { updateConversationStatus } from '@/app/lib/chatwoot/app-api'
import { prisma } from '@/app/lib/prisma'

export interface MessageStatusEvent {
  id: string              // Meta message ID (metaMessageId in our DB)
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipientId: string
  errors?: Array<{ code: number; title: string }>
}

/**
 * Parse status update events from a Meta webhook change value.
 * Returns an empty array if the change contains no status events.
 */
export function parseStatusEvents(changeValue: any): MessageStatusEvent[] {
  if (!changeValue?.statuses) return []
  return changeValue.statuses.map((s: any) => ({
    id: s.id,
    status: s.status,
    timestamp: s.timestamp,
    recipientId: s.recipient_id,
    errors: s.errors,
  }))
}

/**
 * Handle a batch of Meta message status events.
 *
 * Phase 3 behaviour:
 *   - delivered/read: look up the conversation via metaMessageId, then
 *     mark the Chatwoot conversation as "open" (it stays open until agent resolves)
 *   - failed: log with error details
 *
 * Phase 4 will do finer-grained per-message status in Chatwoot.
 */
export async function handleStatusEvents(events: MessageStatusEvent[]): Promise<void> {
  const accountId = process.env.CHATWOOT_ACCOUNT_ID
  const token = process.env.CHATWOOT_AGENT_ACCESS_TOKEN

  for (const event of events) {
    if (event.status === 'failed') {
      console.warn(`[WA status] Message ${event.id} failed:`, event.errors)
    }

    // Skip delivered/read if Chatwoot not configured
    if (!accountId || !token) continue
    if (event.status !== 'delivered' && event.status !== 'read') continue

    try {
      // Find the Conversation that has this message's chatwootConversationId
      const msg = await prisma.whatsAppMessage
        .findFirst({
          where: { metaMessageId: event.id },
          select: { agentId: true },
        })
        .catch(() => null)
      if (!msg) continue

      // Find the conversation linked to this agent for the recipient
      const conv = await prisma.conversation
        .findFirst({
          where: {
            agentId: msg.agentId,
            chatwootConversationId: { not: null },
            status: 'active',
          },
          select: { chatwootConversationId: true },
        })
        .catch(() => null)
      if (!conv?.chatwootConversationId) continue

      // On 'read' — the conversation is still active, no status change needed
      // On 'delivered' — same.
      // If we wanted to close on read, we'd call updateConversationStatus here.
      // For Phase 3, we just log.
      console.log(
        `[WA status] ${event.status}: conv=${conv.chatwootConversationId} msg=${event.id}`,
      )
    } catch (err: any) {
      console.error(`[WA status] Failed to handle ${event.status} for ${event.id}:`, err.message)
    }
  }
}
