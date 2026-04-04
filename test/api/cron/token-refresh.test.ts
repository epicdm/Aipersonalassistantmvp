import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/app/lib/prisma'

// Mock token-service
vi.mock('@/app/lib/token-service', () => ({
  checkExpiring: vi.fn(),
  refreshToken: vi.fn(),
  healthCheck: vi.fn(),
}))

// Mock alert
vi.mock('@/app/lib/alert', () => ({
  alertEric: vi.fn(),
}))

describe('GET /api/cron/token-refresh', () => {
  let GET: typeof import('@/app/api/cron/token-refresh/route').GET

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('@/app/api/cron/token-refresh/route')
    GET = mod.GET
  })

  it('returns summary with zero tokens when none expiring', async () => {
    const { checkExpiring } = await import('@/app/lib/token-service')
    vi.mocked(checkExpiring).mockResolvedValue([])
    vi.mocked(prisma.tenantRegistry.findMany).mockResolvedValue([])

    const res = await GET()
    const data = await res.json()

    expect(data.checked).toBe(0)
    expect(data.refreshed).toBe(0)
    expect(data.failed).toBe(0)
  })

  it('refreshes expiring tokens successfully', async () => {
    const { checkExpiring, refreshToken } = await import('@/app/lib/token-service')
    vi.mocked(checkExpiring).mockResolvedValue([
      { tenantId: 't1', waPhoneNumberId: '123', tokenExpiresAt: new Date(), businessName: 'Test' },
    ] as any)
    vi.mocked(refreshToken).mockResolvedValue({ success: true })
    vi.mocked(prisma.tenantRegistry.findMany).mockResolvedValue([])

    const res = await GET()
    const data = await res.json()

    expect(data.checked).toBe(1)
    expect(data.refreshed).toBe(1)
    expect(data.failed).toBe(0)
  })

  it('counts failed refreshes and sends alert', async () => {
    const { checkExpiring, refreshToken } = await import('@/app/lib/token-service')
    const { alertEric } = await import('@/app/lib/alert')

    vi.mocked(checkExpiring).mockResolvedValue([
      { tenantId: 't1', waPhoneNumberId: '123', tokenExpiresAt: new Date(), businessName: 'Fail' },
    ] as any)
    vi.mocked(refreshToken).mockResolvedValue({ success: false, error: 'expired' })
    vi.mocked(prisma.tenantRegistry.findMany).mockResolvedValue([])

    const res = await GET()
    const data = await res.json()

    expect(data.failed).toBe(1)
    expect(data.alerts).toBe(1)
    expect(alertEric).toHaveBeenCalled()
  })

  it('health-checks permanent tokens on Mondays', async () => {
    const { checkExpiring, healthCheck } = await import('@/app/lib/token-service')

    // Mock Date to be a Monday
    const monday = new Date('2026-04-06T12:00:00Z') // Monday
    vi.setSystemTime(monday)

    vi.mocked(checkExpiring).mockResolvedValue([])
    vi.mocked(prisma.tenantRegistry.findMany).mockResolvedValue([
      { tenantId: 'perm-1', businessName: 'Permanent Biz' },
    ] as any)
    vi.mocked(healthCheck).mockResolvedValue({ healthy: true })

    const res = await GET()
    const data = await res.json()

    expect(data.healthChecked).toBe(1)
    expect(healthCheck).toHaveBeenCalledWith('perm-1')

    vi.useRealTimers()
  })
})
