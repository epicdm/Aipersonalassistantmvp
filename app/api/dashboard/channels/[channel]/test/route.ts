/**
 * Dashboard App — Test channel connectivity
 * POST ?token=...  /channels/:channel/test
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channel } = await params

  try {
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>)?.[channel] || {}

    if (channel === 'whatsapp') {
      if (!cfg.phoneNumberId || !cfg.token)
        return NextResponse.json({ ok: false, error: 'Missing credentials' })
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${cfg.phoneNumberId}?access_token=${cfg.token}`
      )
      const ok = res.ok
      return NextResponse.json({ ok, error: ok ? null : 'Invalid token or phone number ID' })
    }

    if (channel === 'stripe') {
      if (!cfg.sk) return NextResponse.json({ ok: false, error: 'Missing secret key' })
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${cfg.sk}` },
      })
      return NextResponse.json({ ok: res.ok, error: res.ok ? null : 'Invalid Stripe key' })
    }

    return NextResponse.json({ ok: true, note: 'Manual test required for this channel' })
  } catch (err) {
    console.error('[dashboard/channels/test POST]', err)
    return NextResponse.json({ ok: false, error: 'Test failed' })
  }
}
