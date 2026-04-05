import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
  contact: { findFirst: vi.fn() },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

const VALID_SECRET = 'test-secret'

function makeReq(params: Record<string, string>, secret?: string) {
  const url = new URL('http://localhost/api/internal/contacts/lookup')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), {
    headers: secret !== undefined ? { 'x-internal-secret': secret } : {},
  })
}

describe('GET /api/internal/contacts/lookup', () => {
  let route: typeof import('@/app/api/internal/contacts/lookup/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    mockPrisma.agent.findUnique.mockResolvedValue({ userId: 'u1' })
    route = await import('@/app/api/internal/contacts/lookup/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when params missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns found: false when no contact exists', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null)
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.found).toBe(false)
    // Verify read-only — no create call
    expect(mockPrisma.contact.findFirst).toHaveBeenCalledTimes(1)
  })

  it('returns contact profile when found', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({
      id: 'c1',
      name: 'John Doe',
      stage: 'qualified',
      tags: ['vip'],
      ownerNotes: 'Prefers morning',
      agentContacts: [{ lastContactAt: new Date('2026-04-01'), lastInboundAt: new Date('2026-04-01') }],
      bookings: [{ id: 'b1', datetime: new Date(), status: 'confirmed', service: { name: 'Haircut' } }],
    })
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(body.found).toBe(true)
    expect(body.name).toBe('John Doe')
    expect(body.stage).toBe('qualified')
    expect(body.tags).toContain('vip')
    expect(body.totalBookings).toBe(1)
  })
})
