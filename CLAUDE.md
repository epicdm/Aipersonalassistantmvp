# CLAUDE.md — Isola BFF Project Context
*Read this before touching any file. Updated 2026-04-03.*

---

## What This Project Is

**BFF** (bff.epic.dm / isola.epic.dm) is a Next.js 14 TypeScript SaaS platform where Caribbean businesses sign up, connect their WhatsApp Business number, and get an AI agent that handles customer conversations, voice calls, campaigns, and commerce. Built by EPIC Communications (Dominica ISP) — they own the phone number range 1767818xxxx.

This is a multi-product platform:
- **Product 1 — BFF self-serve**: SMBs sign up via browser, connect WhatsApp, get AI agent
- **Product 2 — Isola Enterprise**: Per-tenant Docker containers running Paperclip + OpenClaw AI

**You are working on Product 1 (BFF) unless told otherwise.**

---

## Server Layout

| Server | IP | Role |
|--------|-----|------|
| BFF | 66.118.37.63 | Next.js app (port 3000), gateway, frontend |
| deepseek | 66.118.37.12 | All tenant containers, Asterisk, voice agent (PM2 id 9, port 3020) |
| voice00 | 157.245.83.64 | Magnus Billing SIP — owns 767-818-XXXX DID pool |

---

## Tech Stack

- **Framework**: Next.js 14 App Router, TypeScript strict
- **Database**: PostgreSQL via Prisma (`/opt/bff/prisma/schema.prisma`)
- **Auth**: Clerk (`app/api/auth/`, `middleware.ts`, `getSessionUser()`)
- **Payments**: Stripe (subscriptions) + Fiserv (Caribbean local)
- **WhatsApp**: Meta Cloud API v21.0
- **AI (BFF agents)**: DeepSeek Chat — `app/lib/agent-chat.ts`, 300 token limit, 7s timeout
- **AI (enterprise)**: Anthropic Claude via Isola tenant containers
- **Voice**: Asterisk ARI on deepseek, Edge TTS, Groq Whisper STT
- **Email**: SMTP (dunning/notifications)
- **Styling**: Tailwind CSS

---

## Critical File Map

```
/opt/bff/
├── app/
│   ├── api/
│   │   ├── whatsapp/
│   │   │   ├── webhook/route.ts      ← ALL incoming WhatsApp messages (2000+ lines)
│   │   │   ├── connect/route.ts      ← OAuth + Meta number registration
│   │   │   └── flows/route.ts        ← WhatsApp Flows endpoint (to be built)
│   │   ├── billing/
│   │   │   └── webhook/route.ts      ← Stripe event handler
│   │   ├── handoff/route.ts          ← Human handoff API (to be built)
│   │   ├── templates/route.ts        ← HSM template CRUD (to be built)
│   │   └── cron/route.ts             ← Cron jobs (to be built)
│   ├── lib/
│   │   ├── whatsapp.ts               ← sendWhatsAppMessage, sendInteractiveButtons, etc.
│   │   ├── campaigns.ts              ← Campaign broadcast + enrollment
│   │   ├── agent-chat.ts             ← DeepSeek AI response generation
│   │   ├── onboarding.ts             ← Owner onboarding Q&A + knowledge extraction
│   │   ├── soul-generator.ts         ← SOUL.md personality file generator
│   │   ├── magnus.ts                 ← Magnus Billing REST API client
│   │   ├── did-provisioner.ts        ← DEPRECATED — use magnus.ts instead
│   │   ├── google.ts                 ← Meta/Facebook/Instagram OAuth (misnamed)
│   │   ├── template-library.ts       ← Pre-built HSM templates (to be built)
│   │   ├── flow-crypto.ts            ← WhatsApp Flows encryption (to be built)
│   │   ├── campaign-analytics.ts     ← Delivery metrics (to be built)
│   │   └── campaign-triggers.ts      ← Event-triggered enrollments (to be built)
│   ├── templates/page.tsx            ← Template management UI (to be built)
│   ├── analytics/page.tsx            ← Analytics dashboard (to be built)
│   ├── handoff/page.tsx              ← Human handoff console (to be built)
│   ├── channels/page.tsx             ← WhatsApp Channels UI (to be built)
│   └── number/
│       └── number-client.tsx         ← 3-path WhatsApp number connect UI
├── prisma/
│   └── schema.prisma                 ← Source of truth for all DB models
└── .env                              ← DO NOT COMMIT. Never log values.
```

---

## Key Patterns

### Getting the current user
```typescript
import { getSessionUser } from '@/app/lib/auth'
const user = await getSessionUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### Prisma usage
```typescript
import { prisma } from '@/app/lib/prisma'
// Always use .catch(() => null) on reads that can fail gracefully
const agent = await prisma.agent.findFirst({ where: { userId: user.id } }).catch(() => null)
```

### Sending a WhatsApp message
```typescript
import { sendWhatsAppMessage, sendInteractiveButtons, sendInteractiveList } from '@/app/lib/whatsapp'
await sendWhatsAppMessage(phone, text, phoneNumberId)
// phoneNumberId is agent.config.phoneNumberId OR process.env.META_PHONE_ID
```

### Schema migrations
```bash
# Always run from /opt/bff:
npx prisma migrate dev --name descriptive_name_here
# Never edit the DB directly. Never skip migrations.
```

### Restart after changes
```bash
pm2 restart bff-web
# Or for env var changes:
pm2 restart bff-web --update-env
```

### Webhook handler structure
`app/api/whatsapp/webhook/route.ts` is the single entry point for ALL inbound WhatsApp, Instagram, and Messenger messages. Key functions inside it:
- `processWebhook(body)` — routes by channel and tenant
- `processStatuses(statuses, phoneId)` — delivery receipts (Sprint 14)
- `handleCustomer(agent, from, text, ...)` — customer AI conversation
- `handleOwnerChat(agent, from, text, ...)` — owner AI conversation
- `handleOnboarding(from, text, agent, ...)` — owner Q&A onboarding

### Agent config shape (JSON stored in `agent.config`)
```typescript
{
  wabaId: string,           // WhatsApp Business Account ID
  phoneNumberId: string,    // Meta phone number ID
  displayPhone: string,     // human-readable phone
  whatsappConnected: bool,
  messengerPageId?: string, // Facebook Page ID (Sprint 24)
  knowledge: {
    businessName, hours, services, pricing, location, faqs,
    media?: { officeLat, officeLng, officeAddress, brochureUrl, menuUrl }
  },
  personality: { tone, escalationContact },
}
```

---

## Environment Variables (Key ones)

```bash
# WhatsApp
META_WA_TOKEN          # System token for Meta API calls
META_SYSTEM_TOKEN      # Admin token (DID registration, WABA management)
META_APP_ID
META_APP_SECRET
META_PHONE_ID          # Default fallback phone number ID
META_VERIFY_TOKEN      # Webhook verification

# Stripe
STRIPE_SECRET_KEY
STRIPE_BILLING_WEBHOOK_SECRET
STRIPE_PRICE_COMMUNITY / PERSONAL / STARTER / PRO / BUSINESS / ISP

# SMTP (dunning emails)
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM

# Meta Embedded Signup
NEXT_PUBLIC_META_APP_ID
NEXT_PUBLIC_META_CONFIG_ID

# Fiserv
FISERV_API_KEY / FISERV_SECRET / FISERV_MERCHANT_ID / FISERV_BASE_URL

# WhatsApp Flows (Sprint 15)
FLOW_PRIVATE_KEY       # RSA 2048-bit PEM

# Messenger (Sprint 24)
MESSENGER_PAGE_ACCESS_TOKEN
MESSENGER_APP_SECRET
```

---

## AI Provider Decision (2026-04-03)

**BFF agents (SMB self-serve):** DeepSeek via `app/lib/agent-chat.ts` — unchanged.

**Enterprise tenant containers (`isola-agent-server.js`):** OpenRouter as primary provider.
```
OPENROUTER_API_KEY=<single key for all containers>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```
Fallback chain: `OPENROUTER_API_KEY` → `ANTHROPIC_API_KEY` → `DEEPSEEK_API_KEY`
Default model: `openrouter/auto` (free tier, handles most SMB WhatsApp volumes)
Cost per tenant at launch: $0

**TODO (mini-sprint alongside Sprint 12):** Update `isola-agent-server.js` to use OpenRouter as primary. One URL swap, API-compatible with Anthropic SDK format.

---

## Agent Architecture Principles (from Claude Code source leak)

5 build priorities for `isola-agent-server.js` (container level, not BFF):

| # | What | File | Effort |
|---|------|------|--------|
| 1 | Hard `max_tokens` + 10-turn cap per conversation | `isola-agent-server.js` | 30m |
| 2 | Session persistence: write `{messages, lastActivity, odooTicketId}` to `/tmp/sessions/{phone}.json` | `isola-agent-server.js` | 1h |
| 3 | Action audit log: every WA send / Odoo ticket / payment logged with outcome | `isola-agent-server.js` | 1h |
| 4 | Agent type constraints: helpdesk=read-only, sales=plan, billing=mutating+approval | `templates.ts` | 2h |
| 5 | Tool registry JSON: `tools/registry.json` declaring name, trust tier, allowed agent types | new file | 3h |

Rule: **before GA, every mutating action (send message, create ticket, process payment) needs an explicit permission check + audit log entry.**

---

## The PRD

All sprint specs (12–25) are at `/home/epicdm/epic-docs/PRD.md`.
Master plan at `/home/epicdm/epic-docs/MASTER_PLAN.md`.

**Before building any sprint:** Read the relevant sprint section in PRD.md. It has exact schema changes, function signatures, file paths, and pass/fail gates.

---

## Non-Negotiable Rules

1. **Never send plain text to a customer who hasn't messaged in 24h** — use template messages (HSM)
2. **Never edit the DB directly** — always `npx prisma migrate dev`
3. **Never log env var values** — log presence only: `META_SYSTEM_TOKEN: configured | MISSING`
4. **Never remove tests** — only add
5. **`did-provisioner.ts` is deprecated** — use `magnus.ts` for all DID provisioning
6. **Interactive buttons/lists are for CUSTOMERS too** — not just owner commands
7. **Every campaign send must check**: `doNotContact`, `optedIn`, `qualityScore !== 'red'`, `nextStepAt`
8. **Delivery status webhooks must not be dropped** — `if (!message) check statuses array first`

---

## Current Sprint

**Sprint 12 — Go-Live Prerequisites.**
See `/home/epicdm/epic-docs/PRD.md` → Sprint 12 section.
After all Sprint 12 gates pass, move to Sprint 13.
