/**
 * POST /api/internal/template
 * Send an approved WhatsApp HSM template message.
 * Used for: explicit agent template sends (confirmations, reminders)
 * AND the Bug #3 auto-fallback from sendReply() when Meta returns 131047.
 * Auth: x-internal-secret header.
 *
 * Body: { agentId, customerPhone, templateName, variables?: string[] }
 * Response: { sent: true, templateName }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'
import { findOrCreateContact } from '@/app/lib/contacts'
import { sendTemplate, TemplateVariable } from '@/app/lib/whatsapp-templates'

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

  const { agentId, customerPhone, templateName, variables } = body

  if (!agentId || !customerPhone || !templateName) {
    return NextResponse.json({ error: 'agentId, customerPhone, templateName required' }, { status: 400 })
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId as string },
      select: { id: true, userId: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Resolve contact (creates if not exists — needed for CRM tracking)
    await findOrCreateContact(agent, customerPhone as string)

    // Map string[] → TemplateVariable[]
    const templateVars: TemplateVariable[] = ((variables as string[]) || []).map(
      (s: string): TemplateVariable => ({ type: 'text', text: s })
    )

    await sendTemplate(
      customerPhone as string,
      templateName as string,
      'en_US',
      templateVars.length ? templateVars : undefined
    )

    return NextResponse.json({ sent: true, templateName })
  } catch (err) {
    console.error('[internal/template] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
