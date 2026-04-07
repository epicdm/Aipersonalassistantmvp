// app/lib/chatwoot/conversation-sync.ts
// Find or create a Chatwoot conversation for a given Isola conversation,
// and persist the Chatwoot conversation ID.
import { prisma } from '@/app/lib/prisma'
import { getContactConversations, createConversation } from './app-api'

/**
 * Ensure a Chatwoot conversation exists for this Isola conversation.
 * Persists `chatwootConversationId` back to our Conversation row.
 *
 * Looks for an existing open conversation between the contact and inbox before
 * creating a new one (avoids duplicate conversations on replay).
 *
 * Returns the Chatwoot conversation ID as a string.
 */
export async function syncConversationToChatwoot(
  accountId: string,
  token: string,
  inboxId: number,
  chatwootContactId: string,
  conversation: { id: string },
  label?: string,
): Promise<string> {
  // Check if we already have the mapping
  const existing = await prisma.conversation
    .findUnique({ where: { id: conversation.id }, select: { chatwootConversationId: true } })
    .catch(() => null)

  if (existing?.chatwootConversationId) return existing.chatwootConversationId

  // Check if an open conversation already exists for this contact+inbox
  const contactConvs = await getContactConversations(accountId, token, Number(chatwootContactId))
  const openForInbox = contactConvs.find(
    (c) => c.inbox_id === inboxId && c.status === 'open',
  )

  let chatwootConvId: number
  if (openForInbox) {
    chatwootConvId = openForInbox.id
  } else {
    const created = await createConversation(
      accountId,
      token,
      Number(chatwootContactId),
      inboxId,
      label,
    )
    chatwootConvId = created.id
  }

  // Persist the mapping
  await prisma.conversation
    .update({
      where: { id: conversation.id },
      data: { chatwootConversationId: String(chatwootConvId) },
    })
    .catch((e: any) => console.warn('[chatwoot] Failed to save conversation ID:', e.message))

  return String(chatwootConvId)
}
