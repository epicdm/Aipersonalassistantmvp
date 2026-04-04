# TODOS

## Per-Tenant Envelope Keys (Key Rotation Strategy)
**What:** Replace single TENANT_MASTER_KEY with per-tenant envelope encryption. Each tenant gets a unique data encryption key (DEK) encrypted by the master key (KEK). Rotation = re-encrypt DEKs, not re-encrypt all tokens.
**Why:** Single master key means one leak compromises ALL tenant tokens. Envelope encryption limits blast radius to one tenant per leaked DEK.
**Context:** provision/route.ts line 52 has the comment "Sprint 1: per-tenant envelope key." crypto.ts currently derives AES key from SHA-256 of TENANT_MASTER_KEY. Change to: generate random DEK per tenant, encrypt DEK with KEK, store encrypted DEK alongside token.
**Depends on:** Sprint 18 (token storage must be working first).
**Added:** 2026-04-03 by /plan-eng-review (outside voice flagged single-key risk)

## Dead-Letter Queue for Webhook Deliveries
**What:** Store failed webhook deliveries in a DB table and retry when tenant container recovers. Currently, unreachable containers cause silent message loss (webhook/route.ts:603-606 logs "dead-lettered" but doesn't store).
**Why:** Container restarts mean 30-60 seconds of lost customer messages. In a market where the competitor is "business owner picks up the phone," losing even one message erodes trust.
**Context:** webhook/route.ts:594-608 proxies to `http://66.118.37.12:{port}/webhook`. On fetch failure, it logs and returns. Add a `dead_letter` table: `{ id, tenantId, payload, attempts, createdAt }`. Retry on container health-check success.
**Depends on:** Nothing. Independent of Sprint 18.
**Added:** 2026-04-03 by /plan-eng-review (outside voice flagged silent message loss)
