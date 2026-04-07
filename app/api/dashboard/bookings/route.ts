/**
 * Dashboard App — Bookings CRUD
 * Bookings stored as JSON array in Agent.config.bookings
 * GET    ?token=...&status=upcoming|past|all  — list
 * POST   ?token=...                           — create
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function getBookingsConfig(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
  const cfg   = (agent?.config as Record<string, any>) || {}
  return { cfg, bookings: (cfg.bookings || []) as any[] }
}

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'

  try {
    const { bookings } = await getBookingsConfig(agentId)
    const now = Date.now()

    const filtered = bookings
      .filter((b: any) => {
        if (status === 'all') return true
        const dt = b.datetime ? new Date(b.datetime).getTime() : 0
        if (status === 'upcoming') return dt >= now && b.status !== 'cancelled'
        if (status === 'past')     return dt < now || b.status === 'completed'
        return true
      })
      .sort((a: any, b: any) => {
        const ad = a.datetime ? new Date(a.datetime).getTime() : 0
        const bd = b.datetime ? new Date(b.datetime).getTime() : 0
        return ad - bd
      })
      .map((b: any) => {
        const dt = b.datetime ? new Date(b.datetime) : null
        return {
          id:          b.id,
          contactName: b.contactName || 'Unknown',
          phone:       b.contactPhone || '',
          service:     b.serviceName || 'Appointment',
          date:        dt ? dt.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) : '',
          dateShort:   dt ? dt.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
          time:        dt ? dt.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }) : '',
          status:      b.status || 'confirmed',
          amount:      b.price ? `$${b.price}` : null,
          notes:       b.notes || null,
          source:      'Dashboard',
        }
      })

    return NextResponse.json({ bookings: filtered })
  } catch (err) {
    console.error('[dashboard/bookings GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { contactName, phone, service: serviceName, date, time, notes, price, status = 'confirmed' } = await req.json()

    const { cfg, bookings } = await getBookingsConfig(agentId)

    const datetime = date && time ? new Date(`${date}T${time}`).toISOString()
      : date ? new Date(date).toISOString() : null

    const booking = {
      id:           randomUUID(),
      contactName:  contactName || '',
      contactPhone: phone || '',
      serviceName:  serviceName || 'Appointment',
      datetime,
      notes:        notes || '',
      price:        price || null,
      status,
      createdAt:    new Date().toISOString(),
      source:       'Dashboard',
    }
    bookings.push(booking)

    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, bookings } } })
    return NextResponse.json({ booking: { id: booking.id } }, { status: 201 })
  } catch (err) {
    console.error('[dashboard/bookings POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
