/**
 * GET /api/internal/business-hours
 * Internal endpoint — returns formatted business hours for an agent.
 * Auth: x-internal-secret header.
 *
 * Query params:
 *   agentId — required
 *
 * Returns: { hours: [{dayOfWeek, dayName, openTime, closeTime, isClosed}] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/app/lib/internal-auth'
import { prisma } from '@/app/lib/prisma'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function GET(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  try {
    const rows = await prisma.businessHours.findMany({
      where: { agentId },
      orderBy: { dayOfWeek: 'asc' },
    })

    if (!rows.length) {
      return NextResponse.json({ hours: [], message: 'No hours configured' })
    }

    // Build full 7-day week — days without a row are closed
    const byDay = new Map(rows.map(r => [r.dayOfWeek, r]))
    const hours = Array.from({ length: 7 }, (_, i) => {
      const row = byDay.get(i)
      return {
        dayOfWeek: i,
        dayName: DAY_NAMES[i],
        openTime: row?.openTime ?? null,
        closeTime: row?.closeTime ?? null,
        isClosed: !row,
      }
    })

    return NextResponse.json({ hours })
  } catch (err) {
    console.error('[internal/business-hours] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
