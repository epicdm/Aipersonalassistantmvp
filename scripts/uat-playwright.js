/**
 * BFF Playwright UAT — Full authenticated user journey
 * Uses Clerk sign-in token to authenticate, then walks every page
 */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const BASE = 'https://bff.epic.dm';
const SS = '/tmp/bff-pw-uat';
const CLERK_SECRET = require('fs').readFileSync('/opt/bff/.env', 'utf8')
  .match(/CLERK_SECRET_KEY=(.+)/)?.[1]?.trim();
const TEST_USER_ID = 'user_36XVMb3CwJy3Il2BxCXJcog7dXB'; // giraud.eric@gmail.com

if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';
const results = [];

function log(status, name, detail = '') {
  const icon = { PASS: '✅', FAIL: '❌', WARN: '⚠️ ', INFO: 'ℹ️ ' }[status] || '?';
  const col  = { PASS: G, FAIL: R, WARN: Y, INFO: C }[status] || X;
  console.log(`${col}${icon} [${status}]${X} ${name}${detail ? ': ' + detail : ''}`);
  results.push({ status, name, detail });
}

async function ss(page, name) {
  await page.screenshot({ path: `${SS}/${name}.png`, fullPage: true });
}

async function getSignInToken() {
  const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLERK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: TEST_USER_ID }),
  });
  const d = await res.json();
  if (!d.token) throw new Error(JSON.stringify(d));
  return d.token;
}

async function run() {
  console.log(`\n${C}══════════════════════════════════════════${X}`);
  console.log(`${C}   BFF Playwright UAT — Full Journey${X}`);
  console.log(`${C}══════════════════════════════════════════${X}\n`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });

  try {
    // ── STEP 1: Landing ───────────────────────────────────────────────────────
    console.log(`\n${C}[ 1. Landing Page ]${X}`);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await ss(page, '01-landing');

    const lt = await page.evaluate(() => document.body.innerText);
    log(lt.includes('WhatsApp') ? 'PASS' : 'FAIL', 'Landing — WhatsApp content visible');
    log(lt.includes('$') && lt.includes('free') || lt.includes('pricing') ? 'PASS' : 'WARN', 'Landing — Pricing visible');
    log(jsErrors.length === 0 ? 'PASS' : 'WARN', 'Landing — No JS errors', jsErrors[0]?.slice(0,60) || '');

    // ── STEP 2: Authenticate via Clerk sign-in token ──────────────────────────
    console.log(`\n${C}[ 2. Authentication ]${X}`);
    const token = await getSignInToken();
    log('PASS', 'Got Clerk sign-in token');

    // Navigate to the token URL - Clerk will exchange it and set cookies
    await page.goto(`${BASE}/sign-in#/?token=${token}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await ss(page, '02-after-token-auth');

    const authUrl = page.url();
    log('INFO', 'Post-auth URL', authUrl.replace(BASE, '') || '/');

    // Check if we're authenticated by seeing if a protected page loads
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const dashUrl = page.url();
    const isAuthed = !dashUrl.includes('sign-in');
    log(isAuthed ? 'PASS' : 'WARN', 'Authentication state', isAuthed ? 'Signed in ✓' : `Redirected to ${dashUrl.replace(BASE,'')}`);
    await ss(page, '03-dashboard-attempt');

    if (!isAuthed) {
      // Try signing in via the UI form
      log('INFO', 'Trying UI sign-in...');
      await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      try {
        // Fill email
        await page.locator('input[type="email"], input[name="emailAddress"], input[name="identifier"]').first().fill('giraud.eric@gmail.com');
        await page.waitForTimeout(500);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(2000);

        // Fill password if prompted
        const pwInput = page.locator('input[type="password"]').first();
        if (await pwInput.isVisible({ timeout: 3000 })) {
          // We need a password - use the reset flow won't work
          // Let's try a different approach - use the sign-in token URL directly
          log('WARN', 'Password required for UI sign-in — token auth needed');
        }
      } catch(e) {
        log('WARN', 'UI sign-in', e.message.slice(0,60));
      }
      await ss(page, '03b-signin-ui');
    }

    // ── STEP 3: Check each page (authenticated or not) ────────────────────────
    console.log(`\n${C}[ 3. Page Checks ]${X}`);

    const pages = [
      ['/dashboard',               'Dashboard Home'],
      ['/dashboard/conversations', 'Conversations'],
      ['/dashboard/agents',        'Agents'],
      ['/dashboard/calls',         'Calls'],
      ['/dashboard/broadcasts',    'Broadcasts'],
      ['/dashboard/billing',       'Billing'],
      ['/dashboard/settings',      'Settings'],
      ['/dashboard/contacts',      'Contacts'],
      ['/knowledge',               'Knowledge'],
      ['/integrations',            'Integrations'],
      ['/create',                  'Create Agent'],
      ['/number',                  'WhatsApp Number'],
    ];

    for (const [path, name] of pages) {
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        const url = page.url();
        const text = await page.evaluate(() => document.body.innerText).catch(() => '');
        const status = url.includes('sign-in') ? 'NOT_AUTHED'
          : text.includes('500') || text.includes('Application error') ? 'ERROR'
          : 'OK';

        if (status === 'OK') {
          log('PASS', `${name} — loads`, url.replace(BASE, ''));
          // Check for 500 errors specifically
          const has500 = text.includes('Internal Server Error') || text.includes('Something went wrong');
          if (has500) log('FAIL', `${name} — 500 error in body`);
        } else if (status === 'NOT_AUTHED') {
          log('WARN', `${name} — redirects to sign-in (not logged in)`);
        } else {
          log('FAIL', `${name} — error`, text.slice(0, 80));
        }

        await ss(page, `page-${path.replace(/\//g, '-').slice(1) || 'home'}`);
      } catch (e) {
        log('FAIL', name, e.message.slice(0, 80));
      }
    }

    // ── STEP 4: API checks ────────────────────────────────────────────────────
    console.log(`\n${C}[ 4. API Health ]${X}`);
    const apis = [
      ['/api/agent',        401, 'Agent API auth'],
      ['/api/conversations',401, 'Conversations auth'],
      ['/api/knowledge',    401, 'Knowledge auth'],
      ['/api/broadcast',    401, 'Broadcast auth'],
      ['/api/billing/plan', 401, 'Billing auth'],
      ['/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=epic-wa-2026&hub.challenge=PW_TEST', 200, 'Webhook verify'],
    ];

    for (const [ep, expected, label] of apis) {
      const r = await ctx.request.get(`${BASE}${ep}`);
      const got = r.status();
      log(got === expected ? 'PASS' : 'FAIL', label, `HTTP ${got}`);
      if (ep.includes('PW_TEST')) {
        const body = await r.text();
        log(body === 'PW_TEST' ? 'PASS' : 'FAIL', 'Webhook challenge body', `"${body}"`);
      }
    }

    // ── STEP 5: Mobile ────────────────────────────────────────────────────────
    console.log(`\n${C}[ 5. Mobile ]${X}`);
    const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mp = await mob.newPage();
    await mp.goto(BASE, { waitUntil: 'domcontentloaded' });
    await mp.waitForTimeout(1500);
    await mp.screenshot({ path: `${SS}/mobile-landing.png`, fullPage: true });
    const mt = await mp.evaluate(() => document.body.innerText);
    log(mt.includes('BFF') ? 'PASS' : 'FAIL', 'Mobile landing renders');
    log((await mp.locator('nav, header').count()) > 0 ? 'PASS' : 'WARN', 'Mobile has nav/header');
    await mob.close();

  } finally {
    await browser.close();

    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const warn = results.filter(r => r.status === 'WARN').length;
    const info = results.filter(r => r.status === 'INFO').length;

    console.log(`\n${C}══════════════════════════════════════════${X}`);
    console.log(`${C}   UAT Summary${X}`);
    console.log(`${C}══════════════════════════════════════════${X}`);
    console.log(`${G}  ✅ PASS: ${pass}${X}`);
    console.log(`${Y}  ⚠️  WARN: ${warn}${X}`);
    console.log(`${R}  ❌ FAIL: ${fail}${X}`);
    console.log(`     ℹ️  INFO: ${info}`);
    console.log(`\n  Screenshots → ${SS}/`);

    if (fail > 0) {
      console.log(`\n${R}FAILURES:${X}`);
      results.filter(r => r.status === 'FAIL').forEach(r =>
        console.log(`  ${R}❌ ${r.name}${r.detail ? ': ' + r.detail : ''}${X}`));
    }
    if (warn > 0) {
      console.log(`\n${Y}WARNINGS:${X}`);
      results.filter(r => r.status === 'WARN').forEach(r =>
        console.log(`  ${Y}⚠️  ${r.name}${r.detail ? ': ' + r.detail.slice(0,80) : ''}${X}`));
    }
    console.log('');
  }
}

run().catch(console.error);
