# 01 — Isola Product Architecture
*Generated 2026-04-06. Based on codebase inspection of bff-sandbox/repo-20260406 + bff_prd.txt.*

---

## Product Thesis

Isola is a **WhatsApp-first business operating system** for SMBs.

Not a helpdesk. Not a chatbot platform. Not a CRM.

A business operating system: the business owner connects their WhatsApp number once and gets AI agents that handle conversations, qualify leads, take bookings, collect payments, run campaigns, manage their catalog, and escalate to the owner when it matters. Everything happens inside WhatsApp — the channel the owner and their customers already live in.

Chatwoot is the **operator console layer** — the inbox where human agents and owners watch and intervene. It is not the product brain. It is replaceable.

The real product brain lives in Isola/BFF.

---

## System Boundaries

```
[Meta WhatsApp Cloud API]
        |
        v
[Isola BFF — the product brain]
  +-- Tenant Provisioning (Meta Embedded Signup -> OCMT -> container)
  +-- Channel Router (webhook ingress, tenant resolution, dedup)
  +-- Conversation Orchestrator (AI/human ownership, session state)
  +-- AI Runtime (workers: customer/owner/support/sales/collections)
  +-- Action Executor (bookings, payments, catalog, templates)
  +-- Owner Console API (watch, whisper, takeover)
  +-- Billing & Entitlements (Stripe + Fiserv)
  +-- Analytics & Reporting
  +-- Chatwoot Adapter (sync conversations + contacts to Chatwoot)
        |
        v
[Chatwoot — operator inbox layer]
  +-- Human agent replies
  +-- Conversation assignment
  +-- Human takeover initiated from Chatwoot webhook -> Isola
  +-- (Replaceable over time)
        |
        v
[OCMT — container manager on 66.118.37.12]
  +-- isola-tenant containers (one per WhatsApp number)
        |
        v
[External: LiveKit/Voice, Magnus Billing, Stripe, Fiserv, DeepSeek/Claude]
```

**What Isola owns:**
- Meta Embedded Signup initiation and OAuth
- Tenant provisioning and registry
- WhatsApp webhook ingress and routing
- AI agent configuration and execution
- Message persistence and conversation state
- Owner watch / whisper / takeover state
- Billing subscriptions and plan enforcement
- Analytics, audit trail, and activity logs
- Chatwoot provisioning via Platform APIs

**What Chatwoot owns:**
- Human agent inbox UI
- Assignment routing to human agents
- Human-to-customer reply transport
- SLA tracking (optional)

**What Chatwoot does NOT own:**
- WhatsApp number connection (that is Isola's Embedded Signup)
- AI agent logic
- Billing
- Tenant provisioning
- Owner watch / whisper (custom Isola features)
- Analytics beyond basic conversation counts

---

## Core Domain Model

```
Tenant
  +-- waPhoneNumberId (Meta)
  +-- wabaId
  +-- businessName
  +-- plan (free | starter | pro | business)
  +-- status (provisioning | active | suspended)
  +-- containerPort (from SEQUENCE, 3200-3299)
  +-- tokenEncrypted (AES-256-GCM)
  +-- chatwootAccountId (after provisioning)
  +-- Agent[]

Agent
  +-- template (receptionist | sales | support | collector | concierge | assistant)
  +-- soul (SOUL.md — personality file)
  +-- approvalMode (auto | confirm | notify)
  +-- tools (JSON array of enabled capabilities)
  +-- guardrails (JSON)
  +-- whatsappNumber
  +-- ownerPhone
  +-- KnowledgeSource[]

Conversation
  +-- sessionType (customer | owner)
  +-- status (active | ai_handling | human_takeover | closed)
  +-- escalationFlag
  +-- WhatsAppMessage[]

Contact
  +-- phone
  +-- stage (lead | qualified | customer | at_risk | inactive)
  +-- tags[]
  +-- customFields
  +-- doNotContact

MessageDraft
  +-- draftText (AI proposed reply)
  +-- status (pending | approved | rejected | sent)
  +-- ownerEdit

TenantRegistry (Prisma: tenant_registry)
  +-- tenantId
  +-- waPhoneNumberId (unique)
  +-- containerPort (unique, from SEQUENCE)
  +-- tokenEncrypted
  +-- template
  +-- status
```

**Current schema gaps:**
- No `chatwootAccountId` on TenantRegistry or Agent
- No `organizationId` / reseller hierarchy
- No explicit `WatchSession` model for owner watch
- No `WhisperMessage` model
- No `entitlement` / usage meter tables
- No `deadLetterQueue` table (noted in TODOS.md)

---

## Tenant Model

**Provisioning lifecycle:**
```
1. Business owner visits isola.epic.dm/demo
2. Meta Embedded Signup -> POST /api/isola/signup
   - Code exchange with Meta Graph API
   - Phone number registration (PIN: 290909)
   - WABA webhook subscription
3. TenantRegistry created (status=provisioning)
4. OCMT called -> spins up isola-tenant container
5. Container health -> PATCH /api/provision (status=active)
6. BFF webhook now routes messages to this tenant
7. Chatwoot account provisioned via Platform API
8. Owner notified via WhatsApp
```

**Current cap:** 100 tenants (port SEQUENCE 3200-3299). This is a hard ceiling that must be resolved before any marketing push.

**Recommended fix:** Move to Traefik label-based routing with tenant subdomain or URL routing, eliminating the port sequence ceiling entirely.

---

## Channel Model

Current channels in schema (Conversation.channel, WhatsAppMessage.channel):
- `whatsapp` (primary — fully implemented)
- `instagram` (webhook exists at /api/instagram/webhook, partially implemented)
- `messenger` (webhook exists at /api/messenger/webhook, stub)
- `voice` (via LiveKit/Asterisk — implemented but separate)

**Isola v1 channel priority:**
1. WhatsApp (all energy here)
2. Voice (EPIC's moat — owns SIP/DID infrastructure)
3. Instagram DMs (secondary, later)
4. Messenger (later)

---

## Message Lifecycle

```
Inbound WhatsApp message ->
  POST /api/whatsapp/webhook ->
    Tenant resolution (by waPhoneNumberId) ->
      Session type detection (owner phone? -> owner session) ->
        Conversation upsert ->
          orchestrateInboundMessage() ->
            loadRuntimeContext() ->
              selectWorker() -> [customer|owner|support|sales|collections] ->
                planXxxResponse() ->
                  evaluatePolicy() -> [execute|draft|deny] ->
                    executePlannedActions() ->
                      if execute: sendWhatsAppMessage() + logAudit()
                      if draft: createMessageDraft() + notifyOwner()
                      if deny: escalate
          Chatwoot sync (async) ->
            POST to Chatwoot adapter
```

**Current webhook file:** `app/api/whatsapp/webhook/route.ts` — 2000+ lines. This is the highest-priority refactor target.

---

## AI Lifecycle

```
Agent created -> template assigned -> soul generated (soul-generator.ts) ->
  Knowledge sources added (KnowledgeSource) ->
    Agent deployed (status: draft -> active) ->
      Conversations handled by orchestrator ->
        Worker selects response strategy ->
          DeepSeek API call (getAgentResponse) ->
            Response delivered or drafted ->
              Owner approves/edits (if approvalMode=confirm) ->
                Message sent
```

**Current AI model:** DeepSeek Chat (`sk-443f0af69dc1...`) — 300 token limit, 7s timeout. This is very aggressive for business conversations and should be increased.

**Templates currently implemented:**
- `assistant` — personal productivity
- `study-buddy` — tutoring
- `receptionist` — front desk
- `concierge` — tourism
- `collector` — collections/AR
- `sales` — lead qualification
- `support` — customer support

---

## Human Takeover Lifecycle

```
Trigger options:
  A. Owner types "take over" / "stop agent" to their own WhatsApp number
  B. Escalation flag set by AI (e.g. negative sentiment, payment dispute)
  C. Owner clicks takeover in Chatwoot or Isola dashboard
  D. Timeout (no AI response within N seconds)

Takeover flow:
  1. conversation.sessionType -> 'owner' (or explicit takeover flag)
  2. AI stops responding to customer
  3. Chatwoot notified -> conversation assigned to human agent
  4. Owner can send whisper messages (visible only to agents, not customer)
  5. Owner replies to customer via Chatwoot or direct WhatsApp
  6. Owner types "return to agent" -> AI resumes

Current state:
  - Owner session detection exists (sessionType='owner' in schema)
  - MessageDraft approval flow exists (approvalMode='confirm')
  - No explicit WatchSession model
  - No whisper message model
  - No "return to agent" command handling
  - Chatwoot sync for takeover state: NOT IMPLEMENTED
```

---

## Embedded Signup Lifecycle

**Current implementation:** `app/api/isola/signup/route.ts` (277 lines)

```
POST /api/isola/signup
  Body: { code, phoneNumberId, wabaId, displayPhone, template, businessName }

  1. Validate input
  2. Exchange OAuth code for WABA token (Meta Graph API v25.0)
  3. Register phone number with Meta (PIN: 290909)
  4. Subscribe WABA to webhook
  5. Fetch business_id (graceful degradation)
  6. Idempotency check (409 if already provisioned)
  7. Encrypt token (AES-256-GCM, TENANT_MASTER_KEY)
  8. Allocate containerPort (Postgres SEQUENCE tenant_port_seq)
  9. Create TenantRegistry (status=provisioning)
  10. Call OCMT POST /api/tenants
  11. Return 202

  Then async:
  OCMT spins up isola-tenant container ->
    PATCH /api/provision { tenantId, status: 'active' }
```

**Gaps:**
- No user account created during signup (Isola signup is anonymous/business-level)
- No Chatwoot account provisioned at this point
- No onboarding flow after provisioning (owner gets no guided setup)
- PIN `290909` is hardcoded — should be configurable per deployment

---

## Billing and Entitlement Model

**Current implementation:**
- `User.plan` field: `free | pro | business` (string, no enforcement middleware)
- `Subscription` table: Stripe-backed
- `app/api/billing/checkout/route.ts`: creates Stripe Checkout Session
- `app/api/billing/webhook/route.ts`: handles Stripe events (subscription.created, updated, deleted)
- Fiserv: referenced in schema (`fiservOrderId`, `fiservTxnId`) but not fully wired

**Plans:**
```
free:     0 agents, no WhatsApp connection
pro:      price_id from STRIPE_PRICE_PRO — exact features TBD
business: price_id from STRIPE_PRICE_BUSINESS — exact features TBD
```

**Current gaps:**
- No entitlement enforcement at API layer (anyone can call any API once authed)
- No usage metering (message count, conversation count, campaign sends)
- No overage handling
- Fiserv not fully connected (Caribbean local payments — critical for Dominica market)
- No tenant-level billing (billing is User-level, not Tenant-level)
- No reseller billing tier

---

## Replaceable Chatwoot Strategy

Chatwoot is used today as:
1. Agent inbox (human agent replies to customers)
2. Conversation history display
3. Contact management (partial sync)

To keep Chatwoot replaceable:
1. **All business logic must live in Isola** — Chatwoot only receives sync'd copies of conversations
2. **Chatwoot is written to via adapter** — the `ChaiwootAdapter` service is the only code that calls Chatwoot APIs
3. **Isola's DB is the source of truth** — Chatwoot is a consumer, not the store
4. **Takeover/whisper state lives in Isola** — not in Chatwoot native features
5. **If Chatwoot goes down** — Isola continues handling conversations; Chatwoot is eventually consistent

**Replacement trigger conditions:**
- Chatwoot performance degrades at >500 concurrent conversations
- Chatwoot licensing changes
- Need for deeper AI/agent native UX that Chatwoot can't provide
- White-label requirement for a customer who can't have "Chatwoot" branding
