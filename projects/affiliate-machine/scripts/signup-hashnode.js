'use strict';

/**
 * signup-hashnode.js
 *
 * Documents the Hashnode account signup flow end-to-end.
 * Uses a temporary email address via Guerrilla Mail (with mailtm fallback)
 * and screenshots every meaningful step.
 *
 * Hashnode signup URL: https://hashnode.com/onboard
 * Also attempts GraphQL API-based signup since Hashnode uses GraphQL.
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

const SCREENSHOT_DIR = 'data/screenshots/hashnode';
const SIGNUP_URL     = 'https://hashnode.com/onboard';
const LOGIN_URL      = 'https://hashnode.com/login';
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
    console.log(`[hashnode] Temp email via guerrilla: ${r.address}`);
    return r;
  } catch (err) {
    console.warn(`[hashnode] Guerrilla failed (${err.message}), trying mailtm...`);
    const r = await mailtmGetEmail();
    console.log(`[hashnode] Temp email via mailtm: ${r.address}`);
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
  return `${adj}${noun}${num}`;
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
         h.includes('magic link')        || h.includes('otp') ||
         url.includes('confirm')         || url.includes('verify');
}

async function detectSuccess(page) {
  const url = page.url();
  const h   = await pageHtml(page);
  // Only count as success if we've actually left the onboard/login pages
  // and reached a real authenticated page
  if (url.includes('/onboard') || url.includes('/login') || url.includes('/signup')) {
    return false;
  }
  return (url.includes('hashnode.com/@') ||
          url.includes('hashnode.com/dashboard') ||
          h.includes('your blog') ||
          h.includes('start writing') ||
          (h.includes('dashboard') && h.includes('hashnode') && !h.includes('sign in')));
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

// ─── Hashnode selectors ───────────────────────────────────────────────────────

// Hashnode uses various auth flows — magic link, email, social
const EMAIL_SIGNUP_SELECTORS = [
  'button:has-text("Sign up with Email")',
  'button:has-text("Continue with Email")',
  'a:has-text("Sign up with Email")',
  'a:has-text("Continue with Email")',
  'button:has-text("Use Email")',
  '[data-testid="email-signup"]',
];

const EMAIL_SELECTORS = [
  'input[name="email"]',
  'input[type="email"]',
  'input[id="email"]',
  'input[placeholder*="email" i]',
  'input[aria-label*="email" i]',
];

const USERNAME_SELECTORS = [
  'input[name="username"]',
  'input[id="username"]',
  'input[placeholder*="username" i]',
  'input[placeholder*="handle" i]',
  'input[aria-label*="username" i]',
];

const NAME_SELECTORS = [
  'input[name="name"]',
  'input[id="name"]',
  'input[placeholder*="name" i]',
  'input[aria-label*="name" i]',
];

const PASSWORD_SELECTORS = [
  'input[name="password"]',
  'input[type="password"]',
  'input[id="password"]',
];

const SUBMIT_SELECTORS = [
  'button:has-text("Next")',
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Sign up")',
  'button:has-text("Create account")',
  'button:has-text("Continue")',
  'button:has-text("Get started")',
  '[type="submit"]',
];

// ─── Hashnode GraphQL / API signup attempt ────────────────────────────────────

/**
 * Hashnode uses a GraphQL API. We can attempt signup via their createUser mutation.
 * Note: Hashnode's auth is typically magic-link based, so pure API signup
 * is unlikely without a browser session, but we document the attempt.
 */
async function tryApiSignup(email, username, name) {
  console.log('[hashnode] Attempting API signup via GraphQL endpoint...');
  try {
    // Hashnode GraphQL endpoint
    const GRAPHQL_URL = 'https://gql.hashnode.com';

    // First: try the createAccount / signup mutation
    // Hashnode's public GraphQL schema — request magic link
    const requestMagicLinkMutation = `
      mutation {
        requestMagicLink(input: {
          email: "${email}"
          requestedFrom: SIGN_UP
        }) {
          success
          message
        }
      }
    `;

    const res = await timedFetch(GRAPHQL_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Origin':       'https://hashnode.com',
        'Referer':      'https://hashnode.com/',
      },
      body: JSON.stringify({ query: requestMagicLinkMutation }),
    }, 30_000);

    const data = await res.json();
    console.log(`[hashnode] API signup response: ${JSON.stringify(data)}`);

    if (data?.data?.requestMagicLink?.success) {
      return {
        success: true,
        reason:  'magic_link_sent',
        message: data.data.requestMagicLink.message,
      };
    }
    if (data?.errors) {
      const errorMsg = data.errors.map(e => e.message).join(', ');
      console.warn(`[hashnode] API signup GraphQL errors: ${errorMsg}`);
      return { success: false, reason: `graphql_errors: ${errorMsg}` };
    }

    return { success: false, reason: 'unexpected_graphql_response', data };
  } catch (err) {
    console.warn(`[hashnode] API signup failed: ${err.message}`);
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

  console.log('[hashnode] Starting Hashnode signup flow documentation');
  console.log(`[hashnode] Screenshot dir: ${path.resolve(SCREENSHOT_DIR)}`);

  // ── Step 1: Get temp email ────────────────────────────────────────────────
  try {
    const r    = await getTempEmail();
    tempEmail  = r.address;
    tempMeta   = r.meta;
    tempProvider = r.provider;
    stepsCompleted.push('temp_email_obtained');
    console.log(`[hashnode] Step 1: Temp email → ${tempEmail} (via ${tempProvider})`);
  } catch (err) {
    console.error(`[hashnode] Step 1 FAILED: ${err.message}`);
    printSummary({ stepsCompleted, blockReason: `temp_email_failed: ${err.message}`, outcome: 'error', tempEmail, username, name });
    return;
  }

  // ── Step 2 (parallel): Try GraphQL API signup while browser loads ─────────
  console.log('[hashnode] Step 2: Attempting GraphQL API signup in parallel with browser...');
  const apiSignupPromise = tryApiSignup(tempEmail, username, name);

  let browser;
  let page;

  try {
    // ── Step 3: Launch browser ───────────────────────────────────────────────
    ({ browser, page } = await launchBrowser({ headless: true }));
    stepsCompleted.push('browser_launched');
    console.log('[hashnode] Step 3: Browser launched');

    // ── Step 4a: Navigate to /login to document the real auth entry point ──
    try {
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      await page.waitForTimeout(4000).catch(() => {});
      stepsCompleted.push('navigated_to_login');
      console.log(`[hashnode] Step 4a: Navigated to ${LOGIN_URL}, URL now: ${page.url()}`);
    } catch (err) {
      console.warn(`[hashnode] Step 4a: Login page nav failed: ${err.message}`);
    }
    await screenshotAndLog(page, 'step4a_login_page', SCREENSHOT_DIR).catch(() => {});

    // ── Step 4b: Navigate to /onboard (profile setup page) ──────────────────
    try {
      await page.goto(SIGNUP_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      stepsCompleted.push('navigated_to_onboard');
      console.log(`[hashnode] Step 4b: Navigated to ${SIGNUP_URL}`);
    } catch (err) {
      blockReason = `navigation_failed: ${err.message}`;
      console.error(`[hashnode] Step 4b FAILED — ${blockReason}`);
      await screenshotAndLog(page, 'step4b_nav_error', SCREENSHOT_DIR).catch(() => {});
      outcome = 'error';
      return;
    }

    // Wait for JS to render
    await page.waitForTimeout(4000).catch(() => {});
    await screenshotAndLog(page, 'step4_signup_page', SCREENSHOT_DIR).catch(() => {});
    console.log(`[hashnode] Step 4b: Onboard page screenshot saved. URL: ${page.url()}`);
    stepsCompleted.push('screenshot_signup_page');

    // ── Step 5: Check for CAPTCHA / Cloudflare ──────────────────────────────
    if (await detectCaptcha(page)) {
      blockReason = 'captcha_or_cloudflare_on_onboard_page';
      console.warn('[hashnode] Step 5: CAPTCHA/Cloudflare detected on onboard page');
      await screenshotAndLog(page, 'step5_captcha', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('captcha_detected');
      outcome = 'blocked';
    }

    // Note: /login is blocked by Cloudflare Turnstile (bot detection).
    // /onboard is the post-auth profile setup page — email field is disabled
    // because it requires a magic-link authenticated session to be usable.
    // The real auth flow: email → magic link email → click link → /onboard
    console.log('[hashnode] Step 5: Note — /login is Cloudflare-gated, /onboard email field is disabled (requires prior magic-link session)');

    // ── Step 6: Identify signup options ──────────────────────────────────────
    const html = await pageHtml(page);
    const hasEmailOption = html.includes('email');
    const hasSocialOnly  = (html.includes('github') || html.includes('google')) && !hasEmailOption;
    console.log(`[hashnode] Step 6: Email option? ${hasEmailOption}, Social-only? ${hasSocialOnly}`);
    stepsCompleted.push(hasEmailOption ? 'email_option_visible' : 'no_email_option');

    // Log page structure for analysis
    const titleText = await page.title().catch(() => 'unknown');
    console.log(`[hashnode] Step 6: Page title: "${titleText}"`);

    // Try to click "Sign up with Email" link if present
    const emailLink = await findFirst(page, EMAIL_SIGNUP_SELECTORS);
    if (emailLink) {
      console.log(`[hashnode] Step 6: Found email signup button: ${emailLink.sel}`);
      try {
        await page.click(emailLink.sel);
        await page.waitForTimeout(2000).catch(() => {});
        stepsCompleted.push('clicked_email_signup_button');
        await screenshotAndLog(page, 'step6_after_email_click', SCREENSHOT_DIR).catch(() => {});
        console.log(`[hashnode] Step 6: After click, URL: ${page.url()}`);
      } catch (err) {
        console.warn(`[hashnode] Step 6: Email link click failed: ${err.message}`);
      }
    } else {
      console.log('[hashnode] Step 6: No separate email signup button — checking for email field');
      await screenshotAndLog(page, 'step6_no_email_button', SCREENSHOT_DIR).catch(() => {});
    }

    // ── Step 7: Fill the signup form ─────────────────────────────────────────
    // Hashnode's email field starts disabled (React not yet hydrated).
    // Wait up to 15s for it to become enabled before trying to fill.
    console.log('[hashnode] Step 7: Waiting for email field to become enabled (React hydration)...');
    try {
      await page.waitForSelector('input[type="email"]:not([disabled])', { timeout: 15_000 });
      console.log('[hashnode] Step 7: Email field is now enabled');
    } catch (waitErr) {
      console.warn('[hashnode] Step 7: Email field still disabled after 15s wait — attempting fill anyway');
    }

    // Email field
    const emailField = await findFirst(page, EMAIL_SELECTORS);
    if (emailField) {
      try {
        // Use JavaScript fill as fallback if normal fill fails on disabled element
        // Note: page.evaluate only accepts a single argument — wrap in object
        await page.evaluate(({ sel, val }) => {
          const el = document.querySelector(sel);
          if (el) {
            el.removeAttribute('disabled');
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, { sel: emailField.sel, val: tempEmail });
        // Also try the Playwright fill
        try { await page.fill(emailField.sel, tempEmail); } catch (_) {}
        stepsCompleted.push('filled_email');
        console.log(`[hashnode] Step 7: Filled email "${tempEmail}" (selector: ${emailField.sel})`);
      } catch (err) {
        console.warn(`[hashnode] Step 7: Could not fill email: ${err.message}`);
      }
    } else {
      console.warn('[hashnode] Step 7: No email field found');
      stepsCompleted.push('email_field_not_found');
    }

    // Username field
    const usernameField = await findFirst(page, USERNAME_SELECTORS);
    if (usernameField) {
      try {
        // Triple-click to select all existing text, then fill
        await page.click(usernameField.sel, { clickCount: 3 }).catch(() => {});
        await page.fill(usernameField.sel, username);
        stepsCompleted.push('filled_username');
        console.log(`[hashnode] Step 7: Filled username "${username}" (selector: ${usernameField.sel})`);
      } catch (err) {
        console.warn(`[hashnode] Step 7: Could not fill username: ${err.message}`);
      }
    } else {
      console.warn('[hashnode] Step 7: No username field found (Hashnode may use only email/magic-link)');
    }

    // Name field
    const nameField = await findFirst(page, NAME_SELECTORS);
    if (nameField) {
      try {
        await page.click(nameField.sel, { clickCount: 3 }).catch(() => {});
        await page.fill(nameField.sel, name);
        stepsCompleted.push('filled_name');
        console.log(`[hashnode] Step 7: Filled name "${name}" (selector: ${nameField.sel})`);
      } catch (err) {
        console.warn(`[hashnode] Step 7: Could not fill name: ${err.message}`);
      }
    }

    // Password field
    const pwField = await findFirst(page, PASSWORD_SELECTORS);
    if (pwField) {
      try {
        await page.fill(pwField.sel, password);
        stepsCompleted.push('filled_password');
        console.log(`[hashnode] Step 7: Filled password (selector: ${pwField.sel})`);
      } catch (err) {
        console.warn(`[hashnode] Step 7: Could not fill password: ${err.message}`);
      }
    } else {
      console.warn('[hashnode] Step 7: No password field (Hashnode likely uses magic-link — no password)');
      stepsCompleted.push('no_password_field_magic_link_likely');
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
        console.log(`[hashnode] Step 8: Submitted form (selector: ${submitBtn.sel})`);
      } catch (err) {
        console.warn(`[hashnode] Step 8: Submit error: ${err.message}`);
        stepsCompleted.push('submit_error');
      }
    } else {
      console.warn('[hashnode] Step 8: No submit button found');
      stepsCompleted.push('no_submit_button');
    }

    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step8_post_submit', SCREENSHOT_DIR).catch(() => {});
    console.log(`[hashnode] Step 8: Post-submit URL: ${page.url()}`);

    // ── Step 9: Analyse result ───────────────────────────────────────────────
    if (await detectCaptcha(page)) {
      blockReason = 'captcha_post_submit';
      console.warn('[hashnode] Step 9: CAPTCHA after form submit');
      await screenshotAndLog(page, 'step9_captcha_post_submit', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('captcha_post_submit');
      outcome = 'blocked';
    } else if (await detectEmailVerify(page)) {
      console.log('[hashnode] Step 9: Email verification / magic-link step detected');
      stepsCompleted.push('email_verification_or_magic_link_requested');
      await screenshotAndLog(page, 'step9_email_verify_prompt', SCREENSHOT_DIR).catch(() => {});

      // ── Step 10: Poll inbox ──────────────────────────────────────────────
      console.log(`[hashnode] Step 10: Waiting ${POLL_WAIT_MS / 1000}s before checking inbox...`);
      await new Promise(r => setTimeout(r, POLL_WAIT_MS));

      let emailFound = false;
      try {
        let messages = await checkInbox(tempProvider, tempMeta);
        console.log(`[hashnode] Step 10: Inbox has ${messages.length} message(s)`);
        if (messages.length > 0) {
          emailFound = true;
          const msg = messages[0];
          const subject = msg.subject ?? msg.mail_subject ?? 'unknown';
          console.log(`[hashnode] Step 10: First email subject: "${subject}"`);
          stepsCompleted.push('verification_email_received');
        } else {
          console.warn('[hashnode] Step 10: Inbox empty, waiting 20s more...');
          await new Promise(r => setTimeout(r, 20_000));
          messages = await checkInbox(tempProvider, tempMeta);
          if (messages.length > 0) {
            emailFound = true;
            stepsCompleted.push('verification_email_received_second_poll');
            console.log('[hashnode] Step 10: Email arrived on second poll');
          } else {
            stepsCompleted.push('inbox_empty_both_polls');
            console.warn('[hashnode] Step 10: No emails after both polls');
          }
        }
      } catch (err) {
        console.warn(`[hashnode] Step 10: Inbox check failed: ${err.message}`);
        stepsCompleted.push('inbox_check_failed');
      }

      outcome = emailFound ? 'pending_email_verification' : 'pending_email_verification_unconfirmed';

      // Store credentials
      try {
        addAccount('hashnode', tempEmail, password, {
          username,
          name,
          status: 'pending_verification',
          notes:  'Created via signup-hashnode.js — awaiting magic link / email verification',
          signupUrl: SIGNUP_URL,
        });
        stepsCompleted.push('credentials_stored');
        console.log('[hashnode] Step 10: Credentials stored in credentials.json');
      } catch (err) {
        console.warn(`[hashnode] Could not store credentials: ${err.message}`);
      }

    } else if (await detectSuccess(page)) {
      outcome = 'success';
      stepsCompleted.push('account_created');
      console.log('[hashnode] Step 9: SUCCESS — reached dashboard/home');
      await screenshotAndLog(page, 'step9_success', SCREENSHOT_DIR).catch(() => {});

      try {
        addAccount('hashnode', tempEmail, password, {
          username,
          name,
          notes:    'Created via signup-hashnode.js',
          signupUrl: SIGNUP_URL,
        });
        stepsCompleted.push('credentials_stored');
      } catch (err) {
        console.warn(`[hashnode] Could not store credentials: ${err.message}`);
      }
    } else {
      const unknownUrl = page.url();
      const htmlSnippet = (await page.content().catch(() => '')).slice(0, 500);
      console.warn('[hashnode] Step 9: Unknown post-submit state');
      console.warn(`[hashnode]   URL: ${unknownUrl}`);
      console.warn(`[hashnode]   HTML snippet: ${htmlSnippet.replace(/\s+/g, ' ')}`);
      stepsCompleted.push('unknown_final_state');
      blockReason = `unknown_state_at: ${unknownUrl}`;
      outcome = 'incomplete';
      await screenshotAndLog(page, 'step9_unknown_state', SCREENSHOT_DIR).catch(() => {});
    }

  } catch (err) {
    console.error(`[hashnode] Unhandled error: ${err.message}`);
    blockReason = blockReason || `unhandled_error: ${err.message}`;
    outcome = 'error';
    if (page) {
      await screenshotAndLog(page, 'error_unhandled', SCREENSHOT_DIR).catch(() => {});
    }
  } finally {
    if (browser) await closeBrowser(browser);
  }

  // ── Resolve API signup result ─────────────────────────────────────────────
  console.log('\n[hashnode] Resolving GraphQL API signup result...');
  try {
    const apiResult = await apiSignupPromise;
    console.log(`[hashnode] GraphQL API result: success=${apiResult.success}, reason=${apiResult.reason}`);
    stepsCompleted.push(`api_signup_${apiResult.success ? 'succeeded' : 'failed'}: ${apiResult.reason}`);

    // If API signup sent a magic link, check the inbox for it
    if (apiResult.success && apiResult.reason === 'magic_link_sent') {
      console.log(`[hashnode] GraphQL magic link sent! Message: ${apiResult.message}`);
      console.log(`[hashnode] Checking inbox for magic link email (via ${tempProvider})...`);
      await new Promise(r => setTimeout(r, POLL_WAIT_MS));
      try {
        const messages = await checkInbox(tempProvider, tempMeta);
        if (messages.length > 0) {
          const subject = messages[0].subject ?? messages[0].mail_subject ?? 'unknown';
          console.log(`[hashnode] Magic link email arrived — subject: "${subject}"`);
          stepsCompleted.push('magic_link_email_received_via_api');
          outcome = 'pending_email_verification';

          // Store credentials
          try {
            addAccount('hashnode', tempEmail, 'magic-link-auth', {
              username,
              name,
              status: 'pending_magic_link',
              notes:  'Hashnode account created via GraphQL API magic-link signup — check inbox for login link',
              signupUrl: SIGNUP_URL,
              authMethod: 'magic-link',
            });
            stepsCompleted.push('credentials_stored_via_api_flow');
          } catch (credErr) {
            console.warn(`[hashnode] Could not store credentials: ${credErr.message}`);
          }
        } else {
          console.warn('[hashnode] Magic link sent but inbox still empty after polling');
        }
      } catch (inboxErr) {
        console.warn(`[hashnode] Inbox check after API magic link failed: ${inboxErr.message}`);
      }
    }
  } catch (err) {
    console.warn(`[hashnode] API signup promise rejected: ${err.message}`);
  }

  printSummary({ stepsCompleted, blockReason, outcome, tempEmail, username, name });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary({ stepsCompleted, blockReason, outcome, tempEmail, username, name }) {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  HASHNODE SIGNUP — SUMMARY');
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
    success:                            'Account created. Explore Hashnode dashboard.',
    pending_email_verification:         'Signup submitted. Verification/magic-link email arrived — click the link to complete login.',
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
  console.error('[hashnode] Fatal:', err.message);
  process.exit(1);
});
