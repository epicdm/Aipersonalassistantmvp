/**
 * Dashboard App — Services CRUD
 * Services stored as JSON array in Agent.config.services
 * GET    ?token=...  — list services
 * POST   ?token=...  — create service
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

async function getServicesConfig(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
  const cfg   = (agent?.config as Record<string, any>) || {}
  return { cfg, services: (cfg.services || []) as any[] }
}

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { services } = await getServicesConfig(agentId)
    return NextResponse.json({ services })
  } catch (err) {
    console.error('[dashboard/services GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, description, price, duration, icon, location, active } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const { cfg, services } = await getServicesConfig(agentId)
    const service = {
      id:          randomUUID(),
      name,
      description: description || null,
      price:       price    ? parseFloat(price)    : null,
      duration:    duration ? parseInt(duration, 10) : null,
      icon:        icon     || '🔧',
      location:    location || 'on-site',
      active:      active !== false,
      createdAt:   new Date().toISOString(),
    }
    services.push(service)

    await prisma.agent.update({ where: { id: agentId }, data: { config: { ...cfg, services } } })
    return NextResponse.json({ service: { id: service.id } }, { status: 201 })
  } catch (err) {
    console.error('[dashboard/services POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
