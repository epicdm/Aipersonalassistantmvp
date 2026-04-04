import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({ auth: () => mockAuth() }))

const mockPrisma: any = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
}
vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))

const mockStripeCustomerCreate = vi.fn()
const mockStripeCheckoutCreate = vi.fn()
const mockStripePortalCreate = vi.fn()

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      customers = { create: mockStripeCustomerCreate }
      checkout = { sessions: { create: mockStripeCheckoutCreate } }
      billingPortal = { sessions: { create: mockStripePortalCreate } }
      webhooks = { constructEvent: vi.fn() }
    },
  }
})

function makeRequest(body: any) {
  return new Request('http://localhost/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('POST /api/billing/checkout', () => {
  let POST: any

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
    process.env.STRIPE_PRICE_PRO = 'price_pro_test'
    process.env.STRIPE_PRICE_BUSINESS = 'price_biz_test'

    vi.resetModules()
    const mod = await import('@/app/api/billing/checkout/route')
    POST = mod.POST
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid plan', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' })
    const res = await POST(makeRequest({ plan: 'super' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when already on same plan', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', plan: 'pro', email: 'test@test.com' })
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(400)
  })

  it('creates Stripe customer if none exists', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', plan: 'free', email: 'test@test.com', stripeCustomerId: null, clerkId: 'clerk-1',
    })
    mockStripeCustomerCreate.mockResolvedValue({ id: 'cus_new' })
    mockStripeCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/xxx' })

    const res = await POST(makeRequest({ plan: 'pro' }))
    const data = await res.json()

    expect(mockStripeCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@test.com' })
    )
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stripeCustomerId: 'cus_new' }) })
    )
    expect(data.url).toBe('https://checkout.stripe.com/xxx')
  })

  it('reuses existing Stripe customer', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', plan: 'free', email: 'test@test.com', stripeCustomerId: 'cus_existing', clerkId: 'clerk-1',
    })
    mockStripeCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/yyy' })

    const res = await POST(makeRequest({ plan: 'pro' }))
    const data = await res.json()

    expect(mockStripeCustomerCreate).not.toHaveBeenCalled()
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing', mode: 'subscription' })
    )
    expect(data.url).toBe('https://checkout.stripe.com/yyy')
  })

  it('creates Customer Portal session for portal action', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', stripeCustomerId: 'cus_123',
    })
    mockStripePortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal' })

    const res = await POST(makeRequest({ action: 'portal' }))
    const data = await res.json()

    expect(mockStripePortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_123' })
    )
    expect(data.url).toBe('https://billing.stripe.com/portal')
  })

  it('returns 400 for portal when no Stripe customer', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', stripeCustomerId: null,
    })

    const res = await POST(makeRequest({ action: 'portal' }))
    expect(res.status).toBe(400)
  })
})
