/**
 * Dashboard App — Message Templates CRUD
 * GET    ?token=...       — list templates
 * POST   ?token=...       — create template
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

// Templates are stored in Agent.config.templates as an array
// (no dedicated Prisma model — they're agent-level config)

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}
    const templates: any[] = cfg.templates || getDefaultTemplates()
    return NextResponse.json({ templates })
  } catch (err) {
    console.error('[dashboard/templates GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, category, body, active } = await req.json()
    if (!name || !body) return NextResponse.json({ error: 'name and body required' }, { status: 400 })

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}
    const templates: any[] = cfg.templates || []

    const newTemplate = {
      id:       `tmpl_${Date.now()}`,
      name,
      category: category || 'custom',
      body,
      active:   active !== false,
    }
    templates.push(newTemplate)

    await prisma.agent.update({
      where: { id: agentId },
      data:  { config: { ...cfg, templates } },
    })

    return NextResponse.json({ template: newTemplate }, { status: 201 })
  } catch (err) {
    console.error('[dashboard/templates POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDefaultTemplates() {
  return [
    { id: 'tmpl_welcome',  name: 'Welcome',       category: 'greeting',  body: 'Hi {{name}} 👋 Welcome to EPIC Communications! How can I help you today?', active: true },
    { id: 'tmpl_hours',    name: 'Business Hours', category: 'hours',     body: 'Our business hours are Mon–Fri 8am–5pm. We\'re closed on weekends. How can we help?', active: true },
    { id: 'tmpl_payment',  name: 'Payment Link',   category: 'payment',   body: 'Hi {{name}}, here\'s your payment link for ${{amount}}: {{link}} — Valid for 24 hours.', active: true },
    { id: 'tmpl_booking',  name: 'Booking Confirm', category: 'booking',  body: 'Hi {{name}} ✅ Your appointment is confirmed for {{date}}. Reply CANCEL if needed.', active: true },
    { id: 'tmpl_followup', name: 'Follow-Up',       category: 'followup', body: 'Hi {{name}}, just checking in — how is everything going? Any questions for us?', active: true },
  ]
}
