/**
 * Chatwoot Platform API adapter — Isola Phase 1
 *
 * Uses the Chatwoot Platform API (self-hosted only) to provision one
 * dedicated account per Isola tenant. This is the ONLY code that should
 * call Chatwoot Platform APIs. All other Chatwoot access goes through
 * Application APIs using per-account agent tokens.
 *
 * Required env vars:
 *   CHATWOOT_URL                — e.g. https://inbox.epic.dm
 *   CHATWOOT_SUPER_ADMIN_TOKEN  — Platform API token from Chatwoot super_admin profile
 *
 * Docs: https://www.chatwoot.com/developers/api/#tag/Accounts
 */

const CHATWOOT_URL           = process.env.CHATWOOT_URL           || 'https://inbox.epic.dm'
const SUPER_ADMIN_TOKEN      = process.env.CHATWOOT_SUPER_ADMIN_TOKEN || ''

function platformHeaders() {
  if (!SUPER_ADMIN_TOKEN) throw new Error('CHATWOOT_SUPER_ADMIN_TOKEN not configured')
  return {
    'Content-Type': 'application/json',
    'api_access_token': SUPER_ADMIN_TOKEN,
  }
}

export interface ChaiwootAccount {
  id: number
  name: string
}

/**
 * Create a new Chatwoot account for one Isola tenant.
 * Idempotency: callers should check chatwootAccountId before calling —
 * this function does NOT check for duplicates.
 */
export async function provisionChatwootAccount(businessName: string): Promise<ChaiwootAccount> {
  const res = await fetch(`${CHATWOOT_URL}/api/v1/platform/accounts`, {
    method: 'POST',
    headers: platformHeaders(),
    body: JSON.stringify({ name: businessName || 'Isola Business' }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new Error(`Chatwoot account creation failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  if (!data?.id) throw new Error(`Chatwoot returned unexpected shape: ${JSON.stringify(data)}`)

  return { id: data.id, name: data.name }
}

/**
 * Create a Chatwoot user and add them as admin to an account.
 * Phase 1: creates the tenant admin user so they can log in.
 */
export async function createChatwootUser(params: {
  email: string
  name: string
  accountId: number
  role?: 'agent' | 'administrator'
}): Promise<{ userId: number; accessToken: string }> {
  // 1. Create the user at platform level
  const userRes = await fetch(`${CHATWOOT_URL}/api/v1/platform/users`, {
    method: 'POST',
    headers: platformHeaders(),
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      password: crypto.randomUUID().replace(/-/g, '') + 'Aa1!', // strong random, user resets via email
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!userRes.ok) {
    const body = await userRes.text().catch(() => '(no body)')
    throw new Error(`Chatwoot user creation failed (${userRes.status}): ${body}`)
  }
  const userData = await userRes.json()

  // 2. Add user to the account
  const memberRes = await fetch(`${CHATWOOT_URL}/api/v1/platform/accounts/${params.accountId}/account_members`, {
    method: 'POST',
    headers: platformHeaders(),
    body: JSON.stringify({ user_id: userData.id, role: params.role || 'administrator' }),
    signal: AbortSignal.timeout(10000),
  })
  if (!memberRes.ok) {
    // Non-fatal — user exists, membership assignment failed; log and continue
    console.warn(`[chatwoot] Failed to add user ${userData.id} to account ${params.accountId}`)
  }

  return { userId: userData.id, accessToken: userData.access_token }
}
