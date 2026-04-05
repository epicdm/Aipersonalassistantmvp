import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
}
const mockFindOrCreate = vi.fn()
const mockSendTemplate = vi.fn()

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/app/lib/contacts', () => ({ findOrCreateContact: mockFindOrCreate }))
vi.mock('@/app/lib/whatsapp-templates', () => ({ sendTemplate: mockSendTemplate }))

const VALID_SECRET = 'test-secret'
const AGENT = { id: 'a1', userId: 'u1' }

function makeReq(body: Record<string, unknown>, secret?: string) {
  return new NextRequest('http://localhost/api/internal/template', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-internal-secret': secret } : {}),
    },
  })
}

describe('POST /api/internal/template', () => {
  let route: typeof import('@/app/api/internal/template/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    mockPrisma.agent.findUnique.mockResolvedValue(AGENT)
    mockFindOrCreate.mockResolvedValue({ id: 'c1' })
    mockSendTemplate.mockResolvedValue(undefined)
    route = await import('@/app/api/internal/template/route')
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
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', templateName: 're_engagement',
    }, VALID_SECRET))
    expect(res.status).toBe(404)
  })

  it('calls sendTemplate with correct args', async () => {
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', templateName: 're_engagement',
    }, VALID_SECRET))
    expect(res.status).toBe(200)
    expect(mockSendTemplate).toHaveBeenCalledWith('111', 're_engagement', 'en_US', undefined)
  })

  it('maps string variables to TemplateVariable array', async () => {
    await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', templateName: 'appointment_reminder',
      variables: ['John', 'Monday 9am'],
    }, VALID_SECRET))
    expect(mockSendTemplate).toHaveBeenCalledWith(
      '111', 'appointment_reminder', 'en_US',
      [{ type: 'text', text: 'John' }, { type: 'text', text: 'Monday 9am' }]
    )
  })

  it('returns sent: true and templateName', async () => {
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', templateName: 'payment_reminder',
    }, VALID_SECRET))
    const body = await res.json()
    expect(body.sent).toBe(true)
    expect(body.templateName).toBe('payment_reminder')
  })
})
