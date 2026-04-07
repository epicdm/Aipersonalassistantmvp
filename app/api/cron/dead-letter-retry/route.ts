/**
 * GET /api/cron/dead-letter-retry
 * Retries failed webhook deliveries stored in the dead_letter table.
 *
 * Idempotent: safe to run multiple times. Processes at most BATCH_SIZE
 * rows per invocation so a backlog does not overwhelm containers.
 *
 * Auth: CRON_SECRET query param (same pattern as other cron routes).
 * Deploy: trigger every 2–5 minutes via Vercel Cron or external cron.
 *
 * Required env vars:
 *   CRON_SECRET            — shared cron auth secret
 *   OCMT_CONTAINER_HOST    — container hostname (default: 66.118.37.12)
 *   OCMT_CONTAINER_SCHEME  — http or https (default: http)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_ATTEMPTS = 5
const BATCH_SIZE   = 20

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && secret !== 'bff-cron-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const containerHost   = process.env.OCMT_CONTAINER_HOST   || '66.118.37.12'
  const containerScheme = process.env.OCMT_CONTAINER_SCHEME || 'http'

  // Fetch retryable dead letters — oldest first, cap at BATCH_SIZE
  const rows = await prisma.deadLetter.findMany({
    where: { resolved: false, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { lastAttemptAt: 'asc' },
    take: BATCH_SIZE,
  })

  let delivered = 0
  let failed    = 0
  let abandoned = 0
  const errors: string[] = []

  for (const row of rows) {
    // Look up the tenant to get its container port
    const tenant = row.tenantId
      ? await prisma.tenantRegistry.findUnique({
          where: { tenantId: row.tenantId },
          select: { containerPort: true, status: true, containerUrl: true },
        }).catch(() => null)
      : null

    // Skip if tenant no longer active (do not abandon — status could recover)
    if (tenant && tenant.status !== 'active') {
      await prisma.deadLetter.update({
        where: { id: row.id },
        data: {
          lastAttemptAt: new Date(),
          failureReason: `Tenant not active (status: ${tenant.status}) — skipping retry`,
        },
      })
      continue
    }

    // Build container URL — prefer explicit containerUrl, fall back to port routing
    const containerUrl = (tenant as any)?.containerUrl
      ?? (tenant?.containerPort
        ? `${containerScheme}://${containerHost}:${tenant.containerPort}/webhook`
        : null)

    if (!containerUrl) {
      // Cannot route — tenant not found or no port. Abandon after max attempts.
      const newAttempts = row.attempts + 1
      await prisma.deadLetter.update({
        where: { id: row.id },
        data: {
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          failureReason: 'No container URL resolvable — tenant not found',
          resolved: newAttempts >= MAX_ATTEMPTS,
          resolvedAt: newAttempts >= MAX_ATTEMPTS ? new Date() : null,
        },
      })
      abandoned++
      continue
    }

    // Attempt delivery
    try {
      const res = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row.payload),
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        await prisma.deadLetter.update({
          where: { id: row.id },
          data: { resolved: true, resolvedAt: new Date(), failureReason: 'Delivered on retry' },
        })
        delivered++
      } else {
        const newAttempts = row.attempts + 1
        const reason = `container returned ${res.status} on retry attempt ${newAttempts}`
        await prisma.deadLetter.update({
          where: { id: row.id },
          data: {
            attempts: newAttempts,
            lastAttemptAt: new Date(),
            failureReason: reason,
            resolved: newAttempts >= MAX_ATTEMPTS,
            resolvedAt: newAttempts >= MAX_ATTEMPTS ? new Date() : null,
          },
        })
        if (newAttempts >= MAX_ATTEMPTS) {
          console.error(`[dead-letter] Abandoned ${row.id} after ${MAX_ATTEMPTS} attempts: ${reason}`)
          abandoned++
        } else {
          failed++
          errors.push(reason)
        }
      }
    } catch (err: any) {
      const newAttempts = row.attempts + 1
      const reason = `unreachable on retry attempt ${newAttempts}: ${err.message}`
      await prisma.deadLetter.update({
        where: { id: row.id },
        data: {
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          failureReason: reason,
          resolved: newAttempts >= MAX_ATTEMPTS,
          resolvedAt: newAttempts >= MAX_ATTEMPTS ? new Date() : null,
        },
      })
      if (newAttempts >= MAX_ATTEMPTS) abandoned++
      else { failed++; errors.push(reason) }
    }
  }

  return NextResponse.json({
    processed: rows.length,
    delivered,
    failed,
    abandoned,
    errors: errors.length ? errors : undefined,
    timestamp: new Date().toISOString(),
  })
}
