import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetAvailableSlots = vi.fn()
const mockGetServices = vi.fn()

vi.mock('@/app/lib/booking', () => ({
  getAvailableSlots: mockGetAvailableSlots,
  getServices: mockGetServices,
}))

const VALID_SECRET = 'test-secret'

function makeReq(params: Record<string, string>, secret?: string) {
  const url = new URL('http://localhost/api/internal/booking/slots')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url, {
    headers: secret !== undefined ? { 'x-internal-secret': secret } : {},
  })
}

describe('GET /api/internal/booking/slots', () => {
  let route: typeof import('@/app/api/internal/booking/slots/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/booking/slots/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when agentId missing', async () => {
    const res = await route.GET(makeReq({}, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns services list when no serviceId', async () => {
    const services = [
      { id: 's1', name: 'Haircut', duration: 30, price: 20 },
      { id: 's2', name: 'Coloring', duration: 60, price: 50 },
    ]
    mockGetServices.mockResolvedValue(services)

    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.slots).toHaveLength(0)
    expect(body.services).toHaveLength(2)
    expect(body.services[0]).toMatchObject({ id: 's1', name: 'Haircut', duration: 30 })
    expect(mockGetAvailableSlots).not.toHaveBeenCalled()
  })

  it('returns slots when serviceId provided', async () => {
    const services = [{ id: 's1', name: 'Haircut', duration: 30, price: 20 }]
    const slots = [
      { id: 'slot_1', datetime: new Date('2026-04-10T09:00:00Z'), label: 'Thursday 9:00 AM' },
      { id: 'slot_2', datetime: new Date('2026-04-10T09:30:00Z'), label: 'Thursday 9:30 AM' },
    ]
    mockGetServices.mockResolvedValue(services)
    mockGetAvailableSlots.mockResolvedValue(slots)

    const res = await route.GET(makeReq({ agentId: 'a1', serviceId: 's1' }, VALID_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.slots).toHaveLength(2)
    expect(body.slots[0]).toMatchObject({ id: 'slot_1', datetime: '2026-04-10T09:00:00.000Z', label: 'Thursday 9:00 AM' })
    expect(mockGetAvailableSlots).toHaveBeenCalledWith('a1', 's1', 5)
  })

  it('uses daysAhead param', async () => {
    mockGetServices.mockResolvedValue([])
    mockGetAvailableSlots.mockResolvedValue([])

    await route.GET(makeReq({ agentId: 'a1', serviceId: 's1', daysAhead: '14' }, VALID_SECRET))
    expect(mockGetAvailableSlots).toHaveBeenCalledWith('a1', 's1', 14)
  })
})
