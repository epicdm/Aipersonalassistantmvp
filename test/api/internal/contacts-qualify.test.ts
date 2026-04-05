import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
  contact: { update: vi.fn().mockResolvedValue({}) },
}
const mockFindOrCreate = vi.fn()

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/app/lib/contacts', () => ({ findOrCreateContact: mockFindOrCreate }))

const VALID_SECRET = 'test-secret'
const AGENT = { id: 'a1', userId: 'u1' }

function makeReq(body: Record<string, unknown>, secret?: string) {
  return new NextRequest('http://localhost/api/internal/contacts/qualify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-internal-secret': secret } : {}),
    },
  })
}

describe('POST /api/internal/contacts/qualify', () => {
  let route: typeof import('@/app/api/internal/contacts/qualify/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    mockPrisma.agent.findUnique.mockResolvedValue(AGENT)
    mockFindOrCreate.mockResolvedValue({ id: 'c1' })
    mockPrisma.contact.update.mockResolvedValue({ id: 'c1', stage: 'qualified' })
    route = await import('@/app/api/internal/contacts/qualify/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.POST(makeReq({}))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    const res = await route.POST(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid stage', async () => {
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', stage: 'vip',
    }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('updates Contact model (not AgentContact)', async () => {
    await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', stage: 'qualified',
    }, VALID_SECRET))
    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { stage: 'qualified' },
    })
  })

  it('includes tags and notes when provided', async () => {
    await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', stage: 'hot',
      tags: ['vip', 'repeat'], notes: 'Very interested in router',
    }, VALID_SECRET))
    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { stage: 'hot', tags: ['vip', 'repeat'], ownerNotes: 'Very interested in router' },
    })
  })

  it('returns updated: true, contactId, stage', async () => {
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', stage: 'customer',
    }, VALID_SECRET))
    const body = await res.json()
    expect(body.updated).toBe(true)
    expect(body.contactId).toBe('c1')
    expect(body.stage).toBe('customer')
  })

  it('accepts all valid stages', async () => {
    for (const stage of ['new', 'qualified', 'hot', 'customer', 'churned']) {
      const res = await route.POST(makeReq({ agentId: 'a1', customerPhone: '111', stage }, VALID_SECRET))
      expect(res.status).toBe(200)
    }
  })
})
