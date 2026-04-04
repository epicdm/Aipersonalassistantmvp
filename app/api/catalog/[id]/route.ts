/**
 * GET    /api/catalog/[id] — get single product
 * PATCH  /api/catalog/[id] — update product
 * DELETE /api/catalog/[id] — soft-delete product (set availability=false)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/app/lib/prisma'
import { getProduct, updateProduct, deleteProduct } from '@/app/lib/catalog'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Verify ownership through agent
  const agent = await prisma.agent.findFirst({ where: { id: product.agentId, userId } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ product })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const agent = await prisma.agent.findFirst({ where: { id: product.agentId, userId } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, description, price, imageUrl, category, availability } = body

  const updated = await updateProduct(id, {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(availability !== undefined ? { availability } : {}),
  })

  return NextResponse.json({ product: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const agent = await prisma.agent.findFirst({ where: { id: product.agentId, userId } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteProduct(id)
  return NextResponse.json({ success: true })
}
