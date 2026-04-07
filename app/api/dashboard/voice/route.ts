/**
 * Dashboard App — Voice Line
 * GET ?token=...  — voice stats, call log, settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateDashboardToken } from '@/app/lib/dashboard-auth'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = validateDashboardToken(req)
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const agent = await prisma.agent.findUnique({
      where:  { id: agentId },
      select: { phoneNumber: true, config: true },
    })

    const cfg      = (agent?.config as Record<string, any>) || {}
    const settings = cfg.voiceSettings || {}

    const [todayCalls, recentCalls] = await Promise.all([
      prisma.callLog.findMany({
        where:   { agentId, createdAt: { gte: today } },
        select:  { duration: true, outcome: true },
      }),
      prisma.callLog.findMany({
        where:   { agentId },
        orderBy: { createdAt: 'desc' },
        take:    20,
        select:  { id: true, from: true, duration: true, outcome: true, transcript: true, createdAt: true },
      }),
    ])

    const totalDuration = todayCalls.reduce((s, c) => s + (c.duration ?? 0), 0)
    const aiHandled     = todayCalls.filter(c => c.outcome !== 'missed').length
    const avgDuration   = todayCalls.length > 0
      ? formatDuration(Math.round(totalDuration / todayCalls.length))
      : '—'

    const calls = recentCalls.map(c => ({
      id:       c.id,
      from:     c.from || 'Unknown',
      duration: c.duration ? formatDuration(c.duration) : null,
      outcome:  c.outcome || 'resolved',
      summary:  c.transcript ? c.transcript.slice(0, 80) + '…' : null,
      type:     c.outcome === 'missed' ? 'missed' : 'answered',
    }))

    return NextResponse.json({
      did: agent?.phoneNumber || cfg.voice?.did || 'Not configured',
      stats: {
        today:      todayCalls.length,
        avgDuration,
        aiHandled:  todayCalls.length > 0 ? `${Math.round((aiHandled / todayCalls.length) * 100)}%` : '—',
      },
      settings: {
        answerAll:    settings.answerAll    !== false,
        voicemail:    settings.voicemail    === true,
        smsSummary:   settings.smsSummary   !== false,
        forwardHuman: settings.forwardHuman === true,
        forwardNumber: settings.forwardNumber || '',
      },
      calls,
    })
  } catch (err) {
    console.error('[dashboard/voice GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}
