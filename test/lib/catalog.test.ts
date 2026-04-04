import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma: any = {
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}

vi.mock('@/app/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/app/lib/api-retry', () => ({
  metaFetch: vi.fn(),
}))

describe('Catalog service', () => {
  let catalog: typeof import('@/app/lib/catalog')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    catalog = await import('@/app/lib/catalog')
  })

  describe('getProducts', () => {
    it('returns available products for agent', async () => {
      const products = [
        { id: 'p1', name: 'Chicken', price: 5.99, category: 'Meat', availability: true },
        { id: 'p2', name: 'Fish', price: 8.99, category: 'Seafood', availability: true },
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)

      const result = await catalog.getProducts('agent-1')

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agentId: 'agent-1', availability: true },
        })
      )
      expect(result).toEqual(products)
    })

    it('filters by category when provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      await catalog.getProducts('agent-1', 'Meat')

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agentId: 'agent-1', availability: true, category: 'Meat' },
        })
      )
    })
  })

  describe('createProduct', () => {
    it('creates a product with required fields', async () => {
      const newProduct = { id: 'p1', agentId: 'agent-1', name: 'Chicken', price: 5.99 }
      mockPrisma.product.create.mockResolvedValue(newProduct)

      const result = await catalog.createProduct({
        agentId: 'agent-1',
        name: 'Chicken',
        price: 5.99,
      })

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: { agentId: 'agent-1', name: 'Chicken', price: 5.99 },
      })
      expect(result).toEqual(newProduct)
    })
  })

  describe('updateProduct', () => {
    it('updates specified fields only', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', price: 7.99 })

      await catalog.updateProduct('p1', { price: 7.99 })

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { price: 7.99 },
      })
    })
  })

  describe('deleteProduct', () => {
    it('soft deletes by setting availability to false', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', availability: false })

      await catalog.deleteProduct('p1')

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { availability: false },
      })
    })
  })

  describe('getProductsByCategory', () => {
    it('groups products by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Chicken', category: 'Meat' },
        { id: 'p2', name: 'Beef', category: 'Meat' },
        { id: 'p3', name: 'Snapper', category: 'Seafood' },
        { id: 'p4', name: 'Widget', category: null },
      ])

      const result = await catalog.getProductsByCategory('agent-1')

      expect(result['Meat']).toHaveLength(2)
      expect(result['Seafood']).toHaveLength(1)
      expect(result['Other']).toHaveLength(1)
    })
  })

  describe('syncFromMetaCatalog', () => {
    it('throws when META_TOKEN is missing', async () => {
      process.env.META_WA_TOKEN = ''
      vi.resetModules()
      const mod = await import('@/app/lib/catalog')

      await expect(mod.syncFromMetaCatalog('cat-1', 'agent-1'))
        .rejects.toThrow('META_TOKEN and catalogId required')
    })
  })
})
