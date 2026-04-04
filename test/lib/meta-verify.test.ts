import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// We need to test with a known secret, so we control the env
const TEST_SECRET = 'test-app-secret'

describe('verifyMetaSignature', () => {
  let verifyMetaSignature: typeof import('@/app/lib/meta-verify').verifyMetaSignature

  beforeEach(async () => {
    process.env.META_APP_SECRET = TEST_SECRET
    // Fresh import each time to pick up env changes
    vi.resetModules()
    const mod = await import('@/app/lib/meta-verify')
    verifyMetaSignature = mod.verifyMetaSignature
  })

  function makeSignature(body: string, secret = TEST_SECRET): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
  }

  it('accepts a valid signature', () => {
    const body = '{"test":"data"}'
    const rawBody = Buffer.from(body)
    const sig = makeSignature(body)
    expect(verifyMetaSignature(rawBody, sig)).toBe(true)
  })

  it('rejects an invalid signature', () => {
    const rawBody = Buffer.from('{"test":"data"}')
    expect(verifyMetaSignature(rawBody, 'sha256=bad')).toBe(false)
  })

  it('rejects when signature is empty string', () => {
    const rawBody = Buffer.from('{"test":"data"}')
    expect(verifyMetaSignature(rawBody, '')).toBe(false)
  })

  it('rejects when META_APP_SECRET is not set', async () => {
    process.env.META_APP_SECRET = ''
    vi.resetModules()
    const mod = await import('@/app/lib/meta-verify')
    const rawBody = Buffer.from('test')
    const sig = makeSignature('test')
    expect(mod.verifyMetaSignature(rawBody, sig)).toBe(false)
  })

  it('handles length mismatch gracefully (timingSafeEqual)', () => {
    const rawBody = Buffer.from('test')
    // Signature with wrong length prefix
    expect(verifyMetaSignature(rawBody, 'sha256=ab')).toBe(false)
  })

  it('works with binary body data', () => {
    const body = Buffer.from([0x00, 0x01, 0xff, 0xfe])
    const sig = makeSignature(body.toString())
    // This won't match because we used .toString() which loses binary,
    // but it should not crash
    expect(verifyMetaSignature(body, sig)).toBe(false)
  })
})
