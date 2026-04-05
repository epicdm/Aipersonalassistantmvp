/**
 * GET /api/internal/catalog
 * Internal endpoint for the isola-tenant agent container.
 * Auth: x-internal-secret header.
 *
 * Query params:
 *   agentId   — required
 *   category  — optional, filter by category
 *   search    — optional, fuzzy name/description search (limit 5)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { getProducts, searchProducts } from '@/app/lib/catalog'

export async function GET(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  const category = searchParams.get('category') || undefined
  const search = searchParams.get('search') || undefined

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  try {
    let products
    if (search) {
      products = await searchProducts(agentId, search)
    } else {
      products = await getProducts(agentId, category)
    }

    return NextResponse.json({
      products: products.slice(0, 50).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        imageUrl: p.imageUrl,
        category: p.category,
      })),
    })
  } catch (err) {
    console.error('[internal/catalog] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
