/**
 * auth-boundary.ts — Isola authentication boundary reference
 *
 * This file is the single source of truth for how routes authenticate.
 * Every API route MUST fall into exactly one of the four categories below.
 * Re-export the relevant helpers from here so route files stay clean.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ CATEGORY A — Public webhook endpoints                                   ║
 * ║ Auth: Meta X-Hub-Signature-256 verification only                        ║
 * ║ Routes: /api/whatsapp/webhook, /api/instagram/webhook,                  ║
 * ║         /api/messenger/webhook, /api/whatsapp/webhook (GET verify)      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ CATEGORY B — Public business onboarding (no user auth required)         ║
 * ║ Auth: Input validation + Meta OAuth flow only                           ║
 * ║ Routes: /api/isola/signup, /api/whatsapp/connect,                       ║
 * ║         /api/isola/available-numbers, /api/isola/provision-status       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ CATEGORY C — Operator/user-facing dashboard routes                      ║
 * ║ Auth: Clerk session (getSessionUser / auth())                           ║
 * ║ Routes: /api/agents/*, /api/billing/*, /api/contacts/*, /api/campaigns/*║
 * ║         /api/broadcast/*, /api/templates/*, /api/catalog/*, etc.        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ CATEGORY D — Internal service callbacks (machine-to-machine)            ║
 * ║ Auth: HMAC token (dashboard-auth.ts) OR x-internal-secret header        ║
 * ║ Routes: /api/provision (PATCH from OCMT), /api/internal/*,              ║
 * ║         /api/dashboard/* (Chatwoot dashboard app), /api/chatwoot/*      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DEAD PATTERNS — do not use ──────────────────────────────────────────────
 * session.ts exports signToken/verifyToken — these are stubs returning null.
 * The old JWT auth system is fully removed. Do not call these.
 * All legacy JWT routes have migrated to Clerk (Category C).
 */

// Re-export Category C helpers
export { getSessionUser } from '@/app/lib/session'
export type { SessionUser } from '@/app/lib/session'

// Re-export Category D helpers
export { validateDashboardToken, generateDashboardToken } from '@/app/lib/dashboard-auth'
export { validateInternalSecret } from '@/app/lib/internal-auth'

// Re-export Category A helper
export { verifyMetaSignature } from '@/app/lib/meta-verify'

/**
 * Convenience: require Clerk auth or return 401.
 * Use in Category C routes.
 *
 * @example
 * const user = await requireSessionUser()
 * if (user instanceof NextResponse) return user
 */
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/app/lib/session'
import type { SessionUser } from '@/app/lib/session'

export async function requireSessionUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return user
}

/**
 * Convenience: require internal secret or return 401.
 * Use in Category D routes that accept x-internal-secret.
 */
export function requireInternalSecret(req: Request): NextResponse | null {
  const secret = req.headers.get('x-internal-secret')
  const expected = process.env.INTERNAL_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
