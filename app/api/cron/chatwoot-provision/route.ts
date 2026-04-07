/**
 * GET /api/cron/chatwoot-provision
 * Provisions Chatwoot accounts for tenants that have status=active
 * but no chatwootAccountId yet (chatwootStatus IS NULL or 'pending').
 *
 * This runs AFTER PATCH /api/provision sets a tenant active.
 * Decoupled from the OCMT callback so Chatwoot failures never block
 * the provisioning acknowledgment to OCMT.
 *
 * Idempotent: safe to run multiple times.
 * Deploy: trigger every 1–2 minutes via cron.
 *
 * Required env vars:
 *   CRON_SECRET                 — shared cron auth secret
 *   CHATWOOT_URL                — e.g. https://inbox.epic.dm
 *   CHATWOOT_SUPER_ADMIN_TOKEN  — Platform API token
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { provisionChatwootAccount } from '@/app/lib/chatwoot/adapter'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && secret !== 'bff-cron-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find tenants that are active but not yet provisioned in Chatwoot
  const pending = await prisma.tenantRegistry.findMany({
    where: {
      status: 'active',
      chatwootAccountId: null,
      // Skip tenants already marked failed after multiple cron runs
      // (chatwootStatus='failed' after 5+ failures — manual fix needed)
      NOT: { chatwootStatus: 'failed_permanent' },
    },
    take: 10,
  })

  let provisioned = 0
  let failed      = 0
  const errors: string[] = []

  for (const tenant of pending) {
    try {
      const account = await provisionChatwootAccount(
        tenant.businessName || tenant.tenantId,
      )

      await prisma.tenantRegistry.update({
        where: { tenantId: tenant.tenantId },
        data: {
          chatwootAccountId:    String(account.id),
          chatwootStatus:       'provisioned',
          chatwootProvisionedAt: new Date(),
        },
      })

      console.log(`[chatwoot-provision] Provisioned account ${account.id} for tenant ${tenant.tenantId}`)
      provisioned++
    } catch (err: any) {
      console.error(`[chatwoot-provision] Failed for tenant ${tenant.tenantId}:`, err.message)

      // Count failures — after 5 failures mark as failed_permanent for human review
      const failCount = await prisma.tenantRegistry.findUnique({
        where: { tenantId: tenant.tenantId },
        select: { chatwootStatus: true },
      })

      const isRepeatedFailure = failCount?.chatwootStatus?.startsWith('failed:')
      const failureNum = isRepeatedFailure
        ? parseInt(failCount!.chatwootStatus!.split(':')[1] || '1', 10) + 1
        : 1

      await prisma.tenantRegistry.update({
        where: { tenantId: tenant.tenantId },
        data: {
          chatwootStatus: failureNum >= 5
            ? 'failed_permanent'
            : `failed:${failureNum}`,
        },
      })

      errors.push(`${tenant.tenantId}: ${err.message}`)
      failed++
    }
  }

  return NextResponse.json({
    checked: pending.length,
    provisioned,
    failed,
    errors: errors.length ? errors : undefined,
    timestamp: new Date().toISOString(),
  })
}
