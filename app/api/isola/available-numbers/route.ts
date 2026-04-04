/**
 * GET /api/isola/available-numbers
 * Returns up to 5 available 818-XXXX numbers from Magnus.
 * Used by Path B onboarding — business picks a number from EPIC's pool.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

// Pool of EPIC 818 numbers provisioned in Magnus (verified 2026-04-04).
// These are the ACTUAL DIDs from Magnus DID table.
// Remove from pool once assigned to a tenant.
const DID_POOL = [
  '17678183456', '17678188564', '17678180000', '17678180857',
  '17678187511', '17678180300', '17678182815', '17678185999',
  '17678182530', '17678184780', '17678185784', '17678184040',
  '17678185911', '17678182751', '17678188617', '17678182507',
  '17678188641', '17678186416', '17678182668', '17678183742',
  '17678182741', '17678187626', '17678183366', '17678184934',
  '17678187055',
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
