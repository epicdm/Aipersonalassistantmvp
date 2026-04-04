/**
 * GET  /api/catalog?agentId=xxx — list products for an agent
 * POST /api/catalog — create a new product
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/app/lib/prisma'
import { getProducts, createProduct } from '@/app/lib/catalog'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  // Verify agent belongs to user
  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const products = await getProducts(agentId)
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { agentId, name, description, price, imageUrl, category } = body

  if (!agentId || !name || price == null) {
    return NextResponse.json({ error: 'agentId, name, and price required' }, { status: 400 })
  }

  // Verify agent belongs to user
  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const product = await createProduct({ agentId, name, description, price, imageUrl, category })
  return NextResponse.json({ product }, { status: 201 })
}
