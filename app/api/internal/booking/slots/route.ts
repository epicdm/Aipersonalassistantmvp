/**
 * GET /api/internal/booking/slots
 * Internal endpoint — returns available slots for a service, or service list if no serviceId.
 * Auth: x-internal-secret header.
 *
 * Query params:
 *   agentId    — required
 *   serviceId  — optional; omit to get services list first
 *   daysAhead  — optional, default 5
 *
 * Returns: { slots, services }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { getAvailableSlots, getServices } from '@/app/lib/booking'

export async function GET(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  const serviceId = searchParams.get('serviceId') || undefined
  const daysAhead = parseInt(searchParams.get('daysAhead') || '5', 10)

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  try {
    const services = await getServices(agentId)

    if (!serviceId) {
      // No service selected — return services list for agent to prompt the customer
      return NextResponse.json({
        slots: [],
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
        })),
      })
    }

    const rawSlots = await getAvailableSlots(agentId, serviceId, daysAhead)
    return NextResponse.json({
      slots: rawSlots.map(s => ({
        id: s.id,
        datetime: s.datetime.toISOString(),
        label: s.label,
      })),
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        price: s.price,
      })),
    })
  } catch (err) {
    console.error('[internal/booking/slots] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
