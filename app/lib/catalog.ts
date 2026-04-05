/**
 * Product Catalog service.
 * Manages products in local DB with optional Meta Catalog API sync.
 */

import { prisma } from '@/app/lib/prisma'
import { metaFetch } from '@/app/lib/api-retry'

const META_TOKEN = process.env.META_WA_TOKEN || ''

// ─── Local DB operations ──────────────────────────────────────────────────────

export async function getProducts(agentId: string, category?: string) {
  return prisma.product.findMany({
    where: {
      agentId,
      availability: true,
      ...(category ? { category } : {}),
    },
    orderBy: { category: 'asc' },
  })
}

export async function searchProducts(agentId: string, query: string, limit = 5) {
  return prisma.product.findMany({
    where: {
      agentId,
      availability: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: limit,
  })
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } })
}

export async function createProduct(data: {
  agentId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category?: string
  catalogId?: string
}) {
  return prisma.product.create({ data })
}

export async function updateProduct(id: string, data: {
  name?: string
  description?: string
  price?: number
  imageUrl?: string
  category?: string
  availability?: boolean
}) {
  return prisma.product.update({ where: { id }, data })
}

export async function deleteProduct(id: string) {
  return prisma.product.update({
    where: { id },
    data: { availability: false },
  })
}

// ─── Product grouping by category ─────────────────────────────────────────────

export async function getProductsByCategory(agentId: string) {
  const products = await getProducts(agentId)
  const grouped: Record<string, typeof products> = {}

  for (const product of products) {
    const cat = product.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(product)
  }

  return grouped
}

// ─── Meta Catalog API sync ────────────────────────────────────────────────────

export async function syncFromMetaCatalog(catalogId: string, agentId: string) {
  if (!META_TOKEN || !catalogId) {
    throw new Error('META_TOKEN and catalogId required for sync')
  }

  const res = await metaFetch(
    `https://graph.facebook.com/v25.0/${catalogId}/products?fields=id,name,description,price,image_url,category,availability&limit=100`,
    { headers: { Authorization: `Bearer ${META_TOKEN}` } }
  )

  const data = await res.json()
  const products = data.data || []
  let synced = 0

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        agentId,
        name: p.name || 'Unnamed',
        description: p.description,
        price: parseFloat(p.price || '0'),
        imageUrl: p.image_url,
        category: p.category,
        catalogId,
        availability: p.availability !== 'out of stock',
      },
      update: {
        name: p.name || 'Unnamed',
        description: p.description,
        price: parseFloat(p.price || '0'),
        imageUrl: p.image_url,
        category: p.category,
        availability: p.availability !== 'out of stock',
      },
    })
    synced++
  }

  return { synced, total: products.length }
}
