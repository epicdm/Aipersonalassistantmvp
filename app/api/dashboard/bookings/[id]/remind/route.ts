/**
 * Dashboard App — Send booking reminder via WhatsApp
 * POST ?token=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true, config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}
    const bookings: any[] = cfg.bookings || []
    const booking = bookings.find((b: any) => b.id === id)
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const phone = booking.contactPhone
    if (!phone) return NextResponse.json({ error: 'No phone number for booking' }, { status: 400 })

    const dt = booking.datetime ? new Date(booking.datetime) : null
    const dateStr = dt
      ? dt.toLocaleString('en', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'your upcoming appointment'

    const msg = `Hi ${booking.contactName || 'there'} 👋 This is a reminder for your *${booking.serviceName || 'appointment'}* on *${dateStr}*. Reply CONFIRM to confirm or CANCEL to cancel. — ${agent?.name || 'Your team'}`

    await sendWhatsAppMessage(phone, msg, agentId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/bookings/remind POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
