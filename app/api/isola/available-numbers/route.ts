/**
 * GET /api/isola/available-numbers
 * Returns up to 5 available 818-XXXX numbers from Magnus.
 * Used by Path B onboarding — business picks a number from EPIC's pool.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

// Pool of EPIC 818 numbers provisioned in Magnus.
// These are real DIDs. Remove from pool once assigned to a tenant.
const DID_POOL = [
  '17678181019', '17678183081', '17678185018', '17678185042',
  '17678185168', '17678186449', '17678186649', '17678187708',
  '17678189043', '17678189320', '17678189430', '17678189475',
  '17678189632', '17678189637', '17678189656', '17678189733',
]

export async function GET() {
  try {
    // Filter out DIDs already assigned to tenants
    const assigned = await prisma.tenantRegistry.findMany({
      where: { didNumber: { not: null } },
      select: { didNumber: true },
    })
    const assignedSet = new Set(assigned.map(t => t.didNumber))

    // Also filter out reserved DIDs from pending signups
    const reserved = await prisma.pendingSignup.findMany({
      where: { reservedUntil: { gt: new Date() }, status: { in: ['flow_started', 'flow_complete', 'payment_pending'] } },
      select: { reservedDid: true },
    }).catch(() => [])
    const reservedSet = new Set(reserved.map(r => r.reservedDid))

    const available = DID_POOL
      .filter(d => !assignedSet.has(d) && !reservedSet.has(d))
      .map(d => ({
        id: d,
        title: `+1 ${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`,
      }))

    if (available.length === 0) {
      return NextResponse.json({ error: 'No numbers available right now.' }, { status: 503 })
    }

    return NextResponse.json({ numbers: available.slice(0, 5) })
  } catch (err: any) {
    console.error('[available-numbers]', err.message)
    return NextResponse.json({ error: 'Could not load numbers.' }, { status: 500 })
  }
}
