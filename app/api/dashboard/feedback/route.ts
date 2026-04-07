/**
 * Dashboard App — Customer Feedback & NPS
 * GET  ?token=...  — list feedback + NPS score
 *
 * Ratings are detected from WhatsApp messages that are just "1"–"5"
 * sent after a rating request. Also checks Agent.config.feedbackHistory.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Find WhatsApp messages from customers that contain only a rating digit 1-5
    const ratingMsgs = await prisma.whatsAppMessage.findMany({
      where: {
        agentId,
        role:    'user',
        content: { in: ['1', '2', '3', '4', '5'] },
      },
      orderBy: { timestamp: 'desc' },
      take:    200,
    })

    // Also pull stored feedback from config
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { config: true } })
    const cfg   = (agent?.config as Record<string, any>) || {}
    const stored: any[] = cfg.feedbackHistory || []

    // Combine — stored takes priority, WA messages fill the rest
    const seenPhones = new Set(stored.map((f: any) => `${f.phone}:${f.date}`))
    const waMapped = ratingMsgs
      .filter(m => !seenPhones.has(`${m.phone}:${new Date(m.timestamp).toISOString().slice(0, 10)}`))
      .map(m => ({
        id:      m.id,
        contact: m.phone,
        rating:  parseInt(m.content, 10),
        text:    null,
        date:    new Date(m.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        channel: 'WhatsApp',
        phone:   m.phone,
      }))

    const storedMapped = stored.map((f: any) => ({
      id:      f.id || f.phone,
      contact: f.contact || f.phone || 'Anonymous',
      rating:  f.rating ?? 0,
      text:    f.comment || null,
      date:    f.date || '',
      channel: 'WhatsApp',
      phone:   f.phone || '',
    }))

    const rows = [...storedMapped, ...waMapped]
    const total = rows.length

    const avg        = total > 0 ? rows.reduce((s, r) => s + r.rating, 0) / total : 0
    const promoters  = rows.filter(r => r.rating === 5).length
    const neutrals   = rows.filter(r => r.rating === 4).length
    const detractors = rows.filter(r => r.rating <= 3 && r.rating > 0).length
    const nps        = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null

    return NextResponse.json({
      feedback:     rows.slice(0, 100),
      nps:          nps ?? '—',
      promoters,
      neutrals,
      detractors,
      avgRating:    avg > 0 ? avg.toFixed(1) : '—',
      total,
      responseRate: total > 0 ? `${Math.round((total / Math.max(total, 1)) * 100)}%` : '—',
    })
  } catch (err) {
    console.error('[dashboard/feedback GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
