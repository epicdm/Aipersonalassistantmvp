# 06 — Phase 0: Tenant Routing Remediation Plan
*Generated 2026-04-06.*

---

## Problem Statement

The current tenant routing allocates a unique port per tenant from a Postgres SEQUENCE
(tenant_port_seq, MINVALUE 3200, MAXVALUE 3299).

This creates a **hard ceiling of 100 tenants**. Once reached:
- The SEQUENCE throws an exception
- New provisioning fails with a 503
- An alert is sent to Eric, but no automatic recovery exists
- Existing tenants continue to work

Every tenant message is proxied in the webhook handler like:
```
http://66.118.37.12:{tenant.containerPort}/webhook
```

This couples the routing model directly to port numbers and to a specific IP address (66.118.37.12).

---

## Current Code Locations

All code that must change for a routing overhaul:

| File | Line(s) | Issue |
|------|---------|-------|
| `app/api/provision/route.ts` | 67-78 | Allocates port from tenant_port_seq |
| `app/api/provision/route.ts` | 98-110 | Passes containerPort to OCMT |
| `app/api/isola/signup/route.ts` | (similar section) | Allocates port from tenant_port_seq |
| `app/api/whatsapp/webhook/route.ts` | 520 | Constructs URL: `http://66.118.37.12:{port}/webhook` |
| `prisma/schema.prisma` | TenantRegistry | containerPort field |
| Migration SQL | tenant_port_seq | SEQUENCE must be dropped after migration |
| OCMT (`66.118.37.12:4000`) | /api/tenants | Accepts containerPort, binds container to it |

---

## Recommended Solution: Traefik Label Routing

Replace port-per-tenant with label-based routing. Each container is registered with
a Traefik label `traefik.http.routers.tenant-{tenantId}.rule=Header(X-Tenant-Id, {tenantId})`
(or path prefix, or subdomain). Traefik routes inbound requests to the correct container
by label match, not by port number. No ceiling.

### Routing model options (pick one):

**Option A — Tenant-ID header routing** (simplest)
BFF webhook handler sets `X-Tenant-Id: {tenantId}` header before proxying.
Traefik matches on header value.
Pros: No DNS changes. Works with single domain.
Cons: BFF must set header correctly.

**Option B — Subdomain routing** (cleanest long-term)
Each tenant gets a subdomain: `t-{tenantId}.containers.epic.dm`
BFF webhook constructs URL from tenantId, not port.
Pros: Easy to debug, works with TLS per tenant.
Cons: Requires wildcard DNS and wildcard TLS cert for containers.epic.dm.

**Option C — Path-prefix routing** (intermediate)
BFF proxies to: `http://containers.epic.dm/t/{tenantId}/webhook`
Traefik routes by path prefix.
Pros: Single domain, no cert changes.
Cons: Containers must handle path prefix or Traefik strips it.

### Recommended: Option A (header routing) for sprint 1

---

## Migration Steps

### Step 1: OCMT changes (infra work, not app-code)
1. Install/configure Traefik on 66.118.37.12 as reverse proxy for containers
2. Update OCMT to register each container with Traefik labels on startup
3. Remove port binding from container launch command (or bind to random ephemeral port)
4. OCMT `POST /api/tenants` response no longer needs to return `containerPort`
   (or returns 0 as placeholder during transition)

### Step 2: App code changes (can be done in parallel)
1. Add `containerUrl String?` field to TenantRegistry (to hold the Traefik-routed URL)
2. Keep `containerPort Int?` but make it nullable (for backward compat with live tenants)
3. Update webhook handler: use `tenant.containerUrl` if set, fall back to port-based URL
4. Update provision route: accept optional `containerUrl` from OCMT response
5. Update isola/signup: same

```typescript
// New webhook routing logic (replaces line 520):
const containerUrl = tenant.containerUrl
  ?? `http://66.118.37.12:${tenant.containerPort}/webhook`  // legacy fallback
```

### Step 3: Migration
1. For each active tenant, OCMT registers the container with Traefik
2. OCMT updates TenantRegistry.containerUrl via PATCH /api/provision
3. Once all live tenants have containerUrl set, retire the port-sequence path
4. Drop tenant_port_seq from DB
5. Remove port-based fallback from webhook handler

### Step 4: Schema cleanup
1. Make containerPort nullable: `containerPort Int?`
2. Add `containerUrl String?`
3. Run migration

---

## What Can Be Done NOW (without infra changes)

The following code hardening can be done immediately to prepare:

1. ~~Hardcode 66.118.37.12~~ — already moved to `OCMT_CONTAINER_HOST` env var in this sprint
   (see 07-phase0-implementation-report.md for the env var list)
2. Add `containerUrl` field to TenantRegistry schema (nullable — done in schema migration)
3. Add fallback logic in webhook handler (uses containerUrl if set, falls back to port)

These changes are **backward compatible** — no existing tenants are disrupted.

---

## Environment Variables Required After Migration

```
OCMT_CONTAINER_HOST=66.118.37.12   # or traefik hostname after migration
OCMT_CONTAINER_SCHEME=http         # http for internal, https if Traefik terminates TLS
TRAEFIK_ADMIN_API=http://66.118.37.12:8080  # for health checks (future)
```

---

## Risk if Not Fixed

- At 100 tenants: `nextval('tenant_port_seq')` throws, new provisioning returns 503
- Alert goes to Eric's WhatsApp but no auto-recovery
- Affected: only new signups — existing 100 tenants keep working
- Recovery requires: manual SEQUENCE reset or infra changes under pressure

**Estimated time to hit ceiling at current growth:** depends entirely on marketing spend.
One targeted campaign to Dominica businesses could hit 50-100 signups in a week.
