/**
 * POST /api/internal/feedback
 * Send a feedback/rating request to a customer via WhatsApp.
 * Auth: x-internal-secret header.
 *
 * Body: { agentId, customerPhone }
 * Response: { sent: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'
import { sendWhatsAppMessage } from '@/app/lib/whatsapp'

const FEEDBACK_MESSAGE = `How would you rate your experience today?

1️⃣ Poor
2️⃣ Fair
3️⃣ Good
4️⃣ Very Good
5️⃣ Excellent

Reply with a number (1–5). Your feedback helps us improve!`

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

  const { agentId, customerPhone } = body

  if (!agentId || !customerPhone) {
    return NextResponse.json({ error: 'agentId and customerPhone required' }, { status: 400 })
  }

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId as string },
      select: { id: true },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    await sendWhatsAppMessage(customerPhone as string, FEEDBACK_MESSAGE)

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[internal/feedback] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
