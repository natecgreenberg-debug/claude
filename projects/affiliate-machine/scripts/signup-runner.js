'use strict';

/**
 * signup-runner.js — Config-driven generic affiliate signup runner.
 *
 * Usage:
 *   node scripts/signup-runner.js <platform> [--dry-run]
 *
 * Dry-run (default): navigates to the signup URL, screenshots it, but never
 * fills or submits anything. Safe for exploration.
 *
 * Live mode: executes all steps in the platform config, filling forms and
 * submitting. Credentials are saved to data/credentials.json on success.
 *
 * Platform configs live in ../signup-configs/<platform>.json.
 */

const path = require('path');
const fs   = require('fs');

const { launchBrowser, screenshotAndLog, closeBrowser } = require('../lib/browser');
const { addAccount } = require('../lib/credentials');

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFIG_DIR     = path.resolve(__dirname, '..', 'signup-configs');
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'data', 'screenshots');
const NAV_TIMEOUT    = 60_000; // ms

// ─── CLI parsing ──────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const platform = args.find(a => !a.startsWith('--'));
const dryRun   = args.includes('--dry-run') || !args.includes('--live');

if (!platform) {
  console.error('Usage: node scripts/signup-runner.js <platform> [--dry-run|--live]');
  console.error('Available platforms:');
  try {
    fs.readdirSync(CONFIG_DIR)
      .filter(f => f.endsWith('.json'))
      .forEach(f => console.error('  ' + path.basename(f, '.json')));
  } catch { /* configs dir may not exist yet */ }
  process.exit(1);
}

// ─── Credential / identity generators ────────────────────────────────────────

/**
 * Generate a random plausible-looking full name.
 * @returns {string}
 */
function generateName() {
  const firsts = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Drew', 'Avery', 'Quinn'];
  const lasts  = ['Parker', 'Mitchell', 'Hayes', 'Collins', 'Brooks', 'Morgan', 'Reed', 'Foster', 'Price'];
  return `${firsts[Math.floor(Math.random() * firsts.length)]} ${lasts[Math.floor(Math.random() * lasts.length)]}`;
}

/**
 * Generate a strong random password.
 * @returns {string}
 */
function generatePassword() {
  const words = ['Falcon', 'Ember', 'Cobalt', 'Prism', 'Vortex', 'Storm', 'Forge', 'Drift', 'Apex'];
  const w1  = words[Math.floor(Math.random() * words.length)];
  const w2  = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(10 + Math.random() * 90);
  const syms = ['!', '@', '#', '$', '%'];
  return `${w1}${w2}${num}${syms[Math.floor(Math.random() * syms.length)]}`;
}

/**
 * Generate a temporary email via Guerrilla Mail, with mail.tm as fallback.
 * @returns {Promise<{ address: string, provider: string, meta: object }>}
 */
async function getTempEmail() {
  // Guerrilla Mail
  try {
    const res = await timedFetch('https://api.guerrillamail.com/ajax.php?f=get_email_address');
    if (res.ok) {
      const data = await res.json();
      if (data.email_addr) {
        return { address: data.email_addr, provider: 'guerrilla', meta: { sid_token: data.sid_token } };
      }
    }
  } catch (err) {
    console.warn(`[runner] Guerrilla Mail failed: ${err.message}`);
  }

  // mail.tm fallback
  console.log('[runner] Falling back to mail.tm for temp email...');
  const randStr = (n = 10) => {
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
  };

  const domainsRes = await timedFetch('https://api.mail.tm/domains?page=1');
  if (!domainsRes.ok) throw new Error('mail.tm: domains fetch failed');
  const domainsData = await domainsRes.json();
  const domain = (domainsData['hydra:member'] ?? domainsData.member ?? [])[0]?.domain;
  if (!domain) throw new Error('mail.tm: no domains available');

  const local    = randStr(10);
  const address  = `${local}@${domain}`;
  const password = randStr(16);

  const createRes = await timedFetch('https://api.mail.tm/accounts', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ address, password }),
  });
  if (!createRes.ok) throw new Error(`mail.tm: account creation failed (${createRes.status})`);

  const tokenRes = await timedFetch('https://api.mail.tm/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ address, password }),
  });
  if (!tokenRes.ok) throw new Error(`mail.tm: token fetch failed (${tokenRes.status})`);
  const tokenData = await tokenRes.json();

  return { address, provider: 'mailtm', meta: { token: tokenData.token, password } };
}

/**
 * Fetch with an AbortController-based timeout.
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs]
 * @returns {Promise<Response>}
 */
async function timedFetch(url, options = {}, timeoutMs = 30_000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Interpolation ────────────────────────────────────────────────────────────

/**
 * Replace {email}, {password}, {name} tokens in a string.
 * @param {string} template
 * @param {{ email: string, password: string, name: string }} vars
 * @returns {string}
 */
function interpolate(template, vars) {
  return template
    .replace(/\{email\}/g,    vars.email)
    .replace(/\{password\}/g, vars.password)
    .replace(/\{name\}/g,     vars.name);
}

// ─── Page helpers ─────────────────────────────────────────────────────────────

/**
 * Return the lowercased page HTML for content detection.
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
async function pageHtml(page) {
  try { return (await page.content()).toLowerCase(); } catch { return ''; }
}

/**
 * Detect CAPTCHA/bot-challenge indicators in page content.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectCaptcha(page) {
  const h = await pageHtml(page);
  return h.includes('captcha')   || h.includes('recaptcha')   ||
         h.includes('hcaptcha')  || h.includes('turnstile')   ||
         h.includes('cloudflare') || h.includes('challenge');
}

/**
 * Try every selector in a comma-separated list; return the first visible one.
 * This mirrors Playwright's locator chaining but works with multi-selector strings.
 *
 * @param {import('playwright').Page} page
 * @param {string} selectorList - comma-separated selector alternatives
 * @returns {Promise<string|null>} The matching selector string, or null
 */
async function findFirstSelector(page, selectorList) {
  const selectors = selectorList.split(',').map(s => s.trim());
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) return sel;
    } catch { /* selector may not be valid — continue */ }
  }
  return null;
}

// ─── Step executors ───────────────────────────────────────────────────────────

/**
 * Execute a single config step.
 *
 * Returns an object describing the outcome.
 *
 * @param {import('playwright').Page} page
 * @param {object} step         - Step definition from the config
 * @param {object} vars         - Interpolation variables { email, password, name }
 * @param {string} screenshotDir - Platform-specific screenshot directory
 * @param {boolean} dryRunMode
 * @returns {Promise<{ action: string, status: 'ok'|'skip'|'warn'|'error', note?: string }>}
 */
async function executeStep(page, step, vars, screenshotDir, dryRunMode) {
  const { action } = step;

  // ── navigate ────────────────────────────────────────────────────────────
  if (action === 'navigate') {
    try {
      await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      return { action, status: 'ok', note: `Navigated to ${page.url()}` };
    } catch (err) {
      return { action, status: 'error', note: `Navigation failed: ${err.message}` };
    }
  }

  // ── screenshot ───────────────────────────────────────────────────────────
  if (action === 'screenshot') {
    try {
      const filepath = await screenshotAndLog(page, step.name || 'step', screenshotDir);
      return { action, status: 'ok', note: `Saved: ${filepath}` };
    } catch (err) {
      return { action, status: 'warn', note: `Screenshot failed: ${err.message}` };
    }
  }

  // ── wait ──────────────────────────────────────────────────────────────────
  if (action === 'wait') {
    const ms = step.ms ?? 1000;
    await new Promise(r => setTimeout(r, ms));
    return { action, status: 'ok', note: `Waited ${ms}ms` };
  }

  // ── check_captcha ─────────────────────────────────────────────────────────
  if (action === 'check_captcha') {
    const found = await detectCaptcha(page);
    if (found) {
      await screenshotAndLog(page, 'captcha_detected', screenshotDir).catch(() => {});
      return { action, status: 'warn', note: 'CAPTCHA/challenge detected on page' };
    }
    return { action, status: 'ok', note: 'No CAPTCHA detected' };
  }

  // ── check_success ─────────────────────────────────────────────────────────
  if (action === 'check_success') {
    const url  = page.url().toLowerCase();
    const html = await pageHtml(page);
    const indicators = step.indicators ?? [];
    const matched = indicators.filter(ind => url.includes(ind) || html.includes(ind));
    if (matched.length > 0) {
      return { action, status: 'ok', note: `Success indicators found: ${matched.join(', ')}` };
    }
    return { action, status: 'warn', note: `No success indicators matched. URL: ${page.url()}` };
  }

  // ─── Steps below are SKIPPED in dry-run mode ─────────────────────────────
  if (dryRunMode) {
    return { action, status: 'skip', note: 'Skipped in dry-run mode' };
  }

  // ── click ─────────────────────────────────────────────────────────────────
  if (action === 'click') {
    const sel = await findFirstSelector(page, step.selector);
    if (!sel) {
      if (step.optional) {
        return { action, status: 'skip', note: `Optional click — no element found for: ${step.selector}` };
      }
      return { action, status: 'warn', note: `No element found for: ${step.selector}` };
    }
    try {
      if (step.wait_for_nav) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }).catch(() => {}),
          page.click(sel),
        ]);
      } else {
        await page.click(sel);
      }
      return { action, status: 'ok', note: `Clicked: ${sel} | Now at: ${page.url()}` };
    } catch (err) {
      if (step.optional) {
        return { action, status: 'skip', note: `Optional click failed: ${err.message}` };
      }
      return { action, status: 'warn', note: `Click failed: ${err.message}` };
    }
  }

  // ── fill ──────────────────────────────────────────────────────────────────
  if (action === 'fill') {
    const value = interpolate(step.value ?? '', vars);
    const sel   = await findFirstSelector(page, step.selector);
    if (!sel) {
      if (step.optional) {
        return { action, status: 'skip', note: `Optional fill — no element found for: ${step.selector}` };
      }
      return { action, status: 'warn', note: `No element found for: ${step.selector}` };
    }
    try {
      await page.waitForSelector(sel, { timeout: NAV_TIMEOUT });
      await page.fill(sel, value);
      // Mask passwords in logs
      const logVal = step.value?.includes('{password}') ? '***' : value;
      return { action, status: 'ok', note: `Filled "${logVal}" into: ${sel}` };
    } catch (err) {
      if (step.optional) {
        return { action, status: 'skip', note: `Optional fill failed: ${err.message}` };
      }
      return { action, status: 'warn', note: `Fill failed: ${err.message}` };
    }
  }

  // ── unknown action ────────────────────────────────────────────────────────
  return { action, status: 'warn', note: `Unknown action type: "${action}"` };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Load config
  const configPath = path.join(CONFIG_DIR, `${platform}.json`);
  if (!fs.existsSync(configPath)) {
    console.error(`[runner] Config not found: ${configPath}`);
    console.error('[runner] Available platforms:');
    try {
      fs.readdirSync(CONFIG_DIR)
        .filter(f => f.endsWith('.json'))
        .forEach(f => console.error('  ' + path.basename(f, '.json')));
    } catch { /* ignore */ }
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`[runner] Failed to parse config: ${err.message}`);
    process.exit(1);
  }

  const platformName  = config.name ?? config.platform;
  const screenshotDir = path.join(SCREENSHOT_DIR, config.platform);
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SIGNUP RUNNER — ${platformName}`);
  console.log(`  Mode: ${dryRun ? 'DRY-RUN (no form fill/submit)' : 'LIVE'}`);
  console.log(`  Config: ${configPath}`);
  console.log(`  Screenshots: ${screenshotDir}`);
  console.log(`${'═'.repeat(60)}\n`);

  // 2. Generate identity / credentials
  let email, password, name;
  try {
    console.log('[runner] Obtaining temp email...');
    const tempResult = await getTempEmail();
    email    = tempResult.address;
    console.log(`[runner] Temp email: ${email} (via ${tempResult.provider})`);
  } catch (err) {
    console.warn(`[runner] Could not get temp email: ${err.message}`);
    // Fall back to a local placeholder — dry-run doesn't need a real inbox
    email = `runner_${Date.now()}@example.com`;
    console.warn(`[runner] Using placeholder email: ${email}`);
  }
  password = generatePassword();
  name     = generateName();

  const vars = { email, password, name };

  // 3. Launch browser
  let browser, page;
  const results = [];

  try {
    ({ browser, page } = await launchBrowser({ headless: true }));
    console.log('[runner] Browser launched\n');

    // 4. Execute steps
    for (let i = 0; i < config.steps.length; i++) {
      const step   = config.steps[i];
      const prefix = `[step ${i + 1}/${config.steps.length}] ${step.action}`;
      console.log(`${prefix}...`);

      const result = await executeStep(page, step, vars, screenshotDir, dryRun);
      results.push(result);

      const icon = result.status === 'ok'    ? 'OK'
                 : result.status === 'skip'  ? 'SKIP'
                 : result.status === 'warn'  ? 'WARN'
                 : 'ERR';

      console.log(`  [${icon}] ${result.note ?? ''}`);

      // Hard stop on non-optional navigation errors
      if (result.status === 'error' && step.action === 'navigate') {
        console.error('[runner] Navigation error — aborting run');
        break;
      }
    }

  } catch (err) {
    console.error(`[runner] Unhandled error: ${err.message}`);
    if (page) {
      await screenshotAndLog(page, 'unhandled_error', screenshotDir).catch(() => {});
    }
    results.push({ action: 'unhandled_error', status: 'error', note: err.message });
  } finally {
    if (browser) await closeBrowser(browser);
  }

  // 5. Save credentials on live run if we got an ok on check_success
  if (!dryRun) {
    const successStep = results.find(r => r.action === 'check_success' && r.status === 'ok');
    if (successStep) {
      try {
        addAccount(config.platform, email, password, {
          name,
          notes:    `Registered via signup-runner.js (${config.name})`,
          signupUrl: config.signup_url,
        });
        console.log('\n[runner] Credentials saved to data/credentials.json');
      } catch (err) {
        console.warn(`[runner] Could not save credentials: ${err.message}`);
      }
    }
  }

  // 6. Print summary
  printSummary({ platformName, dryRun, email, name, results, screenshotDir });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * Print a human-readable run summary.
 */
function printSummary({ platformName, dryRun, email, name, results, screenshotDir }) {
  const counts = { ok: 0, skip: 0, warn: 0, error: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const successStep = results.find(r => r.action === 'check_success');
  const captchaStep = results.find(r => r.action === 'check_captcha' && r.status === 'warn');

  let outcome;
  if (captchaStep)                                           outcome = 'CAPTCHA_DETECTED';
  else if (successStep?.status === 'ok')                     outcome = 'SUCCESS';
  else if (successStep?.status === 'warn')                   outcome = 'UNCLEAR';
  else if (dryRun)                                           outcome = 'DRY_RUN_COMPLETE';
  else                                                       outcome = 'INCOMPLETE';

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SUMMARY — ${platformName}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Mode      : ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`  Email     : ${email}`);
  console.log(`  Name      : ${name}`);
  console.log(`  Steps     : ${results.length} total | OK: ${counts.ok} | SKIP: ${counts.skip} | WARN: ${counts.warn} | ERR: ${counts.error}`);
  console.log(`  Outcome   : ${outcome}`);
  console.log(`  Screenshots: ${screenshotDir}`);
  console.log(`${'═'.repeat(60)}\n`);

  if (captchaStep) {
    console.log('  NOTE: CAPTCHA detected — this platform may require manual intervention or a proxy.');
  } else if (outcome === 'UNCLEAR') {
    console.log('  NOTE: Could not confirm success. Check screenshots for the actual result.');
  } else if (dryRun) {
    console.log('  NOTE: Dry-run complete. Review screenshots then re-run with --live to submit.');
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

run().catch((err) => {
  console.error('[runner] Fatal:', err.message);
  process.exit(1);
});
