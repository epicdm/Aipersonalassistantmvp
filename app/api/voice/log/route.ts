/**
 * POST /api/voice/log
 * Internal - logs completed voice calls to DB and notifies user via WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'bff-internal-2026'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { agentId, callerPhone, duration, startTime } = await req.json()

  const prisma = getPrisma()

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { user: true },
  })

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  // Log as agent activity
  await prisma.agentActivity.create({
    data: {
      agentId,
      type: 'voice_call',
      summary: `Voice call from ${callerPhone} — ${duration}s`,
      metadata: {
        callerPhone,
        duration,
        startTime,
        channel: 'whatsapp_calling',
      },
    },
  })

  // Notify the agent owner via WhatsApp if they have a number
  if (agent.user && agent.whatsappPhone) {
    const mins = Math.floor(duration / 60)
    const secs = duration % 60
    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    
    await sendWhatsAppMessage(
      agent.whatsappPhone,
      `📞 *Call summary*\n\nYour agent *${agent.name}* just handled a call!\n\n` +
      `• From: +${callerPhone}\n` +
      `• Duration: ${durationStr}\n\n` +
      `_Check your dashboard for the full transcript._`
    )
  }

  return NextResponse.json({ ok: true })
}
