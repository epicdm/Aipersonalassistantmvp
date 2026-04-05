import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma: any = {
  agent: { findUnique: vi.fn() },
}
const mockSendProduct = vi.fn()
const mockSendText = vi.fn()

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/app/lib/whatsapp', () => ({
  sendProductMessage: mockSendProduct,
  sendWhatsAppMessage: mockSendText,
}))

const VALID_SECRET = 'test-secret'

function makeReq(body: Record<string, unknown>, secret?: string) {
  return new NextRequest('http://localhost/api/internal/product-card', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-internal-secret': secret } : {}),
    },
  })
}

describe('POST /api/internal/product-card', () => {
  let route: typeof import('@/app/api/internal/product-card/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/product-card/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.POST(makeReq({}))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: {} })
    const res = await route.POST(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid price', async () => {
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', productId: 'p1', productName: 'Chicken', price: -5,
    }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 404 when agent not found', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null)
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', productId: 'p1', productName: 'Chicken', price: 5,
    }, VALID_SECRET))
    expect(res.status).toBe(404)
  })

  it('uses text fallback when no catalogId configured', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: {} })
    mockSendText.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', productId: 'p1', productName: 'Chicken', price: 9.99,
    }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.method).toBe('text')
    expect(mockSendText).toHaveBeenCalledWith('111', expect.stringContaining('Chicken'))
  })

  it('uses product_message when catalogId is configured', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: { catalogId: 'cat123' } })
    mockSendProduct.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', productId: 'p1', productName: 'Chicken', price: 9.99,
    }, VALID_SECRET))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.method).toBe('product_message')
    expect(mockSendProduct).toHaveBeenCalledWith('111', 'cat123', 'p1', expect.any(String), expect.any(String))
  })

  it('returns productId, productName, price in response', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ config: {} })
    mockSendText.mockResolvedValue(undefined)
    const res = await route.POST(makeReq({
      agentId: 'a1', customerPhone: '111', productId: 'p99', productName: 'Rice', price: 3.50,
    }, VALID_SECRET))
    const body = await res.json()
    expect(body.productId).toBe('p99')
    expect(body.productName).toBe('Rice')
    expect(body.price).toBe(3.50)
  })
})
