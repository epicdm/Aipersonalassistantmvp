# Changelog

All notable changes to the EPIC AI BFF project will be documented in this file.

## [0.18.0.0] - 2026-04-03

### Added
- Per-tenant token storage for Embedded Signup (Path A): OAuth code exchange, AES-256-GCM encryption, TenantRegistry persistence
- Centralized token service (`app/lib/token-service.ts`): store, get, refresh, checkExpiring, healthCheck
- Token refresh cron (`/api/cron/token-refresh`): daily check for expiring tokens, auto-refresh via fb_exchange_token, health-check permanent tokens weekly
- account_update webhook (`/api/whatsapp/account-update`): handles quality changes, restrictions, bans from Meta
- Webhook signature verification on main webhook POST handler (X-Hub-Signature-256)
- Shared utility modules: `meta-verify.ts` (signature verification), `alert.ts` (admin WhatsApp alerts)
- `tokenExpiresAt`, `tokenType`, `businessId`, `wabaId`, `displayPhone`, `businessName` fields on TenantRegistry
- Full test suite: vitest configured, 52 unit tests across 6 test files
- TODOS.md for tracking deferred work
- VERSION and CHANGELOG files

### Changed
- WhatsApp Graph API upgraded from v21.0 to v25.0 across all endpoints (8 files)
- `signup/route.ts` completed as canonical Path A endpoint (was 28-line stub)
- `provision/route.ts` DRY cleanup: inline encryptToken, verifyMetaSignature, alertEric replaced with shared imports
- Frontend (`number-client.tsx`) updated to POST to `/api/isola/signup` instead of `/api/whatsapp/connect`
- Middleware updated with account-update webhook route

### Deprecated
- `POST /api/whatsapp/connect` returns 410 Gone (replaced by `/api/isola/signup`)

### Fixed
- Embedded Signup token was exchanged but never stored (the core bug this sprint fixes)
- Port allocation now happens after code exchange (prevents resource exhaustion from invalid requests)
