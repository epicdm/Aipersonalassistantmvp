/**
 * BFF UAT Crawl Script
 * 
 * Tests the full user journey:
 * 1. Landing page (SSR content, CTA buttons, template tabs)
 * 2. Sign-in / Sign-up pages
 * 3. Dashboard (auth redirect)
 * 4. Onboarding / Create flow
 * 5. Number page
 * 6. API endpoints
 * 7. Screenshots of every page
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://bff.epic.dm';
const SCREENSHOTS_DIR = '/tmp/bff-uat-screenshots';
const results = [];

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : 'ℹ️';
  const color = status === 'PASS' ? GREEN : status === 'FAIL' ? RED : status === 'WARN' ? YELLOW : CYAN;
  console.log(`${color}${icon} [${status}]${RESET} ${name}${detail ? ': ' + detail : ''}`);
  results.push({ status, name, detail });
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function runUAT() {
  console.log(`\n${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${CYAN}   BFF UAT Crawl — ${BASE_URL}${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════${RESET}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (compatible; BFF-UAT/1.0)',
  });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  });

  // ── Test 1: Landing Page ──────────────────────────────────────────────
  console.log(`\n${CYAN}[ Landing Page ]${RESET}`);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await screenshot(page, '01-landing');

  // SSR check — wait for hydration then check
  await page.waitForTimeout(2000);
  const bodyText = await page.evaluate(() => document.body.innerText);
  const pageHtml = await page.content();
  const hasHero = bodyText.includes('Your business') || bodyText.includes('always on') || bodyText.includes('AI WhatsApp') || pageHtml.includes('AI WhatsApp');
  log(hasHero ? 'PASS' : 'FAIL', 'Landing content', hasHero ? 'Hero content visible' : 'Hero content missing');

  // Title
  const title = await page.title();
  log(title.includes('BFF') ? 'PASS' : 'FAIL', 'Page title', title);

  // CTA buttons
  const ctaButtons = await page.locator('button, a[href*="sign"]').count();
  log(ctaButtons > 0 ? 'PASS' : 'FAIL', 'CTA buttons present', `${ctaButtons} found`);

  // JS errors
  log(errors.length === 0 ? 'PASS' : 'WARN', 'No JS console errors', errors.length > 0 ? errors.slice(0,2).join('; ') : 'Clean');

  // Template tabs (Business / Personal)
  await page.waitForTimeout(1500); // Let React hydrate
  const tabText = await page.evaluate(() => document.body.innerText);
  const hasBusinessTab = tabText.toLowerCase().includes('business');
  const hasPersonalTab = tabText.toLowerCase().includes('personal');
  log(hasBusinessTab ? 'PASS' : 'FAIL', 'Business template tab visible');
  log(hasPersonalTab ? 'PASS' : 'FAIL', 'Personal template tab visible');

  // Template cards — cards are <a> tags not buttons
  const templateCards = await page.locator('button, a[href*="sign"]').count();
  const templateLinks = await page.locator('a').count();
  log(templateLinks > 5 ? 'PASS' : 'WARN', 'Template cards rendered', `${templateLinks} links, ${templateCards} CTAs`);

  // Pricing section
  const hasPricing = tabText.toLowerCase().includes('pricing') || tabText.includes('$');
  log(hasPricing ? 'PASS' : 'WARN', 'Pricing section visible');

  // ── Test 2: Mobile Landing ─────────────────────────────────────────────
  console.log(`\n${CYAN}[ Mobile Responsiveness ]${RESET}`);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1500);
  await screenshot(mobilePage, '02-landing-mobile');
  const mobileText = await mobilePage.evaluate(() => document.body.innerText);
  log(mobileText.includes('BFF') ? 'PASS' : 'FAIL', 'Mobile landing renders');
  const mobileNav = await mobilePage.locator('nav').count();
  log(mobileNav > 0 ? 'PASS' : 'WARN', 'Mobile nav present');
  await mobilePage.close();

  // ── Test 3: Sign-in page ──────────────────────────────────────────────
  console.log(`\n${CYAN}[ Auth Pages ]${RESET}`);
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot(page, '03-sign-in');
  const signInText = await page.evaluate(() => document.body.innerText);
  const hasSignInForm = signInText.toLowerCase().includes('sign in') || signInText.toLowerCase().includes('email') || signInText.toLowerCase().includes('continue');
  log(hasSignInForm ? 'PASS' : 'FAIL', 'Sign-in page loads with form');
  const signInStatus = page.url();
  log(!signInStatus.includes('error') ? 'PASS' : 'FAIL', 'Sign-in URL clean', signInStatus);

  // Sign-up page
  await page.goto(`${BASE_URL}/sign-up`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot(page, '04-sign-up');
  const signUpText = await page.evaluate(() => document.body.innerText);
  const hasSignUpForm = signUpText.toLowerCase().includes('sign up') || signUpText.toLowerCase().includes('create') || signUpText.toLowerCase().includes('email');
  log(hasSignUpForm ? 'PASS' : 'FAIL', 'Sign-up page loads with form');

  // ── Test 4: Protected route redirects ─────────────────────────────────
  console.log(`\n${CYAN}[ Auth Redirects ]${RESET}`);
  const protectedRoutes = ['/dashboard', '/create', '/number', '/dashboard/settings', '/dashboard/conversations'];
  for (const route of protectedRoutes) {
    const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
    const finalUrl = page.url();
    const redirectedToAuth = finalUrl.includes('sign-in') || finalUrl.includes('sign-up') || finalUrl.includes('clerk');
    log(redirectedToAuth ? 'PASS' : 'WARN', `${route} → auth redirect`, `→ ${finalUrl.replace(BASE_URL, '')}`);
  }
  await screenshot(page, '05-dashboard-redirect');

  // ── Test 5: Static pages ──────────────────────────────────────────────
  console.log(`\n${CYAN}[ Static Pages ]${RESET}`);
  for (const [route, keyword] of [['/privacy', 'privacy'], ['/terms', 'terms']]) {
    const resp = await context.request.get(`${BASE_URL}${route}`);
    log(resp.status() === 200 ? 'PASS' : 'FAIL', `${route}`, `HTTP ${resp.status()}`);
  }

  // ── Test 6: API endpoints ─────────────────────────────────────────────
  console.log(`\n${CYAN}[ API Endpoints ]${RESET}`);
  const apiTests = [
    ['/api/agent', 401, 'Agent API requires auth'],
    ['/api/conversations', 401, 'Conversations API requires auth'],
    ['/api/agents', 401, 'Agents list requires auth'],
    ['/api/whatsapp/connect', 401, 'WA connect requires auth'],
    ['/api/number/provision', 401, 'Number provision requires auth'],
    ['/api/agent/routing', 401, 'Routing requires auth'],
    ['/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=epic-wa-2026&hub.challenge=UAT_TEST', 200, 'Webhook verification'],
  ];

  for (const [endpoint, expectedStatus, desc] of apiTests) {
    const resp = await context.request.get(`${BASE_URL}${endpoint}`);
    const actual = resp.status();
    const pass = actual === expectedStatus;
    log(pass ? 'PASS' : 'FAIL', desc, `Expected ${expectedStatus}, got ${actual}`);
    
    // For webhook, check body
    if (endpoint.includes('hub.challenge')) {
      const body = await resp.text();
      log(body === 'UAT_TEST' ? 'PASS' : 'FAIL', 'Webhook returns challenge', `body: "${body}"`);
    }
  }

  // ── Test 7: Performance ───────────────────────────────────────────────
  console.log(`\n${CYAN}[ Performance ]${RESET}`);
  const startTime = Date.now();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  const loadTime = Date.now() - startTime;
  log(loadTime < 3000 ? 'PASS' : 'WARN', 'Landing page load time', `${loadTime}ms`);

  // Check for large JS bundles
  const resources = await page.evaluate(() => 
    performance.getEntriesByType('resource')
      .filter(r => r.initiatorType === 'script')
      .map(r => ({ url: r.name.split('/').pop(), size: Math.round(r.transferSize / 1024) + 'KB' }))
      .filter(r => parseInt(r.size) > 100)
  );
  log(resources.length < 10 ? 'PASS' : 'WARN', 'JS bundle count', `${resources.length} bundles >100KB`);

  // ── Test 8: SEO basics ────────────────────────────────────────────────
  console.log(`\n${CYAN}[ SEO ]${RESET}`);
  await page.goto(BASE_URL);
  const metaDesc = await page.getAttribute('meta[name="description"]', 'content');
  log(metaDesc ? 'PASS' : 'FAIL', 'Meta description', metaDesc || 'MISSING');
  const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
  log(ogTitle ? 'PASS' : 'WARN', 'OG title tag', ogTitle || 'MISSING');
  const canonical = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href || null);
  log(canonical ? 'PASS' : 'WARN', 'Canonical URL', canonical || 'Not set');
  const favicon = await page.evaluate(() => document.querySelector('link[rel="icon"]')?.href || null);
  log(favicon ? 'PASS' : 'WARN', 'Favicon', favicon || 'MISSING');

  // ── Test 9: Interaction — click template tab ───────────────────────────
  console.log(`\n${CYAN}[ Interactions ]${RESET}`);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  try {
    // Try clicking Personal tab
    await page.getByText('personal', { exact: false }).first().click();
    await page.waitForTimeout(800);
    await screenshot(page, '06-personal-tab');
    const afterClick = await page.evaluate(() => document.body.innerText);
    const hasPersonalContent = afterClick.toLowerCase().includes('coach') || afterClick.toLowerCase().includes('buddy') || afterClick.toLowerCase().includes('tutor') || afterClick.toLowerCase().includes('personal') || afterClick.toLowerCase().includes('wellness') || afterClick.toLowerCase().includes('fitness');
    log(hasPersonalContent ? 'PASS' : 'WARN', 'Personal tab click shows personal templates');
  } catch (e) {
    log('WARN', 'Personal tab interaction', e.message.slice(0, 60));
  }

  try {
    // Try clicking a CTA link (landing uses <a> not <button>)
    const signUpLink = page.locator('a[href*="sign-up"]').first();
    await signUpLink.click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    const afterCTA = page.url();
    log(afterCTA.includes('sign') ? 'PASS' : 'WARN', 'CTA navigates to sign-up', afterCTA.replace(BASE_URL, '') || '/');
    await screenshot(page, '07-after-cta-click');
  } catch (e) {
    log('WARN', 'CTA navigation', e.message.slice(0, 60));
  }

  await browser.close();
  await mobileContext.close();

  // ── Summary ───────────────────────────────────────────────────────────
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const warn = results.filter(r => r.status === 'WARN').length;

  console.log(`\n${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${CYAN}   UAT Summary${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${GREEN}  ✅ PASS: ${pass}${RESET}`);
  console.log(`${YELLOW}  ⚠️  WARN: ${warn}${RESET}`);
  console.log(`${RED}  ❌ FAIL: ${fail}${RESET}`);
  console.log(`\n  Screenshots: ${SCREENSHOTS_DIR}/`);

  if (fail > 0) {
    console.log(`\n${RED}FAILURES:${RESET}`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ${RED}❌ ${r.name}: ${r.detail}${RESET}`);
    });
  }
  if (warn > 0) {
    console.log(`\n${YELLOW}WARNINGS:${RESET}`);
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  ${YELLOW}⚠️  ${r.name}: ${r.detail}${RESET}`);
    });
  }

  console.log('');
  return { pass, fail, warn };
}

runUAT().catch(console.error);
