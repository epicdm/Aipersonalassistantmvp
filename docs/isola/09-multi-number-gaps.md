# 09 — Multi-Number Support: Schema Gap Analysis
*Generated 2026-04-06 — Phase 2.*

---

## Current State

Each Agent row can have exactly **one** WhatsApp number. The binding is stored across
several overlapping fields:

| Field | Type | Purpose |
|-------|------|---------|
| `Agent.whatsappNumber` | `String?` | The display number (e.g. +17678180001) |
| `Agent.whatsappPhone` | `String?` | Duplicate — appears to be the same value |
| `Agent.phoneNumber` | `String?` | Third duplicate — unclear origin |
| `Agent.whatsappStatus` | `String` | `not_connected \| connected \| ...` |
| `Agent.config.phoneNumberId` | `Json` | Meta phone_number_id stored inside config blob |

The webhook handler resolves the incoming number to an Agent via:
1. TenantRegistry lookup (multi-tenant container path)
2. `Agent.ownerPhone` — owner's personal WhatsApp (not the business number)
3. `Agent.shareCode` — CHAT-link routing
4. Recent `Conversation` lookup

There is **no Agent → PhoneNumber join table**. One agent = one number.

---

## What "Multi-Number" Means in Phase 2.3

The roadmap goal is:
> One tenant can have multiple WhatsApp numbers, each → separate Agent row.

This is **already achievable** with the current schema if:
- Each Agent is a separate row owned by the same User
- Each Agent has its own `waPhoneNumberId` in TenantRegistry
- The dashboard allows a User to create multiple Agents under one account

What does **not** work today:
1. No shared business identity across numbers (no "Tenant" entity in the Agent model)
2. No shared knowledge base or config across numbers owned by same business
3. `Agent.config.phoneNumberId` is a JSON blob, not indexed — can't query efficiently
4. Three duplicate phone fields (`whatsappNumber`, `whatsappPhone`, `phoneNumber`) suggest
   unmigrated in-flight work; should be consolidated before adding multi-number

---

## Schema Gaps to Fix Before Multi-Number Launch

### Gap 1 — No `tenantId` FK on Agent
**Problem:** There is no link between `Agent` and `TenantRegistry`. If a business has two
WhatsApp numbers, each gets an `Agent` row but they share no parent identity.

**Fix:**
```prisma
model Agent {
  tenantId  String?   // FK → TenantRegistry.tenantId
  ...
}
```

This allows:
- `prisma.agent.findMany({ where: { tenantId: myTenantId } })` — all numbers for a business
- Shared Chatwoot account across numbers (Phase 3)
- Unified billing per tenant (Phase 7)

### Gap 2 — Duplicate phone number fields
**Problem:** `whatsappNumber`, `whatsappPhone`, `phoneNumber` are all `String?` with unclear
semantics. Only `config.phoneNumberId` is actually used in the webhook path.

**Fix:** Consolidate to one canonical field:
```prisma
model Agent {
  waPhoneNumberId  String?  // Meta phone_number_id — matches TenantRegistry FK
  waDisplayNumber  String?  // Human-readable E.164 (e.g. +17678180001)
  // deprecate: whatsappNumber, whatsappPhone, phoneNumber
}
```

Run a migration that copies `config->>'phoneNumberId'` into `waPhoneNumberId`.

### Gap 3 — `Agent.ownerPhone` is single-value
**Problem:** The owner's personal WhatsApp number is stored as `Agent.ownerPhone String?`.
If the same owner has two agents (two business numbers), both point to the same `ownerPhone`.
The webhook `findFirst({ where: { ownerPhone: from } })` returns only one agent — the latest.

**Impact for multi-number:** Owner messages would only route to the most-recently-created agent.

**Fix options:**
- A. Add a priority or `isDefault` flag on Agent so the owner can designate which agent
  handles their personal commands.
- B. If owner messages to business number A, resolve to Agent A. If to number B, resolve to B.
  This requires the webhook to know which number the owner texted.

For now the `incomingPhoneId` is already available in the webhook — Option B is implementable
without a schema change.

### Gap 4 — No `Agent.status` for `not_connected` + `TenantRegistry.status` divergence
**Problem:** `Agent.status` has values: `draft | active | paused`. `TenantRegistry.status` has
`provisioning | active | inactive`. These can get out of sync.

**Fix:** Add a migration step in the provisioning chain that syncs `Agent.status = 'active'`
when `TenantRegistry.status = 'active'` is set.

---

## Migration Path (before Phase 4)

```sql
-- 1. Add tenantId FK to Agent (nullable, no FK constraint initially)
ALTER TABLE "Agent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Agent" ADD COLUMN "waPhoneNumberId" TEXT;
ALTER TABLE "Agent" ADD COLUMN "waDisplayNumber" TEXT;

-- 2. Backfill from config JSON
UPDATE "Agent"
SET "waPhoneNumberId" = config->>'phoneNumberId'
WHERE config->>'phoneNumberId' IS NOT NULL;

-- 3. Link Agents to TenantRegistry via waPhoneNumberId
UPDATE "Agent" a
SET "tenantId" = t."tenantId"
FROM "tenant_registry" t
WHERE t."waPhoneNumberId" = a."waPhoneNumberId";
```

Prisma schema after:
```prisma
model Agent {
  tenantId         String?
  waPhoneNumberId  String?
  waDisplayNumber  String?
  // ... existing fields ...
}
```

---

## Summary

| Item | Severity | Phase |
|------|----------|-------|
| No tenantId FK on Agent | High — blocks shared identity | Phase 3 |
| Duplicate phone fields | Medium — confusing but not blocking | Phase 3 |
| ownerPhone single-value routing | Medium — breaks multi-agent owner | Phase 4 |
| Agent ↔ TenantRegistry status drift | Low — cron can fix | Phase 3 |

**Recommendation:** Do NOT add multi-number UX until Gap 1 (tenantId FK) is resolved.
The underlying data model must be correct before exposing the feature.
