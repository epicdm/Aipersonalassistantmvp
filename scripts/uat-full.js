/**
 * BFF Full User Journey UAT
 * Simulates a real user: sign-up → create agent → onboarding → dashboard → all features
 * Uses a fresh test account created via Clerk API
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://bff.epic.dm';
const SS_DIR = '/tmp/bff-uat-full';
const CLERK_SECRET = process.env.CLERK_SECRET_KEY || require('fs').readFileSync('/opt/bff/.env', 'utf8').match(/CLERK_SECRET_KEY=(.+)/)?.[1]?.trim();

const results = [];
let page, browser, context;

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';

if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️ ' : 'ℹ️ ';
  const col = status === 'PASS' ? G : status === 'FAIL' ? R : status === 'WARN' ? Y : C;
  console.log(`${col}${icon} [${status}]${X} ${name}${detail ? ': ' + detail : ''}`);
  results.push({ status, name, detail });
}

async function ss(name) {
  try { await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: true }); } catch {}
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Create test user via Clerk API ───────────────────────────────────────────
async function createClerkUser(email, password) {
  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: true,
      skip_password_requirement: false,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Clerk user create failed: ${JSON.stringify(data)}`);
  return data.id;
}

async function deleteClerkUser(userId) {
  await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${CLERK_SECRET}` },
  });
}

// ─── Main UAT ──────────────────────────────────────────────────────────────────
async function runFullUAT() {
  const testEmail = `uat-test-${Date.now()}@bff-test.epic.dm`;
  const testPassword = 'BffTest2026!';
  let clerkUserId = null;

  console.log(`\n${C}══════════════════════════════════════════${X}`);
  console.log(`${C}   BFF Full UAT — Automated User Journey${X}`);
  console.log(`${C}══════════════════════════════════════════${X}\n`);
  console.log(`${C}ℹ️  Test account: ${testEmail}${X}\n`);

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    // ── 1. Create Clerk user ───────────────────────────────────────────────────
    console.log(`${C}[ Setup ]${X}`);
    try {
      clerkUserId = await createClerkUser(testEmail, testPassword);
      log('PASS', 'Clerk test user created', clerkUserId);
    } catch (e) {
      log('FAIL', 'Clerk user creation', e.message);
      return;
    }

    // ── 2. Landing page ────────────────────────────────────────────────────────
    console.log(`\n${C}[ Landing Page ]${X}`);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await wait(2000);
    await ss('01-landing');

    const title = await page.title();
    log(title.includes('BFF') ? 'PASS' : 'FAIL', 'Landing title', title);

    const landingText = await page.evaluate(() => document.body.innerText);
    log(landingText.includes('WhatsApp') ? 'PASS' : 'FAIL', 'Landing has WhatsApp content');
    log(landingText.includes('pricing') || landingText.includes('$') ? 'PASS' : 'FAIL', 'Pricing visible');
    log(errors.length === 0 ? 'PASS' : 'WARN', 'No JS errors on landing', errors.length ? errors[0].slice(0,60) : 'clean');

    // ── 3. Sign up ─────────────────────────────────────────────────────────────
    console.log(`\n${C}[ Sign Up Flow ]${X}`);
    await page.goto(`${BASE}/sign-up`, { waitUntil: 'domcontentloaded' });
    await wait(2000);
    await ss('02-sign-up');

    // Fill Clerk sign-up form
    try {
      // Email field
      await page.locator('input[name="emailAddress"], input[type="email"]').first().fill(testEmail);
      await wait(500);
      // Continue / next
      const continueBtn = page.locator('button[type="submit"]').first();
      await continueBtn.click();
      await wait(2000);
      await ss('02b-sign-up-password');

      // Password field
      const pwField = page.locator('input[type="password"]').first();
      if (await pwField.isVisible({ timeout: 3000 })) {
        await pwField.fill(testPassword);
        await wait(300);
        await page.locator('button[type="submit"]').first().click();
        await wait(3000);
      }

      await ss('02c-after-signup');
      const afterSignup = page.url();
      const wentToCreate = afterSignup.includes('/create') || afterSignup.includes('/dashboard');
      log(wentToCreate ? 'PASS' : 'WARN', 'After sign-up redirect', afterSignup.replace(BASE, ''));

      // Handle email verification if shown
      const verifyVisible = await page.locator('text=/verify|code|check your email/i').isVisible({ timeout: 2000 }).catch(() => false);
      if (verifyVisible) {
        log('WARN', 'Email verification required — skipping UI test, using direct API test');
        // Fall through to API-level tests
      }
    } catch (e) {
      log('WARN', 'Sign-up UI interaction', e.message.slice(0, 80));
    }

    // ── 4. Test API layer with real Clerk token ─────────────────────────────────
    console.log(`\n${C}[ API Layer — Authenticated ]${X}`);

    // Get a Clerk session token for the test user
    let sessionToken = null;
    try {
      const signInRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: clerkUserId }),
      });
      const signInData = await signInRes.json();
      if (signInData.token) {
        sessionToken = signInData.token;
        log('PASS', 'Got Clerk sign-in token');
      } else {
        log('WARN', 'Could not get Clerk token', JSON.stringify(signInData).slice(0,60));
      }
    } catch (e) {
      log('WARN', 'Clerk token fetch', e.message);
    }

    // Use sign-in token to authenticate browser
    if (sessionToken) {
      await page.goto(`${BASE}/sign-in#/?token=${sessionToken}`, { waitUntil: 'domcontentloaded' });
      await wait(3000);
      await ss('03-signed-in');
      const signedInUrl = page.url();
      log(signedInUrl.includes('/create') || signedInUrl.includes('/dashboard') ? 'PASS' : 'WARN',
        'Token sign-in redirect', signedInUrl.replace(BASE, ''));
    }

    // ── 5. Create flow ─────────────────────────────────────────────────────────
    console.log(`\n${C}[ Create Agent Flow ]${X}`);
    await page.goto(`${BASE}/create`, { waitUntil: 'domcontentloaded' });
    await wait(2000);
    await ss('04-create');

    const createUrl = page.url();
    const onCreateOrSignIn = createUrl.includes('/create') || createUrl.includes('/sign-in');
    log(onCreateOrSignIn ? 'PASS' : 'FAIL', '/create page accessible', createUrl.replace(BASE, ''));

    if (createUrl.includes('/create')) {
      const createText = await page.evaluate(() => document.body.innerText);
      const hasTemplates = createText.toLowerCase().includes('receptionist') ||
                          createText.toLowerCase().includes('agent') ||
                          createText.toLowerCase().includes('template');
      log(hasTemplates ? 'PASS' : 'WARN', 'Create page shows templates');

      // Try clicking a template
      try {
        const templateBtn = page.locator('button, [role="button"]').filter({ hasText: /receptionist|sales|support/i }).first();
        if (await templateBtn.isVisible({ timeout: 3000 })) {
          await templateBtn.click();
          await wait(1500);
          await ss('04b-template-selected');
          log('PASS', 'Template selection works');

          // Name field
          const nameField = page.locator('input[placeholder*="name" i], input[placeholder*="Name" i]').first();
          if (await nameField.isVisible({ timeout: 2000 })) {
            await nameField.fill('TestBot');
            log('PASS', 'Agent name field works');

            // Continue through onboarding
            const nextBtn = page.locator('button').filter({ hasText: /continue|next|→/i }).first();
            if (await nextBtn.isVisible({ timeout: 2000 })) {
              await nextBtn.click();
              await wait(1500);
              await ss('04c-onboarding-step2');
              log('PASS', 'Onboarding step 2 reached');
            }
          }
        }
      } catch (e) {
        log('WARN', 'Create flow interaction', e.message.slice(0, 60));
      }
    }

    // ── 6. Dashboard ───────────────────────────────────────────────────────────
    console.log(`\n${C}[ Dashboard Pages ]${X}`);
    const dashPages = [
      ['/dashboard', 'Dashboard home'],
      ['/dashboard/conversations', 'Conversations'],
      ['/dashboard/agents', 'Agents'],
      ['/dashboard/calls', 'Calls'],
      ['/dashboard/broadcasts', 'Broadcasts'],
      ['/dashboard/billing', 'Billing'],
      ['/dashboard/settings', 'Settings'],
      ['/knowledge', 'Knowledge'],
      ['/integrations', 'Integrations'],
      ['/dashboard/contacts', 'Contacts'],
    ];

    for (const [path, name] of dashPages) {
      try {
        const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await wait(1500);
        const url = page.url();
        const status = res?.status() || 0;
        const redirectedToAuth = url.includes('sign-in');
        const loaded = !redirectedToAuth && (status === 200 || url.includes(path));

        if (loaded) {
          const text = await page.evaluate(() => document.body.innerText).catch(() => '');
          const has500 = text.includes('500') || text.includes('Internal Server Error') || text.includes('Application error');
          log(!has500 ? 'PASS' : 'FAIL', `${name} loads`, has500 ? '500 error detected' : 'OK');
          await ss(`05-${path.replace(/\//g, '-').slice(1)}`);
        } else {
          log('WARN', `${name} — auth redirect`, url.replace(BASE, ''));
        }
      } catch (e) {
        log('FAIL', `${name}`, e.message.slice(0, 60));
      }
    }

    // ── 7. Number/WhatsApp page ────────────────────────────────────────────────
    console.log(`\n${C}[ WhatsApp Number Page ]${X}`);
    try {
      await page.goto(`${BASE}/number`, { waitUntil: 'domcontentloaded' });
      await wait(1500);
      const numUrl = page.url();
      const numText = await page.evaluate(() => document.body.innerText).catch(() => '');
      const hasWaContent = numText.toLowerCase().includes('whatsapp') || numText.toLowerCase().includes('number') || numUrl.includes('/number');
      log(hasWaContent ? 'PASS' : 'WARN', '/number page loads', numUrl.replace(BASE, ''));
      await ss('06-number');
    } catch (e) {
      log('FAIL', '/number page', e.message.slice(0, 60));
    }

    // ── 8. API smoke tests ─────────────────────────────────────────────────────
    console.log(`\n${C}[ API Smoke Tests ]${X}`);
    const apiTests = [
      ['/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=epic-wa-2026&hub.challenge=SMOKE', 200, 'Webhook verify'],
      ['/api/agent', 401, 'Agent API (unauthed → 401)'],
      ['/api/conversations', 401, 'Conversations (unauthed → 401)'],
      ['/api/knowledge', 401, 'Knowledge (unauthed → 401)'],
      ['/api/broadcast', 401, 'Broadcast (unauthed → 401)'],
      ['/api/billing/plan', 401, 'Billing plan (unauthed → 401)'],
    ];

    for (const [endpoint, expected, label] of apiTests) {
      const r = await context.request.get(`${BASE}${endpoint}`);
      const got = r.status();
      log(got === expected ? 'PASS' : 'FAIL', label, `${got} (expected ${expected})`);
      if (endpoint.includes('challenge=SMOKE')) {
        const body = await r.text();
        log(body === 'SMOKE' ? 'PASS' : 'FAIL', 'Webhook returns challenge', `"${body}"`);
      }
    }

    // ── 9. Mobile ──────────────────────────────────────────────────────────────
    console.log(`\n${C}[ Mobile View ]${X}`);
    const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobPage = await mob.newPage();
    await mobPage.goto(BASE, { waitUntil: 'domcontentloaded' });
    await wait(1500);
    await mobPage.screenshot({ path: `${SS_DIR}/07-mobile-landing.png`, fullPage: true });
    const mobText = await mobPage.evaluate(() => document.body.innerText);
    log(mobText.includes('BFF') || mobText.includes('WhatsApp') ? 'PASS' : 'FAIL', 'Mobile landing renders');
    await mob.close();

  } finally {
    await browser.close();

    // Cleanup Clerk user
    if (clerkUserId) {
      try {
        await deleteClerkUser(clerkUserId);
        log('PASS', 'Cleanup: Clerk test user deleted');
      } catch (e) {
        log('WARN', 'Cleanup: could not delete Clerk user', e.message);
      }
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const warn = results.filter(r => r.status === 'WARN').length;

    console.log(`\n${C}══════════════════════════════════════════${X}`);
    console.log(`${C}   Full UAT Summary${X}`);
    console.log(`${C}══════════════════════════════════════════${X}`);
    console.log(`${G}  ✅ PASS: ${pass}${X}`);
    console.log(`${Y}  ⚠️  WARN: ${warn}${X}`);
    console.log(`${R}  ❌ FAIL: ${fail}${X}`);
    console.log(`\n  Screenshots: ${SS_DIR}/`);

    if (fail > 0) {
      console.log(`\n${R}FAILURES:${X}`);
      results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ${R}❌ ${r.name}: ${r.detail}${X}`));
    }
    if (warn > 0) {
      console.log(`\n${Y}WARNINGS:${X}`);
      results.filter(r => r.status === 'WARN').forEach(r => console.log(`  ${Y}⚠️  ${r.name}: ${r.detail}${X}`));
    }
    console.log('');
  }
}

runFullUAT().catch(console.error);
