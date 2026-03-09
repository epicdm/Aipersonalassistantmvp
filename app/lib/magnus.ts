/**
 * Magnus Billing API Client (TypeScript)
 * HMAC-SHA512 authenticated REST API
 * URL pattern: /mbilling/index.php/{module}/{action}
 * Actions: read, save, destroy
 * Auth: Key + Sign headers, nonce in POST body
 */

import crypto from 'crypto'

const MAGNUS_URL = process.env.MAGNUS_URL || 'https://voice00.epic.dm/mbilling'
const MAGNUS_API_KEY = process.env.MAGNUS_API_KEY || ''
const MAGNUS_API_SECRET = process.env.MAGNUS_API_SECRET || ''
const DID_PREFIX = '1767818' // 17678180000 range
const DEFAULT_ID_GROUP = '3'
const DEFAULT_ID_PLAN = '34'
const SIP_SERVER = process.env.MAGNUS_SIP_SERVER || 'voice00.epic.dm'

export interface MagnusProvisionResult {
  success: boolean
  didNumber: string
  sipUsername: string
  sipPassword: string
  sipServer: string
  magnusUserId: string
  error?: string
}

function sign(postData: string): string {
  return crypto.createHmac('sha512', MAGNUS_API_SECRET).update(postData).digest('hex')
}

async function magnusRequest(module: string, action: string, data: Record<string, string> = {}): Promise<any> {
  const nonce = (Date.now() * 1000).toString() // microsecond precision

  const params = new URLSearchParams({
    module,
    action,
    nonce,
    ...data,
  })
  const postData = params.toString()
  const signature = sign(postData)

  const url = `${MAGNUS_URL}/index.php/${module}/${action}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Key': MAGNUS_API_KEY,
      'Sign': signature,
    },
    body: postData,
  })

  const text = await res.text()
  try {
    const json = JSON.parse(text)
    if (json?.status === 'error') {
      throw new Error(`Magnus error: ${json.message || JSON.stringify(json)}`)
    }
    return json
  } catch (e: any) {
    if (e.message?.startsWith('Magnus error:')) throw e
    throw new Error(`Magnus invalid response: ${text.slice(0, 200)}`)
  }
}

function generatePassword(length = 16): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}

function generateDID(): string {
  const suffix = Math.floor(Math.random() * 9000 + 1000).toString()
  return `${DID_PREFIX}${suffix}`
}

export async function provisionAgentDID(agentId: string, agentName: string, email: string): Promise<MagnusProvisionResult> {
  try {
    if (!MAGNUS_API_KEY || !MAGNUS_API_SECRET) {
      throw new Error('Magnus API credentials not configured')
    }

    const username = `bff_${agentId.slice(0, 8)}`.toLowerCase()
    const password = generatePassword()
    const didNumber = generateDID()

    // 1. Create Magnus user
    const userRes = await magnusRequest('user', 'save', {
      username,
      password,
      email: email || `${username}@bff.epic.dm`,
      id_group: DEFAULT_ID_GROUP,
      id_plan: DEFAULT_ID_PLAN,
      active: '1',
      firstname: agentName,
      lastname: 'BFF Agent',
    })

    const magnusUserId = userRes?.id || userRes?.data?.id || userRes?.rows?.[0]?.id
    if (!magnusUserId) {
      throw new Error(`Failed to create Magnus user: ${JSON.stringify(userRes)}`)
    }

    // 2. Create SIP user linked to Magnus user
    await magnusRequest('sip', 'save', {
      name: username,
      accountcode: magnusUserId,
      context: 'default',
      host: 'dynamic',
      insecure: 'port,invite',
      nat: 'yes',
      qualify: 'yes',
      type: 'friend',
      username,
      secret: password,
      allow: 'opus,g729,gsm,alaw,ulaw',
      id_user: magnusUserId,
    })

    // 3. Create DID
    const didRes = await magnusRequest('did', 'save', {
      did: didNumber,
      id_user: magnusUserId,
      activated: '1',
      country: 'DM',
    })

    const didId = didRes?.id || didRes?.data?.id

    // 4. Create DID destination → route to SIP user
    if (didId) {
      await magnusRequest('diddestination', 'save', {
        id_did: didId,
        destination: `sip:${username}@${SIP_SERVER}`,
        id_user: magnusUserId,
        activated: '1',
      }).catch(e => console.warn('[Magnus] DID destination warning:', e.message))
    }

    return {
      success: true,
      didNumber,
      sipUsername: username,
      sipPassword: password,
      sipServer: SIP_SERVER,
      magnusUserId,
    }
  } catch (error: any) {
    console.error('[Magnus] Provisioning error:', error.message)
    return {
      success: false,
      didNumber: '',
      sipUsername: '',
      sipPassword: '',
      sipServer: SIP_SERVER,
      magnusUserId: '',
      error: error.message,
    }
  }
}

export async function deprovisionAgentDID(sipUsername: string, magnusUserId: string): Promise<boolean> {
  try {
    // Find and delete SIP user
    const sipRes = await magnusRequest('sip', 'read', { search: sipUsername })
    const sipId = sipRes?.rows?.[0]?.id
    if (sipId) {
      await magnusRequest('sip', 'destroy', { id: sipId })
    }
    // Delete Magnus user
    if (magnusUserId) {
      await magnusRequest('user', 'destroy', { id: magnusUserId })
    }
    return true
  } catch (error: any) {
    console.error('[Magnus] Deprovisioning error:', error.message)
    return false
  }
}

export async function testMagnusConnection(): Promise<{ ok: boolean; users?: number; error?: string }> {
  try {
    const res = await magnusRequest('user', 'read', { rows: '1', page: '1' })
    return { ok: true, users: res?.total || 0 }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
