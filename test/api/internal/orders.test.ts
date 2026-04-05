import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
  contact: { findFirst: vi.fn() },
  booking: { findMany: vi.fn() },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

const VALID_SECRET = 'test-secret'

function makeReq(params: Record<string, string>, secret?: string) {
  const url = new URL('http://localhost/api/internal/orders')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), {
    headers: secret !== undefined ? { 'x-internal-secret': secret } : {},
  })
}

describe('GET /api/internal/orders', () => {
  let route: typeof import('@/app/api/internal/orders/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    mockPrisma.agent.findUnique.mockResolvedValue({ userId: 'u1' })
    route = await import('@/app/api/internal/orders/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when params missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns empty orders when contact not found', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null)
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.orders).toEqual([])
  })

  it('returns recent bookings as orders', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1' })
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'b1',
        status: 'confirmed',
        datetime: new Date('2026-04-10T09:00:00Z'),
        service: { name: 'Haircut', price: 25 },
      },
    ])
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(body.orders).toHaveLength(1)
    expect(body.orders[0].type).toBe('booking')
    expect(body.orders[0].serviceName).toBe('Haircut')
    expect(body.orders[0].amount).toBe(25)
  })
})
