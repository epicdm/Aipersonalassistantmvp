/**
 * POST /api/cron/stats
 * Midnight aggregation cron — computes daily stats for all active agents.
 * Run via Vercel Cron or external scheduler at 00:05 daily.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { aggregateDailyStats } from '@/app/lib/analytics'

export async function POST(req: NextRequest) {
  // Basic auth for cron
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  const expected = process.env.CRON_SECRET || process.env.INTERNAL_SECRET || ''
  if (expected && secret !== expected && secret !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Aggregate yesterday's stats
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    let aggregated = 0
    const errors: string[] = []

    for (const agent of agents) {
      try {
        await aggregateDailyStats(agent.id, yesterday)
        aggregated++
      } catch (err: any) {
        errors.push(`${agent.id}: ${err.message}`)
      }
    }

    console.log(`[cron/stats] Aggregated ${aggregated}/${agents.length} agents`)

    return NextResponse.json({
      success: true,
      date: yesterday.toISOString().split('T')[0],
      agents: agents.length,
      aggregated,
      ...(errors.length ? { errors } : {}),
    })
  } catch (error: any) {
    console.error('[cron/stats]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Stats aggregation cron endpoint' })
}
