// app/lib/chatwoot/app-api.ts
// Chatwoot Application API — per-account REST operations.
//
// This is separate from adapter.ts (Platform API / super-admin).
// Application API uses per-account agent tokens and can create contacts,
// conversations, and messages inside a specific account.
//
// Required env vars:
//   CHATWOOT_URL               — e.g. https://inbox.epic.dm
//   CHATWOOT_ACCOUNT_ID        — BFF system account numeric ID
//   CHATWOOT_AGENT_ACCESS_TOKEN — access token for the BFF system account admin

const BASE = process.env.CHATWOOT_URL || 'https://inbox.epic.dm'

function headers(token: string) {
  return { 'Content-Type': 'application/json', api_access_token: token }
}

function base(accountId: string) {
  return `${BASE}/api/v1/accounts/${accountId}`
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export interface CWContact {
  id: number
  name: string
  phone_number: string | null
}

/**
 * Search Chatwoot contacts by phone number.
 * Returns the first match or null if not found.
 */
export async function searchContactByPhone(
  accountId: string,
  token: string,
  phone: string,
): Promise<CWContact | null> {
  const res = await fetch(
    `${base(accountId)}/contacts/search?q=${encodeURIComponent(phone)}&include_contacts=true`,
    { headers: headers(token), signal: AbortSignal.timeout(10000) },
  )
  if (!res.ok) return null
  const data = await res.json()
  const contacts: CWContact[] = data?.payload ?? []
  // Exact phone match (Chatwoot search is fuzzy)
  return contacts.find((c) => c.phone_number === phone) ?? null
}

/** Create a new Chatwoot contact. */
export async function createContact(
  accountId: string,
  token: string,
  phone: string,
  name?: string,
): Promise<CWContact> {
  const res = await fetch(`${base(accountId)}/contacts`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ phone_number: phone, name: name || phone }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`createContact failed (${res.status}): ${body}`)
  }
  return res.json()
}

/** Find or create a contact. Returns the Chatwoot contact ID. */
export async function upsertContact(
  accountId: string,
  token: string,
  phone: string,
  name?: string,
): Promise<number> {
  const existing = await searchContactByPhone(accountId, token, phone)
  if (existing) return existing.id
  const created = await createContact(accountId, token, phone, name)
  return created.id
}

// ── Conversations ─────────────────────────────────────────────────────────────

export interface CWConversation {
  id: number
  status: string
  inbox_id: number
}

/** Fetch conversations for a Chatwoot contact. */
export async function getContactConversations(
  accountId: string,
  token: string,
  chatwootContactId: number,
): Promise<CWConversation[]> {
  const res = await fetch(`${base(accountId)}/contacts/${chatwootContactId}/conversations`, {
    headers: headers(token),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.payload ?? []
}

/** Create a new Chatwoot conversation. */
export async function createConversation(
  accountId: string,
  token: string,
  chatwootContactId: number,
  inboxId: number,
  label?: string,
): Promise<CWConversation> {
  const body: Record<string, any> = {
    contact_id: chatwootContactId,
    inbox_id: inboxId,
    status: 'open',
  }
  if (label) body.labels = [label]

  const res = await fetch(`${base(accountId)}/conversations`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`createConversation failed (${res.status}): ${err}`)
  }
  return res.json()
}

/** Update a conversation status (open | resolved | pending). */
export async function updateConversationStatus(
  accountId: string,
  token: string,
  chatwootConversationId: number,
  status: 'open' | 'resolved' | 'pending',
): Promise<void> {
  await fetch(`${base(accountId)}/conversations/${chatwootConversationId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ status }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
}

// ── Messages ──────────────────────────────────────────────────────────────────

/**
 * Add a message to a Chatwoot conversation.
 * message_type: "incoming" = from customer, "outgoing" = from agent
 */
export async function addMessage(
  accountId: string,
  token: string,
  chatwootConversationId: number,
  content: string,
  messageType: 'incoming' | 'outgoing' = 'incoming',
): Promise<{ id: number }> {
  const res = await fetch(
    `${base(accountId)}/conversations/${chatwootConversationId}/messages`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        content,
        message_type: messageType,
        private: false,
      }),
      signal: AbortSignal.timeout(10000),
    },
  )
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`addMessage failed (${res.status}): ${err}`)
  }
  return res.json()
}

// ── Inboxes ───────────────────────────────────────────────────────────────────

export interface CWInbox {
  id: number
  name: string
}

/** List inboxes in a Chatwoot account. */
export async function listInboxes(accountId: string, token: string): Promise<CWInbox[]> {
  const res = await fetch(`${base(accountId)}/inboxes`, {
    headers: headers(token),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.payload ?? []
}

/**
 * Find an inbox by name, or create it if it doesn't exist.
 * Uses 'api' channel type — no special configuration needed.
 */
export async function upsertInbox(
  accountId: string,
  token: string,
  name: string,
): Promise<number> {
  const existing = await listInboxes(accountId, token)
  const match = existing.find((i) => i.name === name)
  if (match) return match.id

  const res = await fetch(`${base(accountId)}/inboxes`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      name,
      channel: { type: 'api', webhook_url: '' },
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`upsertInbox failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return data.id
}
