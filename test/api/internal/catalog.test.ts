import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetProducts = vi.fn()
const mockSearchProducts = vi.fn()

vi.mock('@/app/lib/catalog', () => ({
  getProducts: mockGetProducts,
  searchProducts: mockSearchProducts,
}))

const VALID_SECRET = 'test-secret'

function makeReq(params: Record<string, string>, secret?: string) {
  const url = new URL('http://localhost/api/internal/catalog')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url, {
    headers: secret !== undefined ? { 'x-internal-secret': secret } : {},
  })
}

describe('GET /api/internal/catalog', () => {
  let route: typeof import('@/app/api/internal/catalog/route')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('INTERNAL_SECRET', VALID_SECRET)
    route = await import('@/app/api/internal/catalog/route')
  })

  it('returns 401 when secret missing', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret wrong', async () => {
    const res = await route.GET(makeReq({ agentId: 'a1' }, 'bad-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when agentId missing', async () => {
    const res = await route.GET(makeReq({}, VALID_SECRET))
    expect(res.status).toBe(400)
  })

  it('returns products for agentId', async () => {
    const products = [
      { id: 'p1', name: 'Chicken', price: 5.99, description: null, imageUrl: null, category: 'Meat', availability: true },
    ]
    mockGetProducts.mockResolvedValue(products)

    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.products).toHaveLength(1)
    expect(body.products[0]).toMatchObject({ id: 'p1', name: 'Chicken', price: 5.99 })
    expect(mockGetProducts).toHaveBeenCalledWith('a1', undefined)
  })

  it('filters by category', async () => {
    mockGetProducts.mockResolvedValue([])
    await route.GET(makeReq({ agentId: 'a1', category: 'Meat' }, VALID_SECRET))
    expect(mockGetProducts).toHaveBeenCalledWith('a1', 'Meat')
  })

  it('calls searchProducts when search param given', async () => {
    mockSearchProducts.mockResolvedValue([])
    await route.GET(makeReq({ agentId: 'a1', search: 'chicken' }, VALID_SECRET))
    expect(mockSearchProducts).toHaveBeenCalledWith('a1', 'chicken')
    expect(mockGetProducts).not.toHaveBeenCalled()
  })

  it('caps product list at 50', async () => {
    const products = Array.from({ length: 60 }, (_, i) => ({
      id: `p${i}`, name: `Product ${i}`, price: 1, description: null, imageUrl: null, category: null,
    }))
    mockGetProducts.mockResolvedValue(products)

    const res = await route.GET(makeReq({ agentId: 'a1' }, VALID_SECRET))
    const body = await res.json()
    expect(body.products).toHaveLength(50)
  })
})
