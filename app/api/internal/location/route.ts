/**
 * GET /api/internal/location?agentId=X&phone=Y
 * Send the business location pin via WhatsApp.
 * Auth: x-internal-secret header.
 *
 * If agent.config.location is not set, returns 200 with error field (not 422)
 * so agent-server.js can detect and fall back to text address.
 *
 * Response (success): { sent: true }
 * Response (no location): { error: 'location_not_configured', address: string | null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'
import { sendLocationMessage } from '@/app/lib/whatsapp'

export async function GET(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  const phone = searchParams.get('phone')

  if (!agentId || !phone) {
    return NextResponse.json({ error: 'agentId and phone required' }, { status: 400 })
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
    const location = config.location as { latitude: number; longitude: number; name: string; address: string } | undefined

    if (!location?.latitude || !location?.longitude) {
      return NextResponse.json({
        error: 'location_not_configured',
        address: (config.address as string) || null,
      })
    }

    await sendLocationMessage(
      phone,
      location.latitude,
      location.longitude,
      location.name || 'Our Location',
      location.address || ''
    )

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[internal/location] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
