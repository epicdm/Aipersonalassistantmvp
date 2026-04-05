import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

const VALID_SECRET = 'test-secret'

function makeReq(params: Record<string, string>, secret?: string) {
  const url = new URL('http://localhost/api/internal/agent-config')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), {
    headers: secret !== undefined ? { 'x-internal-secret': secret } : {},
  })
}

describe('GET /api/internal/agent-config', () => {
  let route: typeof import('@/app/api/internal/agent-config/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/agent-config/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when agentId missing', async () => {
    const res = await route.GET(makeReq({}, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 404 when agent not found', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null)
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(404)
  })

  it('returns all core tools when config.tools is empty', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: {} })
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.enabledTools).toContain('catalog_browse')
    expect(body.enabledTools).toContain('send_product_card')
    expect(body.enabledTools).toContain('lookup_contact')
  })

  it('returns only enabled tools from config', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      config: { tools: { catalog_browse: true, catalog_search: false, send_location: true } },
    })
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()
    expect(body.enabledTools).toEqual(['catalog_browse', 'send_location'])
  })

  it('returns timezone and currency from config', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      config: { timezone: 'America/New_York', currency: 'usd' },
    })
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()
    expect(body.timezone).toBe('America/New_York')
    expect(body.currency).toBe('usd')
  })

  it('defaults timezone to America/Dominica and currency to xcd', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: {} })
    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()
    expect(body.timezone).toBe('America/Dominica')
    expect(body.currency).toBe('xcd')
  })
})
