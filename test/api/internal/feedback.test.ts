import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
}
const mockSendText = vi.fn()

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/app/lib/whatsapp', () => ({ sendWhatsAppMessage: mockSendText }))

const VALID_SECRET = 'test-secret'

function makeReq(body: Record<string, unknown>, secret?: string) {
  return new NextRequest('http://localhost/api/internal/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-internal-secret': secret } : {}),
    },
  })
}

describe('POST /api/internal/feedback', () => {
  let route: typeof import('@/app/api/internal/feedback/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/feedback/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.POST(makeReq({}))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    const res = await route.POST(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 404 when agent not found', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null)
    const res = await route.POST(makeReq({ agentId: 'a1', customerPhone: '111' }, VALID_SECRET))
    expect(res.status).toBe(404)
  })

  it('sends feedback message and returns sent: true', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ id: 'a1' })
    mockSendText.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({ agentId: 'a1', customerPhone: '111' }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.sent).toBe(true)
    expect(mockSendText).toHaveBeenCalledWith('111', expect.stringContaining('rate'))
  })
})
