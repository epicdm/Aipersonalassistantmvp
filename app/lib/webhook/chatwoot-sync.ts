// app/lib/webhook/chatwoot-sync.ts
// Phase 3: real implementation of the Chatwoot sync stub.
//
// Syncs inbound customer messages to the Chatwoot operator console so
// EPIC staff can see all conversations and intervene when needed.
//
// Phase 3 scope (Isola → Chatwoot only):
//   - Customer messages are mirrored as "incoming" messages in Chatwoot
//   - AI replies are NOT mirrored yet (Phase 4)
//
// Phase 4 will add:
//   - Mirror AI replies as "outgoing" messages
//   - Loop prevention for the Chatwoot → WhatsApp direction
//
// Required env vars (BFF system Chatwoot account):
//   CHATWOOT_ACCOUNT_ID         — numeric account ID (e.g. "1")
//   CHATWOOT_AGENT_ACCESS_TOKEN — agent access token for the BFF system account

import { prisma } from '@/app/lib/prisma'
import { upsertInbox } from '@/app/lib/chatwoot/app-api'
import { syncContactToChatwoot } from '@/app/lib/chatwoot/contact-sync'
import { syncConversationToChatwoot } from '@/app/lib/chatwoot/conversation-sync'
import { pushIncomingMessage } from '@/app/lib/chatwoot/message-sync'

export interface ChatwootSyncPayload {
  tenantId?: string
  agentId: string
  conversationId: string    // Isola Conversation.id
  messageId: string
  from: string              // customer phone
  contactName?: string | null
  text: string
  role: 'user' | 'assistant'
  timestamp: Date
  agentTemplate?: string    // used as inbox label / conversation tag
}

function getChatwootCreds(): { accountId: string; token: string } | null {
  const accountId = process.env.CHATWOOT_ACCOUNT_ID
  const token = process.env.CHATWOOT_AGENT_ACCESS_TOKEN
  if (!accountId || !token) return null
  return { accountId, token }
}

/**
 * Mirror an inbound customer message to Chatwoot.
 * Called fire-and-forget from message-handler.ts handleCustomer.
 *
 * Phase 3: only syncs role='user' messages.
 */
export async function syncMessageToChatwoot(payload: ChatwootSyncPayload): Promise<void> {
  if (payload.role !== 'user') return  // Phase 4: mirror AI replies too

  const creds = getChatwootCreds()
  if (!creds) return  // Not configured — skip silently

  const { accountId, token } = creds

  // 1. Load agent to check/create inbox
  const agent = await prisma.agent
    .findUnique({
      where: { id: payload.agentId },
      select: { id: true, name: true, template: true, chatwootInboxId: true },
    })
    .catch(() => null)
  if (!agent) return

  // 2. Ensure inbox for this agent (create once, then cached in Agent.chatwootInboxId)
  let inboxId: number
  if (agent.chatwootInboxId) {
    inboxId = Number(agent.chatwootInboxId)
  } else {
    inboxId = await upsertInbox(accountId, token, agent.name)
    // Persist inbox ID back to agent
    await prisma.agent
      .update({ where: { id: agent.id }, data: { chatwootInboxId: String(inboxId) } })
      .catch(() => null)
  }

  // 3. Load contact
  const contact = await prisma.contact
    .findFirst({ where: { phone: payload.from } })
    .catch(() => null)
  if (!contact) return

  // 4. Ensure Chatwoot contact
  const chatwootContactId = await syncContactToChatwoot(accountId, token, {
    id: contact.id,
    phone: contact.phone,
    name: contact.name ?? payload.contactName,
  })

  // 5. Ensure Chatwoot conversation
  const label = payload.agentTemplate || agent.template || undefined
  const chatwootConversationId = await syncConversationToChatwoot(
    accountId,
    token,
    inboxId,
    chatwootContactId,
    { id: payload.conversationId },
    label,
  )

  // 6. Push the message
  await pushIncomingMessage(accountId, token, chatwootConversationId, payload.text)

  console.log(
    `[chatwoot-sync] synced message to conv ${chatwootConversationId} (agent=${agent.name}, from=${payload.from})`,
  )
}

/**
 * Sync a contact update to Chatwoot.
 * Called when contact name or stage changes (Phase 4+).
 * Phase 3: no-op — contact is created on first message.
 */
export async function syncContactUpdate(
  _agentId: string,
  _phone: string,
  _name?: string,
): Promise<void> {
  // Phase 4 implementation
}
