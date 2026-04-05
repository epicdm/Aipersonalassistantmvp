import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  businessHours: { findMany: vi.fn() },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

const VALID_SECRET = 'test-secret'

function makeReq(params: Record<string, string>, secret?: string) {
  const url = new URL('http://localhost/api/internal/business-hours')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url, {
    headers: secret !== undefined ? { 'x-internal-secret': secret } : {},
  })
}

describe('GET /api/internal/business-hours', () => {
  let route: typeof import('@/app/api/internal/business-hours/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/business-hours/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when agentId missing', async () => {
    const res = await route.GET(makeReq({}, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns empty hours with message when none configured', async () => {
    mockPrisma.businessHours.findMany.mockResolvedValue([])

    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.hours).toHaveLength(0)
    expect(body.message).toBe('No hours configured')
  })

  it('returns full 7-day week with closed days', async () => {
    // Only Mon-Fri configured
    mockPrisma.businessHours.findMany.mockResolvedValue([
      { dayOfWeek: 1, openTime: '08:00', closeTime: '17:00' }, // Mon
      { dayOfWeek: 2, openTime: '08:00', closeTime: '17:00' }, // Tue
      { dayOfWeek: 3, openTime: '08:00', closeTime: '17:00' }, // Wed
      { dayOfWeek: 4, openTime: '08:00', closeTime: '17:00' }, // Thu
      { dayOfWeek: 5, openTime: '08:00', closeTime: '17:00' }, // Fri
    ])

    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.hours).toHaveLength(7)

    const sunday = body.hours.find((h: any) => h.dayOfWeek === 0)
    expect(sunday.isClosed).toBe(true)
    expect(sunday.openTime).toBeNull()

    const saturday = body.hours.find((h: any) => h.dayOfWeek === 6)
    expect(saturday.isClosed).toBe(true)

    const monday = body.hours.find((h: any) => h.dayOfWeek === 1)
    expect(monday.isClosed).toBe(false)
    expect(monday.openTime).toBe('08:00')
    expect(monday.closeTime).toBe('17:00')
    expect(monday.dayName).toBe('Monday')
  })

  it('orders days 0-6', async () => {
    mockPrisma.businessHours.findMany.mockResolvedValue([
      { dayOfWeek: 3, openTime: '08:00', closeTime: '17:00' },
    ])

    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()

    expect(body.hours.map((h: any) => h.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})
