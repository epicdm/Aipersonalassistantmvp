import { describe, it, expect } from 'vitest'
import { encryptToken, decryptToken } from '@/app/lib/crypto'

describe('crypto', () => {
  describe('encryptToken / decryptToken', () => {
    it('round-trips a token correctly', () => {
      const token = 'EAABsbCS1iHgBO0ZBdFmZAiXrHC2TeSS9sZAmwGkLVo'
      const encrypted = encryptToken(token)
      const decrypted = decryptToken(encrypted)
      expect(decrypted).toBe(token)
    })

    it('produces different ciphertexts for the same input (random IV)', () => {
      const token = 'same-token-twice'
      const a = encryptToken(token)
      const b = encryptToken(token)
      expect(a).not.toBe(b)
    })

    it('encrypted format is iv:authTag:ciphertext (3 base64 parts)', () => {
      const encrypted = encryptToken('test')
      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)
      // Each part should be valid base64
      for (const part of parts) {
        expect(() => Buffer.from(part, 'base64')).not.toThrow()
      }
    })

    it('throws on invalid encrypted format (missing parts)', () => {
      expect(() => decryptToken('only-one-part')).toThrow()
    })

    it('throws on corrupted ciphertext (auth tag mismatch)', () => {
      const encrypted = encryptToken('real-token')
      const parts = encrypted.split(':')
      // Corrupt the ciphertext
      parts[2] = Buffer.from('corrupted-data').toString('base64')
      expect(() => decryptToken(parts.join(':'))).toThrow()
    })

    it('handles short tokens', () => {
      const token = 'x'
      const encrypted = encryptToken(token)
      expect(decryptToken(encrypted)).toBe(token)
    })

    it('handles long tokens (1000 chars)', () => {
      const token = 'x'.repeat(1000)
      const encrypted = encryptToken(token)
      expect(decryptToken(encrypted)).toBe(token)
    })

    it('handles unicode in tokens', () => {
      const token = 'token-with-emoji-🔑-and-accents-café'
      const encrypted = encryptToken(token)
      expect(decryptToken(encrypted)).toBe(token)
    })
  })
})
