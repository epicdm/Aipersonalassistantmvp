// app/lib/tenant-cache.ts
// In-memory tenant registry cache with 5-minute TTL.
//
// IMPORTANT: This relies on a long-lived Node.js process (PM2).
// In a serverless deployment each invocation gets a fresh module instance
// and the cache is always empty. If BFF ever moves to Vercel serverless,
// replace this with a Redis-backed cache.
import { prisma } from '@/app/lib/prisma'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface CachedTenant {
  tenantId: string
  waPhoneNumberId: string
  containerPort: number
  containerUrl: string | null
  status: string
  cachedAt: number
}

class TenantCache {
  private readonly cache = new Map<string, CachedTenant>()

  async get(waPhoneNumberId: string): Promise<CachedTenant | null> {
    const hit = this.cache.get(waPhoneNumberId)
    if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) {
      return hit
    }

    // Cache miss or stale — fetch from DB
    const tenant = await prisma.tenantRegistry
      .findUnique({
        where: { waPhoneNumberId },
        select: {
          tenantId: true,
          waPhoneNumberId: true,
          containerPort: true,
          containerUrl: true,
          status: true,
        },
      })
      .catch(() => null)

    if (!tenant) {
      this.cache.delete(waPhoneNumberId)
      return null
    }

    const cached: CachedTenant = { ...tenant, cachedAt: Date.now() }
    this.cache.set(waPhoneNumberId, cached)
    return cached
  }

  /** Remove a single entry — call on tenant suspend/resume. */
  invalidate(waPhoneNumberId: string): void {
    this.cache.delete(waPhoneNumberId)
  }

  /** Nuke all entries — call after bulk status changes. */
  invalidateAll(): void {
    this.cache.clear()
  }

  /** Diagnostic: how many live (non-stale) entries are cached. */
  get size(): number {
    const now = Date.now()
    let count = 0
    for (const v of this.cache.values()) {
      if (now - v.cachedAt < CACHE_TTL_MS) count++
    }
    return count
  }
}

// Module-level singleton — one instance per Node.js process lifetime.
export const tenantCache = new TenantCache()
