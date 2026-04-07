// app/lib/webhook/tenant-router.ts
// Phase 2: extracted from app/api/whatsapp/webhook/route.ts
//
// Responsibilities:
//   resolveTenant          — cache-first TenantRegistry lookup
//   proxyToTenantContainer — forward webhook body to tenant container with dead-letter on failure
import { prisma } from '@/app/lib/prisma'
import { tenantCache, type CachedTenant } from '@/app/lib/tenant-cache'

async function persistDeadLetter(
  tenantId: string,
  waPhoneNumberId: string,
  payload: unknown,
  failureReason: string,
): Promise<void> {
  try {
    await prisma.deadLetter.create({
      data: {
        tenantId,
        waPhoneNumberId,
        payload: payload as any,
        failureReason,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
    })
  } catch (dbErr: any) {
    // Last resort — if DB write fails, at least log it. Never throw from here.
    console.error(
      '[WA dead-letter] Failed to persist dead letter:',
      dbErr.message,
      'original failure:',
      failureReason,
    )
  }
}

/**
 * Look up the tenant for this phone number ID.
 * Uses the in-memory TenantCache (5-minute TTL) — steady-state lookup < 1ms.
 * Returns null if no tenant is registered for this number (BFF's own agents).
 */
export async function resolveTenant(waPhoneNumberId: string): Promise<CachedTenant | null> {
  return tenantCache.get(waPhoneNumberId)
}

/**
 * Forward the raw webhook payload to the tenant's isola-tenant container.
 *
 * Routing priority:
 *   1. tenant.containerUrl  — set after Traefik migration (see 06-phase0-routing-remediation.md)
 *   2. port-based URL        — legacy, supports up to 100 tenants
 *
 * On any failure (container unreachable, non-2xx), the payload is written to
 * the dead_letter table for retry by app/api/cron/dead-letter-retry.
 *
 * Returns true always — caller should stop processing regardless of proxy outcome.
 */
export async function proxyToTenantContainer(
  tenant: CachedTenant,
  body: unknown,
  waPhoneNumberId: string,
): Promise<true> {
  if (tenant.status !== 'active') {
    console.log(
      `[WA] Tenant ${tenant.tenantId} not active (${tenant.status}) \u2014 dropping message`,
    )
    return true
  }

  const containerHost = process.env.OCMT_CONTAINER_HOST || '66.118.37.12'
  const containerScheme = process.env.OCMT_CONTAINER_SCHEME || 'http'
  // Phase 0: use containerUrl if set (Traefik routing), fall back to port-based
  const containerUrl =
    tenant.containerUrl ?? `${containerScheme}://${containerHost}:${tenant.containerPort}/webhook`

  try {
    const res = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      await persistDeadLetter(
        tenant.tenantId,
        waPhoneNumberId,
        body,
        `container returned ${res.status}`,
      )
      console.error(
        `[WA] tenant=${tenant.tenantId} container:${tenant.containerPort} returned ${res.status} \u2014 persisted to dead_letter`,
      )
    }
  } catch (err: any) {
    await persistDeadLetter(
      tenant.tenantId,
      waPhoneNumberId,
      body,
      `container unreachable: ${err.message}`,
    )
    console.error(
      `[WA] tenant=${tenant.tenantId} container:${tenant.containerPort} unreachable \u2014 persisted to dead_letter`,
    )
  }

  return true
}
