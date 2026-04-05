/**
 * GET /api/internal/contacts/lookup?agentId=X&phone=Y
 * Look up a customer profile and interaction history.
 * Read-only — does NOT create a contact if one doesn't exist.
 * Auth: x-internal-secret header.
 *
 * Response: { found: false } | { found: true, name, stage, tags, lastSeen, totalBookings, totalOrders, notes }
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
      include: {
        agentContacts: {
          where: { agentId },
          select: { lastContactAt: true, lastInboundAt: true },
        },
        bookings: {
          where: { agentId },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, datetime: true, status: true, service: { select: { name: true } } },
        },
      },
    })

    if (!contact) {
      return NextResponse.json({ found: false })
    }

    const agentContact = contact.agentContacts[0]
    const recentBookings = contact.bookings.map(b => ({
      type: 'booking',
      reference: b.id,
      serviceName: b.service.name,
      datetime: b.datetime.toISOString(),
      status: b.status,
    }))

    return NextResponse.json({
      found: true,
      name: contact.name,
      stage: contact.stage,
      tags: contact.tags,
      notes: contact.ownerNotes,
      lastSeen: agentContact?.lastContactAt?.toISOString() || null,
      totalBookings: contact.bookings.length,
      totalOrders: 0,  // Stripe orders tracked in metadata — future enhancement
      recentInteractions: recentBookings,
    })
  } catch (err) {
    console.error('[internal/contacts/lookup] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
