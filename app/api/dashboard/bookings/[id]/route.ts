/**
 * Dashboard App — Single Booking operations (Agent.config.bookings)
 * PATCH  ?token=... — update status/notes
 * DELETE ?token=... — delete booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

async function getBookingsConfig(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
  const cfg   = (agent?.config as Record<string, any>) || {}
  return { cfg, bookings: (cfg.bookings || []) as any[] }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const { cfg, bookings } = await getBookingsConfig(agentId)
    const idx = bookings.findIndex((b: any) => b.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = ['status', 'notes', 'datetime', 'contactName', 'contactPhone', 'serviceName', 'price']
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    bookings[idx] = { ...bookings[idx], ...patch }

    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, bookings } } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/bookings PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { cfg, bookings } = await getBookingsConfig(agentId)
    const filtered = bookings.filter((b: any) => b.id !== id)
    if (filtered.length === bookings.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, bookings: filtered } } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/bookings DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
