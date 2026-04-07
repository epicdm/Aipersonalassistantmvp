# 07 — Phase 0 Implementation Report
*Generated 2026-04-06. Author: Ace / gstack sprint.*

---

## Summary

Phase 0 (Architecture and Hardening) has been applied as a surgical patch to the existing
codebase. No features were added. No rewrites were performed. Every change is targeted at
a specific documented risk from 02-current-state-gap-analysis.md.

---

## Changed Files

| File | Change | Category |
|------|--------|----------|
| `package.json` | Removed `db push --accept-data-loss`, added `build:dev` and `migrate:deploy` scripts | Build hardening |
| `app/lib/crypto.ts` | Per-tenant DEK/KEK envelope encryption. `decryptToken` now migration-safe (uses DEK if present, falls back to global key for legacy rows) | Encryption |
| `prisma/schema.prisma` | Added `tenantDek`, `chatwootAccountId`, `businessName`, `wabaId` to TenantRegistry. Added `DeadLetter` model. | Schema |
| `app/api/provision/route.ts` | Hardened OCMT callback secret (fail closed), per-tenant DEK on provision, OCMT_URL removed hardcoded default | Security |
| `app/api/isola/signup/route.ts` | Updated crypto import to include per-tenant DEK functions | Security |
| `app/api/whatsapp/webhook/route.ts` | Added `persistDeadLetter()` helper, replaced silent dead-letter logs with durable DB writes, externalized container host to `OCMT_CONTAINER_HOST` env var | Reliability |
| `app/lib/auth-boundary.ts` | New file — explicit auth boundary documentation and convenience helpers for all four route categories | Auth |
| `docs/isola/06-phase0-routing-remediation.md` | New file — detailed plan for replacing port-sequence with Traefik label routing | Planning |

---

## New Files

- `app/lib/auth-boundary.ts` — auth boundary reference and helpers
- `docs/isola/06-phase0-routing-remediation.md` — routing remediation plan
- `docs/isola/07-phase0-implementation-report.md` — this file

---

## Migration Steps Required

### Migration 1: Prisma schema changes

After pulling this code, run:
```bash
npx prisma migrate dev --name phase0_hardening
```

This will generate a migration for:
- `ALTER TABLE tenant_registry ADD COLUMN tenant_dek TEXT`
- `ALTER TABLE tenant_registry ADD COLUMN chatwoot_account_id TEXT`
- `ALTER TABLE tenant_registry ADD COLUMN business_name TEXT`
- `ALTER TABLE tenant_registry ADD COLUMN waba_id TEXT`
- `CREATE TABLE dead_letter (...)`

On production:
```bash
npx prisma migrate deploy
```

### Migration 2: Re-encrypt legacy tenant tokens (deferred, non-blocking)

Tenants provisioned before this sprint have `tenantDek = NULL` in the database.
The updated `decryptToken()` handles this transparently (falls back to global key).

A one-time migration script should be run **after** verifying the new provisioning
path works correctly for new tenants:

```typescript
// scripts/migrate-tenant-deks.ts (create this when ready)
// For each tenant where tenantDek IS NULL:
//   1. decryptToken(tenant.tokenEncrypted, null)  -> get raw token
//   2. generateTenantDek() -> new DEK
//   3. encryptTokenWithDek(rawToken, newDek.encryptedDek) -> new encrypted token
//   4. UPDATE tenant_registry SET token_encrypted = ?, tenant_dek = ? WHERE tenant_id = ?
```

This script is NOT created in this sprint. It should be created and tested in a staging
environment before running on production.

---

## Environment Variables Required

### New (must add):
```bash
OCMT_CALLBACK_SECRET=<strong-random-secret>   # REQUIRED — provision PATCH will 503 without it
OCMT_CONTAINER_HOST=66.118.37.12              # container host (was hardcoded, now env)
OCMT_CONTAINER_SCHEME=http                    # container scheme (http for internal)
```

### Existing (verify these are set):
```bash
TENANT_MASTER_KEY=<strong-random-key>         # KEK for per-tenant DEK encryption
OCMT_URL=http://66.118.37.12:4000             # OCMT API URL (no longer has hardcoded default)
INTERNAL_SECRET=<strong-random-secret>        # internal service auth
```

### No longer needed (after legacy migration is complete):
The `TENANT_MASTER_KEY` remains needed as the KEK even after migration, so do not remove it.

---

## Rollback Considerations

| Change | Rollback Steps |
|--------|---------------|
| package.json build script | Revert to `prisma db push --accept-data-loss` (not recommended) |
| crypto.ts | Old `encryptToken` is still exported. No existing callers break. |
| Schema additions | All new fields are nullable — old code works without them. Migration is additive only. |
| provision PATCH hardening | If OCMT_CALLBACK_SECRET is not set, PATCH returns 503. Set the env var or revert the check. |
| Dead-letter persistence | If DeadLetter table doesn't exist yet (migration not run), the `persistDeadLetter` catch block prevents crashes. |
| Webhook container URL | Falls back to port-based URL if `containerUrl` is null. No behavior change for existing tenants. |

---

## What Remains Blocked (Needs Infra Help)

| Blocker | Who | What |
|---------|-----|------|
| Port sequence ceiling | Infra (OCMT/66.118.37.12) | Traefik must be installed and OCMT must register containers with labels. See 06-phase0-routing-remediation.md |
| OCMT_CALLBACK_SECRET | Ops | Must be set as env var on both BFF and OCMT. Currently provision PATCH returns 503 until set. |
| OCMT_URL default removed | Ops | Must set OCMT_URL explicitly. Old default http://66.118.37.12:4000 is gone. |
| Dead-letter retry worker | Engineering | Schema is ready. Retry cron job not yet implemented. Dead letters accumulate but no auto-retry. |
| Legacy tenant DEK migration | Engineering | Script needed after staging validation. Not blocking anything today. |

---

## Top 5 Remaining Risks After Phase 0

1. **Port ceiling still at 100** — Traefik migration requires infra work not done in this sprint.
   New provisioning will fail at 100 tenants. Mitigated: we now have clear remediation plan.

2. **OCMT_CALLBACK_SECRET must be deployed** — The provision PATCH endpoint now fails closed
   (503) if the env var is not set. This is correct security behavior but will break OCMT
   callbacks until ops sets the env var on both sides.

3. **Dead-letter retry not implemented** — Messages are now persisted durably instead of
   dropped, but no retry mechanism exists yet. Dead letters will accumulate until a retry
   worker is built (Phase 1 work).

4. **Legacy tenant DEK migration not run** — Old tenants still use global key encryption.
   No immediate risk (the fallback decryption works), but the single-key risk persists for
   those rows until the migration script runs.

5. **2000-line webhook still monolithic** — Dead-letter persistence was added surgically,
   but the webhook is still a single large file. Testing and extending it remains difficult.
   Full decomposition is Phase 2 work.

---

## Phase 1 Starter — Exact Next Prompt

When ready to begin Phase 1, use this prompt:

```
You are implementing Phase 1 for Isola based on docs/isola/03-phased-roadmap.md.
Phase 0 is complete. Read docs/isola/07-phase0-implementation-report.md first to understand
what was changed and what env vars are now required.

Phase 1 goals:
1. Complete the provisioning chain: after PATCH /api/provision sets status=active,
   automatically provision a Chatwoot account via Platform API and store chatwootAccountId
   in TenantRegistry.

2. Build tenant management admin APIs:
   GET /api/admin/tenants, GET /api/admin/tenants/:id,
   POST /api/admin/tenants/:id/suspend, POST /api/admin/tenants/:id/resume

3. Add plan enforcement middleware: withPlanCheck(plan, handler)
   Wire it to at least one route as proof of concept.

4. Add post-provisioning onboarding WhatsApp sequence:
   After container is healthy, send owner a WhatsApp message with dashboard link.

5. Write the dead-letter retry cron at app/api/cron/dead-letter-retry/route.ts

Constraints:
- Do not start Embedded Signup UI yet (Phase 2)
- Do not start Chatwoot bidirectional sync yet (Phase 3)
- Do not implement owner takeover yet (Phase 5)
- Keep changes surgical

Read the codebase before touching files.
The repo is at /home/eric/labs/clawcode-bff-lab/bff-sandbox/repo-20260406/
```
