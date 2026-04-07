# 10 — Embedded Signup UI Specification
*Generated 2026-04-06 — Phase 2.*

---

## Overview

The Embedded Signup flow lets a business owner connect their WhatsApp Business number
to Isola in under 5 minutes without leaving the browser. Entry point: `isola.epic.dm/connect`.

This document specifies the exact flow, component states, error paths, and backend
calls. **Do not build UI until Phase 3 is complete** (Chatwoot sync must be ready for
the post-provisioning welcome to be meaningful).

---

## URL Structure

```
https://isola.epic.dm/connect          ← landing / start
https://isola.epic.dm/connect/setup    ← post-OAuth template selection
https://isola.epic.dm/connect/status   ← polling progress indicator
https://isola.epic.dm/connect/done     ← success screen
```

---

## Step-by-Step Flow

### Step 1 — Landing (`/connect`)

**UI components:**
- Hero headline: "Add AI to your WhatsApp in 5 minutes"
- Single CTA button: "Connect Your WhatsApp Business Account"
- Trust signals: number of businesses live, security badge

**On CTA click:**
1. Launch Meta Embedded Signup JS SDK modal
   ```javascript
   FB.login(handleResponse, {
     scope: 'whatsapp_business_management,whatsapp_business_messaging',
     extras: {
       feature: 'whatsapp_embedded_signup',
       setup: {}
     }
   })
   ```
2. Spinner overlay: "Connecting to Facebook..."

**Fallback:** If JS SDK fails to load, show manual link to Meta Business Manager.

---

### Step 2 — Meta OAuth Modal (Meta-hosted)

User completes inside Meta's iframe:
- Log in to Facebook / Business Manager
- Select or create WhatsApp Business Account (WABA)
- Select or verify phone number
- Confirm permissions

**On success:** Meta calls our `session_info_exchange_token` endpoint with a short-lived
code. BFF exchanges for a permanent System User token and phone_number_id.

**Existing backend:** `POST /api/isola/signup` handles this exchange today.
No changes needed for Phase 3.

**Meta OAuth error codes to handle:**
| Code | Meaning | UI message |
|------|---------|------------|
| User cancelled | User closed modal | "Setup cancelled. Click Connect to try again." |
| `10` | Permission denied | "Facebook permissions not granted. Please try again and accept all permissions." |
| `200` | Business not set up | "Please set up a WhatsApp Business Account in Meta Business Manager first." |
| `368` | Temporarily blocked | "Your account is temporarily restricted by Meta. Try again in 24 hours." |

---

### Step 3 — Template Selection (`/connect/setup`)

**Shown after:** Successful OAuth exchange. BFF has `waPhoneNumberId` + token.

**UI components:**
- "Choose your agent personality"
- 4 template cards (icon + name + 1-line description):
  - 🧑‍💼 **Receptionist** — Greets customers, captures intent, routes queries
  - 💼 **Sales** — Qualifies leads, shares pricing, follows up
  - 🛠️ **Support** — Answers FAQs, guides troubleshooting
  - 🏨 **Concierge** — Bookings, recommendations, local expertise
- One text field: "Business name" (pre-filled from Meta if available)
- CTA: "Activate Agent"

**On submit:**
```typescript
POST /api/provision
{
  waPhoneNumberId: string,
  template: 'receptionist' | 'sales' | 'support' | 'concierge',
  businessName: string
}
```

Redirect to `/connect/status?tenantId={tenantId}`.

---

### Step 4 — Provisioning Status (`/connect/status`)

**UI:** Animated checklist, polling every 3 seconds:

```
✅ WhatsApp number verified
⏳ Starting your AI agent...          ← container spinning up (OCMT)
⏱  Setting up your workspace...       ← Chatwoot account
⏱  Almost ready...                    ← container health check
```

**Polling endpoint:**
```typescript
GET /api/isola/signup/status?tenantId={tenantId}
Response: { status: 'provisioning' | 'active' | 'failed', chatwootStatus: string }
```

**Timeout:** If `status !== 'active'` after 90 seconds → show error state (see below).

**On `status === 'active'`:** Redirect to `/connect/done`.

---

### Step 5 — Success (`/connect/done`)

**UI:**
- Large green checkmark
- "Your agent is live!"
- Business name + phone number displayed
- Two CTAs:
  - "Test Your Agent" → opens wa.me/{phone} in new tab
  - "Go to Dashboard" → `bff.epic.dm/agents/{agentId}`
- "What happens next" section:
  - Your agent will reply to every customer message
  - Log in to your dashboard to update knowledge, hours, and services
  - Text your number "help" for owner commands

---

## Error States

### E1 — OAuth Exchange Failure
**When:** `POST /api/isola/signup` returns non-200.

**UI:** Red banner with message from API. Button: "Try Again".
Log: server should return `{ error: 'token_exchange_failed', detail: string }`.

### E2 — Number Already Connected
**When:** `POST /api/isola/signup` returns `409 Conflict`.

**UI:** "This number is already connected to an Isola account.
[Sign in to your existing account] or [use a different number]."

### E3 — Provisioning Timeout (90s)
**When:** Status polling hasn't returned `active` in 90 seconds.

**UI:** "We're still getting things ready — this is taking longer than usual.
Check your email for updates, or contact support."

Backend: OCMT has a 120s container start timeout. BFF should send a recovery email
at 60s if OCMT hasn't called back with a health confirmation.

### E4 — Container Start Failure
**When:** OCMT returns error on `/api/tenants`.

**UI:** "We hit a technical problem setting up your agent. Our team has been notified.
[Try Again] [Contact Support]"

Admin: dead-letter entry created; Eric gets a WhatsApp alert.

### E5 — Port Ceiling Hit (100-tenant limit)
**When:** `tenant_port_seq` throws nextval overflow.

**UI:** "We're fully booked right now! Join the waitlist and we'll notify you when a
slot opens." — collect email for waitlist.

Long-term fix: Traefik migration (see `06-phase0-routing-remediation.md`).

---

## Session Continuity

If a user closes the browser during provisioning:
- `tenantId` stored in `sessionStorage` on the `/connect/setup` page
- `/connect/status` re-reads from `sessionStorage` on load
- If `sessionStorage` is empty, user can re-enter their phone number to look up their tenant

---

## Security Considerations

- OAuth `state` parameter must be a CSRF token tied to the user's session
- The short-lived Meta code is single-use; BFF must exchange it within 5 minutes
- `POST /api/isola/signup` must require a valid CSRF token or Clerk session
- Phone number must be verified against the WABA account — do not allow arbitrary phone_number_ids

---

## Env Vars Needed for Signup UI

```bash
NEXT_PUBLIC_FACEBOOK_APP_ID=<Meta App ID for Embedded Signup>
ISOLA_META_CONFIG_ID=<Configuration ID from Meta's Embedded Signup setup>
META_WA_TOKEN=<System User token for token exchange>
NEXT_PUBLIC_BASE_URL=https://isola.epic.dm
```

---

## Open Questions

1. **Domain:** Is `isola.epic.dm` a subdomain we're ready to configure, or does
   signup happen on `bff.epic.dm/connect`?
2. **Auth:** Should `/connect` require Clerk login first (operator registers,
   then connects number), or is OAuth the account creation event?
3. **Multiple numbers:** If the same WABA has 3 numbers, does the user pick one
   on the template selection screen, or get 3 separate agents auto-created?
4. **Trial vs paid:** Is `/connect` open to all, or gated behind a plan selection step?
