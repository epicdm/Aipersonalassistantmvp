# 08 — Phase 1 Implementation Report
*Generated 2026-04-06.*

---

## Summary

Phase 1 (Tenant and Control-Plane Foundation) has been applied as targeted additions
to the existing codebase. No rewrites. No feature expansion beyond the stated goals.

---

## Changed Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Fixed missing TenantRegistry fields: `displayPhone`, `businessId`, `tokenExpiresAt`, `tokenType` (were in signup route but not schema — data loss risk fixed). Added `chatwootStatus`, `chatwootProvisionedAt`, `ownerPhone`, `containerUrl`. |
| `app/api/provision/route.ts` | PATCH now sets `chatwootStatus='pending'` on activation and sends owner welcome WhatsApp (fire-and-forget). |
| `app/api/campaigns/route.ts` | POST now requires `pro` plan via `checkPlan('pro')`. |

## New Files

| File | Purpose |
|------|---------|
| `app/lib/chatwoot/adapter.ts` | Chatwoot Platform API client — `provisionChatwootAccount()`, `createChatwootUser()` |
| `app/lib/plan-check.ts` | Plan enforcement helper — `checkPlan(plan)` for all routes |
| `app/api/cron/dead-letter-retry/route.ts` | Retries failed webhook deliveries. Max 5 attempts, batch 20. |
| `app/api/cron/chatwoot-provision/route.ts` | Polls for `active` tenants with no Chatwoot account, provisions them. |
| `app/api/admin/isola/tenants/route.ts` | List all TenantRegistry rows with dead-letter counts (admin only) |
| `app/api/admin/isola/tenants/[tenantId]/route.ts` | Tenant detail + recent dead-letters |
| `app/api/admin/isola/tenants/[tenantId]/suspend/route.ts` | Set status=inactive |
| `app/api/admin/isola/tenants/[tenantId]/resume/route.ts` | Set status=active |

---

## Critical Schema Fix

The `app/api/isola/signup/route.ts` was writing fields to `tenant_registry` that did not
exist in the Prisma schema (`displayPhone`, `businessId`, `tokenExpiresAt`, `tokenType`).
This would cause silent failures on Prisma strict mode or errors on some DB configurations.
All missing fields have been added. **Migration must be run before next deploy.**

---

## Migration Steps

```bash
# Development
npx prisma migrate dev --name phase1_tenant_foundation

# Production (after testing)
npx prisma migrate deploy
```

New columns are all nullable. Migration is safe and additive.

---

## New Env Vars Required

```bash
# Chatwoot provisioning
CHATWOOT_URL=https://inbox.epic.dm
CHATWOOT_SUPER_ADMIN_TOKEN=<from Chatwoot super_admin profile page>

# Cron (already exists in pattern)
CRON_SECRET=<shared cron auth secret>
```

---

## New Cron Routes to Register

| Route | Frequency | Purpose |
|-------|-----------|---------|
| `/api/cron/dead-letter-retry?secret=CRON_SECRET` | Every 2 min | Retry failed webhook deliveries |
| `/api/cron/chatwoot-provision?secret=CRON_SECRET` | Every 1 min | Provision Chatwoot accounts for new tenants |

---

## Rollback Notes

- Schema additions are all nullable — old code is unaffected.
- `chatwootStatus='pending'` is set but only consumed by the cron. If cron is not deployed, no Chatwoot accounts are created (existing behavior).
- Plan check on campaigns is the only behavior change for existing users. Users on `free` plan who were using campaigns will now get 403. Confirm this is intentional before deploying.
- Welcome message: fire-and-forget, failure is non-fatal and logged.

---

## What Remains Blocked

| Item | Blocker |
|------|---------|
| Chatwoot account actually provisioned | `CHATWOOT_SUPER_ADMIN_TOKEN` must be set + crons deployed |
| Dead-letter retry working | Crons must be registered in Vercel/cron config |
| Port ceiling still at 100 | Traefik infra work not done (see doc 06) |
| Tenant-level billing | Deferred to Phase 7 — current enforcement is User.plan |
| Full Embedded Signup UI | Phase 2 |
| Chatwoot bidirectional sync | Phase 3 |

---

## Top 5 Remaining Risks After Phase 1

1. **Port ceiling unchanged** — still 100 tenants max. No marketing campaign until Traefik is deployed.
2. **CHATWOOT_SUPER_ADMIN_TOKEN not set** — `chatwoot-provision` cron will error on every run if this is missing. Fails gracefully (logs error, marks tenant `failed:1`) but Chatwoot will never get set up.
3. **Plan enforcement on campaigns may break existing free users** — if any free-tier users were using campaigns, they now get 403. Verify before deploying.
4. **Legacy tenant DEK migration still pending** — existing tenants on global key. Non-urgent but should be scheduled before customer count grows.
5. **Schema mismatch was silently broken before this sprint** — the `displayPhone`, `businessId`, `tokenExpiresAt`, `tokenType` fields were written by signup but not in schema. This means any tenant signed up before Phase 1 migration may have missing data. Run the migration, then verify rows.

---

## Next Sprint: Phase 2 Starter Prompt

```
You are implementing Phase 2 for Isola.

Read first:
- docs/isola/03-phased-roadmap.md
- docs/isola/08-phase1-implementation-report.md
- docs/isola/06-phase0-routing-remediation.md

Phase 1 is complete. The provisioning chain now sets chatwootStatus=pending
and triggers Chatwoot account provisioning via a cron. Dead-letter retry
is in place. Admin tenant APIs exist.

Phase 2 goals:
1. Decompose the webhook handler (2000-line monolith) into:
   - app/lib/webhook/ingress.ts
   - app/lib/webhook/tenant-router.ts
   - app/lib/webhook/session-detector.ts
   - app/lib/webhook/message-handler.ts
   - app/lib/webhook/event-handler.ts
   Preserve ALL existing behavior. This is a refactor, not a rewrite.
   The dead-letter path added in Phase 0 must be preserved.

2. Add tenant routing cache:
   - In-memory Map with TTL (5 min) for TenantRegistry lookups
   - Active tenant lookup must be < 5ms in steady state

3. Multi-number support prep:
   - Verify the Agent model can hold multiple numbers per tenant
   - No UI yet — just backend model correctness

4. Document the Embedded Signup UI spec (do not build UI yet):
   - Create docs/isola/09-embedded-signup-ui-spec.md

Constraints:
- No Chatwoot sync yet
- No owner takeover yet
- No product UX expansion
- Every behavior change must be backward compatible
```
