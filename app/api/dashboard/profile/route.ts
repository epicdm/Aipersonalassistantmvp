/**
 * Dashboard App — Business Profile
 * GET ?token=...  — load profile
 * PUT ?token=...  — save profile
 *
 * Hours stored in Agent.config.hours (no separate BusinessHours model)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const agent = await prisma.agent.findUnique({
      where:  { id: agentId },
      select: { name: true, config: true, whatsappNumber: true, phoneNumber: true },
    })

    const cfg = (agent?.config as Record<string, any>) || {}

    // Populate hours from config (default all closed)
    const storedHours = cfg.hours || {}
    const hours: Record<string, string> = {}
    DAYS.forEach(day => { hours[day] = storedHours[day] || 'closed' })

    return NextResponse.json({
      profile: {
        name:        agent?.name || '',
        phone:       agent?.whatsappNumber || agent?.phoneNumber || '',
        description: cfg.description || '',
        website:     cfg.website     || '',
        email:       cfg.email       || '',
        address:     cfg.address     || '',
        category:    cfg.category    || 'Internet Service Provider',
        facebook:    cfg.facebook    || '',
        instagram:   cfg.instagram   || '',
        logo:        cfg.logoUrl     || null,
        hours,
      },
    })
  } catch (err) {
    console.error('[dashboard/profile GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, hours, ...rest } = body

    const agent   = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const existing = (agent?.config as Record<string, any>) || {}

    // Allowed config keys
    const cfgPatch: Record<string, any> = {}
    const ALLOWED_CFG = ['description','website','email','address','category','facebook','instagram','logoUrl']
    ALLOWED_CFG.forEach(k => { if (rest[k] !== undefined) cfgPatch[k] = rest[k] })

    // Merge hours into config
    if (hours && typeof hours === 'object') {
      cfgPatch.hours = { ...(existing.hours || {}), ...hours }
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(name ? { name } : {}),
        config: { ...existing, ...cfgPatch },
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[dashboard/profile PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
