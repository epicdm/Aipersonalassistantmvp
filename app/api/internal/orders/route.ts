/**
 * GET /api/internal/orders?agentId=X&phone=Y&reference=Z
 * Look up recent orders and bookings for a customer.
 * Read-only — does NOT create a contact if one doesn't exist.
 * Auth: x-internal-secret header.
 *
 * Response: { orders: [{type, reference, status, serviceName?, datetime?, amount?}] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  const phone = searchParams.get('phone')
  const reference = searchParams.get('reference') || undefined

  if (!agentId || !phone) {
    return NextResponse.json({ error: 'agentId and phone required' }, { status: 400 })
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Read-only lookup — no create
    const contact = await prisma.contact.findFirst({
      where: { phone, userId: agent.userId },
      select: { id: true },
    })

    if (!contact) {
      return NextResponse.json({ orders: [] })
    }

    const where: Record<string, unknown> = { agentId, contactId: contact.id }
    if (reference) where.id = reference

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { datetime: 'desc' },
      take: 5,
      include: { service: { select: { name: true, price: true } } },
    })

    const orders = bookings.map(b => ({
      type: 'booking',
      reference: b.id,
      status: b.status,
      serviceName: b.service.name,
      datetime: b.datetime.toISOString(),
      amount: b.service.price,
    }))

    return NextResponse.json({ orders })
  } catch (err) {
    console.error('[internal/orders] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
