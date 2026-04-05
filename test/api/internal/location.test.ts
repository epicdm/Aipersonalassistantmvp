import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
}
const mockSendLocation = vi.fn()

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/app/lib/whatsapp', () => ({
  sendLocationMessage: mockSendLocation,
}))

const VALID_SECRET = 'test-secret'

function makeReq(params: Record<string, string>, secret?: string) {
  const url = new URL('http://localhost/api/internal/location')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), {
    headers: secret !== undefined ? { 'x-internal-secret': secret } : {},
  })
}

describe('GET /api/internal/location', () => {
  let route: typeof import('@/app/api/internal/location/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/location/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when params missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns error:location_not_configured when no location in config', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: {} })
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.error).toBe('location_not_configured')
    expect(mockSendLocation).not.toHaveBeenCalled()
  })

  it('returns address from config when location not set', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: { address: '123 Main St' } })
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(body.address).toBe('123 Main St')
  })

  it('sends location pin when config.location is set', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      config: {
        location: { latitude: 15.3, longitude: -61.4, name: 'EPIC Office', address: '5 King St' },
      },
    })
    mockSendLocation.mockResolvedValue(undefined)
    const res = await route.GET(makeReq({ agentId: 'a1', phone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sent).toBe(true)
    expect(mockSendLocation).toHaveBeenCalledWith('111', 15.3, -61.4, 'EPIC Office', '5 King St')
  })
})
