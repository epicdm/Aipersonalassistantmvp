/**
 * GET /api/cron/token-refresh
 * Daily cron: check expiring tokens, auto-refresh, alert on failures.
 * Triggered by external cron (e.g., crontab: curl https://bff.epic.dm/api/cron/token-refresh)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { checkExpiring, refreshToken, healthCheck } from '@/app/lib/token-service'
import { alertEric } from '@/app/lib/alert'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(req: NextRequest) {
  // Require cron secret to prevent public triggering
  if (CRON_SECRET) {
    const auth = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || ''
    if (auth !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const summary = { checked: 0, refreshed: 0, failed: 0, healthChecked: 0, alerts: 0 }

  // 1. Check expiring tokens (within 7 days)
  const expiring = await checkExpiring(7)
  summary.checked = expiring.length

  for (const tenant of expiring) {
    const result = await refreshToken(tenant.tenantId)
    if (result.success) {
      summary.refreshed++
    } else {
      summary.failed++
      summary.alerts++
    }
  }

  // 2. Health-check permanent tokens (weekly: only on Mondays)
  const today = new Date()
  if (today.getUTCDay() === 1) {
    const permanentTenants = await prisma.tenantRegistry.findMany({
      where: { tokenType: 'permanent', status: { in: ['active'] } },
      select: { tenantId: true, businessName: true },
    })

    for (const tenant of permanentTenants) {
      const check = await healthCheck(tenant.tenantId)
      summary.healthChecked++
      if (!check.healthy) {
        summary.failed++
        summary.alerts++
      }
    }
  }

  // 3. Alert summary if any issues
  if (summary.failed > 0) {
    await alertEric(`Token refresh cron: ${summary.refreshed} refreshed, ${summary.failed} failed out of ${summary.checked} checked. ${summary.healthChecked} permanent tokens health-checked.`)
  }

  console.log('[token-lifecycle]', { action: 'cron-complete', ...summary })

  return NextResponse.json(summary)
}
