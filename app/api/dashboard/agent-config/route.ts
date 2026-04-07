/**
 * Dashboard App — Agent Config Read/Write
 * /api/dashboard/agent-config
 *
 * Auth: ?token={dashboard_token}
 * Called from Agent Config Dashboard App iframe.
 *
 * GET   ?token=...  — read agent name, tone, template, enabled tools
 * PATCH ?token=...  body: { name?, tone?, template?, tools? }  — update settings
 *
 * Allowed PATCH fields (whitelist — all others rejected):
 *   name:     string — agent display name
 *   tone:     string — personality ("professional" | "casual" | "formal" | custom text)
 *   template: string — system prompt template key
 *   tools:    Record<string, boolean> — tool enable/disable map
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

const ALL_TOOL_KEYS = [
  'catalog_browse',
  'catalog_search',
  'create_payment_link',
  'get_booking_slots',
  'create_booking',
  'get_business_hours',
  'send_product_card',
  'send_media',
  'send_location',
  'send_template',
  'lookup_contact',
  'get_order_status',
  'send_feedback_request',
  'qualify_lead',
]

// Human-readable labels for the Dashboard App UI
export const TOOL_LABELS: Record<string, { label: string; description: string; optIn?: boolean }> = {
  catalog_browse:       { label: 'Browse Products',   description: 'Show product catalog to customers' },
  catalog_search:       { label: 'Search Products',   description: 'Find specific products by name' },
  create_payment_link:  { label: 'Accept Payments',   description: 'Send Stripe checkout links' },
  get_booking_slots:    { label: 'Show Availability', description: 'Display appointment time slots' },
  create_booking:       { label: 'Book Appointments', description: 'Confirm bookings for customers' },
  get_business_hours:   { label: 'Show Hours',        description: "Answer 'when are you open?' questions" },
  send_product_card:    { label: 'Product Cards',     description: 'Send rich product cards with buy button' },
  send_media:           { label: 'Send Files',        description: 'Share images, documents, videos' },
  send_location:        { label: 'Share Location',    description: 'Send business location on a map' },
  send_template:        { label: 'Send Templates',    description: 'Send approved WhatsApp message templates' },
  lookup_contact:       { label: 'Customer History',  description: 'Look up returning customer profiles' },
  get_order_status:     { label: 'Order Status',      description: 'Show recent orders and bookings' },
  send_feedback_request:{ label: 'Ask for Reviews',   description: 'Request ratings after service', optIn: true },
  qualify_lead:         { label: 'Tag Leads',         description: 'Update customer pipeline stage', optIn: true },
}

// ── GET — read agent config ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, tone: true, template: true, config: true },
    })

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const config = (agent.config as Record<string, unknown>) || {}
    const toolMap = config.tools as Record<string, boolean> | undefined

    // Build tools array with labels and enabled state
    const tools = ALL_TOOL_KEYS.map(key => ({
      key,
      ...TOOL_LABELS[key],
      enabled: toolMap ? (toolMap[key] ?? !TOOL_LABELS[key].optIn) : !TOOL_LABELS[key].optIn,
    }))

    return NextResponse.json({
      id:       agent.id,
      name:     agent.name,
      tone:     agent.tone || 'professional',
      template: agent.template,
      tools,
    })
  } catch (err) {
    console.error('[dashboard/agent-config GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH — update agent config ───────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Whitelist check — reject any non-allowed top-level keys
  const ALLOWED_KEYS = ['name', 'tone', 'template', 'tools'] as const
  const unknownKeys = Object.keys(body).filter(k => !ALLOWED_KEYS.includes(k as any))
  if (unknownKeys.length > 0) {
    return NextResponse.json({ error: `Unknown fields: ${unknownKeys.join(', ')}` }, { status: 400 })
  }

  const { name, tone, template, tools } = body

  // Validate allowed values
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
  }
  if (tools !== undefined) {
    if (typeof tools !== 'object' || Array.isArray(tools)) {
      return NextResponse.json({ error: 'tools must be an object' }, { status: 400 })
    }
    // Validate tool keys
    const invalidKeys = Object.keys(tools).filter(k => !ALL_TOOL_KEYS.includes(k))
    if (invalidKeys.length > 0) {
      return NextResponse.json({ error: `Unknown tool keys: ${invalidKeys.join(', ')}` }, { status: 400 })
    }
  }

  try {
    const existing = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const agentUpdate: Record<string, unknown> = {}
    if (name     !== undefined) agentUpdate.name     = name.trim()
    if (tone     !== undefined) agentUpdate.tone     = tone.trim()
    if (template !== undefined) agentUpdate.template = template.trim()

    // Merge tools into existing config.tools
    if (tools !== undefined) {
      const existingConfig = (existing.config as Record<string, unknown>) || {}
      const existingTools  = (existingConfig.tools as Record<string, boolean>) || {}
      agentUpdate.config   = { ...existingConfig, tools: { ...existingTools, ...tools } }
    }

    if (Object.keys(agentUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: agentUpdate,
      select: { id: true, name: true, tone: true, template: true, config: true },
    })

    return NextResponse.json({ agent: updated })
  } catch (err) {
    console.error('[dashboard/agent-config PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
