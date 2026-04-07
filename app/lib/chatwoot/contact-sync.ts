// app/lib/chatwoot/contact-sync.ts
// Find or create a Chatwoot contact for a given phone number,
// and persist the Chatwoot contact ID to our Contact model.
import { prisma } from '@/app/lib/prisma'
import { upsertContact } from './app-api'

/**
 * Ensure a Chatwoot contact exists for the given phone number.
 * Persists `chatwootContactId` back to our Contact row.
 * Returns the Chatwoot contact ID as a string.
 */
export async function syncContactToChatwoot(
  accountId: string,
  token: string,
  contact: { id: string; phone: string; name?: string | null },
): Promise<string> {
  // Check if we already have the mapping
  const existing = await prisma.contact
    .findUnique({ where: { id: contact.id }, select: { chatwootContactId: true } })
    .catch(() => null)

  if (existing?.chatwootContactId) return existing.chatwootContactId

  // Create or find in Chatwoot
  const chatwootId = await upsertContact(accountId, token, contact.phone, contact.name ?? undefined)

  // Persist the mapping
  await prisma.contact
    .update({ where: { id: contact.id }, data: { chatwootContactId: String(chatwootId) } })
    .catch((e: any) => console.warn('[chatwoot] Failed to save contact ID:', e.message))

  return String(chatwootId)
}
