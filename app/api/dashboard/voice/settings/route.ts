/**
 * Dashboard App — Voice settings
 * PATCH ?token=...  body: { answerAll, voicemail, smsSummary, forwardHuman, forwardNumber }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

const ALLOWED = ['answerAll', 'voicemail', 'smsSummary', 'forwardHuman', 'forwardNumber']

export async function PATCH(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body  = await req.json()
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}

    await prisma.agent.update({
      where: { id: agentId },
      data:  { config: { ...cfg, voiceSettings: { ...(cfg.voiceSettings || {}), ...patch } } },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/voice/settings PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
