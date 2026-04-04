/**
 * GET /api/analytics?agentId=xxx&from=2026-04-01&to=2026-04-07
 * Returns analytics summary for an agent over a date range.
 * Accepts optional format=csv for CSV export.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/app/lib/prisma'
import { getAnalytics, toCSV } from '@/app/lib/analytics'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  // Verify agent belongs to user
  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const fromStr = req.nextUrl.searchParams.get('from')
  const toStr = req.nextUrl.searchParams.get('to')
  const format = req.nextUrl.searchParams.get('format')

  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const to = toStr ? new Date(toStr) : new Date()

  const analytics = await getAnalytics(agentId, from, to)

  if (format === 'csv') {
    const csv = toCSV(analytics)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-${agentId}-${fromStr || 'last7d'}.csv"`,
      },
    })
  }

  return NextResponse.json(analytics)
}
