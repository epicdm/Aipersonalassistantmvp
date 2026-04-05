import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreateBooking = vi.fn()
const mockFindOrCreateContact = vi.fn()
const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
  service: { findUnique: vi.fn() },
}

vi.mock('@/app/lib/booking', () => ({ createBooking: mockCreateBooking }))
vi.mock('@/app/lib/contacts', () => ({ findOrCreateContact: mockFindOrCreateContact }))
vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

const VALID_SECRET = 'test-secret'

function makeReq(body: Record<string, unknown>, secret?: string) {
  return new NextRequest('http://localhost/api/internal/booking', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-internal-secret': secret } : {}),
    },
  })
}

describe('POST /api/internal/booking', () => {
  let route: typeof import('@/app/api/internal/booking/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/booking/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.POST(makeReq({ agentId: 'a1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    const res = await route.POST(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid ISO datetime', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ id: 'a1', userId: 'u1' })
    const res = await route.POST(makeReq({
      agentId: 'a1', serviceId: 's1', slotDatetime: 'not-a-date', customerPhone: '111',
    }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 404 when agent not found', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null)
    const res = await route.POST(makeReq({
      agentId: 'bad-agent', serviceId: 's1', slotDatetime: '2026-04-10T09:00:00Z', customerPhone: '111',
    }, VALID_SECRET))
    expect(res.status).toBe(404)
  })

  it('calls findOrCreateContact and createBooking', async () => {
    const agent = { id: 'a1', userId: 'u1' }
    const contact = { id: 'c1' }
    const booking = { id: 'b1' }

    mockPrisma.agent.findUnique.mockResolvedValue(agent)
    mockFindOrCreateContact.mockResolvedValue(contact)
    mockCreateBooking.mockResolvedValue(booking)
    mockPrisma.service.findUnique.mockResolvedValue({ name: 'Haircut' })

    const res = await route.POST(makeReq({
      agentId: 'a1', serviceId: 's1', slotDatetime: '2026-04-10T09:00:00Z',
      customerPhone: '17671234567', customerName: 'John',
    }, VALID_SECRET))

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(mockFindOrCreateContact).toHaveBeenCalledWith(agent, '17671234567', 'John')
    expect(mockCreateBooking).toHaveBeenCalledWith({
      agentId: 'a1',
      serviceId: 's1',
      contactId: 'c1',
      datetime: expect.any(Date),
    })
    expect(body.bookingId).toBe('b1')
    expect(body.serviceName).toBe('Haircut')
  })
})
