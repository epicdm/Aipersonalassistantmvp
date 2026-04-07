/**
 * Dashboard App — Single Template
 * PATCH  ?token=... — update
 * DELETE ?token=... — delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

async function getTemplates(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
  const cfg   = (agent?.config as Record<string, any>) || {}
  return { cfg, templates: (cfg.templates || []) as any[] }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { cfg, templates } = await getTemplates(agentId)
    const idx = templates.findIndex((t: any) => t.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    templates[idx] = { ...templates[idx], ...body, id }

    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, templates } } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/templates PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { cfg, templates } = await getTemplates(agentId)
    const filtered = templates.filter((t: any) => t.id !== id)
    if (filtered.length === templates.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, templates: filtered } } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/templates DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
