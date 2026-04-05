/**
 * POST /api/internal/booking
 * Internal endpoint — creates a booking after customer selects a slot.
 * Auth: x-internal-secret header.
 *
 * Body: { agentId, serviceId, slotDatetime, customerPhone, customerName? }
 * Returns: { bookingId, confirmedAt, serviceName, datetime }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { createBooking } from '@/app/lib/booking'
import { findOrCreateContact } from '@/app/lib/contacts'
import { prisma } from '@/app/lib/prisma'

export async function POST(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agentId, serviceId, slotDatetime, customerPhone, customerName } = body

  if (!agentId || !serviceId || !slotDatetime || !customerPhone) {
    return NextResponse.json(
      { error: 'agentId, serviceId, slotDatetime, customerPhone required' },
      { status: 400 },
    )
  }

  const datetime = new Date(slotDatetime)
  if (isNaN(datetime.getTime())) {
    return NextResponse.json({ error: 'Invalid slotDatetime — must be ISO 8601' }, { status: 400 })
  }

  try {
    // Resolve agent to get userId (required for contact scoping)
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { id: true, userId: true } })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Resolve phone → Contact DB record (createBooking requires contactId)
    const contact = await findOrCreateContact(agent, customerPhone, customerName)

    const booking = await createBooking({
      agentId,
      serviceId,
      contactId: contact.id,
      datetime,
    })

    // Load service name for the confirmation message
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { name: true },
    })

    return NextResponse.json({
      bookingId: booking.id,
      confirmedAt: new Date().toISOString(),
      serviceName: service?.name || 'Appointment',
      datetime: datetime.toISOString(),
    })
  } catch (err) {
    console.error('[internal/booking] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
