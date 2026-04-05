/**
 * POST /api/internal/contacts/qualify
 * Update a contact's CRM stage, tags, and/or notes.
 * Auth: x-internal-secret header.
 *
 * Body: { agentId, customerPhone, stage, tags?: string[], notes?: string }
 * Response: { updated: true, contactId, stage }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'
import { findOrCreateContact } from '@/app/lib/contacts'

const VALID_STAGES = ['new', 'qualified', 'hot', 'customer', 'churned'] as const

export async function POST(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agentId, customerPhone, stage, tags, notes } = body

  if (!agentId || !customerPhone || !stage) {
    return NextResponse.json({ error: 'agentId, customerPhone, stage required' }, { status: 400 })
  }

  if (!VALID_STAGES.includes(stage as typeof VALID_STAGES[number])) {
    return NextResponse.json({ error: `stage must be one of: ${VALID_STAGES.join(', ')}` }, { status: 400 })
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId as string },
      select: { id: true, userId: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Resolve or create contact
    const contact = await findOrCreateContact(agent, customerPhone as string)

    // Update Contact model (stage + tags live on Contact, not AgentContact)
    const updateData: Record<string, unknown> = { stage }
    if (Array.isArray(tags)) updateData.tags = tags
    if (typeof notes === 'string') updateData.ownerNotes = notes

    await prisma.contact.update({
      where: { id: contact.id },
      data: updateData,
    })

    return NextResponse.json({ updated: true, contactId: contact.id, stage })
  } catch (err) {
    console.error('[internal/contacts/qualify] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
