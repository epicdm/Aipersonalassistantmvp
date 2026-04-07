/**
 * Dashboard App — Request feedback from recent contacts
 * POST ?token=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)

    // Get contacts recently active for this agent via AgentContact
    const agentContacts = await prisma.agentContact.findMany({
      where:   { agentId, lastContactAt: { gte: since } },
      take:    50,
      include: { contact: { select: { name: true, phone: true } } },
    })

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } })
    let sent = 0

    for (const ac of agentContacts) {
      const contact = ac.contact
      if (!contact.phone) continue
      try {
        await sendWhatsAppMessage(
          contact.phone,
          `Hi ${contact.name || 'there'} 😊 How did we do? Reply with a number from 1-5 (5 = excellent) to rate your experience with ${agent?.name || 'us'}. Your feedback helps us improve!`,
          agentId
        )
        sent++
      } catch { /* skip */ }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('[dashboard/feedback/request POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
