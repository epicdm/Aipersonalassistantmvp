import crypto from 'crypto'

const MASTER_KEY = process.env.TENANT_MASTER_KEY || ''

function getKey(): Buffer {
  if (!MASTER_KEY) throw new Error('TENANT_MASTER_KEY not configured')
  return crypto.createHash('sha256').update(MASTER_KEY).digest()
}

/**
 * AES-256-GCM encrypt. Returns 'iv:authTag:ciphertext' (base64).
 */
export function encryptToken(token: string): string {
  const key      = getKey()
  const iv       = crypto.randomBytes(12)
  const cipher   = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const authTag  = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

/**
 * Inverse of encryptToken.
 */
export function decryptToken(encoded: string): string {
  const [ivB64, tagB64, cipherB64] = encoded.split(':')
  if (!ivB64 || !tagB64 || !cipherB64) throw new Error('Invalid encrypted token format')
  const key      = getKey()
  const iv       = Buffer.from(ivB64, 'base64')
  const authTag  = Buffer.from(tagB64, 'base64')
  const cipher   = Buffer.from(cipherB64, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString('utf8')
}
