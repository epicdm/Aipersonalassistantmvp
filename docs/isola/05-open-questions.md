# 05 — Open Questions
*Generated 2026-04-06. These need decisions from Eric before implementation.*

---

## Product Questions

Q1: What are the exact pricing and plan limits?
STRIPE_PRICE_PRO and STRIPE_PRICE_BUSINESS env vars are empty. Plans are free/pro/business
but feature limits are not defined.
- How many WhatsApp numbers per plan?
- How many conversations per month?
- What triggers upgrade prompt?
- Is there a free trial?

Q2: What is the go-to-market sequence?
- Dominica businesses first or Caribbean-wide from day one?
- First channel: paid ads, cold outreach, or EPIC ISP customer referrals?
- Target business type for MVP? (restaurant, hotel, services, retail?)

Q3: Single app or split BFF/Isola?
TWO-APP-TWO-SERVER-PLAN-2026-04-06.md recommends splitting BFF (personal assistant) and
Isola (business platform) into separate apps. Decision needed:
- Continue as one app?
- Split now into two repos on two servers?
- If splitting: 206.53.141.42 = BFF, 66.118.37.12 = Isola?

Q4: What is the Chatwoot deployment model?
- One shared Chatwoot instance (inbox.epic.dm) with multiple accounts via Platform API?
- Or one Chatwoot per business tenant? (not scalable)

Q5: What is the white-label story?
- Will resellers get their own branded version?
- Or always EPIC-branded?

---

## Technical Questions

Q6: What replaces port-per-tenant routing?
Options: Traefik dynamic labels (recommended), Nginx upstream map, subdomain routing.
Who owns this decision: OCMT or BFF team?

Q7: Where does Chatwoot Platform API provisioning happen?
- Platform API is self-hosted-only, requires super-admin token
- What is the super-admin token for inbox.epic.dm?

Q8: What is the AI model strategy?
- Stay on DeepSeek (cheap, fast)?
- Move to Claude Haiku for better quality?
- Different models per template (Claude for sales, DeepSeek for receptionist)?
- What is the target cost per conversation?

Q9: Which server is the long-term home for Isola?
- Currently mixed on 66.118.37.12
- 206.53.141.42 (vpbx00.epic.dm) is the new clean build target
- Does Isola get its own production server?

Q10: How does the owner log into the dashboard?
- /api/isola/signup creates a TenantRegistry but no user account
- Clerk? WhatsApp OTP magic link? Email login?
- How is Chatwoot account linked to Isola owner account?

---

## Operational Questions

Q11: What is the incident response plan for OCMT failures?
New provisioning fails and dead-lettered messages accumulate. Who gets paged? Recovery SLA?

Q12: What is the backup strategy for TenantRegistry?
tokenEncrypted contains WhatsApp tokens. DB loss = all tenants lose WhatsApp connections.

Q13: How is PIN 290909 managed?
Hardcoded in app/api/isola/signup/route.ts:82. Should be moved to env var.
What if it needs to change?

Q14: How are EPIC ISP customers different from SaaS customers?
EPIC owns DID range 1767818XXXX. EPIC-provisioned package vs self-serve SaaS?
Different billing or feature tiers?

Q15: What is the AI fallback when DeepSeek is down?
Current behavior: silence. Should send fallback message to customer + notify owner + queue retry.

---

## Executive Summary

Isola has a surprisingly mature codebase for a v0 product. The provisioning chain
(Meta Embedded Signup -> OCMT -> container) is well-designed. The runtime architecture
(orchestrator -> workers -> policy-gate -> action-executor) is structurally sound.
The schema covers most of the domain correctly.

The main problems are:
1. Three critical security/data issues that must be fixed before growth:
   port ceiling at 100 tenants, single master encryption key, destructive build script
2. The product brain is wired up but thin:
   workers are stubs, tools do not execute, Chatwoot sync does not exist
3. The self-serve onboarding loop is incomplete:
   owner signs up but has no guided journey after provisioning
4. The webhook handler is a 2000-line monolith:
   works but fragile and hard to extend or test

Fix the foundation first. Then complete the wiring. Then drive customers through it.

---

## Top 10 Implementation Priorities

1. Remove db push --accept-data-loss from build script
2. Per-tenant DEK/KEK encryption (TODOS.md item 1)
3. Fix port sequence ceiling -> Traefik routing
4. Add dead-letter queue for webhook delivery (TODOS.md item 2)
5. Chatwoot account provisioning in signup flow
6. Embedded Signup UI at isola.epic.dm/connect
7. Decompose 2000-line webhook handler
8. Implement worker bodies (customer + support + sales)
9. Owner takeover command handling (WhatsApp -> conversation.sessionType=owner)
10. Stripe plan enforcement middleware

---

## Top 10 Risks

1. Port ceiling at 100 tenants — one campaign fills it
2. Single TENANT_MASTER_KEY — one breach exposes all tenant WhatsApp tokens
3. Silent message loss on container restart — no dead-letter = lost customer messages
4. db push --accept-data-loss — can silently drop columns in production
5. Chatwoot never provisioned on signup — operators have no inbox
6. No AI fallback when DeepSeek is down — customers get silence
7. Mixed auth systems — uncovered API routes are a security hole
8. 300 token AI limit — agent responses cut off mid-message
9. OCMT hardcoded to 66.118.37.12 — infrastructure change breaks all provisioning
10. No tenant isolation testing — port-based routing brittle under load

---

## Top 10 Unanswered Questions

1. What are the exact plan prices and feature limits?
2. Single app or split BFF/Isola repos?
3. What replaces port-per-tenant routing (Traefik decision)?
4. Is Chatwoot one shared instance or per-tenant?
5. Who is the target customer for MVP?
6. What is the AI model strategy (DeepSeek or Claude)?
7. How does the owner log into the dashboard?
8. What is the go-to-market sequence after MVP ships?
9. What is the incident response plan for OCMT failures?
10. How is PIN 290909 managed going forward?
