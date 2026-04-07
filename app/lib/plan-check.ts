/**
 * Plan enforcement helpers — Isola Phase 1
 *
 * Usage in a route:
 *   const check = await checkPlan('pro')
 *   if (check instanceof NextResponse) return check
 *   const { user } = check
 *
 * TODO Phase 7: migrate to tenant-level billing once Subscription
 * is linked to TenantRegistry. For now enforces at User.plan level.
 */

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import type { SessionUser } from '@/app/lib/session'

export type Plan = 'free' | 'starter' | 'pro' | 'business'

const PLAN_ORDER: Record<string, number> = {
  free:     0,
  starter:  1,
  pro:      2,
  business: 3,
}

export function planMeetsRequirement(userPlan: string | null | undefined, required: Plan): boolean {
  const current = PLAN_ORDER[userPlan ?? 'free'] ?? 0
  return current >= (PLAN_ORDER[required] ?? 0)
}

/**
 * Check that the current Clerk session user has at least the required plan.
 * Returns { user } on success, NextResponse on failure.
 * Drop-in pattern: same shape as requireSessionUser() in auth-boundary.ts.
 */
export async function checkPlan(
  required: Plan,
): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!planMeetsRequirement(user.plan, required)) {
    return NextResponse.json(
      {
        error: `This feature requires the ${required} plan or higher.`,
        currentPlan: user.plan ?? 'free',
        requiredPlan: required,
        upgradeUrl: '/dashboard/billing',
      },
      { status: 403 },
    )
  }

  return { user }
}
