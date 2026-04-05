import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSessionCreate = vi.fn()

vi.mock('stripe', () => ({
  default: class StripeMock {
    checkout = { sessions: { create: mockSessionCreate } }
  },
}))

const VALID_SECRET = 'test-secret'

function makeReq(body: Record<string, unknown>, secret?: string) {
  return new NextRequest('http://localhost/api/internal/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-internal-secret': secret } : {}),
    },
  })
}

describe('POST /api/internal/checkout', () => {
  let route: typeof import('@/app/api/internal/checkout/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://bff.epic.dm')
    route = await import('@/app/api/internal/checkout/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.POST(makeReq({ agentId: 'a1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    const res = await route.POST(makeReq({ agentId: 'a1' }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid price', async () => {
    const res = await route.POST(makeReq({
      agentId: 'a1', productId: 'p1', productName: 'Chicken', price: -1, customerPhone: '17671111111',
    }, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('converts price to cents for Stripe unit_amount', async () => {
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })

    await route.POST(makeReq({
      agentId: 'a1', productId: 'p1', productName: 'Chicken', price: 29.99, customerPhone: '17671111111',
    }, VALID_SECRET))

    const call = mockSessionCreate.mock.calls[0][0]
    expect(call.line_items[0].price_data.unit_amount).toBe(2999)
  })

  it('returns checkout URL', async () => {
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session-123' })

    const res = await route.POST(makeReq({
      agentId: 'a1', productId: 'p1', productName: 'Router', price: 49.99, customerPhone: '17671111111',
    }, VALID_SECRET))

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.com/session-123')
  })

  it('sets success_url and metadata', async () => {
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })

    await route.POST(makeReq({
      agentId: 'a1', productId: 'p1', productName: 'Router', price: 10, customerPhone: '17671111111',
    }, VALID_SECRET))

    const call = mockSessionCreate.mock.calls[0][0]
    expect(call.success_url).toContain('/order-success')
    expect(call.metadata).toMatchObject({ agentId: 'a1', productId: 'p1', customerPhone: '17671111111' })
  })

  it('defaults currency to usd', async () => {
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })

    await route.POST(makeReq({
      agentId: 'a1', productId: 'p1', productName: 'Router', price: 10, customerPhone: '17671111111',
    }, VALID_SECRET))

    const call = mockSessionCreate.mock.calls[0][0]
    expect(call.line_items[0].price_data.currency).toBe('usd')
  })

  it('accepts xcd currency', async () => {
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })

    await route.POST(makeReq({
      agentId: 'a1', productId: 'p1', productName: 'Router', price: 10, customerPhone: '111', currency: 'xcd',
    }, VALID_SECRET))

    const call = mockSessionCreate.mock.calls[0][0]
    expect(call.line_items[0].price_data.currency).toBe('xcd')
  })
})
