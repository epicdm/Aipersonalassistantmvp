# 02 — Current State Gap Analysis
*Generated 2026-04-06. Based on bff-sandbox/repo-20260406 inspection.*

---

## Codebase Inventory

### What exists and works

| Area | Files | Status |
|------|-------|--------|
| WhatsApp webhook ingress | `app/api/whatsapp/webhook/route.ts` (2000+ lines) | Working but monolithic |
| Meta Embedded Signup | `app/api/isola/signup/route.ts` (277 lines) | Solid — code exchange + phone reg + WABA sub |
| Tenant provisioning | `app/api/provision/route.ts` (175 lines) | Working — OCMT callback + port allocation |
| Tenant registry | `prisma/schema.prisma` TenantRegistry model | Working — AES-256-GCM token encryption |
| Agent CRUD | `app/api/agent/route.ts`, `app/api/agents/[id]/*` | Working |
| Conversation model | `Conversation`, `WhatsAppMessage`, `Contact` in schema | Working |
| AI response | `app/lib/agent-chat.ts` — DeepSeek Chat | Working but aggressive limits |
| AI runtime | `app/lib/runtime/` — orchestrator, workers, policy-gate | Structured but thin stubs |
| Billing | `app/api/billing/` — Stripe checkout + webhook | Working (Stripe only) |
| Campaigns | `app/lib/campaigns.ts`, `app/api/campaigns/` | Implemented |
| Contacts | `app/lib/contacts.ts`, `app/api/contacts/` | Working |
| Knowledge sources | `KnowledgeSource` model, `app/lib/knowledge.ts` | Working |
| Voice (LiveKit) | `app/lib/voice.ts`, `app/lib/livekit-sip.ts` | Implemented |
| Bookings | `app/api/dashboard/bookings/`, `app/lib/booking.ts` | Implemented |
| Catalog | `app/api/catalog/`, `app/lib/catalog.ts` | Implemented |
| Templates | `app/lib/whatsapp-templates.ts`, `/app/api/templates/` | Implemented |
| Broadcasts | `app/api/broadcast/` | Implemented |
| Push notifications | `app/api/push/` | Implemented |
| Cron jobs | `app/api/cron/` (bills, digest, reminders, stats) | Implemented |
| Admin panel | `app/admin/`, `app/api/admin/` | Basic implementation |
| Analytics | `app/lib/analytics.ts`, `app/api/analytics/` | Basic |
| Auth (Clerk) | `app/lib/dashboard-auth.ts`, middleware | Working |
| Auth (own JWT) | `app/lib/session.ts`, `app/api/auth/` | Also exists — parallel auth system |
| Soul generator | `app/lib/soul-generator.ts` | Working |
| Crypto | `app/lib/crypto.ts` — AES-256-GCM | Working |
| OCMT adapter | `app/api/provision/route.ts` -> calls OCMT | Working |
| Instagram | `app/api/instagram/webhook/route.ts`, `app/lib/instagram.ts` | Partial |
| Messenger | `app/api/messenger/webhook/route.ts` | Stub |
| Telegram | `app/api/telegram/bff-ops/route.ts` | Ops notifications only |
| Isola dashboard | `app/isola/` — home, inbox, analytics, bookings, etc. | UI exists |

---

## Existing Assets We Can Reuse (High Value)

### Keep as-is or minor fixes:
- `app/lib/crypto.ts` — solid AES-256-GCM encryption
- `app/lib/meta-verify.ts` — Meta signature verification
- `app/lib/whatsapp.ts` — sendWhatsAppMessage, sendInteractiveButtons etc.
- `app/lib/whatsapp-templates.ts` — HSM template management
- `app/lib/soul-generator.ts` — personality file generator
- `app/lib/booking.ts` — booking logic
- `app/lib/catalog.ts` — catalog/product management
- `app/lib/campaigns.ts` — campaign step/enrollment logic
- `prisma/schema.prisma` — most models are good, need additions
- `app/api/isola/signup/route.ts` (mostly)
- `app/api/provision/route.ts` (mostly)
- `app/lib/runtime/types.ts`, `policy-gate.ts`
- Agent template system in `agent-chat.ts`
- Billing skeleton (Stripe checkout + webhook)

### Refactor (useful logic, poor structure):
- `app/api/whatsapp/webhook/route.ts` — 2000+ lines, needs decomposition into:
  - `lib/webhook/ingress.ts` — verification + dedup
  - `lib/webhook/tenant-router.ts` — tenant resolution
  - `lib/webhook/message-processor.ts` — message handling
  - `lib/webhook/event-handlers/` — status updates, read receipts, etc.
- `app/lib/runtime/orchestrator.ts` — good structure but thin; needs real worker implementations
- `app/lib/runtime/workers/*.ts` — stubs only; need actual AI integration
- `app/lib/agent-chat.ts` — response generation works but 300 token limit must go
- `app/lib/onboarding.ts` — exists but needs post-provisioning onboarding flow

### Reference only (logic useful, structure wrong):
- `app/lib/did-provisioner.ts` — deprecated per CLAUDE.md; use magnus.ts
- `app/lib/voice.ts.deprecated` — deprecated but may have reference patterns
- `app/lib/localdb.ts.backup` — backup file, suggests live experimentation in repo

---

## Architectural Liabilities

### CRITICAL — Fix before any growth:

**1. Port sequence ceiling (100 tenants max)**
- File: `app/api/provision/route.ts:67-78`
- Evidence: `SELECT nextval('tenant_port_seq')`, MAXVALUE 3299 (only 100 ports: 3200-3299)
- Fix: Traefik label routing or dynamic DNS routing. Eliminate port-per-tenant pattern entirely.

**2. Single TENANT_MASTER_KEY for all tenants**
- File: `app/lib/crypto.ts`, `app/api/provision/route.ts:84`
- Evidence: `encryptToken(waToken)` uses single global key
- Fix: Per-tenant envelope encryption (DEK+KEK). Already noted in TODOS.md.
- Risk: One compromised key = all tenant tokens exposed.

**3. `db push --accept-data-loss` in build script**
- File: `package.json:8`
- Evidence: `"build": "prisma generate && (prisma db push --accept-data-loss || true) && next build"`
- Fix: Remove immediately. Use `prisma migrate deploy` for production. This can silently drop data.

**4. Dual auth systems (Clerk + own JWT)**
- Evidence: Both `app/lib/dashboard-auth.ts` (Clerk) and `app/lib/session.ts` (JWT) exist and are used in different routes
- Risk: Inconsistent auth — some routes protected by Clerk, others by JWT, easy to leave routes unprotected by mistake
- Fix: Pick one. Clerk for dashboard/operator routes. JWT for internal API-to-API. Be explicit about which routes use which.

**5. DeepSeek 300 token limit**
- File: `app/lib/agent-chat.ts`
- Evidence: `max_tokens: 300` in API call
- Impact: Cuts off mid-response on anything non-trivial. Sales/support conversations need 800-1200 tokens.
- Fix: Increase to 800 minimum; make configurable per template.

**6. No dead-letter queue for webhook delivery**
- File: `TODOS.md` — explicitly noted
- Evidence: `app/api/whatsapp/webhook/route.ts:603-606` logs "dead-lettered" but doesn't store
- Impact: Container restarts lose customer messages. In Dominica market, one lost message = customer switches to competitor.
- Fix: Implement `dead_letter` table + retry on container health.

### IMPORTANT — Address in Phase 1-2:

**7. No Chatwoot provisioning on tenant signup**
- The provisioning flow creates a TenantRegistry but never provisions a Chatwoot account
- Chatwoot accounts must be created via Platform API (self-hosted only)
- This means the "operator console" never gets set up automatically

**8. No entitlement enforcement**
- `User.plan` exists but nothing enforces it at API boundaries
- Any authenticated user can call any API regardless of plan
- Fix: Plan enforcement middleware per route group

**9. No tenant-level billing**
- Billing is `User`-level, not `Tenant`-level
- For multi-business SaaS, billing must be at the business/tenant level
- Fix: Add `tenantId` FK to `Subscription` table

**10. Webhook is 2000+ lines**
- `app/api/whatsapp/webhook/route.ts` is a single-file monolith
- Everything from Meta signature verification to AI response to Chatwoot sync happens here
- Makes testing, debugging, and extension extremely difficult
- Fix: Decompose into ingress -> router -> processor -> handler layers

---

## Naming and Branding Issues

The codebase has two names in active conflict:

| Name | Where Used | Meaning |
|------|-----------|---------|
| `BFF` | Domain (bff.epic.dm), package.json (`epic-ai-mvp`), CLAUDE.md | The original product name / personal assistant |
| `Isola` | `app/isola/` routes, `app/api/isola/`, `isola-tenant` containers, OCMT | The business platform product |

**Problems:**
- `app/isola/` and `app/dashboard/` both exist — two separate UI sections for unclear reasons
- API routes split between `/api/isola/` and `/api/dashboard/` with unclear ownership
- `package.json` name is `epic-ai-mvp` — not helpful
- CLAUDE.md refers to the same app as both BFF and Isola interchangeably
- The codebase needs a clear decision: is this a monorepo (BFF + Isola as separate apps) or a single app with a clear product name?

**Decision needed from Eric:** Per the TWO-APP-TWO-SERVER-PLAN-2026-04-06.md on this server, the plan is to split. But until that happens, the current codebase should treat `/app/isola/` as the business product and `/app/dashboard/` as legacy/personal.

---

## Security and Deployment Concerns

| Issue | Severity | Location |
|-------|----------|----------|
| `db push --accept-data-loss` in build | CRITICAL | package.json |
| Single TENANT_MASTER_KEY | CRITICAL | crypto.ts, provision/route.ts |
| PIN `290909` hardcoded in signup | HIGH | isola/signup/route.ts:82 |
| OCMT URL hardcoded to 66.118.37.12 | HIGH | provision/route.ts:28, isola/signup/route.ts:32 |
| `.env` contains live production keys | HIGH | .env (found in sandbox — never commit) |
| `localdb.ts.backup` in repo | MEDIUM | app/lib/ |
| `voice.ts.deprecated` in repo | LOW | app/lib/ |
| Mixed auth systems | HIGH | Multiple routes |
| No rate limiting on webhook endpoint | HIGH | whatsapp/webhook/route.ts |
| OCMT_CALLBACK_SECRET check is optional | MEDIUM | provision/route.ts:144-150 |

---

## What to Keep, Harden, Replace, Defer

### KEEP (solid, use directly)
- Prisma schema models (most of them)
- `app/lib/crypto.ts`
- `app/lib/meta-verify.ts`
- `app/lib/whatsapp.ts`
- `app/lib/soul-generator.ts`
- `app/lib/booking.ts`, `app/lib/catalog.ts`, `app/lib/campaigns.ts`
- `app/lib/runtime/types.ts`, `policy-gate.ts`
- `app/api/isola/signup/route.ts` (mostly)
- `app/api/provision/route.ts` (mostly)
- Agent template system in `agent-chat.ts`
- Billing skeleton (Stripe checkout + webhook)

### HARDEN (good logic, needs safety work)
- `app/api/whatsapp/webhook/route.ts` — add rate limiting + dead letter + decompose
- `app/api/provision/route.ts` — add per-tenant key rotation
- `app/lib/agent-chat.ts` — increase token limits, make configurable
- `package.json` build script — replace `db push --accept-data-loss` with `migrate deploy`
- Auth middleware — unify Clerk vs JWT usage

### REPLACE (wrong approach)
- Port sequence for tenant routing -> Traefik label routing
- Single TENANT_MASTER_KEY -> per-tenant DEK/KEK
- Hardcoded PIN in signup -> config via env or DB
- `db push --accept-data-loss` -> `prisma migrate deploy`

### DEFER (real value, not blocking)
- Instagram full integration
- Messenger integration
- Fiserv full wiring
- Reseller/white-label tier
- Usage metering
- Attribution Service
- Growth Service (CTWA ads, lead ads, campaigns)
- Advanced analytics
