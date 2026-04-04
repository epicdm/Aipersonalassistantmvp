import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/app/lib/prisma'
import { encryptToken } from '@/app/lib/crypto'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock alertEric
vi.mock('@/app/lib/alert', () => ({
  alertEric: vi.fn(),
}))

describe('token-service', () => {
  let storeToken: typeof import('@/app/lib/token-service').storeToken
  let getToken: typeof import('@/app/lib/token-service').getToken
  let refreshToken: typeof import('@/app/lib/token-service').refreshToken
  let checkExpiring: typeof import('@/app/lib/token-service').checkExpiring
  let healthCheck: typeof import('@/app/lib/token-service').healthCheck

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('@/app/lib/token-service')
    storeToken = mod.storeToken
    getToken = mod.getToken
    refreshToken = mod.refreshToken
    checkExpiring = mod.checkExpiring
    healthCheck = mod.healthCheck
  })

  describe('storeToken', () => {
    it('encrypts and stores an expiring token', async () => {
      vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

      await storeToken('tenant-1', 'plain-token', 'expiring', 60)

      expect(prisma.tenantRegistry.update).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        data: expect.objectContaining({
          tokenType: 'expiring',
          tokenExpiresAt: expect.any(Date),
        }),
      })

      // Verify the token is actually encrypted (not plaintext)
      const call = vi.mocked(prisma.tenantRegistry.update).mock.calls[0][0]
      expect((call.data as any).tokenEncrypted).not.toBe('plain-token')
      expect((call.data as any).tokenEncrypted).toContain(':') // iv:tag:cipher format
    })

    it('stores permanent token with null expiry', async () => {
      vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

      await storeToken('tenant-1', 'plain-token', 'permanent')

      const call = vi.mocked(prisma.tenantRegistry.update).mock.calls[0][0]
      expect((call.data as any).tokenExpiresAt).toBeNull()
      expect((call.data as any).tokenType).toBe('permanent')
    })
  })

  describe('getToken', () => {
    it('decrypts and returns a stored token', async () => {
      const plainToken = 'my-secret-token'
      const encrypted = encryptToken(plainToken)

      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: encrypted,
      } as any)

      const result = await getToken('tenant-1')
      expect(result).toBe(plainToken)
    })

    it('throws when tenant not found', async () => {
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockRejectedValue(
        new Error('Record not found')
      )

      await expect(getToken('nonexistent')).rejects.toThrow('Record not found')
    })
  })

  describe('refreshToken', () => {
    it('refreshes successfully with new token', async () => {
      const oldEncrypted = encryptToken('old-token')
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: oldEncrypted,
      } as any)
      vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ access_token: 'new-token', expires_in: 5184000 }),
      })

      const result = await refreshToken('tenant-1')
      expect(result.success).toBe(true)
      expect(prisma.tenantRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          data: expect.objectContaining({
            tokenExpiresAt: expect.any(Date),
          }),
        })
      )
    })

    it('handles expired token (error 190)', async () => {
      const oldEncrypted = encryptToken('expired-token')
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: oldEncrypted,
      } as any)
      vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: 190, message: 'Token expired' } }),
      })

      const result = await refreshToken('tenant-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('re-authentication')
      expect(prisma.tenantRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'token_expired' },
        })
      )
    })

    it('handles non-JSON response from Meta', async () => {
      const oldEncrypted = encryptToken('some-token')
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: oldEncrypted,
      } as any)

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new Error('Not JSON')),
        status: 429,
      })

      const result = await refreshToken('tenant-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('non-JSON')
    })

    it('handles network failure', async () => {
      const oldEncrypted = encryptToken('some-token')
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: oldEncrypted,
      } as any)

      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const result = await refreshToken('tenant-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('ECONNREFUSED')
    })

    it('handles decrypt failure on current token', async () => {
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: 'invalid:format',
      } as any)

      const result = await refreshToken('tenant-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('decrypt')
    })
  })

  describe('checkExpiring', () => {
    it('returns tenants with tokens expiring within threshold', async () => {
      const mockTenants = [
        { tenantId: 't1', waPhoneNumberId: '123', tokenExpiresAt: new Date(), businessName: 'Test' },
      ]
      vi.mocked(prisma.tenantRegistry.findMany).mockResolvedValue(mockTenants as any)

      const result = await checkExpiring(7)
      expect(result).toEqual(mockTenants)
      expect(prisma.tenantRegistry.findMany).toHaveBeenCalledWith({
        where: {
          tokenType: 'expiring',
          tokenExpiresAt: { lt: expect.any(Date) },
          status: { in: ['active', 'provisioning'] },
        },
        select: { tenantId: true, waPhoneNumberId: true, tokenExpiresAt: true, businessName: true },
      })
    })

    it('returns empty array when no tokens expiring', async () => {
      vi.mocked(prisma.tenantRegistry.findMany).mockResolvedValue([])
      const result = await checkExpiring(7)
      expect(result).toEqual([])
    })
  })

  describe('healthCheck', () => {
    it('returns healthy when Meta /me responds with id', async () => {
      const encrypted = encryptToken('valid-token')
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: encrypted,
      } as any)

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: '12345', name: 'Test App' }),
      })

      const result = await healthCheck('tenant-1')
      expect(result.healthy).toBe(true)
    })

    it('returns unhealthy and updates status on error 190', async () => {
      const encrypted = encryptToken('dead-token')
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: encrypted,
      } as any)
      vi.mocked(prisma.tenantRegistry.update).mockResolvedValue({} as any)

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: { code: 190, message: 'Token expired' } }),
      })

      const result = await healthCheck('tenant-1')
      expect(result.healthy).toBe(false)
      expect(prisma.tenantRegistry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'token_expired' } })
      )
    })

    it('handles non-JSON response', async () => {
      const encrypted = encryptToken('some-token')
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: encrypted,
      } as any)

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new Error('HTML page')),
      })

      const result = await healthCheck('tenant-1')
      expect(result.healthy).toBe(false)
      expect(result.error).toContain('Non-JSON')
    })

    it('handles decrypt failure', async () => {
      vi.mocked(prisma.tenantRegistry.findUniqueOrThrow).mockResolvedValue({
        tokenEncrypted: 'bad',
      } as any)

      const result = await healthCheck('tenant-1')
      expect(result.healthy).toBe(false)
      expect(result.error).toContain('Decrypt')
    })
  })
})
