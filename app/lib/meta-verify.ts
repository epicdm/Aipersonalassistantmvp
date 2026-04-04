import crypto from 'crypto'

const META_APP_SECRET = process.env.META_APP_SECRET || ''

/**
 * Verify Meta webhook signature (X-Hub-Signature-256).
 * Returns false if secret is not configured or signature is invalid.
 */
export function verifyMetaSignature(rawBody: Buffer, signature: string): boolean {
  if (!META_APP_SECRET) {
    console.error('[meta-verify] META_APP_SECRET not set — rejecting')
    return false
  }
  const expected = 'sha256=' + crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
