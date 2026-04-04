/**
 * POST /api/templates/[id]/send
 * Send an approved template to a contact or list of contacts.
 * Checks 24h window: inside → direct message, outside → template message.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/app/lib/prisma'
import { sendTemplate, isWithin24hWindow } from '@/app/lib/whatsapp-templates'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: templateName } = await params
  const body = await req.json()
  const { agentId, contactIds, language = 'en_US', variables, directMessage } = body

  if (!agentId || !contactIds?.length) {
    return NextResponse.json({ error: 'agentId and contactIds required' }, { status: 400 })
  }

  // Verify agent belongs to user
  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const results: { contactId: string; phone: string; method: string; success: boolean; error?: string }[] = []

  for (const contactId of contactIds) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact?.phone) {
      results.push({ contactId, phone: '', method: 'skip', success: false, error: 'No phone number' })
      continue
    }

    try {
      const inWindow = await isWithin24hWindow(agentId, contactId)

      if (inWindow && directMessage) {
        // Inside 24h window — send direct message (cheaper, more flexible)
        await sendWhatsAppMessage(contact.phone, directMessage)
        results.push({ contactId, phone: contact.phone, method: 'direct', success: true })
      } else {
        // Outside 24h window or no direct message — use template
        await sendTemplate(contact.phone, templateName, language, variables)
        results.push({ contactId, phone: contact.phone, method: 'template', success: true })
      }
    } catch (error: any) {
      results.push({ contactId, phone: contact.phone, method: 'template', success: false, error: error.message })
    }
  }

  const sent = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return NextResponse.json({ sent, failed, results })
}
