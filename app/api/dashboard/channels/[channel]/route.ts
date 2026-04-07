/**
 * Dashboard App — Save channel config
 * PUT ?token=...  /channels/:channel  — save whatsapp|voice|stripe|magnus
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

const ALLOWED_CHANNELS = ['whatsapp', 'voice', 'stripe', 'magnus']

export async function PUT(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channel } = await params
  if (!ALLOWED_CHANNELS.includes(channel))
    return NextResponse.json({ error: 'Unknown channel' }, { status: 400 })

  try {
    const body  = await req.json()
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}

    // Strip placeholder values before saving
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string' && v.includes('••••')) continue // don't overwrite masked values
      clean[k] = v as string
    }

    await prisma.agent.update({
      where: { id: agentId },
      data:  { config: { ...cfg, [channel]: { ...((cfg[channel] as any) || {}), ...clean } } },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/channels PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
