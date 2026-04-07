# 04 — Build Priorities
*Generated 2026-04-06.*

---

## Must Build Now (Phase 0-1)

Blockers. Nothing else matters until these are done.

| Priority | Item | Why Blocking |
|----------|------|-------------|
| P0 | Remove db push --accept-data-loss from build | Can silently drop production data |
| P0 | Per-tenant DEK/KEK encryption | Single key = all tenant tokens exposed on one breach |
| P0 | Fix port sequence ceiling (100 tenant max) | One marketing campaign fills it |
| P0 | Dead-letter queue for webhook | Lost messages = lost customer trust |
| P1 | Chatwoot account provisioning on signup | Operator console never gets created today |
| P1 | Unify auth (Clerk vs JWT) | Mixed auth = uncovered API routes |
| P1 | Decompose 2000-line webhook handler | Untestable and fragile |
| P1 | Increase AI token limit (300 -> 800) | Cuts responses mid-sentence on anything real |
| P1 | Tenant-level billing | Billing model is wrong for multi-tenant SaaS |
| P1 | Embedded Signup UI at isola.epic.dm/connect | No self-serve onboarding = no product |

---

## Should Build Next (Phase 2-4)

High value, ship after Phase 0-1 is stable.

| Priority | Item | Value |
|----------|------|-------|
| P2 | Chatwoot bidirectional sync | Human agents need to see AI conversations |
| P2 | Chatwoot webhook receiver | Agent replies must reach WhatsApp |
| P2 | Owner watch/whisper/takeover | Biggest trust-builder for SMB owners |
| P2 | Worker implementations (all 5) | Workers are currently empty stubs |
| P2 | Tool registry + execution layer | Agent cannot take actions without this |
| P2 | Post-provisioning onboarding sequence | Owners need guided setup after signup |
| P3 | AI model provider abstraction | DeepSeek lock-in is a risk |
| P3 | Context window management | Full history loading breaks at scale |
| P3 | Knowledge base loading | Agents need business context to be useful |
| P3 | Payment link tool (Stripe + Fiserv) | Monetization milestone |
| P3 | Booking tool wired to AI | High-value demo feature |

---

## Later / Optional (Phase 5-7)

| Item | Notes |
|------|-------|
| Usage metering | After billing model is correct |
| Instagram DM integration | WhatsApp first, Instagram after |
| Messenger integration | Stub only, defer |
| Attribution/CAPI | Growth feature |
| Reseller tier | Phase 7 |
| White-label subdomain routing | Phase 7 |
| Google Calendar sync | Nice-to-have |
| Advanced analytics | Need baseline data first |
| CTWA ads / lead ads | Growth feature |

---

## Anti-Goals (Do Not Build Yet)

| Anti-Goal | Why |
|-----------|-----|
| Build a custom Chatwoot replacement | Chatwoot works. Do not rebuild the inbox now. |
| Paperclip/OpenClaw agent runtime | app/lib/runtime/ is sufficient for now |
| Full Odoo ERP integration | Way too early. Conversations first. |
| Mobile app | WhatsApp IS the mobile experience. |
| Real-time websocket dashboard | Polling is fine at this scale. |
| Advanced NLP/RAG pipeline | Start with knowledge in prompt first. |
| Facebook Pages full automation | Not the core channel. Later. |
| Email channel | Not WhatsApp. Not now. |

---

## The MVP Slice

A business owner can:
1. Visit isola.epic.dm/connect
2. Complete Meta Embedded Signup
3. Have an AI receptionist on their WhatsApp in 5 minutes
4. Watch conversations in Chatwoot
5. Take over any conversation if needed
6. Pay for it with a credit card

MVP requires:
- All Phase 0 hardening items
- Embedded Signup UI
- Chatwoot sync (conversations visible to agents)
- Working owner takeover via WhatsApp command
- One working template (receptionist)
- Stripe billing (pro plan)
- Post-provisioning welcome WhatsApp message

MVP does NOT require:
- All 5 workers implemented
- Full tool registry
- Campaign automation
- Analytics dashboard
- Instagram or Messenger
- Fiserv
- Reseller tier
