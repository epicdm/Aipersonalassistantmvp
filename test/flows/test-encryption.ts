/**
 * Local test: simulate what Meta sends to our endpoint.
 * Encrypts a request with our PUBLIC key, sends it to the endpoint,
 * verifies the response can be decrypted.
 *
 * Run: npx tsx test/flows/test-encryption.ts
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, '../../flow_public.pem'), 'utf8')
const PRIVATE_KEY = fs.readFileSync(path.join(__dirname, '../../flow_private.pem'), 'utf8')
const ENDPOINT = process.env.ENDPOINT || 'https://bff.epic.dm/api/whatsapp/flows'

// Simulate Meta's encryption (what Meta sends to our endpoint)
function encryptLikeMeta(payload: any) {
  // Generate random AES-128 key and IV
  const aesKey = crypto.randomBytes(16)
  const iv = crypto.randomBytes(16) // Changed to 16 bytes (128-bit)

  // Encrypt AES key with our public key (RSA-OAEP-SHA256)
  const encryptedAesKey = crypto.publicEncrypt(
    { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  )

  // Encrypt the payload with AES-128-GCM
  const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encrypted_flow_data: Buffer.concat([encrypted, authTag]).toString('base64'),
    encrypted_aes_key: encryptedAesKey.toString('base64'),
    initial_vector: iv.toString('base64'),
    // Return raw values for decrypting response
    _aesKey: aesKey,
    _iv: iv,
  }
}

// Decrypt the response from our endpoint (simulate what Meta does)
function decryptResponse(base64Response: string, aesKey: Buffer, iv: Buffer) {
  // Flip IV (same as our endpoint does)
  const flippedIv = Buffer.alloc(iv.length)
  for (let i = 0; i < iv.length; i++) flippedIv[i] = ~iv[i] & 0xff

  const responseBuffer = Buffer.from(base64Response, 'base64')
  const TAG_LENGTH = 16
  const ciphertext = responseBuffer.subarray(0, -TAG_LENGTH)
  const authTag = responseBuffer.subarray(-TAG_LENGTH)

  const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, flippedIv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}

async function test(name: string, payload: any) {
  console.log(`\n=== TEST: ${name} ===`)
  console.log('Sending:', JSON.stringify(payload))

  const { encrypted_flow_data, encrypted_aes_key, initial_vector, _aesKey, _iv } = encryptLikeMeta(payload)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted_flow_data, encrypted_aes_key, initial_vector }),
    })

    console.log('Status:', res.status)
    const responseText = await res.text()

    if (res.status === 421) {
      console.log('FAIL: 421 — Decryption failed on server side')
      console.log('Response:', responseText)
      return false
    }

    if (res.status !== 200) {
      console.log('FAIL: Unexpected status', res.status)
      console.log('Response:', responseText)
      return false
    }

    // Try to decrypt the response
    try {
      const decrypted = decryptResponse(responseText, _aesKey, _iv)
      console.log('PASS: Decrypted response:', JSON.stringify(decrypted, null, 2))
      return true
    } catch (err: any) {
      console.log('FAIL: Could not decrypt response:', err.message)
      console.log('Raw response (first 200 chars):', responseText.substring(0, 200))
      return false
    }
  } catch (err: any) {
    console.log('FAIL: Request error:', err.message)
    return false
  }
}

async function main() {
  console.log('Endpoint:', ENDPOINT)
  console.log('Public key loaded:', PUBLIC_KEY.substring(0, 40) + '...')
  console.log('Private key loaded:', PRIVATE_KEY.substring(0, 40) + '...')

  // Test 1: Health check ping
  const t1 = await test('Ping (health check)', {
    version: '3.0',
    action: 'ping',
  })

  // Test 2: INIT action
  const t2 = await test('INIT (first screen load)', {
    version: '3.0',
    action: 'INIT',
    flow_token: 'test-token-123',
    data: {},
  })

  // Test 3: Error notification
  const t3 = await test('Error notification', {
    version: '3.0',
    action: 'data_exchange',
    flow_token: 'test-token-123',
    data: { error: 'INVALID_RESPONSE', error_message: 'test error' },
  })

  console.log('\n=== RESULTS ===')
  console.log('Ping:', t1 ? 'PASS' : 'FAIL')
  console.log('INIT:', t2 ? 'PASS' : 'FAIL')
  console.log('Error:', t3 ? 'PASS' : 'FAIL')

  if (t1 && t2 && t3) {
    console.log('\nAll tests PASSED. The endpoint works correctly.')
  } else {
    console.log('\nSome tests FAILED. Fix the failures above.')
  }
}

main()
