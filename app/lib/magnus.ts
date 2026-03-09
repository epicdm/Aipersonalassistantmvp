/**
 * Magnus Billing API Client (TypeScript)
 * HMAC-SHA512 authenticated REST API
 * Docs: https://voice00.epic.dm/mbilling
 */

import crypto from 'crypto'

const MAGNUS_URL = process.env.MAGNUS_URL || 'https://voice00.epic.dm/mbilling'
const MAGNUS_API_KEY = process.env.MAGNUS_API_KEY || ''
const MAGNUS_API_SECRET = process.env.MAGNUS_API_SECRET || ''
const DID_PREFIX = '1767818' // 17678180000 range
const DEFAULT_ID_GROUP = '3'
const DEFAULT_ID_PLAN = '34'
const DEFAULT_ID_OFFER = '7'
const DEFAULT_CODECS = 'opus,g729,gsm,alaw,ulaw'
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
  const params = new URLSearchParams({
    module,
    action,
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
    // @ts-ignore - Node fetch options
    ...(process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? {} : {}),
  })

  if (!res.ok) {
    throw new Error(`Magnus API error: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function generatePassword(length = 16): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}

function generateDID(): string {
  // Generate random 4 digits after prefix: 1767818XXXX
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
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
    const userRes = await magnusRequest('user', 'create', {
      username,
      password,
      email,
      id_group: DEFAULT_ID_GROUP,
      id_plan: DEFAULT_ID_PLAN,
      active: '1',
    })

    const magnusUserId = userRes?.id || userRes?.data?.id
    if (!magnusUserId) {
      throw new Error(`Failed to create Magnus user: ${JSON.stringify(userRes)}`)
    }

    // 2. Create SIP user linked to Magnus user
    const sipRes = await magnusRequest('sip', 'create', {
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
      allow: DEFAULT_CODECS,
      id_user: magnusUserId,
    })

    const sipId = sipRes?.id || sipRes?.data?.id

    // 3. Create DID
    const didRes = await magnusRequest('did', 'create', {
      did: didNumber,
      id_user: magnusUserId,
      activated: '1',
      country: 'DM',
    })

    const didId = didRes?.id || didRes?.data?.id

    // 4. Create DID destination → route to SIP user
    if (sipId && didId) {
      await magnusRequest('diddestination', 'create', {
        id_did: didId,
        destination: `sip:${username}@${SIP_SERVER}`,
        id_user: magnusUserId,
        activated: '1',
      })
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
    // Deactivate SIP user
    const sipRecord = await magnusRequest('sip', 'read', { name: sipUsername })
    if (sipRecord?.id) {
      await magnusRequest('sip', 'delete', { id: sipRecord.id })
    }
    // Deactivate user
    if (magnusUserId) {
      await magnusRequest('user', 'delete', { id: magnusUserId })
    }
    return true
  } catch (error: any) {
    console.error('[Magnus] Deprovisioning error:', error.message)
    return false
  }
}

export async function testMagnusConnection(): Promise<boolean> {
  try {
    const res = await magnusRequest('user', 'read', { rows: '1' })
    return !!res
  } catch {
    return false
  }
}
