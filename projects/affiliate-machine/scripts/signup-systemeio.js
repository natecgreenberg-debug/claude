'use strict';

/**
 * signup-systemeio.js
 *
 * Documents the Systeme.io affiliate signup flow end-to-end.
 * Uses a temporary email address via Guerrilla Mail (with mailtm fallback)
 * and screenshots every meaningful step.
 *
 * Success is defined as fully documenting the flow, not necessarily
 * completing affiliate approval — which may require manual review.
 */

const path = require('path');
const fs   = require('fs');

const {
  launchBrowser,
  screenshotAndLog,
  waitAndClick,
  fillField,
  closeBrowser,
} = require('../lib/browser');
const { addAccount, updateStatus } = require('../lib/credentials');

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREENSHOT_DIR  = 'data/screenshots/systemeio';
const AFFILIATE_URL   = 'https://systeme.io/affiliate-program';
const NAV_TIMEOUT     = 60_000; // ms
const INBOX_POLL_WAIT = 15_000; // ms — wait before polling for verification email

// ─── Temp Email Helpers (inline, guerrilla → mailtm fallback) ────────────────

const GUERRILLA_BASE = 'https://api.guerrillamail.com/ajax.php';
const MAILTM_BASE    = 'https://api.mail.tm';

/** Fetch with a hard timeout. */
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

/** Guerrilla Mail: get a temporary address. */
async function guerrillaGetEmail() {
  const data = await fetchJSON(`${GUERRILLA_BASE}?f=get_email_address`);
  return {
    address:   data.email_addr,
    provider:  'guerrilla',
    meta: { sid_token: data.sid_token, seq: 0 },
  };
}

/** Guerrilla Mail: poll inbox. */
async function guerrillaCheckInbox(meta) {
  const data = await fetchJSON(
    `${GUERRILLA_BASE}?f=check_email&seq=${meta.seq ?? 0}&sid_token=${meta.sid_token}`
  );
  return data.list ?? [];
}

/** mail.tm: get a temporary address. */
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
    meta: { token: tokenData.token, password },
  };
}

/** Poll inbox for any messages. */
async function checkInbox(provider, meta) {
  if (provider === 'guerrilla') return guerrillaCheckInbox(meta);

  if (provider === 'mailtm') {
    const data = await fetchJSON(`${MAILTM_BASE}/messages?page=1`, {
      headers: { Authorization: `Bearer ${meta.token}` },
    });
    return data['hydra:member'] ?? data.member ?? [];
  }

  return [];
}

/** Attempt guerrilla first; fall back to mailtm. */
async function getTempEmail() {
  try {
    const result = await guerrillaGetEmail();
    console.log(`[systemeio] Temp email via guerrilla: ${result.address}`);
    return result;
  } catch (err) {
    console.warn(`[systemeio] Guerrilla failed (${err.message}), trying mailtm...`);
    const result = await mailtmGetEmail();
    console.log(`[systemeio] Temp email via mailtm: ${result.address}`);
    return result;
  }
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

async function detectPhoneVerify(page) {
  const h = await pageHtml(page);
  return h.includes('phone number') || h.includes('verify your identity') ||
         h.includes('mobile number') || h.includes('sms') || h.includes('text message');
}

async function detectEmailVerify(page) {
  const h = await pageHtml(page);
  return h.includes('verify your email') || h.includes('confirm your email') ||
         h.includes('check your inbox') || h.includes('confirmation email') ||
         h.includes('we sent you') || h.includes('verification link');
}

async function detectSuccess(page) {
  const url = page.url();
  const h   = await pageHtml(page);
  const successUrls = ['systeme.io/dashboard', 'systeme.io/affiliate', 'app.systeme.io'];
  if (successUrls.some(u => url.includes(u))) return true;
  return h.includes('welcome') && (h.includes('affiliate') || h.includes('dashboard')) ||
         h.includes('your affiliate link') || h.includes('referral link');
}

async function detectRegistrationForm(page) {
  const h = await pageHtml(page);
  return h.includes('name') && (h.includes('password') || h.includes('sign up') ||
         h.includes('register') || h.includes('create account') || h.includes('join'));
}

// ─── Selectors ────────────────────────────────────────────────────────────────

const JOIN_SELECTORS = [
  'a:has-text("Join the affiliate program")',
  'a:has-text("Join affiliate program")',
  'a:has-text("Become an affiliate")',
  'a:has-text("Join now")',
  'a:has-text("Sign up")',
  'a:has-text("Get started")',
  'button:has-text("Join")',
  'button:has-text("Sign up")',
  'button:has-text("Become an affiliate")',
  '[class*="affiliate"] a',
  '[class*="cta"] a',
  'a[href*="affiliate"][href*="sign"]',
  'a[href*="register"]',
  'a[href*="signup"]',
];

const EMAIL_SELECTORS = [
  'input[name="email"]',
  'input[type="email"]',
  'input[id="email"]',
  'input[placeholder*="email" i]',
  'input[aria-label*="email" i]',
];

const NAME_SELECTORS = [
  'input[name="name"]',
  'input[name="full_name"]',
  'input[name="fullName"]',
  'input[id="name"]',
  'input[placeholder*="name" i]',
  'input[aria-label*="name" i]',
  'input[name="first_name"]',
  'input[id="first_name"]',
];

const PASSWORD_SELECTORS = [
  'input[name="password"]',
  'input[type="password"]',
  'input[id="password"]',
  'input[aria-label*="password" i]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Create")',
  'button:has-text("Sign up")',
  'button:has-text("Register")',
  'button:has-text("Join")',
  'button:has-text("Continue")',
  '[type="submit"]',
];

// ─── Helper: try a list of selectors and return first found element ───────────

async function findFirst(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) return { el, sel };
    } catch { /* continue */ }
  }
  return null;
}

// ─── Generate plausible-looking affiliate name & password ─────────────────────

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
  const syms = ['!', '@', '#', '$'];
  return `${w1}${w2}${num}${syms[Math.floor(Math.random() * syms.length)]}`;
}

// ─── Update programs.json status ─────────────────────────────────────────────

function updateProgramStatus(status, notes) {
  const filePath = path.resolve(__dirname, '..', 'programs.json');
  try {
    const programs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const idx = programs.findIndex(p => p.name === 'Systeme.io');
    if (idx !== -1) {
      programs[idx].status = status;
      if (notes) programs[idx].signup_notes = notes;
      programs[idx].signup_attempted_at = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(programs, null, 2), 'utf8');
      console.log(`[systemeio] programs.json updated: status=${status}`);
    } else {
      console.warn('[systemeio] Systeme.io not found in programs.json — skipping update');
    }
  } catch (err) {
    console.warn(`[systemeio] Could not update programs.json: ${err.message}`);
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
  const name           = generateName();

  console.log('[systemeio] Starting affiliate signup flow documentation');
  console.log(`[systemeio] Screenshot dir: ${path.resolve(SCREENSHOT_DIR)}`);

  // ── Step 1: Get a temporary email address ─────────────────────────────────
  try {
    const result = await getTempEmail();
    tempEmail    = result.address;
    tempMeta     = result.meta;
    tempProvider = result.provider;
    stepsCompleted.push('temp_email_obtained');
    console.log(`[systemeio] Step 1: Temp email → ${tempEmail} (via ${tempProvider})`);
  } catch (err) {
    console.error(`[systemeio] Step 1 FAILED — could not get temp email: ${err.message}`);
    blockReason = `temp_email_failed: ${err.message}`;
    printSummary({ stepsCompleted, blockReason, outcome, tempEmail, name });
    return;
  }

  let browser;
  let page;

  try {
    // ── Step 2: Launch browser ───────────────────────────────────────────────
    ({ browser, page } = await launchBrowser({ headless: true }));
    stepsCompleted.push('browser_launched');
    console.log('[systemeio] Step 2: Browser launched');

    // ── Step 3: Navigate to affiliate landing page ───────────────────────────
    try {
      await page.goto(AFFILIATE_URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      stepsCompleted.push('navigated_to_affiliate_page');
      console.log(`[systemeio] Step 3: Navigated to ${AFFILIATE_URL}`);
    } catch (err) {
      blockReason = `navigation_failed: ${err.message}`;
      console.error(`[systemeio] Step 3 FAILED — ${blockReason}`);
      await screenshotAndLog(page, 'step3_nav_error', SCREENSHOT_DIR).catch(() => {});
      return;
    }

    // ── Step 4: Screenshot the landing page ──────────────────────────────────
    await screenshotAndLog(page, 'step4_affiliate_landing', SCREENSHOT_DIR).catch(() => {});
    stepsCompleted.push('screenshot_landing');
    console.log(`[systemeio] Step 4: Landing page screenshot saved. URL: ${page.url()}`);

    // ── Step 5: Check for immediate CAPTCHA/block ────────────────────────────
    if (await detectCaptcha(page)) {
      blockReason = 'blocked_captcha_on_landing';
      console.warn(`[systemeio] Step 5: CAPTCHA/challenge on landing page — ${blockReason}`);
      await screenshotAndLog(page, 'step5_captcha_landing', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_captcha_landing');
      outcome = 'blocked';
      updateProgramStatus('blocked', 'Captcha on landing page');
      return;
    }

    // ── Step 6: Look for a "Join" / signup button or form ───────────────────
    // First check if we already have a registration form on this page
    const alreadyHasForm = await detectRegistrationForm(page);
    console.log(`[systemeio] Step 6: Registration form on landing page? ${alreadyHasForm}`);

    if (!alreadyHasForm) {
      // Try to find and click a CTA button to navigate to signup
      const cta = await findFirst(page, JOIN_SELECTORS);
      if (cta) {
        console.log(`[systemeio] Step 6: Found CTA — "${cta.sel}" — clicking`);
        try {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }).catch(() => {}),
            page.click(cta.sel),
          ]);
          stepsCompleted.push('clicked_join_cta');
          console.log(`[systemeio] Step 6: Clicked CTA, now at: ${page.url()}`);
        } catch (err) {
          console.warn(`[systemeio] Step 6: Click/navigation error: ${err.message}`);
        }
        await screenshotAndLog(page, 'step6_after_cta_click', SCREENSHOT_DIR).catch(() => {});
      } else {
        // No obvious CTA — maybe it's an embedded form or different layout
        // Try scrolling down to find it
        console.warn('[systemeio] Step 6: No CTA found — scrolling to look for form');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => {});
        await page.waitForTimeout(1000).catch(() => {});
        await screenshotAndLog(page, 'step6_scrolled_midpage', SCREENSHOT_DIR).catch(() => {});

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
        await page.waitForTimeout(1000).catch(() => {});
        await screenshotAndLog(page, 'step6_scrolled_bottom', SCREENSHOT_DIR).catch(() => {});

        // Re-check for form after scrolling
        const hasFormNow = await detectRegistrationForm(page);
        if (!hasFormNow) {
          // Try direct navigation to common signup paths
          const signupUrls = [
            'https://systeme.io/sign-up',
            'https://systeme.io/register',
            'https://systeme.io/affiliate-program/register',
            'https://systeme.io/affiliate',
          ];
          let foundSignup = false;
          for (const url of signupUrls) {
            try {
              await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
              const h = await pageHtml(page);
              if (h.includes('email') && (h.includes('password') || h.includes('sign up'))) {
                foundSignup = true;
                console.log(`[systemeio] Step 6: Found signup page via direct URL: ${url}`);
                stepsCompleted.push('found_signup_via_direct_url');
                await screenshotAndLog(page, 'step6_direct_signup_page', SCREENSHOT_DIR).catch(() => {});
                break;
              }
            } catch (err) {
              console.warn(`[systemeio] Step 6: Direct URL ${url} failed: ${err.message}`);
            }
          }
          if (!foundSignup) {
            stepsCompleted.push('no_signup_form_found');
            console.warn('[systemeio] Step 6: Could not locate a registration form or clear CTA');
          }
        }
      }
    }

    // ── Step 7: Wait for form to settle, screenshot current state ───────────
    await page.waitForTimeout(2000).catch(() => {});
    await screenshotAndLog(page, 'step7_pre_form_fill', SCREENSHOT_DIR).catch(() => {});

    // ── Step 8: Fill email field ─────────────────────────────────────────────
    const emailField = await findFirst(page, EMAIL_SELECTORS);
    if (emailField) {
      try {
        await page.fill(emailField.sel, tempEmail);
        stepsCompleted.push('filled_email');
        console.log(`[systemeio] Step 8: Filled email "${tempEmail}" (selector: ${emailField.sel})`);
      } catch (err) {
        console.warn(`[systemeio] Step 8: Could not fill email: ${err.message}`);
      }
    } else {
      console.warn('[systemeio] Step 8: No email field found on current page');
      stepsCompleted.push('email_field_not_found');
    }

    // ── Step 9: Fill name field ──────────────────────────────────────────────
    const nameField = await findFirst(page, NAME_SELECTORS);
    if (nameField) {
      try {
        await page.fill(nameField.sel, name);
        stepsCompleted.push('filled_name');
        console.log(`[systemeio] Step 9: Filled name "${name}" (selector: ${nameField.sel})`);
      } catch (err) {
        console.warn(`[systemeio] Step 9: Could not fill name: ${err.message}`);
      }
    } else {
      console.warn('[systemeio] Step 9: No name field found (may not be required at this stage)');
    }

    // ── Step 10: Fill password field ─────────────────────────────────────────
    const pwField = await findFirst(page, PASSWORD_SELECTORS);
    if (pwField) {
      try {
        await page.fill(pwField.sel, password);
        stepsCompleted.push('filled_password');
        console.log(`[systemeio] Step 10: Filled password (selector: ${pwField.sel})`);
      } catch (err) {
        console.warn(`[systemeio] Step 10: Could not fill password: ${err.message}`);
      }
    } else {
      console.warn('[systemeio] Step 10: No password field found');
    }

    // Screenshot the filled form
    await screenshotAndLog(page, 'step10_form_filled', SCREENSHOT_DIR).catch(() => {});

    // ── Step 11: Submit the form ─────────────────────────────────────────────
    const submitBtn = await findFirst(page, SUBMIT_SELECTORS);
    if (submitBtn) {
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }).catch(() => {}),
          page.click(submitBtn.sel),
        ]);
        stepsCompleted.push('submitted_form');
        console.log(`[systemeio] Step 11: Submitted form (selector: ${submitBtn.sel})`);
      } catch (err) {
        console.warn(`[systemeio] Step 11: Submit/navigation error: ${err.message}`);
        stepsCompleted.push('submit_error');
      }
    } else {
      console.warn('[systemeio] Step 11: No submit button found — may not have reached form');
      stepsCompleted.push('no_submit_button');
    }

    // Wait for page to settle after submit
    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step11_after_submit', SCREENSHOT_DIR).catch(() => {});

    // ── Step 12: Analyse post-submit state ──────────────────────────────────
    const currentUrl = page.url();
    console.log(`[systemeio] Step 12: Post-submit URL: ${currentUrl}`);

    if (await detectCaptcha(page)) {
      blockReason = 'blocked_captcha_post_submit';
      console.warn(`[systemeio] Step 12: CAPTCHA after submit — ${blockReason}`);
      await screenshotAndLog(page, 'step12_captcha_post_submit', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_captcha_post_submit');
      outcome = 'blocked';
      updateProgramStatus('blocked', 'Captcha appeared after form submit');
      return;
    }

    if (await detectPhoneVerify(page)) {
      blockReason = 'blocked_phone_verification_required';
      console.warn(`[systemeio] Step 12: Phone verification required — ${blockReason}`);
      await screenshotAndLog(page, 'step12_phone_verify', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_phone_verification');
      outcome = 'blocked';
      updateProgramStatus('blocked', 'Phone verification required after submit');
      return;
    }

    if (await detectEmailVerify(page)) {
      console.log('[systemeio] Step 12: Email verification step detected');
      stepsCompleted.push('email_verification_requested');
      await screenshotAndLog(page, 'step12_email_verify_prompt', SCREENSHOT_DIR).catch(() => {});

      // ── Step 13: Poll temp inbox for verification email ──────────────────
      console.log(`[systemeio] Step 13: Waiting ${INBOX_POLL_WAIT / 1000}s before checking inbox...`);
      await new Promise(r => setTimeout(r, INBOX_POLL_WAIT));

      let verificationEmailFound = false;
      let inboxMessages = [];

      try {
        inboxMessages = await checkInbox(tempProvider, tempMeta);
        console.log(`[systemeio] Step 13: Inbox has ${inboxMessages.length} message(s)`);

        if (inboxMessages.length > 0) {
          verificationEmailFound = true;
          stepsCompleted.push('verification_email_received');
          const msg = inboxMessages[0];
          console.log(`[systemeio] Step 13: First email — subject: "${msg.subject ?? msg.mail_subject ?? 'unknown'}"`);
        } else {
          console.warn('[systemeio] Step 13: Inbox empty after wait — verification email not yet received');
          stepsCompleted.push('inbox_empty_after_wait');

          // Second poll attempt after additional wait
          console.log('[systemeio] Step 13: Waiting another 20s for second inbox poll...');
          await new Promise(r => setTimeout(r, 20_000));
          inboxMessages = await checkInbox(tempProvider, tempMeta);
          if (inboxMessages.length > 0) {
            verificationEmailFound = true;
            stepsCompleted.push('verification_email_received_second_poll');
            console.log(`[systemeio] Step 13: Email arrived on second poll — subject: "${inboxMessages[0].subject ?? inboxMessages[0].mail_subject ?? 'unknown'}"`);
          } else {
            console.warn('[systemeio] Step 13: Still no emails after second poll');
            stepsCompleted.push('inbox_empty_second_poll');
          }
        }
      } catch (err) {
        console.warn(`[systemeio] Step 13: Inbox check failed: ${err.message}`);
        stepsCompleted.push('inbox_check_failed');
      }

      if (verificationEmailFound) {
        outcome = 'pending_email_verification';
        // Store the account attempt
        try {
          addAccount('systemeio', tempEmail, password, {
            name,
            status:  'pending_verification',
            notes:   'Created via signup-systemeio.js — awaiting email verification',
            signupUrl: AFFILIATE_URL,
          });
          stepsCompleted.push('credentials_stored');
          console.log('[systemeio] Credentials stored in credentials.json');
        } catch (err) {
          console.warn(`[systemeio] Could not store credentials: ${err.message}`);
        }
        updateProgramStatus('pending_verification', 'Signup submitted, email verification step reached');
      } else {
        outcome = 'pending_email_verification_unconfirmed';
        updateProgramStatus('pending_verification', 'Signup submitted but could not confirm inbox receipt');
      }
      return;
    }

    // ── Step 14: Check for success (dashboard / affiliate portal) ───────────
    if (await detectSuccess(page)) {
      outcome = 'success';
      stepsCompleted.push('affiliate_account_created');
      console.log('[systemeio] Step 14: SUCCESS — reached affiliate dashboard/portal');
      await screenshotAndLog(page, 'step14_success_dashboard', SCREENSHOT_DIR).catch(() => {});

      try {
        addAccount('systemeio', tempEmail, password, {
          name,
          notes:    'Affiliate account created via signup-systemeio.js',
          signupUrl: AFFILIATE_URL,
        });
        stepsCompleted.push('credentials_stored');
        console.log('[systemeio] Credentials stored');
      } catch (err) {
        console.warn(`[systemeio] Could not store credentials: ${err.message}`);
      }
      updateProgramStatus('applied', 'Affiliate account registered and accessible');
      return;
    }

    // ── Step 15: Unknown post-submit state ───────────────────────────────────
    const unknownUrl = page.url();
    const htmlSnippet = (await page.content().catch(() => '')).slice(0, 500);
    console.warn(`[systemeio] Step 15: Unrecognised post-submit state`);
    console.warn(`[systemeio]   URL     : ${unknownUrl}`);
    console.warn(`[systemeio]   HTML (500 chars): ${htmlSnippet}`);
    stepsCompleted.push('unknown_final_state');
    blockReason = `unknown_state_at: ${unknownUrl}`;
    outcome = 'incomplete';
    await screenshotAndLog(page, 'step15_unknown_state', SCREENSHOT_DIR).catch(() => {});
    updateProgramStatus('pending_review', 'Signup attempted — final state unclear, screenshots saved');

  } catch (err) {
    console.error(`[systemeio] Unhandled error: ${err.message}`);
    blockReason = blockReason || `unhandled_error: ${err.message}`;
    outcome = 'error';
    if (page) {
      await screenshotAndLog(page, 'error_unhandled', SCREENSHOT_DIR).catch(() => {});
    }
    updateProgramStatus('pending_review', `Script error: ${err.message}`);
  } finally {
    if (browser) await closeBrowser(browser);
    printSummary({ stepsCompleted, blockReason, outcome, tempEmail, name });
  }
}

// ─── Summary printer ──────────────────────────────────────────────────────────

function printSummary({ stepsCompleted, blockReason, outcome, tempEmail, name }) {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  SYSTEME.IO AFFILIATE SIGNUP — SUMMARY');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Temp email used : ${tempEmail ?? 'none'}`);
  console.log(`  Name used       : ${name ?? 'N/A'}`);
  console.log(`  Steps completed : ${stepsCompleted.join(' → ')}`);
  console.log(`  Outcome         : ${outcome.toUpperCase()}`);
  if (blockReason) {
    console.log(`  Block reason    : ${blockReason}`);
  }
  console.log(`  Screenshots     : ${path.resolve(SCREENSHOT_DIR)}`);
  console.log('══════════════════════════════════════════════════════════\n');

  const OUTCOME_NOTES = {
    success:                        'Affiliate account created successfully.',
    pending_email_verification:     'Signup submitted. Email verification email arrived in inbox. Complete verification manually or automate link extraction.',
    pending_email_verification_unconfirmed: 'Signup submitted, email verification step detected but inbox poll returned no messages. May arrive later.',
    blocked:                        'Flow blocked — see block reason above.',
    incomplete:                     'Flow did not reach a terminal state — check screenshots.',
    error:                          'Script error — see logs above.',
  };
  console.log(`  Note: ${OUTCOME_NOTES[outcome] ?? outcome}`);
  console.log('══════════════════════════════════════════════════════════\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

run().catch((err) => {
  console.error('[systemeio] Fatal (should not reach here):', err.message);
  process.exit(1);
});
