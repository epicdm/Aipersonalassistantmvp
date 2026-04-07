/**
 * Dashboard App — Broadcasts
 * GET  ?token=...  — list recent broadcasts
 * POST ?token=...  — send a broadcast
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const campaigns = await prisma.campaign.findMany({
      where:   { agentId },
      orderBy: { createdAt: 'desc' },
      take:    30,
      include: { CampaignEnrollment: { select: { status: true } } },
    })

    const broadcasts = campaigns.map(c => {
      const delivered = c.CampaignEnrollment.filter(e => e.status === 'completed').length
      const replied   = c.CampaignEnrollment.filter(e => e.status === 'replied').length
      return {
        id:        c.id,
        label:     c.name || 'Broadcast',
        audience:  `${c.CampaignEnrollment.length} contacts`,
        date:      c.createdAt ? new Date(c.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
        delivered,
        replied,
      }
    })

    return NextResponse.json({ broadcasts })
  } catch (err) {
    console.error('[dashboard/broadcasts GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { message, audience = ['all'], schedule } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

    // Get agent userId (required for Campaign)
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { userId: true, name: true } })
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    // If scheduled for later, store as campaign and return
    if (schedule) {
      const campaign = await prisma.campaign.create({
        data: {
          id:            randomUUID(),
          userId:        agent.userId,
          agentId,
          name:          `Broadcast ${new Date().toLocaleDateString()}`,
          type:          'broadcast',
          goal:          'outreach',
          status:        'scheduled',
          audienceFilter: { schedule, audience, message },
          updatedAt:     new Date(),
        },
      })
      return NextResponse.json({ ok: true, count: 0, scheduled: true, campaignId: campaign.id })
    }

    // Build contact filter via AgentContact
    const now7d = new Date(Date.now() - 7 * 86400000)
    const agentContacts = await prisma.agentContact.findMany({
      where: {
        agentId,
        ...(audience.includes('active')   ? { lastContactAt: { gte: now7d } }  : {}),
        ...(audience.includes('inactive') ? { lastContactAt: { lt:  now7d } }  : {}),
      },
      include: { contact: { select: { id: true, name: true, phone: true } } },
      take: 500,
    })
    const contacts = agentContacts.map(ac => ac.contact)

    // Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        id:            randomUUID(),
        userId:        agent.userId,
        agentId,
        name:          `Broadcast ${new Date().toLocaleDateString()}`,
        type:          'broadcast',
        goal:          'outreach',
        status:        'active',
        audienceFilter: { audience },
        updatedAt:     new Date(),
      },
    })

    let sent = 0
    for (const contact of contacts) {
      if (!contact.phone) continue
      const personalised = message.replace(/\{\{name\}\}/g, contact.name || contact.phone)
      try {
        await sendWhatsAppMessage(contact.phone, personalised, agentId)
        await prisma.campaignEnrollment.create({
          data: {
            id:         randomUUID(),
            campaignId: campaign.id,
            contactId:  contact.id,
            status:     'completed',
            enrolledAt: new Date(),
          },
        }).catch(() => null)
        sent++
      } catch { /* skip bad numbers */ }
    }

    return NextResponse.json({ ok: true, count: sent })
  } catch (err) {
    console.error('[dashboard/broadcasts POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
