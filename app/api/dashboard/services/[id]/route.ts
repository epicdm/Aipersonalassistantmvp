/**
 * Dashboard App — Single Service (Agent.config.services)
 * PATCH  ?token=... — update
 * DELETE ?token=... — delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

async function getServicesConfig(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
  const cfg   = (agent?.config as Record<string, any>) || {}
  return { cfg, services: (cfg.services || []) as any[] }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const { cfg, services } = await getServicesConfig(agentId)
    const idx = services.findIndex((s: any) => s.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const ALLOWED = ['name', 'description', 'price', 'duration', 'icon', 'location', 'active']
    const patch   = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    if (patch.price    !== undefined) patch.price    = parseFloat(patch.price as string)
    if (patch.duration !== undefined) patch.duration = parseInt(patch.duration as string, 10)

    services[idx] = { ...services[idx], ...patch }
    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, services } } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/services PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { cfg, services } = await getServicesConfig(agentId)
    const filtered = services.filter((s: any) => s.id !== id)
    if (filtered.length === services.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, services: filtered } } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/services DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
