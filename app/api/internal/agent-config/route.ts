/**
 * GET /api/internal/agent-config?agentId=X
 * Returns enabled tool list and agent config for the isola-tenant container.
 * Auth: x-internal-secret header.
 *
 * Response: { enabledTools: string[], timezone: string, currency: string }
 * If agent.config.tools is null/empty, returns all core tools enabled (backward compat).
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'

const ALL_CORE_TOOLS = [
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
]

export async function GET(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { config: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const config = (agent.config as Record<string, unknown>) || {}
    const toolMap = config.tools as Record<string, boolean> | undefined

    let enabledTools: string[]
    if (!toolMap || Object.keys(toolMap).length === 0) {
      // No tool config — enable all core tools (backward compatible)
      enabledTools = ALL_CORE_TOOLS
    } else {
      enabledTools = Object.entries(toolMap)
        .filter(([, enabled]) => enabled === true)
        .map(([name]) => name)
    }

    return NextResponse.json({
      enabledTools,
      timezone: (config.timezone as string) || 'America/Dominica',
      currency: (config.currency as string) || 'xcd',
    })
  } catch (err) {
    console.error('[internal/agent-config] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
