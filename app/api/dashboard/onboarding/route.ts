/**
 * Dashboard App — Onboarding Wizard
 * GET  ?token=...  — check if already completed, return saved progress
 * POST ?token=...  — save completed onboarding data
 *
 * Hours stored as Agent.config.hours (no separate BusinessHours model in this DB)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const agent = await prisma.agent.findUnique({
      where:  { id: agentId },
      select: { name: true, config: true, onboardingStatus: true },
    })

    const cfg = (agent?.config as Record<string, any>) || {}

    return NextResponse.json({
      completed: agent?.onboardingStatus === 'completed',
      biz: {
        name:        agent?.name || '',
        description: cfg.description || '',
        website:     cfg.website     || '',
        email:       cfg.email       || '',
        address:     cfg.address     || '',
      },
      hours: cfg.hours || {},
    })
  } catch (err) {
    console.error('[dashboard/onboarding GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { biz, hours, agent: agentCfg, wa } = await req.json()

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}

    // Build hours object from the submitted hours map
    const hoursConfig: Record<string, any> = {}
    if (hours && typeof hours === 'object') {
      for (const [day, value] of Object.entries(hours)) {
        hoursConfig[day] = value
      }
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        name:             biz?.name || undefined,
        tone:             agentCfg?.tone || undefined,
        onboardingStatus: 'completed',
        config: {
          ...cfg,
          description:  biz?.description,
          website:      biz?.website,
          email:        biz?.email,
          address:      biz?.address,
          agentName:    agentCfg?.name,
          language:     agentCfg?.language,
          greeting:     agentCfg?.greeting,
          capabilities: agentCfg?.capabilities,
          hours:        Object.keys(hoursConfig).length > 0 ? hoursConfig : cfg.hours,
          whatsapp:     wa ? { phoneNumberId: wa.phoneId, token: wa.token, verifyToken: wa.verifyToken } : cfg.whatsapp,
        },
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/onboarding POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
