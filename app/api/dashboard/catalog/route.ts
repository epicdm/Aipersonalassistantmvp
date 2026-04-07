/**
 * Dashboard App — Catalog CRUD
 * /api/dashboard/catalog
 *
 * Auth: ?token={dashboard_token} (HMAC-signed, expiry-checked)
 * These routes are called from the Catalog Manager Dashboard App iframe.
 *
 * GET    ?token=...&category=...&search=...  — list products
 * POST   ?token=...  body: { name, price, category?, description?, imageUrl? }  — create
 * PATCH  ?token=...  body: { id, name?, price?, category?, description?, imageUrl?, availability? }
 * DELETE ?token=...  body: { id }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import {
  getProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
} from '@/app/lib/catalog'

export const dynamic = 'force-dynamic'

// ── GET — list products ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || undefined
  const search   = searchParams.get('search')   || undefined

  try {
    const products = search
      ? await searchProducts(agentId, search, 50)
      : await getProducts(agentId, category)

    return NextResponse.json({ products })
  } catch (err) {
    console.error('[dashboard/catalog GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — create product ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, price, category, description, imageUrl } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
  }

  try {
    const product = await createProduct({
      agentId,
      name: name.trim(),
      price: Number(price),
      category: category?.trim() || undefined,
      description: description?.trim() || undefined,
      imageUrl: imageUrl?.trim() || undefined,
    })
    return NextResponse.json({ product }, { status: 201 })
  } catch (err) {
    console.error('[dashboard/catalog POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH — update product ─────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, name, price, category, description, imageUrl, availability } = body

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Verify product belongs to this agent
  try {
    const existing = await getProduct(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Don't reveal whether a product exists for a different agent (403 not 404)
    if (existing.agentId !== agentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (err) {
    console.error('[dashboard/catalog PATCH] lookup', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Build update — only allowed fields
  const update: Record<string, unknown> = {}
  if (name       !== undefined) update.name        = String(name).trim()
  if (price      !== undefined) update.price       = Number(price)
  if (category   !== undefined) update.category    = String(category).trim() || null
  if (description !== undefined) update.description = String(description).trim() || null
  if (imageUrl   !== undefined) update.imageUrl    = String(imageUrl).trim() || null
  if (availability !== undefined) update.availability = Boolean(availability)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const product = await updateProduct(id, update)
    return NextResponse.json({ product })
  } catch (err) {
    console.error('[dashboard/catalog PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE — soft-delete product ──────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id } = body
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Verify ownership
  try {
    const existing = await getProduct(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.agentId !== agentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (err) {
    console.error('[dashboard/catalog DELETE] lookup', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  try {
    await deleteProduct(id) // soft-delete: sets availability=false
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[dashboard/catalog DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
