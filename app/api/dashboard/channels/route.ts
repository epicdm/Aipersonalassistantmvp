/**
 * Dashboard App — Channel Configuration
 * GET ?token=...              — load all channel configs
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const agent = await prisma.agent.findUnique({
      where:  { id: agentId },
      select: { config: true, whatsappNumber: true, phoneNumber: true },
    })

    const cfg = (agent?.config as Record<string, any>) || {}

    // Check connectivity (non-throwing)
    const waConnected = !!(cfg.whatsapp?.phoneNumberId && cfg.whatsapp?.token)
    const stripeConnected = !!(cfg.stripe?.pk && cfg.stripe?.sk)
    const magnusConnected = !!(cfg.magnus?.apiKey)
    const voiceConnected  = !!(agent?.phoneNumber || cfg.voice?.did)

    return NextResponse.json({
      whatsapp: {
        connected:     waConnected,
        phoneNumberId: cfg.whatsapp?.phoneNumberId || '',
        wabaId:        cfg.whatsapp?.wabaId        || '',
        // Never expose the token value — just indicate if set
        token:         cfg.whatsapp?.token ? '••••••••' : '',
        verifyToken:   cfg.whatsapp?.verifyToken || '',
      },
      voice: {
        connected: voiceConnected,
        did:       agent?.phoneNumber || cfg.voice?.did || '',
        room:      cfg.voice?.room || '',
      },
      stripe: {
        connected:     stripeConnected,
        pk:            cfg.stripe?.pk ? cfg.stripe.pk : '',
        sk:            cfg.stripe?.sk ? '••••••••' : '',
        webhookSecret: cfg.stripe?.webhookSecret ? '••••••••' : '',
      },
      magnus: {
        connected:  magnusConnected,
        apiKey:     cfg.magnus?.apiKey ? '••••••••' : '',
        apiSecret:  cfg.magnus?.apiSecret ? '••••••••' : '',
      },
    })
  } catch (err) {
    console.error('[dashboard/channels GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
