/**
 * Dashboard App — Analytics
 * GET ?token=...&period=7d|30d|90d
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '7d'
  const days   = period === '90d' ? 90 : period === '30d' ? 30 : 7

  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const prevSince = new Date(since)
  prevSince.setDate(prevSince.getDate() - days)

  try {
    const [convos, prevConvos, messages, prevMessages, newContacts, prevContacts, calls, prevCalls] =
      await Promise.all([
        prisma.conversation.count({ where: { agentId, createdAt: { gte: since } } }),
        prisma.conversation.count({ where: { agentId, createdAt: { gte: prevSince, lt: since } } }),
        prisma.whatsAppMessage.count({ where: { agentId, timestamp: { gte: since } } }),
        prisma.whatsAppMessage.count({ where: { agentId, timestamp: { gte: prevSince, lt: since } } }),
        prisma.agentContact.count({ where: { agentId, firstContactAt: { gte: since } } }),
        prisma.agentContact.count({ where: { agentId, firstContactAt: { gte: prevSince, lt: since } } }),
        prisma.callLog.count({ where: { agentId, createdAt: { gte: since } } }),
        prisma.callLog.count({ where: { agentId, createdAt: { gte: prevSince, lt: since } } }),
      ])

    // Build daily bar chart from conversations
    const convoRows = await prisma.conversation.findMany({
      where: { agentId, createdAt: { gte: since } },
      select: { createdAt: true },
    })

    const dailyMap: Record<string, number> = {}
    convoRows.forEach(c => {
      const key = new Date(c.createdAt).toISOString().slice(0, 10)
      dailyMap[key] = (dailyMap[key] ?? 0) + 1
    })

    const buckets = Math.min(days, 14)
    const dailyConvos = Array.from({ length: buckets }, (_, i) => {
      const d = new Date(since)
      d.setDate(d.getDate() + Math.floor(i * (days / buckets)))
      const key = d.toISOString().slice(0, 10)
      return { label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), v: dailyMap[key] ?? 0 }
    })

    // Products from Agent.config
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}
    const products: any[] = cfg.services || cfg.products || []
    const topProducts = products.slice(0, 5).map((p: any) => ({
      name:    p.name || 'Service',
      revenue: p.price ? `$${p.price}` : '—',
    }))

    return NextResponse.json({
      convos,
      convosDelta:      pctDelta(convos, prevConvos),
      messages,
      messagesDelta:    pctDelta(messages, prevMessages),
      contacts:         newContacts,
      contactsDelta:    pctDelta(newContacts, prevContacts),
      calls,
      callsDelta:       pctDelta(calls, prevCalls),
      avgResponse:      '< 1s',
      avgResponseDelta: 'AI-powered',
      dailyConvos,
      sources: [
        { label: 'WhatsApp', pct: 85 },
        { label: 'Voice',    pct: 10 },
        { label: 'Web',      pct: 5  },
      ],
      topProducts,
    })
  } catch (err) {
    console.error('[dashboard/analytics GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function pctDelta(now: number, prev: number): string {
  if (prev === 0) return now > 0 ? '+100%' : ''
  const pct = Math.round(((now - prev) / prev) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}% vs prev period`
}
