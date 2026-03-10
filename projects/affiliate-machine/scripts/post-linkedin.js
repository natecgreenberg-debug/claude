'use strict';

/**
 * post-linkedin.js
 *
 * DRY RUN — documents the LinkedIn post-composer flow without publishing anything.
 *
 * Flow:
 *   1. Navigate to LinkedIn login page
 *   2. Screenshot login page + document form structure
 *   3. Fill credentials from config (GMAIL_PRIMARY / GMAIL_PRIMARY_PASS)
 *   4. Screenshot filled form, then attempt login
 *   5. On success: navigate to feed, open post composer, fill sample text, screenshot
 *   6. On block (CAPTCHA / 2FA / security check): screenshot and log what's needed
 *   7. Close browser
 *
 * IMPORTANT: This script never clicks the Post/Submit button. It only documents
 * the path to that state.
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

const { GMAIL_PRIMARY, GMAIL_PRIMARY_PASS } = require('../lib/config');

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREENSHOT_DIR = 'data/screenshots/linkedin';
const LOGIN_URL      = 'https://www.linkedin.com/login';
const FEED_URL       = 'https://www.linkedin.com/feed/';
const NAV_TIMEOUT    = 60_000; // ms

const DRY_RUN_TEXT =
  'Testing affiliate content automation - this is a dry run. #test';

// ─── Detection helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the page contains CAPTCHA indicators.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectCaptcha(page) {
  try {
    const html  = await page.content();
    const lower = html.toLowerCase();
    return (
      lower.includes('captcha') ||
      lower.includes('recaptcha') ||
      lower.includes('arkose') ||
      lower.includes('security check') ||
      lower.includes('verify you are human')
    );
  } catch {
    return false;
  }
}

/**
 * Returns true if the page is asking for 2FA / phone / email verification.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectVerificationChallenge(page) {
  try {
    const url   = page.url();
    const html  = await page.content();
    const lower = html.toLowerCase();
    return (
      url.includes('checkpoint') ||
      url.includes('uas/login') ||
      lower.includes('two-step verification') ||
      lower.includes('two step verification') ||
      lower.includes('verify your identity') ||
      lower.includes('enter the code we sent') ||
      lower.includes('phone number') ||
      lower.includes('we noticed some unusual activity') ||
      lower.includes('security verification')
    );
  } catch {
    return false;
  }
}

/**
 * Returns true if we appear to be logged in (feed or home page visible).
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectLoggedIn(page) {
  try {
    const url   = page.url();
    const html  = await page.content();
    const lower = html.toLowerCase();
    return (
      url.includes('linkedin.com/feed') ||
      url.includes('linkedin.com/in/') ||
      url.includes('linkedin.com/home') ||
      lower.includes('start a post') ||
      lower.includes('share an article') ||
      lower.includes('global-nav__primary-link')
    );
  } catch {
    return false;
  }
}

// ─── Page inspection helper ───────────────────────────────────────────────────

/**
 * Inspect the login page and document what form fields are present.
 * Logs selector candidates for future automation.
 * @param {import('playwright').Page} page
 * @returns {Promise<object>} - Summary of detected fields
 */
async function inspectLoginForm(page) {
  const fieldReport = {};

  const candidateFields = [
    { name: 'email_field',    selectors: ['#username', 'input[name="session_key"]', 'input[type="email"]', 'input[autocomplete="username"]'] },
    { name: 'password_field', selectors: ['#password', 'input[name="session_password"]', 'input[type="password"]', 'input[autocomplete="current-password"]'] },
    { name: 'submit_button',  selectors: ['button[type="submit"]', 'button[data-litms-control-urn*="login"]', '.btn__primary--large', 'button:has-text("Sign in")'] },
  ];

  for (const { name, selectors } of candidateFields) {
    fieldReport[name] = { found: false, workingSelector: null, tried: selectors };
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          fieldReport[name].found = true;
          fieldReport[name].workingSelector = sel;
          break;
        }
      } catch {
        // try next selector
      }
    }
  }

  console.log('[linkedin] Login form inspection:');
  for (const [fieldName, result] of Object.entries(fieldReport)) {
    const status = result.found
      ? `FOUND  — selector: ${result.workingSelector}`
      : `MISSING — tried: ${result.tried.join(', ')}`;
    console.log(`  ${fieldName.padEnd(15)} ${status}`);
  }

  return fieldReport;
}

// ─── Main flow ────────────────────────────────────────────────────────────────

async function run() {
  // Track progress for the summary
  const stepsCompleted = [];
  let blockReason      = null;
  let reachedComposer  = false;

  const email    = GMAIL_PRIMARY();
  const password = GMAIL_PRIMARY_PASS();

  console.log('[linkedin] ══════════════════════════════════════════════');
  console.log('[linkedin]  LinkedIn Posting Flow — DRY RUN');
  console.log('[linkedin] ══════════════════════════════════════════════');
  console.log(`[linkedin]  Account       : ${email || '(GMAIL_PRIMARY not set)'}`);
  console.log(`[linkedin]  Screenshot dir: ${path.resolve(SCREENSHOT_DIR)}`);
  console.log('[linkedin]  NOTE: This script will NOT post anything.');
  console.log('[linkedin] ══════════════════════════════════════════════\n');

  // Ensure screenshot directory exists
  fs.mkdirSync(path.resolve(SCREENSHOT_DIR), { recursive: true });

  let browser;
  let page;

  try {
    // ── Step 1: Launch browser ─────────────────────────────────────────────
    ({ browser, page } = await launchBrowser({ headless: true }));
    stepsCompleted.push('browser_launched');
    console.log('[linkedin] Step 1: Browser launched');

    // ── Step 2: Navigate to login page ────────────────────────────────────
    try {
      await page.goto(LOGIN_URL, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      });
      stepsCompleted.push('navigated_to_login');
      console.log(`[linkedin] Step 2: Navigated to ${LOGIN_URL}`);
    } catch (err) {
      console.error(`[linkedin] Step 2 FAILED — navigation error: ${err.message}`);
      blockReason = `navigation_failed: ${err.message}`;
      await screenshotAndLog(page, 'step2_nav_error', SCREENSHOT_DIR).catch(() => {});
      return;
    }

    // ── Step 3: Screenshot login page ─────────────────────────────────────
    await screenshotAndLog(page, 'step3_login_page', SCREENSHOT_DIR).catch(() => {});
    stepsCompleted.push('screenshot_login_page');
    console.log('[linkedin] Step 3: Screenshotted login page');

    // ── Step 4: Inspect and document the login form ───────────────────────
    const formReport = await inspectLoginForm(page);
    stepsCompleted.push('form_structure_documented');
    console.log('[linkedin] Step 4: Login form structure documented');

    // ── Step 5: Fill credentials ───────────────────────────────────────────
    if (!email || !password) {
      console.warn('[linkedin] Step 5: GMAIL_PRIMARY or GMAIL_PRIMARY_PASS not set in config — skipping login');
      blockReason = 'credentials_not_configured';
      stepsCompleted.push('credentials_missing');
    } else {
      // Fill email
      const emailSel = formReport.email_field.workingSelector
        || '#username'
        || 'input[name="session_key"]';

      try {
        await fillField(page, emailSel, email);
        stepsCompleted.push('email_filled');
        console.log(`[linkedin] Step 5a: Email filled (selector: ${emailSel})`);
      } catch (err) {
        console.warn(`[linkedin] Step 5a: Could not fill email field — ${err.message}`);
        stepsCompleted.push('email_fill_failed');
      }

      // Fill password
      const passwordSel = formReport.password_field.workingSelector
        || '#password'
        || 'input[name="session_password"]';

      try {
        await fillField(page, passwordSel, password);
        stepsCompleted.push('password_filled');
        console.log(`[linkedin] Step 5b: Password filled (selector: ${passwordSel})`);
      } catch (err) {
        console.warn(`[linkedin] Step 5b: Could not fill password field — ${err.message}`);
        stepsCompleted.push('password_fill_failed');
      }

      // ── Step 6: Screenshot filled form ────────────────────────────────
      await screenshotAndLog(page, 'step6_filled_login_form', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('screenshot_filled_form');
      console.log('[linkedin] Step 6: Screenshotted filled login form');

      // ── Step 7: Submit login ───────────────────────────────────────────
      const submitSel = formReport.submit_button.workingSelector
        || 'button[type="submit"]';

      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }).catch(() => {}),
          page.click(submitSel),
        ]);
        stepsCompleted.push('login_submitted');
        console.log('[linkedin] Step 7: Login form submitted');
      } catch (err) {
        console.warn(`[linkedin] Step 7: Submit click issue — ${err.message}`);
        stepsCompleted.push('login_submit_attempted');
      }

      // Short wait for post-login redirect to settle
      await page.waitForTimeout(3000).catch(() => {});

      // ── Step 8: Check post-login state ────────────────────────────────
      if (await detectCaptcha(page)) {
        blockReason = 'blocked_captcha_after_login';
        console.warn('[linkedin] Step 8: CAPTCHA detected after login attempt');
        await screenshotAndLog(page, 'step8_captcha', SCREENSHOT_DIR).catch(() => {});
        stepsCompleted.push('detected_captcha');
        console.warn('[linkedin]   → Manual action needed: solve CAPTCHA or use a warmed account');
        return;
      }

      if (await detectVerificationChallenge(page)) {
        blockReason = 'blocked_verification_challenge';
        const currentUrl = page.url();
        console.warn(`[linkedin] Step 8: Verification challenge detected (URL: ${currentUrl})`);
        await screenshotAndLog(page, 'step8_verification_challenge', SCREENSHOT_DIR).catch(() => {});
        stepsCompleted.push('detected_verification_challenge');
        console.warn('[linkedin]   → Manual action needed: complete 2FA / phone / email verification');
        return;
      }

      const loggedIn = await detectLoggedIn(page);
      if (!loggedIn) {
        const currentUrl = page.url();
        console.warn(`[linkedin] Step 8: Login did not succeed — current URL: ${currentUrl}`);
        blockReason = `login_failed_unknown_state: ${currentUrl}`;
        await screenshotAndLog(page, 'step8_login_failed', SCREENSHOT_DIR).catch(() => {});
        stepsCompleted.push('login_failed');
        return;
      }

      // ── Login succeeded ───────────────────────────────────────────────
      stepsCompleted.push('login_succeeded');
      console.log(`[linkedin] Step 8: Login succeeded — current URL: ${page.url()}`);

      // ── Step 9: Navigate to feed ───────────────────────────────────────
      try {
        await page.goto(FEED_URL, {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT,
        });
        stepsCompleted.push('navigated_to_feed');
        console.log(`[linkedin] Step 9: Navigated to feed — ${page.url()}`);
      } catch (err) {
        console.warn(`[linkedin] Step 9: Feed navigation issue — ${err.message}`);
        stepsCompleted.push('feed_navigation_attempted');
      }

      await page.waitForTimeout(2000).catch(() => {});
      await screenshotAndLog(page, 'step9_feed', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('screenshot_feed');
      console.log('[linkedin] Step 9: Feed screenshot captured');

      // ── Step 10: Find and click "Start a post" button ─────────────────
      const startPostSelectors = [
        'button[aria-label*="start a post" i]',
        'button:has-text("Start a post")',
        '.share-box-feed-entry__trigger',
        '[data-control-name="create_post"]',
        'button.artdeco-button--muted:has-text("Start a post")',
        '.share-creation-state__placeholder',
        'span:has-text("Start a post")',
      ];

      let clickedStartPost = false;
      for (const sel of startPostSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await page.click(sel);
            clickedStartPost = true;
            stepsCompleted.push('clicked_start_post');
            console.log(`[linkedin] Step 10: Clicked "Start a post" (selector: ${sel})`);
            break;
          }
        } catch {
          // try next selector
        }
      }

      if (!clickedStartPost) {
        console.warn('[linkedin] Step 10: Could not find "Start a post" button — trying text-based search');
        try {
          // Fallback: look for anything that says "post" in the share box area
          await page.click('text=Start a post');
          clickedStartPost = true;
          stepsCompleted.push('clicked_start_post_text_fallback');
          console.log('[linkedin] Step 10: Clicked "Start a post" via text fallback');
        } catch (err) {
          console.warn(`[linkedin] Step 10: Start-a-post button not found — ${err.message}`);
          stepsCompleted.push('start_post_button_not_found');
          blockReason = 'start_post_button_not_found';
          await screenshotAndLog(page, 'step10_no_start_post_button', SCREENSHOT_DIR).catch(() => {});
        }
      }

      if (clickedStartPost) {
        // Wait for composer to open
        await page.waitForTimeout(2000).catch(() => {});

        // ── Step 11: Fill post composer with sample text ───────────────
        const composerSelectors = [
          'div[role="textbox"][data-placeholder*="talk about" i]',
          'div[role="textbox"][aria-label*="post" i]',
          'div[contenteditable="true"]',
          '.ql-editor',
          'div[data-placeholder*="What do you want to talk about" i]',
          'div[aria-label*="Create a post" i]',
        ];

        let filledComposer = false;
        for (const sel of composerSelectors) {
          try {
            const el = await page.$(sel);
            if (el) {
              await page.click(sel);
              await page.keyboard.type(DRY_RUN_TEXT);
              filledComposer = true;
              stepsCompleted.push('composer_filled');
              console.log(`[linkedin] Step 11: Composer filled with sample text (selector: ${sel})`);
              console.log(`[linkedin]   Text: "${DRY_RUN_TEXT}"`);
              break;
            }
          } catch {
            // try next selector
          }
        }

        if (!filledComposer) {
          console.warn('[linkedin] Step 11: Could not locate composer text area — documenting state');
          stepsCompleted.push('composer_fill_attempted');
          blockReason = blockReason || 'composer_text_area_not_found';
        }

        // ── Step 12: Screenshot the ready-to-post state ────────────────
        await screenshotAndLog(page, 'step12_ready_to_post', SCREENSHOT_DIR).catch(() => {});
        stepsCompleted.push('screenshot_ready_to_post');
        console.log('[linkedin] Step 12: Screenshotted ready-to-post state');

        // ── DRY RUN STOP ───────────────────────────────────────────────
        console.log('[linkedin]');
        console.log('[linkedin] *** DRY RUN — NOT clicking Post/Submit button ***');
        console.log('[linkedin] *** Composer is open and filled — flow documented ***');
        console.log('[linkedin]');

        reachedComposer = true;

        // Log what the Post button selector would be, for documentation
        const postButtonSelectors = [
          'button[data-control-name="share.post"]',
          'button:has-text("Post")',
          'button[aria-label*="post" i]',
          '.share-actions__primary-action',
        ];
        console.log('[linkedin] Post button selectors (NOT clicked — dry run only):');
        for (const sel of postButtonSelectors) {
          try {
            const el = await page.$(sel);
            const exists = !!el;
            console.log(`  ${exists ? 'FOUND  ' : 'ABSENT '} ${sel}`);
          } catch {
            console.log(`  ERROR  ${sel}`);
          }
        }
      }
    }

  } catch (err) {
    console.error(`[linkedin] Unhandled error: ${err.message}`);
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
    console.log('  LINKEDIN POSTING FLOW — DRY RUN SUMMARY');
    console.log('══════════════════════════════════════════════');
    console.log(`  Account         : ${email || '(not configured)'}`);
    console.log(`  Steps completed : ${stepsCompleted.join(' → ')}`);
    if (reachedComposer) {
      console.log('  Outcome         : SUCCESS — reached ready-to-post state (dry run stopped before posting)');
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
  console.error('[linkedin] Fatal error (should not reach here):', err.message);
  process.exit(1);
});
