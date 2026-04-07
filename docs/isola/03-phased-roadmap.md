# 03 — Phased Roadmap
*Generated 2026-04-06.*

---

## Phase 0 — Architecture and Hardening (Do First, Blocks Everything)

Goal: Make the foundation safe to build on.

### 0.1 Fix the build script
- File: package.json:8
- Remove: prisma db push --accept-data-loss
- Replace with: prisma migrate deploy

### 0.2 Per-tenant DEK/KEK encryption
- File: app/lib/crypto.ts
- Generate random DEK per tenant at provisioning time
- Encrypt DEK with master KEK (TENANT_MASTER_KEY)
- Store encrypted DEK in TenantRegistry (new field: tenantDek)
- Update encryptToken/decryptToken to use per-tenant DEK
- Reference: TODOS.md item 1

### 0.3 Fix port sequence ceiling
- Remove dependency on tenant_port_seq (MAXVALUE 3299, only 100 tenants)
- Replace with Traefik label-based routing (no ceiling)
- Hard blocker before any marketing campaign

### 0.4 Unify auth
- Clerk for all operator/dashboard routes
- Internal HMAC secret for service-to-service (OCMT callbacks)
- Document which routes are public vs protected

### 0.5 Dead-letter queue for webhooks
- Add DeadLetter Prisma model: { id, tenantId, waPhoneNumberId, payload, attempts, createdAt, lastAttemptAt }
- Store failed deliveries instead of silently dropping
- Add retry cron job

### 0.6 Harden OCMT callback
- Make OCMT_CALLBACK_SECRET required (fail hard if missing)
- Move hardcoded 66.118.37.12 to env-only

### 0.7 Schema additions
New migrations needed:
- TenantRegistry.chatwootAccountId String?
- TenantRegistry.businessName String?
- TenantRegistry.wabaId String?
- TenantRegistry.tenantDek String?
- DeadLetter table
- WatchSession table

Deliverable: Safe codebase that cannot lose data or expose tokens.

---

## Phase 1 — Tenant and Control-Plane Foundation

Goal: Every provisioned tenant has a complete, consistent workspace.

### 1.1 Complete the provisioning chain
After PATCH /api/provision (container healthy):
1. Provision Chatwoot account via Platform API
2. Store chatwootAccountId in TenantRegistry
3. Create default WhatsApp inbox in Chatwoot account
4. Create tenant admin user in Chatwoot
5. Send welcome WhatsApp message to owner

### 1.2 Tenant management APIs
- GET  /api/admin/tenants
- GET  /api/admin/tenants/:id
- POST /api/admin/tenants/:id/suspend
- POST /api/admin/tenants/:id/resume
- POST /api/admin/tenants/:id/reprovision

### 1.3 Tenant-level billing
- Add tenantId FK to Subscription table
- Migrate billing from User-level to Tenant-level
- Plan enforcement middleware: withPlanCheck(plan, handler)
- Usage tracking: message count per tenant per billing period

### 1.4 Post-provisioning onboarding sequence
After provisioning, send owner WhatsApp sequence:
1. Agent is ready + dashboard login link
2. Set business hours prompt
3. Add catalog/services prompt
4. Test your agent demo
5. Upgrade prompt (if on free)

Deliverable: Clean end-to-end provisioning with Chatwoot account and owner welcome.

---

## Phase 2 — WhatsApp Onboarding and Routing

Goal: A business owner can self-serve connect their WhatsApp number.

### 2.1 Decompose webhook handler
Break app/api/whatsapp/webhook/route.ts (2000+ lines) into:
- app/lib/webhook/ingress.ts — signature verify, dedup, parse
- app/lib/webhook/tenant-router.ts — resolve tenant from waPhoneNumberId
- app/lib/webhook/session-detector.ts — owner vs customer session
- app/lib/webhook/message-handler.ts — route to orchestrator
- app/lib/webhook/event-handler.ts — status updates, read receipts
- app/lib/webhook/chatwoot-sync.ts — async Chatwoot mirror

### 2.2 Embedded Signup UI (isola.epic.dm/connect)
- Meta Embedded Signup JS SDK integration
- Phone number selection
- Template selection (receptionist/sales/support/etc.)
- Progress indicator: connecting -> provisioning -> ready
- Error handling with clear user messages

### 2.3 Multi-number support
- One tenant can have multiple WhatsApp numbers
- Each number -> separate Agent row

### 2.4 Number disconnect/reconnect
- DELETE /api/isola/disconnect/:phoneNumberId
- Revoke Meta token, mark tenant inactive
- Keep conversation history

### 2.5 Webhook routing cache
- Active tenant lookup must be < 5ms
- In-memory cache with TTL for TenantRegistry lookups

Deliverable: Business owner connected and receiving AI replies in under 5 minutes.

---

## Phase 3 — Operator Console Integration (Chatwoot)

Goal: Human agents can see all conversations and intervene when needed.

### 3.1 Chatwoot sync service
New module: app/lib/chatwoot/
- adapter.ts — Chatwoot API client
- contact-sync.ts
- conversation-sync.ts
- message-sync.ts
- webhook-ingest.ts

### 3.2 Bidirectional sync
- Isola to Chatwoot: new messages, conversations, contact updates
- Chatwoot to Isola: agent replies (forward to WhatsApp), assignments, labels

### 3.3 Chatwoot webhook receiver
- POST /api/chatwoot/webhook
- On message_created by human agent: forward to WhatsApp
- On conversation_resolved: mark Conversation.status = closed

### 3.4 Per-tenant inbox mapping
- Each tenant: one Chatwoot account, one inbox per WhatsApp number

Deliverable: Human agents in Chatwoot see all AI conversations and can reply.

---

## Phase 4 — AI Agent Modes

Goal: The AI handles real business conversations end-to-end.

### 4.1 Implement worker bodies (currently empty stubs)
- workers/customer.ts — general service with tool access
- workers/support.ts — troubleshooting + escalation
- workers/sales.ts — qualification + pricing + follow-up
- workers/collections.ts — payment follow-up + plan negotiation
- workers/owner.ts — owner commands

### 4.2 Tool registry and execution layer
Agent.tools exists as JSON string. Implement execution:
- catalog.lookup
- booking.create / booking.check
- payment.link
- contact.qualify
- escalate.human
- send.template
- business_hours.check

### 4.3 AI model upgrade path
- Make model configurable per agent template
- Increase default to 800 tokens (from 300)
- Add app/lib/ai-provider.ts abstraction: DeepSeek | Claude | OpenAI

### 4.4 Knowledge loading
- Load KnowledgeSource content into system prompt
- Cache compiled system prompt per agent (TTL = 5 min)
- Limit conversation history to last 20 messages + rolling summary

Deliverable: Agent handles 80% of inbound conversations without human intervention.

---

## Phase 5 — Owner Watch / Whisper / Takeover

Goal: Owner can monitor and control their AI agent without complexity.

### 5.1 Watch mode
- Owner texts their number "watch" -> watch mode on
- Receives copy of every inbound message
- AI continues responding
- New model: WatchSession { id, agentId, ownerPhone, startedAt, endedAt, mode }

### 5.2 Whisper mode
- Owner prefixes message with "!" -> inserted into AI context as internal note
- Customer never sees the whisper
- New model: WhisperMessage { id, conversationId, agentId, content, createdAt }

### 5.3 Takeover mode
- Owner texts "take over" -> Conversation.sessionType = owner
- AI stops responding, owner talks directly to customer
- Chatwoot notified: conversation assigned to owner
- Resume: "resume agent"

### 5.4 Escalation triggers (auto takeover)
- Negative sentiment, payment dispute, legal keywords, customer asks for human

Deliverable: Owner can run business confidently knowing they can always intervene.

---

## Phase 6 — Workflows, CRM, Payments, Bookings

Goal: Agent takes real business actions, not just chat.

### 6.1 Payment links
- Tool: payment.link via Stripe or Fiserv (Caribbean)
- Send via WhatsApp interactive message
- Track completion via webhook

### 6.2 Booking tool
- Wire app/lib/booking.ts to AI tool
- booking.create, booking.check, booking.reschedule
- Reminder cron (app/api/cron/reminders/ already exists)

### 6.3 Catalog tool
- Wire app/lib/catalog.ts to catalog.lookup
- Send product cards via WhatsApp interactive list messages

### 6.4 Lead qualification pipeline
- Contact stages: lead -> qualified -> customer -> at_risk -> inactive
- AI updates stage on signals, triggers campaigns on stage change

Deliverable: Agent handles bookings, payments, product inquiries without human.

---

## Phase 7 — Analytics, Billing, White-Label Polish

Goal: Platform is productized and ready for growth.

### 7.1 Analytics dashboard
- Conversation volume, AI vs human resolution rate
- Escalation rate, response time, revenue attributed to AI
- Campaign performance

### 7.2 Billing hardening
- Usage metering: messages, conversations, campaigns
- Overage handling: soft limit -> notification -> hard limit
- Fiserv full integration (Caribbean local payments)

### 7.3 Plan enforcement
- withPlanCheck() middleware on all API routes

### 7.4 White-label foundation
- Remove EPIC branding from email templates and UI
- Subdomain routing: business.isola.epic.dm -> tenant workspace

### 7.5 Reseller tier
- Reseller creates accounts for clients
- Reseller billing and dashboard
