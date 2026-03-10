'use strict';

/**
 * create-outlook-account.js
 *
 * Attempts to create a new Outlook/Hotmail account via signup.live.com.
 * Documents every step of the flow and handles blocks (CAPTCHA, phone
 * verification) gracefully — never crashes without logging what happened.
 *
 * Success is defined as fully documenting the flow, not necessarily
 * completing account creation.
 */

const path = require('path');
const fs = require('fs');

const {
  launchBrowser,
  screenshotAndLog,
  waitAndClick,
  fillField,
  closeBrowser,
} = require('../lib/browser');
const { addAccount } = require('../lib/credentials');

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREENSHOT_DIR = 'data/screenshots/outlook';
const SIGNUP_URL = 'https://signup.live.com';
const NAV_TIMEOUT = 60_000; // ms

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a random 6-digit suffix for the username.
 * @returns {string}
 */
function randomSuffix() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a random secure password.
 * Format: two capitalised words + 2-digit number + symbol — passes typical
 * complexity requirements (upper, lower, digit, special char).
 * @returns {string}
 */
function generatePassword() {
  const words = [
    'Rocket', 'Falcon', 'Tiger', 'Storm', 'Pixel',
    'Ember', 'Cobalt', 'Forge', 'Prism', 'Vortex',
  ];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(10 + Math.random() * 90);
  const syms = ['!', '@', '#', '$', '%'];
  const sym = syms[Math.floor(Math.random() * syms.length)];
  return `${w1}${w2}${num}${sym}`;
}

/**
 * Check whether the current page looks like a CAPTCHA challenge.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectCaptcha(page) {
  try {
    const html = await page.content();
    const lower = html.toLowerCase();
    return (
      lower.includes('captcha') ||
      lower.includes('recaptcha') ||
      lower.includes('arkose') ||
      lower.includes('funcaptcha') ||
      lower.includes('verification challenge')
    );
  } catch {
    return false;
  }
}

/**
 * Check whether the current page is asking for phone verification.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectPhoneVerification(page) {
  try {
    const html = await page.content();
    const lower = html.toLowerCase();
    return (
      lower.includes('phone number') ||
      lower.includes('verify your identity') ||
      lower.includes('add your phone') ||
      lower.includes('enter the code') ||
      lower.includes('sms') ||
      lower.includes('mobile number')
    );
  } catch {
    return false;
  }
}

/**
 * Check whether the page indicates successful account creation.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectSuccess(page) {
  try {
    const url = page.url();
    const html = await page.content();
    const lower = html.toLowerCase();

    // Microsoft often redirects to account.microsoft.com or live.com after signup
    const successUrls = [
      'account.microsoft.com',
      'outlook.live.com',
      'login.live.com/login.srf',
      'microsoft.com/welcome',
    ];
    if (successUrls.some((u) => url.includes(u))) {
      return true;
    }

    return (
      lower.includes('welcome to microsoft') ||
      lower.includes('account created') ||
      lower.includes('get started') && lower.includes('outlook')
    );
  } catch {
    return false;
  }
}

// ─── Main flow ────────────────────────────────────────────────────────────────

async function run() {
  const username = `affbot_${randomSuffix()}`;
  const email = `${username}@outlook.com`;
  const password = generatePassword();

  // Track completed steps and block reason for the summary
  const stepsCompleted = [];
  let blockReason = null;
  let accountCreated = false;

  console.log('[outlook] Starting account creation flow');
  console.log(`[outlook] Target email : ${email}`);
  console.log(`[outlook] Password     : ${password}`);
  console.log(`[outlook] Screenshot dir: ${SCREENSHOT_DIR}`);

  // Ensure screenshot directory exists
  fs.mkdirSync(path.resolve(SCREENSHOT_DIR), { recursive: true });

  let browser;
  let page;

  try {
    // ── Step 1: Launch browser ─────────────────────────────────────────────
    ({ browser, page } = await launchBrowser({ headless: true }));
    stepsCompleted.push('browser_launched');
    console.log('[outlook] Step 1: Browser launched');

    // ── Step 2: Navigate to signup page ───────────────────────────────────
    try {
      await page.goto(SIGNUP_URL, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      });
      stepsCompleted.push('navigated_to_signup');
      console.log('[outlook] Step 2: Navigated to signup page');
    } catch (err) {
      console.error(`[outlook] Step 2 FAILED — navigation error: ${err.message}`);
      blockReason = `navigation_failed: ${err.message}`;
      await screenshotAndLog(page, 'step2_nav_error', SCREENSHOT_DIR).catch(() => {});
      return;
    }

    // ── Step 3: Screenshot initial page ───────────────────────────────────
    try {
      await screenshotAndLog(page, 'step3_initial_page', SCREENSHOT_DIR);
      stepsCompleted.push('screenshot_initial');
      console.log('[outlook] Step 3: Screenshotted initial page');
    } catch (err) {
      console.warn(`[outlook] Step 3 screenshot failed (non-fatal): ${err.message}`);
    }

    // ── Step 4: Detect CAPTCHA on initial load ─────────────────────────────
    if (await detectCaptcha(page)) {
      blockReason = 'blocked_captcha_on_initial_load';
      console.warn(`[outlook] CAPTCHA detected on initial load — ${blockReason}`);
      await screenshotAndLog(page, 'step4_captcha_initial', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_captcha_initial');
      return;
    }

    // ── Step 5: Click "Get a new email address" (new Outlook address) ──────
    // Microsoft may show an input for existing email or a link to create new
    const newEmailSelectors = [
      'a[id*="newUser"]',
      'a[href*="newUser"]',
      'a:has-text("Get a new email address")',
      'text=Get a new email address',
      'a:has-text("Create one")',
      'text=Create one',
      '[data-testid="newUserLink"]',
    ];

    let clickedNewEmail = false;
    for (const sel of newEmailSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await page.click(sel);
          clickedNewEmail = true;
          console.log(`[outlook] Step 5: Clicked new-email link (selector: ${sel})`);
          stepsCompleted.push('clicked_new_email_link');
          break;
        }
      } catch {
        // try next selector
      }
    }

    if (!clickedNewEmail) {
      // Maybe we're already on the new-account form — log and continue
      console.warn('[outlook] Step 5: Could not find "new email" link — may already be on create form');
      stepsCompleted.push('new_email_link_not_found');
    }

    // Wait for form to settle
    await page.waitForTimeout(2000).catch(() => {});
    await screenshotAndLog(page, 'step5_after_new_email_click', SCREENSHOT_DIR).catch(() => {});

    // ── Step 6: Fill in the username field ────────────────────────────────
    const usernameSelectors = [
      'input[name="MemberName"]',
      'input[id="MemberName"]',
      'input[name="loginfmt"]',
      'input[type="email"]',
      'input[placeholder*="username" i]',
      'input[aria-label*="username" i]',
      'input[aria-label*="email" i]',
    ];

    let filledUsername = false;
    for (const sel of usernameSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await page.fill(sel, username);
          filledUsername = true;
          console.log(`[outlook] Step 6: Filled username "${username}" (selector: ${sel})`);
          stepsCompleted.push('filled_username');
          break;
        }
      } catch {
        // try next selector
      }
    }

    if (!filledUsername) {
      console.warn('[outlook] Step 6: Could not find username input field');
      blockReason = 'blocked_no_username_field';
      await screenshotAndLog(page, 'step6_no_username_field', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('username_field_not_found');
      return;
    }

    await screenshotAndLog(page, 'step6_username_filled', SCREENSHOT_DIR).catch(() => {});

    // ── Step 7: Select @outlook.com domain if dropdown is present ─────────
    const domainDropdownSelectors = [
      'select[id*="Domain"]',
      'select[name*="Domain"]',
      'select[aria-label*="domain" i]',
    ];

    for (const sel of domainDropdownSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await page.selectOption(sel, { label: 'outlook.com' });
          console.log('[outlook] Step 7: Selected @outlook.com domain');
          stepsCompleted.push('selected_domain_outlook');
          break;
        }
      } catch {
        // no dropdown — username field may already include domain
      }
    }

    // ── Step 8: Click "Next" to move to password step ─────────────────────
    const nextButtonSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'button:has-text("Next")',
      'input[value="Next"]',
      '[data-testid="nextButton"]',
    ];

    let clickedNext1 = false;
    for (const sel of nextButtonSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await page.click(sel);
          clickedNext1 = true;
          console.log(`[outlook] Step 8: Clicked Next (selector: ${sel})`);
          stepsCompleted.push('clicked_next_after_username');
          break;
        }
      } catch {
        // try next selector
      }
    }

    if (!clickedNext1) {
      console.warn('[outlook] Step 8: Could not find Next button after username');
      blockReason = 'blocked_no_next_button_after_username';
      await screenshotAndLog(page, 'step8_no_next_button', SCREENSHOT_DIR).catch(() => {});
      return;
    }

    // Wait for page transition
    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step8_after_next', SCREENSHOT_DIR).catch(() => {});

    // ── Step 9: CAPTCHA check after username entry ─────────────────────────
    if (await detectCaptcha(page)) {
      blockReason = 'blocked_captcha_after_username';
      console.warn(`[outlook] CAPTCHA appeared after username entry — ${blockReason}`);
      await screenshotAndLog(page, 'step9_captcha_after_username', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_captcha_post_username');
      return;
    }

    // ── Step 10: Fill in password ──────────────────────────────────────────
    const passwordSelectors = [
      'input[name="Password"]',
      'input[id="Password"]',
      'input[type="password"]',
      'input[aria-label*="password" i]',
    ];

    let filledPassword = false;
    for (const sel of passwordSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await page.fill(sel, password);
          filledPassword = true;
          console.log(`[outlook] Step 10: Filled password (selector: ${sel})`);
          stepsCompleted.push('filled_password');
          break;
        }
      } catch {
        // try next selector
      }
    }

    if (!filledPassword) {
      console.warn('[outlook] Step 10: Could not find password field');
      blockReason = 'blocked_no_password_field';
      await screenshotAndLog(page, 'step10_no_password_field', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('password_field_not_found');
      return;
    }

    await screenshotAndLog(page, 'step10_password_filled', SCREENSHOT_DIR).catch(() => {});

    // ── Step 11: Click Next after password ────────────────────────────────
    let clickedNext2 = false;
    for (const sel of nextButtonSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await page.click(sel);
          clickedNext2 = true;
          console.log(`[outlook] Step 11: Clicked Next after password (selector: ${sel})`);
          stepsCompleted.push('clicked_next_after_password');
          break;
        }
      } catch {
        // try next selector
      }
    }

    if (!clickedNext2) {
      console.warn('[outlook] Step 11: Could not find Next button after password');
      blockReason = 'blocked_no_next_button_after_password';
      await screenshotAndLog(page, 'step11_no_next_button', SCREENSHOT_DIR).catch(() => {});
    }

    // Wait for page transition
    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step11_after_password_next', SCREENSHOT_DIR).catch(() => {});

    // ── Step 12: Fill optional profile fields (first/last name, birth date) ──
    // Microsoft may ask for these on the next screen
    try {
      const firstNameSel = 'input[name="FirstName"], input[id="FirstName"], input[aria-label*="first name" i]';
      const lastNameSel = 'input[name="LastName"], input[id="LastName"], input[aria-label*="last name" i]';

      const firstNameEl = await page.$(firstNameSel);
      if (firstNameEl) {
        const firstNames = ['James', 'Alex', 'Jordan', 'Taylor', 'Morgan'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'];
        const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
        const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
        await page.fill(firstNameSel, fn);
        console.log(`[outlook] Step 12: Filled first name: ${fn}`);
        stepsCompleted.push('filled_first_name');

        const lastNameEl = await page.$(lastNameSel);
        if (lastNameEl) {
          await page.fill(lastNameSel, ln);
          console.log(`[outlook] Step 12: Filled last name: ${ln}`);
          stepsCompleted.push('filled_last_name');
        }
      }
    } catch (err) {
      console.warn(`[outlook] Step 12: Profile fields not found or error: ${err.message}`);
    }

    // Birth month/day/year selects
    try {
      const birthMonthSel = 'select[id="BirthMonth"], select[name="BirthMonth"]';
      const birthDaySel   = 'select[id="BirthDay"],   select[name="BirthDay"]';
      const birthYearSel  = 'select[id="BirthYear"],  select[name="BirthYear"]';

      if (await page.$(birthMonthSel)) {
        await page.selectOption(birthMonthSel, { value: '6' });         // June
        await page.selectOption(birthDaySel, { value: '15' });
        await page.selectOption(birthYearSel, { value: '1990' });
        console.log('[outlook] Step 12: Filled birth date');
        stepsCompleted.push('filled_birthdate');
      }
    } catch (err) {
      console.warn(`[outlook] Step 12: Birthdate fields not found or error: ${err.message}`);
    }

    await screenshotAndLog(page, 'step12_profile_fields', SCREENSHOT_DIR).catch(() => {});

    // Click Next if visible
    for (const sel of nextButtonSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await page.click(sel);
          console.log('[outlook] Step 12: Clicked Next after profile fields');
          stepsCompleted.push('clicked_next_after_profile');
          break;
        }
      } catch {
        // ignore
      }
    }

    // Wait and screenshot
    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step12_after_profile_next', SCREENSHOT_DIR).catch(() => {});

    // ── Step 13: Check for CAPTCHA / phone verification / success ──────────
    if (await detectCaptcha(page)) {
      blockReason = 'blocked_captcha_post_profile';
      console.warn(`[outlook] CAPTCHA detected after profile — ${blockReason}`);
      await screenshotAndLog(page, 'step13_captcha', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_captcha_post_profile');
      return;
    }

    if (await detectPhoneVerification(page)) {
      blockReason = 'blocked_phone_verification';
      console.warn(`[outlook] Phone verification required — ${blockReason}`);
      await screenshotAndLog(page, 'step13_phone_verification', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_phone_verification');
      return;
    }

    // ── Step 14: Check for success ────────────────────────────────────────
    if (await detectSuccess(page)) {
      accountCreated = true;
      console.log('[outlook] Step 14: Account creation detected as successful!');
      stepsCompleted.push('account_created');
      await screenshotAndLog(page, 'step14_success', SCREENSHOT_DIR).catch(() => {});

      // Store credentials
      try {
        const record = addAccount('outlook', email, password, {
          username,
          notes: 'Created via create-outlook-account.js',
        });
        console.log(`[outlook] Credentials stored: ${JSON.stringify(record)}`);
        stepsCompleted.push('credentials_stored');
      } catch (err) {
        console.error(`[outlook] Failed to store credentials: ${err.message}`);
      }
    } else {
      // Unknown state — take a final screenshot for inspection
      const url = page.url();
      console.warn(`[outlook] Step 14: Unrecognised page state. Current URL: ${url}`);
      blockReason = blockReason || `unknown_state_at: ${url}`;
      await screenshotAndLog(page, 'step14_unknown_state', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('unknown_final_state');
    }

  } catch (err) {
    console.error(`[outlook] Unhandled error: ${err.message}`);
    blockReason = blockReason || `unhandled_error: ${err.message}`;
    if (page) {
      await screenshotAndLog(page, 'error_unhandled', SCREENSHOT_DIR).catch(() => {});
    }
  } finally {
    if (browser) {
      await closeBrowser(browser);
    }

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════');
    console.log('  OUTLOOK ACCOUNT CREATION — SUMMARY');
    console.log('══════════════════════════════════════════════');
    console.log(`  Email attempted : ${email}`);
    console.log(`  Steps completed : ${stepsCompleted.join(' → ')}`);
    if (accountCreated) {
      console.log('  Outcome         : SUCCESS — account created and credentials stored');
    } else if (blockReason) {
      console.log(`  Outcome         : BLOCKED — ${blockReason}`);
    } else {
      console.log('  Outcome         : INCOMPLETE — flow did not reach a terminal state');
    }
    console.log(`  Screenshots     : ${path.resolve(SCREENSHOT_DIR)}`);
    console.log('══════════════════════════════════════════════\n');
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
run().catch((err) => {
  console.error('[outlook] Fatal error (should not reach here):', err.message);
  process.exit(1);
});
