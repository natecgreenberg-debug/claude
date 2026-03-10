'use strict';

/**
 * signup-devto.js
 *
 * Documents the Dev.to account signup flow end-to-end.
 * Uses a temporary email address via Guerrilla Mail (with mailtm fallback)
 * and screenshots every meaningful step.
 *
 * Dev.to primary signup URL: https://dev.to/enter?state=new-user
 * API key location (after login): Settings → Extensions → API Keys
 *
 * Also attempts API-based signup if browser flow is blocked.
 */

const path = require('path');
const fs   = require('fs');

const {
  launchBrowser,
  screenshotAndLog,
  closeBrowser,
} = require('../lib/browser');
const { addAccount } = require('../lib/credentials');

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREENSHOT_DIR = 'data/screenshots/devto';
const SIGNUP_URL     = 'https://dev.to/enter?state=new-user';
const NAV_TIMEOUT    = 60_000;
const POLL_WAIT_MS   = 20_000;

// ─── Temp Email (inline — guerrilla → mailtm fallback) ───────────────────────

const GUERRILLA_BASE = 'https://api.guerrillamail.com/ajax.php';
const MAILTM_BASE    = 'https://api.mail.tm';

async function timedFetch(url, options = {}, timeoutMs = 30_000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(url, options = {}) {
  const res = await timedFetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function guerrillaGetEmail() {
  const data = await fetchJSON(`${GUERRILLA_BASE}?f=get_email_address`);
  return {
    address:  data.email_addr,
    provider: 'guerrilla',
    meta:     { sid_token: data.sid_token, seq: 0 },
  };
}

async function guerrillaCheckInbox(meta) {
  const data = await fetchJSON(
    `${GUERRILLA_BASE}?f=check_email&seq=${meta.seq ?? 0}&sid_token=${meta.sid_token}`
  );
  return data.list ?? [];
}

async function mailtmGetEmail() {
  function randStr(n = 12) {
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
  }

  const domains = await fetchJSON(`${MAILTM_BASE}/domains?page=1`);
  const domain  = (domains['hydra:member'] ?? domains.member ?? [])[0]?.domain;
  if (!domain) throw new Error('mail.tm: no domains available');

  const local    = randStr(10);
  const address  = `${local}@${domain}`;
  const password = randStr(16);

  await fetchJSON(`${MAILTM_BASE}/accounts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ address, password }),
  });

  const tokenData = await fetchJSON(`${MAILTM_BASE}/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ address, password }),
  });

  return {
    address,
    provider: 'mailtm',
    meta:     { token: tokenData.token, password },
  };
}

async function mailtmCheckInbox(meta) {
  const data = await fetchJSON(`${MAILTM_BASE}/messages?page=1`, {
    headers: { Authorization: `Bearer ${meta.token}` },
  });
  return data['hydra:member'] ?? data.member ?? [];
}

async function checkInbox(provider, meta) {
  if (provider === 'guerrilla') return guerrillaCheckInbox(meta);
  if (provider === 'mailtm')   return mailtmCheckInbox(meta);
  return [];
}

async function getTempEmail() {
  try {
    const r = await guerrillaGetEmail();
    console.log(`[devto] Temp email via guerrilla: ${r.address}`);
    return r;
  } catch (err) {
    console.warn(`[devto] Guerrilla failed (${err.message}), trying mailtm...`);
    const r = await mailtmGetEmail();
    console.log(`[devto] Temp email via mailtm: ${r.address}`);
    return r;
  }
}

// ─── Generators ───────────────────────────────────────────────────────────────

function generateUsername() {
  const adjectives = ['swift', 'bold', 'cool', 'keen', 'sharp', 'quick', 'bright'];
  const nouns      = ['coder', 'dev', 'builder', 'maker', 'hacker', 'writer', 'byte'];
  const adj  = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num  = Math.floor(100 + Math.random() * 900);
  return `${adj}_${noun}_${num}`;
}

function generateName() {
  const firsts = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Drew'];
  const lasts  = ['Parker', 'Mitchell', 'Hayes', 'Collins', 'Brooks', 'Morgan', 'Reed'];
  return `${firsts[Math.floor(Math.random() * firsts.length)]} ${lasts[Math.floor(Math.random() * lasts.length)]}`;
}

function generatePassword() {
  const words = ['Falcon', 'Ember', 'Cobalt', 'Prism', 'Vortex', 'Storm', 'Forge'];
  const w1  = words[Math.floor(Math.random() * words.length)];
  const w2  = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${w1}${w2}${num}!`;
}

// ─── Page analysis helpers ────────────────────────────────────────────────────

async function pageHtml(page) {
  try { return (await page.content()).toLowerCase(); } catch { return ''; }
}

async function detectCaptcha(page) {
  const h = await pageHtml(page);
  return h.includes('captcha') || h.includes('recaptcha') || h.includes('hcaptcha') ||
         h.includes('turnstile') || h.includes('cloudflare') || h.includes('challenge');
}

async function detectEmailVerify(page) {
  const h   = await pageHtml(page);
  const url = page.url();
  return h.includes('verify your email') || h.includes('confirm your email') ||
         h.includes('check your inbox')  || h.includes('confirmation email') ||
         h.includes('we sent you')       || h.includes('verification link') ||
         url.includes('confirm')         || url.includes('verify');
}

async function detectSuccess(page) {
  const url = page.url();
  const h   = await pageHtml(page);
  return url.includes('dev.to/dashboard') || url.includes('dev.to/settings') ||
         url.includes('dev.to/') && !url.includes('enter') ||
         h.includes('write a post') || h.includes('reading list') ||
         (h.includes('dashboard') && h.includes('dev.to'));
}

// ─── Helper: try a list of selectors ─────────────────────────────────────────

async function findFirst(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) return { el, sel };
    } catch { /* continue */ }
  }
  return null;
}

// ─── Dev.to selectors ─────────────────────────────────────────────────────────

// Dev.to signup form selectors
const EMAIL_SELECTORS = [
  'input[name="user[email]"]',
  'input[id="user_email"]',
  'input[type="email"]',
  'input[name="email"]',
  'input[placeholder*="email" i]',
];

const USERNAME_SELECTORS = [
  'input[name="user[username]"]',
  'input[id="user_username"]',
  'input[name="username"]',
  'input[placeholder*="username" i]',
];

const NAME_SELECTORS = [
  'input[name="user[name]"]',
  'input[id="user_name"]',
  'input[name="name"]',
  'input[placeholder*="name" i]',
];

const PASSWORD_SELECTORS = [
  'input[name="user[password]"]',
  'input[id="user_password"]',
  'input[name="password"]',
  'input[type="password"]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Sign up")',
  'button:has-text("Create account")',
  'button:has-text("Continue")',
  '[type="submit"]',
];

// Selector to look for email signup option vs social-only
const EMAIL_SIGNUP_LINK_SELECTORS = [
  'a:has-text("Sign up with Email")',
  'a:has-text("Continue with Email")',
  'a:has-text("Use Email")',
  'button:has-text("Sign up with Email")',
  'button:has-text("Continue with Email")',
  '[data-testid*="email"]',
  'a[href*="email"]',
];

// ─── API signup attempt ───────────────────────────────────────────────────────

/**
 * Dev.to does not have a public API signup endpoint, but we can attempt
 * a POST to their user registration endpoint (used by their web form).
 * This mirrors the form submission without a browser.
 */
async function tryApiSignup(email, username, name, password) {
  console.log('[devto] Attempting API-based signup via form POST endpoint...');
  try {
    // Dev.to Rails app — standard Rails form endpoint
    // First get the CSRF token from the signup page
    const signupRes = await timedFetch(SIGNUP_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    }, 30_000);

    const html = await signupRes.text();

    // Extract CSRF token
    const csrfMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : null;

    if (!csrf) {
      console.warn('[devto] API signup: could not find CSRF token in page HTML');
      // Log a snippet of the page for debugging
      const snippet = html.slice(0, 300).replace(/\s+/g, ' ');
      console.log(`[devto] Page snippet: ${snippet}`);
      return { success: false, reason: 'no_csrf_token' };
    }

    console.log(`[devto] API signup: got CSRF token (length=${csrf.length})`);

    // Attempt the POST
    const formData = new URLSearchParams({
      'authenticity_token': csrf,
      'user[email]':        email,
      'user[name]':         name,
      'user[username]':     username,
      'user[password]':     password,
      'user[password_confirmation]': password,
    });

    const postRes = await timedFetch('https://dev.to/users', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'User-Agent':    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer':       SIGNUP_URL,
        'Origin':        'https://dev.to',
        'Accept':        'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      body: formData.toString(),
    }, 30_000);

    const responseText = await postRes.text();
    const status = postRes.status;
    const finalUrl = postRes.url;

    console.log(`[devto] API signup: POST status=${status}, final URL=${finalUrl}`);

    const lower = responseText.toLowerCase();
    if (lower.includes('verify your email') || lower.includes('confirm your email') ||
        lower.includes('check your inbox')  || lower.includes('confirmation email')) {
      return { success: true, reason: 'email_verification_sent', finalUrl };
    }
    if (lower.includes('email has already been taken') || lower.includes('username has already been taken')) {
      return { success: false, reason: 'already_taken', finalUrl };
    }
    if (lower.includes('dashboard') || lower.includes('reading list') || lower.includes('write a post')) {
      return { success: true, reason: 'direct_login_no_verification', finalUrl };
    }
    if (status === 200 && finalUrl !== SIGNUP_URL) {
      return { success: true, reason: `redirected_to_${finalUrl}`, finalUrl };
    }

    // Save response snippet for analysis
    const snippet = responseText.slice(0, 600).replace(/\s+/g, ' ');
    console.log(`[devto] API signup response snippet: ${snippet}`);
    return { success: false, reason: `unexpected_response_status_${status}`, finalUrl };

  } catch (err) {
    console.warn(`[devto] API signup failed: ${err.message}`);
    return { success: false, reason: `api_error: ${err.message}` };
  }
}

// ─── Main flow ────────────────────────────────────────────────────────────────

async function run() {
  fs.mkdirSync(path.resolve(SCREENSHOT_DIR), { recursive: true });

  const stepsCompleted = [];
  let blockReason      = null;
  let outcome          = 'incomplete';
  let tempEmail        = null;
  let tempMeta         = null;
  let tempProvider     = null;
  const password       = generatePassword();
  const username       = generateUsername();
  const name           = generateName();

  console.log('[devto] Starting Dev.to signup flow documentation');
  console.log(`[devto] Screenshot dir: ${path.resolve(SCREENSHOT_DIR)}`);

  // ── Step 1: Get temp email ────────────────────────────────────────────────
  try {
    const r    = await getTempEmail();
    tempEmail  = r.address;
    tempMeta   = r.meta;
    tempProvider = r.provider;
    stepsCompleted.push('temp_email_obtained');
    console.log(`[devto] Step 1: Temp email → ${tempEmail} (via ${tempProvider})`);
  } catch (err) {
    console.error(`[devto] Step 1 FAILED: ${err.message}`);
    printSummary({ stepsCompleted, blockReason: `temp_email_failed: ${err.message}`, outcome: 'error', tempEmail, username, name });
    return;
  }

  // ── Step 2 (parallel): Try API signup while browser loads ────────────────
  console.log('[devto] Step 2: Attempting API signup in parallel with browser launch...');
  const apiSignupPromise = tryApiSignup(tempEmail, username, name, password);

  let browser;
  let page;

  try {
    // ── Step 3: Launch browser ───────────────────────────────────────────────
    ({ browser, page } = await launchBrowser({ headless: true }));
    stepsCompleted.push('browser_launched');
    console.log('[devto] Step 3: Browser launched');

    // ── Step 4: Navigate to signup page ─────────────────────────────────────
    try {
      await page.goto(SIGNUP_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      stepsCompleted.push('navigated_to_signup');
      console.log(`[devto] Step 4: Navigated to ${SIGNUP_URL}`);
    } catch (err) {
      blockReason = `navigation_failed: ${err.message}`;
      console.error(`[devto] Step 4 FAILED — ${blockReason}`);
      await screenshotAndLog(page, 'step4_nav_error', SCREENSHOT_DIR).catch(() => {});
      outcome = 'error';
      return;
    }

    // Wait for page to settle
    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step4_signup_page', SCREENSHOT_DIR).catch(() => {});
    console.log(`[devto] Step 4: Signup page screenshot saved. URL: ${page.url()}`);
    stepsCompleted.push('screenshot_signup_page');

    // ── Step 5: Check for CAPTCHA ────────────────────────────────────────────
    if (await detectCaptcha(page)) {
      blockReason = 'captcha_on_signup_page';
      console.warn(`[devto] Step 5: CAPTCHA detected on signup page`);
      await screenshotAndLog(page, 'step5_captcha', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('captcha_detected');
      outcome = 'blocked';
    }

    // ── Step 6: Identify email signup option ─────────────────────────────────
    const html = await pageHtml(page);
    const hasEmailOption = html.includes('email') && (
      html.includes('sign up with email') || html.includes('continue with email') ||
      html.includes('user[email]') || html.includes('user_email') ||
      html.includes('input') && html.includes('password')
    );
    console.log(`[devto] Step 6: Email signup option detected? ${hasEmailOption}`);
    stepsCompleted.push(hasEmailOption ? 'email_signup_option_found' : 'email_signup_option_not_found');

    // Look for a "Sign up with Email" link/button and click it
    const emailLink = await findFirst(page, EMAIL_SIGNUP_LINK_SELECTORS);
    if (emailLink) {
      console.log(`[devto] Step 6: Found email signup link: ${emailLink.sel} — clicking`);
      try {
        await page.click(emailLink.sel);
        await page.waitForTimeout(2000).catch(() => {});
        stepsCompleted.push('clicked_email_signup_link');
        await screenshotAndLog(page, 'step6_after_email_link_click', SCREENSHOT_DIR).catch(() => {});
        console.log(`[devto] Step 6: After click, URL: ${page.url()}`);
      } catch (err) {
        console.warn(`[devto] Step 6: Email link click failed: ${err.message}`);
      }
    } else {
      console.log('[devto] Step 6: No separate email link — may already show email form');
      await screenshotAndLog(page, 'step6_no_email_link', SCREENSHOT_DIR).catch(() => {});
    }

    // ── Step 7: Fill the signup form ─────────────────────────────────────────
    // Email field
    const emailField = await findFirst(page, EMAIL_SELECTORS);
    if (emailField) {
      try {
        await page.fill(emailField.sel, tempEmail);
        stepsCompleted.push('filled_email');
        console.log(`[devto] Step 7: Filled email (selector: ${emailField.sel})`);
      } catch (err) {
        console.warn(`[devto] Step 7: Could not fill email: ${err.message}`);
      }
    } else {
      console.warn('[devto] Step 7: No email field found');
      stepsCompleted.push('email_field_not_found');
    }

    // Username field
    const usernameField = await findFirst(page, USERNAME_SELECTORS);
    if (usernameField) {
      try {
        await page.fill(usernameField.sel, username);
        stepsCompleted.push('filled_username');
        console.log(`[devto] Step 7: Filled username "${username}" (selector: ${usernameField.sel})`);
      } catch (err) {
        console.warn(`[devto] Step 7: Could not fill username: ${err.message}`);
      }
    } else {
      console.warn('[devto] Step 7: No username field found (may appear later)');
    }

    // Name field
    const nameField = await findFirst(page, NAME_SELECTORS);
    if (nameField) {
      try {
        await page.fill(nameField.sel, name);
        stepsCompleted.push('filled_name');
        console.log(`[devto] Step 7: Filled name "${name}" (selector: ${nameField.sel})`);
      } catch (err) {
        console.warn(`[devto] Step 7: Could not fill name: ${err.message}`);
      }
    }

    // Password field
    const pwField = await findFirst(page, PASSWORD_SELECTORS);
    if (pwField) {
      try {
        await page.fill(pwField.sel, password);
        stepsCompleted.push('filled_password');
        console.log(`[devto] Step 7: Filled password (selector: ${pwField.sel})`);
      } catch (err) {
        console.warn(`[devto] Step 7: Could not fill password: ${err.message}`);
      }
    } else {
      console.warn('[devto] Step 7: No password field found');
      stepsCompleted.push('password_field_not_found');
    }

    await screenshotAndLog(page, 'step7_form_filled', SCREENSHOT_DIR).catch(() => {});

    // ── Step 8: Submit form ──────────────────────────────────────────────────
    const submitBtn = await findFirst(page, SUBMIT_SELECTORS);
    if (submitBtn) {
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }).catch(() => {}),
          page.click(submitBtn.sel),
        ]);
        stepsCompleted.push('submitted_form');
        console.log(`[devto] Step 8: Submitted form (selector: ${submitBtn.sel})`);
      } catch (err) {
        console.warn(`[devto] Step 8: Submit error: ${err.message}`);
        stepsCompleted.push('submit_error');
      }
    } else {
      console.warn('[devto] Step 8: No submit button found');
      stepsCompleted.push('no_submit_button');
    }

    // Wait for response
    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step8_post_submit', SCREENSHOT_DIR).catch(() => {});
    console.log(`[devto] Step 8: Post-submit URL: ${page.url()}`);

    // ── Step 9: Analyse result ───────────────────────────────────────────────
    if (await detectCaptcha(page)) {
      blockReason = 'captcha_post_submit';
      console.warn('[devto] Step 9: CAPTCHA after form submit');
      await screenshotAndLog(page, 'step9_captcha_post_submit', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('captcha_post_submit');
      outcome = 'blocked';
    } else if (await detectEmailVerify(page)) {
      console.log('[devto] Step 9: Email verification step detected');
      stepsCompleted.push('email_verification_requested');
      await screenshotAndLog(page, 'step9_email_verify_prompt', SCREENSHOT_DIR).catch(() => {});

      // ── Step 10: Poll inbox ──────────────────────────────────────────────
      console.log(`[devto] Step 10: Waiting ${POLL_WAIT_MS / 1000}s before checking inbox...`);
      await new Promise(r => setTimeout(r, POLL_WAIT_MS));

      let emailFound = false;
      try {
        let messages = await checkInbox(tempProvider, tempMeta);
        console.log(`[devto] Step 10: Inbox has ${messages.length} message(s)`);
        if (messages.length > 0) {
          emailFound = true;
          const msg = messages[0];
          const subject = msg.subject ?? msg.mail_subject ?? 'unknown';
          console.log(`[devto] Step 10: First email subject: "${subject}"`);
          stepsCompleted.push('verification_email_received');
        } else {
          console.warn('[devto] Step 10: Inbox empty, waiting 20s more...');
          await new Promise(r => setTimeout(r, 20_000));
          messages = await checkInbox(tempProvider, tempMeta);
          if (messages.length > 0) {
            emailFound = true;
            stepsCompleted.push('verification_email_received_second_poll');
            console.log(`[devto] Step 10: Email arrived on second poll`);
          } else {
            stepsCompleted.push('inbox_empty_both_polls');
            console.warn('[devto] Step 10: No emails after both polls');
          }
        }
      } catch (err) {
        console.warn(`[devto] Step 10: Inbox check failed: ${err.message}`);
        stepsCompleted.push('inbox_check_failed');
      }

      outcome = emailFound ? 'pending_email_verification' : 'pending_email_verification_unconfirmed';

      // Store credentials
      try {
        addAccount('devto', tempEmail, password, {
          username,
          name,
          status: 'pending_verification',
          notes:  'Created via signup-devto.js — awaiting email verification',
          signupUrl: SIGNUP_URL,
          apiKeyLocation: 'dev.to Settings → Extensions → API Keys',
        });
        stepsCompleted.push('credentials_stored');
        console.log('[devto] Step 10: Credentials stored in credentials.json');
      } catch (err) {
        console.warn(`[devto] Could not store credentials: ${err.message}`);
      }

    } else if (await detectSuccess(page)) {
      outcome = 'success';
      stepsCompleted.push('account_created');
      console.log('[devto] Step 9: SUCCESS — reached dashboard/home');
      await screenshotAndLog(page, 'step9_success', SCREENSHOT_DIR).catch(() => {});

      try {
        addAccount('devto', tempEmail, password, {
          username,
          name,
          notes:          'Created via signup-devto.js',
          signupUrl:      SIGNUP_URL,
          apiKeyLocation: 'dev.to Settings → Extensions → API Keys',
        });
        stepsCompleted.push('credentials_stored');
      } catch (err) {
        console.warn(`[devto] Could not store credentials: ${err.message}`);
      }
    } else {
      const unknownUrl = page.url();
      const htmlSnippet = (await page.content().catch(() => '')).slice(0, 500);
      console.warn(`[devto] Step 9: Unknown post-submit state`);
      console.warn(`[devto]   URL: ${unknownUrl}`);
      console.warn(`[devto]   HTML snippet: ${htmlSnippet.replace(/\s+/g, ' ')}`);
      stepsCompleted.push('unknown_final_state');
      blockReason = `unknown_state_at: ${unknownUrl}`;
      outcome = 'incomplete';
      await screenshotAndLog(page, 'step9_unknown_state', SCREENSHOT_DIR).catch(() => {});
    }

  } catch (err) {
    console.error(`[devto] Unhandled error: ${err.message}`);
    blockReason = blockReason || `unhandled_error: ${err.message}`;
    outcome = 'error';
    if (page) {
      await screenshotAndLog(page, 'error_unhandled', SCREENSHOT_DIR).catch(() => {});
    }
  } finally {
    if (browser) await closeBrowser(browser);
  }

  // ── Resolve API signup result ─────────────────────────────────────────────
  console.log('\n[devto] Resolving API signup result...');
  try {
    const apiResult = await apiSignupPromise;
    console.log(`[devto] API signup result: success=${apiResult.success}, reason=${apiResult.reason}`);
    stepsCompleted.push(`api_signup_${apiResult.success ? 'succeeded' : 'failed'}: ${apiResult.reason}`);
  } catch (err) {
    console.warn(`[devto] API signup promise rejected: ${err.message}`);
  }

  printSummary({ stepsCompleted, blockReason, outcome, tempEmail, username, name });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary({ stepsCompleted, blockReason, outcome, tempEmail, username, name }) {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  DEV.TO SIGNUP — SUMMARY');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Temp email : ${tempEmail ?? 'none'}`);
  console.log(`  Username   : ${username ?? 'N/A'}`);
  console.log(`  Name       : ${name ?? 'N/A'}`);
  console.log(`  Steps      : ${stepsCompleted.join(' → ')}`);
  console.log(`  Outcome    : ${outcome.toUpperCase()}`);
  if (blockReason) console.log(`  Block reason: ${blockReason}`);
  console.log(`  Screenshots: ${path.resolve(SCREENSHOT_DIR)}`);
  console.log('');

  const notes = {
    success:                            'Account created. Visit Settings → Extensions → API Keys.',
    pending_email_verification:         'Signup submitted. Verification email arrived — complete link click manually or automate.',
    pending_email_verification_unconfirmed: 'Signup submitted. Email verification step reached but inbox empty — email may arrive later.',
    blocked:                            'Flow blocked — see block reason above.',
    incomplete:                         'Flow did not reach a terminal state — check screenshots.',
    error:                              'Script error — see logs above.',
  };
  console.log(`  Note: ${notes[outcome] ?? outcome}`);
  console.log('══════════════════════════════════════════════════════════\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

run().catch((err) => {
  console.error('[devto] Fatal:', err.message);
  process.exit(1);
});
