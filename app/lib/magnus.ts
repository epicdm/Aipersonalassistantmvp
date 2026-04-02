/**
 * Magnus Billing API Client
 *
 * HMAC-SHA512 authenticated REST API.
 * URL: /mbilling/index.php/{module}/{action}
 * Auth: Key + Sign headers, nonce in POST body.
 *
 * Provisioning flow (based on EMA magnusbilling.service.js):
 *   1. createUser=1  → creates user + auto-creates SIP account
 *   2. sip/read      → find the auto-created SIP account by id_user
 *   3. sip/save      → update SIP with DID callerid, nat, codec settings
 *   4. did/save      → create DID record in Magnus
 *   5. diddestination/save → map DID → Asterisk context (routing)
 *   6. callerid/save → register caller ID
 *   7. offerUse/save → assign billing plan
 */

import crypto from 'crypto'

const MAGNUS_URL       = process.env.MAGNUS_URL        || 'https://voice00.epic.dm/mbilling'
const MAGNUS_API_KEY   = process.env.MAGNUS_API_KEY    || ''
const MAGNUS_API_SECRET= process.env.MAGNUS_API_SECRET || ''

// Asterisk SIP server IP — used in diddestination Dial() string
const ASTERISK_IP      = process.env.MAGNUS_ASTERISK_IP || '162.251.181.126'
const SIP_SERVER       = process.env.MAGNUS_SIP_SERVER  || 'voice00.epic.dm'

// Magnus plan/group defaults (from EMA)
const DEFAULT_ID_PLAN  = '34'
const DEFAULT_ID_GROUP = '3'
const DEFAULT_ID_OFFER = '7'

// DID range for Isola Path B — use 185XX-188XX to avoid EMA's 189XX range
const ISOLA_DID_MIN = 5000
const ISOLA_DID_MAX = 8999
const DID_PREFIX    = '1767818'

export interface MagnusProvisionResult {
  success: boolean
  didNumber: string
  sipUsername: string
  sipPassword: string
  sipServer: string
  magnusUserId: string
  magnusSipId?: string
  magnusDidId?: string
  error?: string
}

// ── Auth ─────────────────────────────────────────────────────────────────────

// PHP http_build_query encodes * as %2A, but URLSearchParams does NOT.
// Match PHP urlencode so HMAC signature is valid.
function phpUrlencode(s: string): string {
  // Match PHP urlencode: spaces become +, not %20
  return encodeURIComponent(s)
    .replace(/%20/g, '+')
    .replace(/!/g, '%21').replace(/~/g, '%7E').replace(/\*/g, '%2A')
    .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')
}

function sign(postData: string): string {
  return crypto.createHmac('sha512', MAGNUS_API_SECRET).update(postData).digest('hex')
}

async function magnusRequest(
  module: string,
  action: string,
  data: Record<string, string> = {},
): Promise<any> {
  if (!MAGNUS_API_KEY || !MAGNUS_API_SECRET) {
    throw new Error('Magnus API credentials not configured')
  }

  const nonce    = (Date.now() * 1000).toString()
  // Build body with PHP-compatible encoding so HMAC signature matches server
  const postData = Object.entries({ module, action, nonce, ...data })
    .map(([k, v]) => phpUrlencode(k) + '=' + phpUrlencode(v))
    .join('&')
  const signature= sign(postData)
  const url      = `${MAGNUS_URL}/index.php/${module}/${action}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Key':  MAGNUS_API_KEY,
      'Sign': signature,
    },
    body: postData,
    signal: AbortSignal.timeout(15000),
  })

  const text = await res.text()
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Magnus invalid response: ${text.slice(0, 200)}`)
  }
  if (json?.status === 'error') {
    throw new Error(`Magnus error: ${json.message || JSON.stringify(json)}`)
  }
  return json
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generatePassword(length = 24): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}

/** Random DID in Isola range (185XX–188XX). Caller must verify uniqueness. */
export function generateIsolaDID(): string {
  const suffix = Math.floor(ISOLA_DID_MIN + Math.random() * (ISOLA_DID_MAX - ISOLA_DID_MIN + 1))
  return `${DID_PREFIX}${suffix}`
}

function formatDIDDisplay(did: string): string {
  // 17678185042 → +1 (767) 818-5042
  if (did.length === 11 && did.startsWith('1')) {
    return `+1 (${did.slice(1, 4)}) ${did.slice(4, 7)}-${did.slice(7)}`
  }
  return did
}

export { formatDIDDisplay }

// ── DID availability check ────────────────────────────────────────────────────

/**
 * Check if a DID already exists in Magnus.
 * Uses did/read with search filter on the did field.
 */
async function didExistsInMagnus(did: string): Promise<boolean> {
  try {
    const res = await magnusRequest('did', 'read', {
      rows: '5',
      page: '1',
      'search[did][did]': did,
    })
    const rows: any[] = res?.rows || []
    return rows.some((r: any) => String(r.did) === did)
  } catch {
    // If API unavailable, assume taken (safe default)
    return true
  }
}

/**
 * Return `count` available DIDs from the Isola pool (185XX–188XX).
 * Checks Magnus API + provided usedSet (from local DB).
 * Never touches or modifies any existing DID.
 */
export async function findAvailableDIDs(
  count = 5,
  usedInDB: Set<string> = new Set(),
): Promise<Array<{ id: number; did: string; display: string }>> {
  const results: Array<{ id: number; did: string; display: string }> = []
  const tried = new Set<string>()
  let attempts = 0

  while (results.length < count && attempts < 100) {
    attempts++
    const did = generateIsolaDID()
    if (tried.has(did) || usedInDB.has(did)) continue
    tried.add(did)

    const taken = await didExistsInMagnus(did)
    if (!taken) {
      results.push({ id: 0, did, display: formatDIDDisplay(did) })
    }
  }

  return results
}

// ── Full provisioning flow ────────────────────────────────────────────────────

/**
 * Provision a Magnus user + SIP account + DID + routing.
 *
 * Pass `specificDid` to claim a particular number (e.g. user-selected).
 * If omitted, a random Isola-range DID is generated.
 *
 * For Path B OTP capture, pass `otpContext = true` — the diddestination
 * will route to the bff-otp-{did} Asterisk context instead of the SIP device.
 * After OTP is verified, call updateDIDDestination() to switch to SIP routing.
 */
export async function provisionAgentDID(
  agentId: string,
  agentName: string,
  email: string,
  specificDid?: string,
  otpContext = false,
): Promise<MagnusProvisionResult> {
  const sipServer = SIP_SERVER
  let magnusUserId = ''
  let magnusSipId  = ''
  let magnusDidId  = ''

  try {
    const did      = specificDid || generateIsolaDID()
    const username = `ep_${agentId.replace(/-/g, '').slice(0, 12)}`
    const password = generatePassword(24)
    const uuid     = agentId

    // ── Step 1: Create Magnus user (createUser=1 auto-creates SIP account) ──
    const userRes = await magnusRequest('user', 'save', {
      id:             '0',
      createUser:     '1',
      username,
      password,
      email:          email || `${username}@isola.epic.dm`,
      id_plan:        DEFAULT_ID_PLAN,
      id_group:       DEFAULT_ID_GROUP,
      active:         '1',
      typepaid:       '0',
      prefix_local:   '*/1767/7,767/1767/10',
      id_offer:       DEFAULT_ID_OFFER,
      description:    `EMA_CustomerPhound`,
      dist:           `epic-user-${uuid}`,
      firstname:      agentName.slice(0, 50),
      lastname:       'Isola Agent',
    })

    magnusUserId = String(
      userRes?.id ?? userRes?.data?.id ?? userRes?.rows?.[0]?.id ?? ''
    )
    if (!magnusUserId) {
      throw new Error(`Magnus user creation failed: ${JSON.stringify(userRes)}`)
    }
    console.log(`[Magnus] User created: ${magnusUserId} (${username})`)

    // ── Step 2: Create SIP account ──
    // REST API createUser=1 does NOT auto-create SIP — we create it explicitly.
    const sipRes = await magnusRequest('sip', 'save', {
      id:               '0',
      id_user:          magnusUserId,
      name:             username,
      accountcode:      did,
      context:          'billing',
      host:             'dynamic',
      insecure:         'port,invite',
      nat:              'force_rport,comedia',
      qualify:          'yes',
      type:             'friend',
      username,
      secret:           password,
      allow:            'opus,g729,gsm,alaw,ulaw',
      callerid:         did,
      voicemail:        '1',
      voicemail_password: did.slice(-4),
    })
    magnusSipId = String(sipRes?.id ?? sipRes?.data?.id ?? sipRes?.rows?.[0]?.id ?? '')
    if (!magnusSipId) {
      throw new Error(`SIP account creation failed: ${JSON.stringify(sipRes)}`)
    }
    console.log(`[Magnus] SIP account created: ${magnusSipId}`)

    // ── Step 4: Create DID record ──
    const didRes = await magnusRequest('did', 'save', {
      id:        '0',
      did,
      country:   'Dominica',
      activated: '1',
    })
    magnusDidId = String(
      didRes?.id ?? didRes?.data?.id ?? didRes?.rows?.[0]?.id ?? ''
    )
    if (!magnusDidId) {
      // Duplicate entry — DID already exists in Magnus. Look it up by number.
      console.warn(`[Magnus] DID save returned no id: ${JSON.stringify(didRes)} — querying existing record`)
      try {
        const existingDid = await magnusRequest('did', 'read', {
          rows: '1', page: '1',
          'search[did][did]': did,
        })
        const row = existingDid?.rows?.[0]
        if (row?.id) {
          magnusDidId = String(row.id)
          console.log(`[Magnus] Found existing DID record: ${did} (id=${magnusDidId})`)
        }
      } catch (e: any) {
        console.warn('[Magnus] DID lookup fallback failed:', e.message)
      }
    }
    if (!magnusDidId) {
      throw new Error(`DID ${did} could not be created or found in Magnus`)
    }
    console.log(`[Magnus] DID ready: ${did} (id=${magnusDidId})`)

    // ── Step 5: DID destination (routing) ──
    // For OTP: route to bff-otp-{did} Asterisk context for OTP capture.
    // For normal: Dial to SIP device via Asterisk.
    const context = otpContext
      ? `exten => _X.,1,Goto(bff-otp-${did},\${EXTEN},1)`
      : `exten => _X.,1,Dial(SIP/\${EXTEN}@${ASTERISK_IP})`

    if (magnusDidId && magnusSipId) {
      const sipDest = 'SIP/' + username
      await magnusRequest('diddestination', 'save', {
        id:             '0',
        id_did:         magnusDidId,
        id_sip:         magnusSipId,
        id_user:        magnusUserId,
        idUserusername: username,
        destination:    sipDest,
        context,
        voip_call:      '10',
        priority:       '1',
      }).catch((e: any) =>
        console.warn('[Magnus] DID destination warning:', e.message)
      )
      console.log(`[Magnus] DID destination set (otp=${otpContext})`)
    }

    // ── Step 6: Caller ID ──
    await magnusRequest('callerid', 'save', {
      cid:       `+${did}`,
      name:      did,
      id_user:   magnusUserId,
      activated: '1',
    }).catch((e: any) =>
      console.warn('[Magnus] Caller ID warning:', e.message)
    )

    // ── Step 7: Plan/offer assignment ──
    await magnusRequest('offeruse', 'save', {
      id_user:  magnusUserId,
      id_offer: DEFAULT_ID_OFFER,
      status:   '1',
    }).catch((e: any) =>
      console.warn('[Magnus] Offer assignment warning:', e.message)
    )

    return {
      success: true,
      didNumber:    did,
      sipUsername:  username,
      sipPassword:  password,
      sipServer,
      magnusUserId,
      magnusSipId,
      magnusDidId,
    }
  } catch (error: any) {
    console.error('[Magnus] Provisioning error:', error.message)
    return {
      success: false,
      didNumber:    '',
      sipUsername:  '',
      sipPassword:  '',
      sipServer,
      magnusUserId,
      error: error.message,
    }
  }
}

/**
 * Switch a DID's routing from OTP capture context to live SIP routing.
 * Called after Meta OTP is successfully verified.
 */
export async function updateDIDDestinationToSIP(
  magnusDidId: string,
  magnusSipId: string,
  magnusUserId: string,
  didNumber: string,
): Promise<void> {
  // Custom SIP destination — same pattern as EMA agents (no dialplan context needed)
  const destination = `SIP/${didNumber}@${ASTERISK_IP}`

  // Try to read existing diddestination record — Magnus search on this endpoint
  // can return a 500 for non-EMA records, so fall back to id='0' (create new).
  let existingId = '0'
  try {
    const existing = await magnusRequest('diddestination', 'read', {
      rows: '5', page: '1',
      'search[diddestination][id_did]': magnusDidId,
    })
    if (existing?.rows?.[0]?.id) existingId = String(existing.rows[0].id)
  } catch {
    console.warn(`[Magnus] diddestination read failed for did_id=${magnusDidId} — will create new record`)
  }

  await magnusRequest('diddestination', 'save', {
    id:          existingId,
    id_did:      magnusDidId,
    id_sip:      magnusSipId,
    id_user:     magnusUserId,
    destination,
    context:     '',
    voip_call:   '0',
    priority:    '1',
  })
  console.log(`[Magnus] DID ${didNumber} destination updated to ${destination}`)
}

// ── Deprovisioning ────────────────────────────────────────────────────────────

export async function deprovisionAgentDID(
  sipUsername: string,
  magnusUserId: string,
): Promise<boolean> {
  try {
    const sipRes = await magnusRequest('sip', 'read', {
      rows: '5',
      page: '1',
      'search[sip][name]': sipUsername,
    })
    const sipId = sipRes?.rows?.[0]?.id
    if (sipId) {
      await magnusRequest('sip', 'destroy', { id: String(sipId) })
    }
    if (magnusUserId) {
      await magnusRequest('user', 'destroy', { id: magnusUserId })
    }
    return true
  } catch (error: any) {
    console.error('[Magnus] Deprovisioning error:', error.message)
    return false
  }
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export async function testMagnusConnection(): Promise<{
  ok: boolean
  users?: number
  error?: string
}> {
  try {
    const res = await magnusRequest('user', 'read', { rows: '1', page: '1' })
    return { ok: true, users: res?.total || 0 }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
