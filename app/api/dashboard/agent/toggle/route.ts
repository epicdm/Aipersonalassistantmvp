/**
 * Dashboard App — Agent toggle (pause / resume)
 * POST ?token=...  body: { active: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { active } = await req.json()
    const status = active ? 'active' : 'paused'
    await prisma.agent.update({ where: { id: agentId }, data: { status } })
    return NextResponse.json({ ok: true, status })
  } catch (err) {
    console.error('[dashboard/agent/toggle POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
