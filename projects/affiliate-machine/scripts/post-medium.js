'use strict';

/**
 * post-medium.js
 *
 * DRY RUN — documents the Medium article publishing flow WITHOUT publishing.
 *
 * Flow:
 *   1. Navigate to medium.com sign-in page
 *   2. Screenshot and inspect the login form
 *   3. Detect Google vs. email login options
 *   4. Attempt login with GMAIL_PRIMARY credentials
 *   5. If login succeeds: navigate to editor, fill title + body, screenshot
 *   6. If blocked (CAPTCHA / security check): screenshot and log
 *
 * IMPORTANT: This script NEVER clicks Publish. It is purely a flow documenter.
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
const { GMAIL_PRIMARY, GMAIL_PRIMARY_PASS } = require('../lib/config');

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREENSHOT_DIR = 'data/screenshots/medium';
const SIGNIN_URL     = 'https://medium.com/m/signin';
const NEW_STORY_URL  = 'https://medium.com/new-story';
const NAV_TIMEOUT    = 60_000; // ms

const ARTICLE_TITLE = 'Best Email Marketing Tools 2026 - A Comprehensive Guide';

const ARTICLE_BODY = `Email marketing remains one of the highest-ROI digital marketing channels available \
in 2026, generating an average return of $36 for every $1 spent. Choosing the right platform can \
make or break your campaigns, whether you're running a bootstrapped SaaS startup or managing \
enterprise-level subscriber lists.

In this guide, we break down the top email marketing tools on the market — covering pricing, \
deliverability, automation depth, and integrations. From beginner-friendly drag-and-drop editors \
to developer-first API powerhouses, there's a clear winner for every use case. Read on to find \
the platform that fits your workflow and budget.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scan page HTML for signals that a CAPTCHA or security challenge is active.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectCaptcha(page) {
  try {
    const html = (await page.content()).toLowerCase();
    return (
      html.includes('captcha') ||
      html.includes('recaptcha') ||
      html.includes('hcaptcha') ||
      html.includes('arkose') ||
      html.includes('funcaptcha') ||
      html.includes('security check') ||
      html.includes('verify you are human') ||
      html.includes('prove you are not a robot')
    );
  } catch {
    return false;
  }
}

/**
 * Scan page HTML for signals of a generic block / suspicious-activity page.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectBlock(page) {
  try {
    const html = (await page.content()).toLowerCase();
    const url  = page.url().toLowerCase();
    return (
      html.includes('access denied') ||
      html.includes('suspicious activity') ||
      html.includes('unusual traffic') ||
      html.includes('rate limit') ||
      url.includes('challenge') ||
      url.includes('block')
    );
  } catch {
    return false;
  }
}

/**
 * Check whether the current URL or page signals a successful Medium login.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function detectLoggedIn(page) {
  try {
    const url  = page.url().toLowerCase();
    const html = (await page.content()).toLowerCase();
    // After login Medium typically lands on medium.com or a feed page
    return (
      (url.includes('medium.com') && !url.includes('signin') && !url.includes('login')) ||
      html.includes('write a story') ||
      html.includes('new story') ||
      html.includes('start writing') ||
      // Avatar / account menu present
      html.includes('data-testid="avatarmenu"') ||
      html.includes('"signed_in":true')
    );
  } catch {
    return false;
  }
}

/**
 * Inspect the page and log all <input> and <button> elements found.
 * Useful for debugging unfamiliar login forms.
 * @param {import('playwright').Page} page
 */
async function logFormStructure(page) {
  try {
    const inputs = await page.$$eval('input', (els) =>
      els.map((el) => ({
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label'),
      }))
    );
    const buttons = await page.$$eval('button, [role="button"]', (els) =>
      els.map((el) => ({
        text: el.textContent.trim().slice(0, 80),
        type: el.type,
        id: el.id,
        ariaLabel: el.getAttribute('aria-label'),
      }))
    );
    const links = await page.$$eval('a', (els) =>
      els
        .map((el) => ({ text: el.textContent.trim().slice(0, 60), href: el.href }))
        .filter((a) => a.text.length > 0 && a.href.includes('medium'))
    );

    console.log('[medium] Form structure — inputs:');
    inputs.forEach((i) => console.log('  ', JSON.stringify(i)));
    console.log('[medium] Form structure — buttons:');
    buttons.forEach((b) => console.log('  ', JSON.stringify(b)));
    console.log('[medium] Form structure — relevant links:');
    links.slice(0, 10).forEach((l) => console.log('  ', JSON.stringify(l)));
  } catch (err) {
    console.warn(`[medium] logFormStructure failed: ${err.message}`);
  }
}

// ─── Main flow ────────────────────────────────────────────────────────────────

async function run() {
  const gmailEmail = GMAIL_PRIMARY();
  const gmailPass  = GMAIL_PRIMARY_PASS();

  // Track steps and block reasons for the end-of-run summary
  const stepsCompleted = [];
  let blockReason      = null;
  let loginSucceeded   = false;
  let editorReached    = false;

  console.log('[medium] ════════════════════════════════════════');
  console.log('[medium] Medium article draft — DRY RUN');
  console.log('[medium] WILL NOT PUBLISH anything.');
  console.log('[medium] ════════════════════════════════════════');
  console.log(`[medium] Login account   : ${gmailEmail || '(GMAIL_PRIMARY not set)'}`);
  console.log(`[medium] Screenshot dir  : ${SCREENSHOT_DIR}`);

  // Ensure screenshot directory exists
  fs.mkdirSync(path.resolve(SCREENSHOT_DIR), { recursive: true });

  let browser;
  let page;

  try {
    // ── Step 1: Launch browser ─────────────────────────────────────────────
    ({ browser, page } = await launchBrowser({ headless: true }));
    stepsCompleted.push('browser_launched');
    console.log('[medium] Step 1: Browser launched');

    // ── Step 2: Navigate to sign-in page ──────────────────────────────────
    try {
      await page.goto(SIGNIN_URL, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      });
      stepsCompleted.push('navigated_to_signin');
      console.log(`[medium] Step 2: Navigated to ${SIGNIN_URL}`);
      console.log(`[medium]         Current URL : ${page.url()}`);
    } catch (err) {
      console.error(`[medium] Step 2 FAILED — navigation error: ${err.message}`);
      blockReason = `navigation_failed: ${err.message}`;
      await screenshotAndLog(page, 'step2_nav_error', SCREENSHOT_DIR).catch(() => {});
      return;
    }

    // ── Step 3: Screenshot login page ─────────────────────────────────────
    await page.waitForTimeout(2000).catch(() => {});
    await screenshotAndLog(page, 'step3_login_page', SCREENSHOT_DIR).catch(() => {});
    stepsCompleted.push('screenshot_login_page');
    console.log('[medium] Step 3: Screenshotted login page');

    // ── Step 4: Check for Cloudflare Turnstile / CAPTCHA / block ─────────
    // Medium uses Cloudflare Turnstile to block headless browsers.
    // Detect it early by checking for the hidden turnstile response field,
    // the "Verify you are human" text, or any other CAPTCHA / block signals.
    const pageHtml = (await page.content()).toLowerCase();
    const hasTurnstile = pageHtml.includes('cf-turnstile') || pageHtml.includes('cf-chl-widget');
    const hasHumanVerify = pageHtml.includes('verify you are human') || pageHtml.includes('performing security verification');

    if (hasTurnstile || hasHumanVerify) {
      blockReason = 'blocked_cloudflare_turnstile — headless browser fingerprint rejected by medium.com. Requires real browser session, GoLogin profile, or solved Turnstile token.';
      console.warn('[medium] Step 4: Cloudflare Turnstile bot-protection detected');
      console.warn('[medium]         Medium requires a human-verified session to access the login page.');
      console.warn('[medium]         Next step: use GoLogin with a warmed profile to bypass fingerprinting.');
      await screenshotAndLog(page, 'step4_cloudflare_turnstile', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_cloudflare_turnstile');
      return;
    }

    if (await detectCaptcha(page)) {
      blockReason = 'blocked_captcha_on_login_page';
      console.warn('[medium] Step 4: CAPTCHA detected on initial login page');
      await screenshotAndLog(page, 'step4_captcha_initial', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_captcha_initial');
      return;
    }

    if (await detectBlock(page)) {
      blockReason = 'blocked_generic_on_login_page';
      console.warn('[medium] Step 4: Generic block detected on login page');
      await screenshotAndLog(page, 'step4_block_initial', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_block_initial');
      return;
    }

    stepsCompleted.push('no_initial_block');

    // ── Step 5: Inspect and log form structure ────────────────────────────
    console.log('[medium] Step 5: Inspecting login form structure...');
    await logFormStructure(page);
    stepsCompleted.push('form_structure_logged');

    // ── Step 6: Detect Google login vs. email login ────────────────────────
    console.log('[medium] Step 6: Detecting available login options...');

    const googleButtonSelectors = [
      'button:has-text("Sign in with Google")',
      'button:has-text("Continue with Google")',
      '[data-action="google"]',
      'a:has-text("Sign in with Google")',
      'a:has-text("Continue with Google")',
      'a[href*="google"]',
      '[aria-label*="Google" i]',
    ];

    const emailButtonSelectors = [
      'button:has-text("Sign in with email")',
      'button:has-text("Continue with email")',
      'a:has-text("Sign in with email")',
      '[data-action="email"]',
      'input[type="email"]',
      'input[name="email"]',
    ];

    let googleButtonFound = false;
    let googleButtonSel   = null;
    for (const sel of googleButtonSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          googleButtonFound = true;
          googleButtonSel   = sel;
          console.log(`[medium] Step 6: Google login button found — selector: ${sel}`);
          break;
        }
      } catch {
        // try next
      }
    }

    let emailButtonFound = false;
    let emailButtonSel   = null;
    for (const sel of emailButtonSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          emailButtonFound = true;
          emailButtonSel   = sel;
          console.log(`[medium] Step 6: Email login option found — selector: ${sel}`);
          break;
        }
      } catch {
        // try next
      }
    }

    if (!googleButtonFound && !emailButtonFound) {
      console.warn('[medium] Step 6: No known login buttons found — page may have changed structure');
      stepsCompleted.push('no_login_buttons_detected');
    }

    // ── Step 7: Attempt login ──────────────────────────────────────────────
    console.log('[medium] Step 7: Attempting login...');

    if (googleButtonFound && gmailEmail) {
      // ── Path A: Google login ─────────────────────────────────────────────
      console.log('[medium] Step 7A: Clicking Google login button...');
      stepsCompleted.push('attempt_google_login');

      try {
        await page.click(googleButtonSel);
        stepsCompleted.push('clicked_google_button');
        console.log('[medium] Step 7A: Clicked Google button');

        // Wait for Google OAuth popup or redirect
        await page.waitForTimeout(3000).catch(() => {});
        await screenshotAndLog(page, 'step7a_after_google_click', SCREENSHOT_DIR).catch(() => {});
        console.log(`[medium] Step 7A: Current URL after Google click: ${page.url()}`);

        // Check if Google OAuth opened in same tab
        const afterUrl = page.url().toLowerCase();
        if (afterUrl.includes('accounts.google.com') || afterUrl.includes('google.com/signin')) {
          console.log('[medium] Step 7A: Google OAuth page detected (same tab)');
          stepsCompleted.push('google_oauth_same_tab');

          // Try to fill Google email
          const googleEmailSels = [
            'input[type="email"]',
            'input[id="identifierId"]',
            'input[name="identifier"]',
          ];
          let filledGoogleEmail = false;
          for (const sel of googleEmailSels) {
            try {
              const el = await page.$(sel);
              if (el) {
                await page.fill(sel, gmailEmail);
                filledGoogleEmail = true;
                console.log(`[medium] Step 7A: Filled Google email (selector: ${sel})`);
                stepsCompleted.push('filled_google_email');
                break;
              }
            } catch {
              // try next
            }
          }

          if (filledGoogleEmail) {
            await screenshotAndLog(page, 'step7a_google_email_filled', SCREENSHOT_DIR).catch(() => {});

            // Click "Next" on Google's email step
            const nextSels = [
              '#identifierNext',
              'button:has-text("Next")',
              '[data-action="next"]',
            ];
            for (const sel of nextSels) {
              try {
                const el = await page.$(sel);
                if (el) {
                  await page.click(sel);
                  console.log(`[medium] Step 7A: Clicked Next on Google email (selector: ${sel})`);
                  stepsCompleted.push('clicked_google_next');
                  break;
                }
              } catch {
                // try next
              }
            }

            await page.waitForTimeout(3000).catch(() => {});
            await screenshotAndLog(page, 'step7a_google_after_email_next', SCREENSHOT_DIR).catch(() => {});

            // Fill Google password
            if (gmailPass) {
              const passSels = [
                'input[type="password"]',
                'input[name="password"]',
                'input[aria-label*="password" i]',
              ];
              let filledGooglePass = false;
              for (const sel of passSels) {
                try {
                  const el = await page.$(sel);
                  if (el) {
                    await page.fill(sel, gmailPass);
                    filledGooglePass = true;
                    console.log(`[medium] Step 7A: Filled Google password (selector: ${sel})`);
                    stepsCompleted.push('filled_google_password');
                    break;
                  }
                } catch {
                  // try next
                }
              }

              if (filledGooglePass) {
                await screenshotAndLog(page, 'step7a_google_password_filled', SCREENSHOT_DIR).catch(() => {});

                const passwordNextSels = [
                  '#passwordNext',
                  'button:has-text("Next")',
                  '[data-action="next"]',
                ];
                for (const sel of passwordNextSels) {
                  try {
                    const el = await page.$(sel);
                    if (el) {
                      await page.click(sel);
                      console.log(`[medium] Step 7A: Clicked Next on Google password (selector: ${sel})`);
                      stepsCompleted.push('clicked_google_password_next');
                      break;
                    }
                  } catch {
                    // try next
                  }
                }

                // Wait for OAuth redirect back to Medium
                await page.waitForTimeout(5000).catch(() => {});
                await screenshotAndLog(page, 'step7a_google_after_password_next', SCREENSHOT_DIR).catch(() => {});
                console.log(`[medium] Step 7A: URL after Google password: ${page.url()}`);
              }
            } else {
              console.warn('[medium] Step 7A: GMAIL_PRIMARY_PASS not set — skipping password fill');
              stepsCompleted.push('google_password_skipped_no_creds');
            }
          }

          // Check for 2FA / security challenges on Google's side
          const googleUrl = page.url().toLowerCase();
          if (googleUrl.includes('challenge') || googleUrl.includes('2fa') || googleUrl.includes('verification')) {
            blockReason = `blocked_google_2fa_or_challenge: ${page.url()}`;
            console.warn(`[medium] Step 7A: Google security challenge detected — ${blockReason}`);
            await screenshotAndLog(page, 'step7a_google_challenge', SCREENSHOT_DIR).catch(() => {});
            stepsCompleted.push('detected_google_challenge');
          }

        } else {
          // Google may have opened a popup — log the current state
          console.log(`[medium] Step 7A: After Google click, current URL: ${page.url()}`);
          console.log('[medium] Step 7A: Google OAuth may have opened in a popup (not detectable in headless)');
          stepsCompleted.push('google_oauth_popup_or_redirect');
        }

      } catch (err) {
        console.warn(`[medium] Step 7A: Google login attempt failed: ${err.message}`);
        blockReason = blockReason || `google_login_error: ${err.message}`;
        stepsCompleted.push('google_login_error');
        await screenshotAndLog(page, 'step7a_google_error', SCREENSHOT_DIR).catch(() => {});
      }

    } else if (emailButtonFound) {
      // ── Path B: Email-based login ────────────────────────────────────────
      console.log('[medium] Step 7B: Email login path detected');
      stepsCompleted.push('attempt_email_login');

      try {
        // Click "Sign in with email" button if it's a button (not direct input)
        const isButton = emailButtonSel && !emailButtonSel.includes('input');
        if (isButton) {
          await page.click(emailButtonSel);
          console.log(`[medium] Step 7B: Clicked email login button (selector: ${emailButtonSel})`);
          stepsCompleted.push('clicked_email_login_button');
          await page.waitForTimeout(2000).catch(() => {});
          await screenshotAndLog(page, 'step7b_after_email_button', SCREENSHOT_DIR).catch(() => {});
        }

        // Now fill email field
        const emailFieldSels = [
          'input[type="email"]',
          'input[name="email"]',
          'input[placeholder*="email" i]',
          'input[aria-label*="email" i]',
        ];

        let filledEmail = false;
        for (const sel of emailFieldSels) {
          try {
            const el = await page.$(sel);
            if (el && gmailEmail) {
              await page.fill(sel, gmailEmail);
              filledEmail = true;
              console.log(`[medium] Step 7B: Filled email field (selector: ${sel})`);
              stepsCompleted.push('filled_email_field');
              break;
            }
          } catch {
            // try next
          }
        }

        if (!filledEmail) {
          console.warn('[medium] Step 7B: Could not find email input field or no email credential set');
          stepsCompleted.push('email_field_not_found');
        } else {
          await screenshotAndLog(page, 'step7b_email_filled', SCREENSHOT_DIR).catch(() => {});

          // Submit email form
          const submitSels = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Continue")',
            'button:has-text("Next")',
            'button:has-text("Sign in")',
          ];

          for (const sel of submitSels) {
            try {
              const el = await page.$(sel);
              if (el) {
                await page.click(sel);
                console.log(`[medium] Step 7B: Submitted email form (selector: ${sel})`);
                stepsCompleted.push('submitted_email_form');
                break;
              }
            } catch {
              // try next
            }
          }

          await page.waitForTimeout(3000).catch(() => {});
          await screenshotAndLog(page, 'step7b_after_email_submit', SCREENSHOT_DIR).catch(() => {});
          console.log(`[medium] Step 7B: URL after email submit: ${page.url()}`);
        }

      } catch (err) {
        console.warn(`[medium] Step 7B: Email login attempt failed: ${err.message}`);
        blockReason = blockReason || `email_login_error: ${err.message}`;
        stepsCompleted.push('email_login_error');
        await screenshotAndLog(page, 'step7b_error', SCREENSHOT_DIR).catch(() => {});
      }

    } else {
      console.warn('[medium] Step 7: No login method available — skipping login attempt');
      blockReason = blockReason || 'no_login_method_found';
      stepsCompleted.push('login_skipped_no_method');
    }

    // ── Step 8: Check login result ─────────────────────────────────────────
    await page.waitForTimeout(3000).catch(() => {});
    await screenshotAndLog(page, 'step8_post_login_state', SCREENSHOT_DIR).catch(() => {});
    console.log(`[medium] Step 8: Post-login URL: ${page.url()}`);

    if (await detectCaptcha(page)) {
      blockReason = blockReason || 'blocked_captcha_post_login';
      console.warn(`[medium] Step 8: CAPTCHA detected after login attempt`);
      await screenshotAndLog(page, 'step8_captcha_post_login', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_captcha_post_login');
    } else if (await detectBlock(page)) {
      blockReason = blockReason || 'blocked_generic_post_login';
      console.warn(`[medium] Step 8: Generic block detected after login`);
      await screenshotAndLog(page, 'step8_block_post_login', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('detected_block_post_login');
    } else if (await detectLoggedIn(page)) {
      loginSucceeded = true;
      console.log('[medium] Step 8: Login detected as SUCCESSFUL');
      stepsCompleted.push('login_succeeded');
    } else {
      console.warn(`[medium] Step 8: Login state unclear — URL: ${page.url()}`);
      stepsCompleted.push('login_state_unclear');
    }

    // ── Steps 9–13 only if logged in ──────────────────────────────────────
    if (loginSucceeded) {
      // ── Step 9: Navigate to new story page ──────────────────────────────
      console.log('[medium] Step 9: Navigating to new story page...');
      try {
        await page.goto(NEW_STORY_URL, {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT,
        });
        stepsCompleted.push('navigated_to_new_story');
        console.log(`[medium] Step 9: Navigated to ${NEW_STORY_URL}`);
        console.log(`[medium]         Current URL : ${page.url()}`);
      } catch (err) {
        console.error(`[medium] Step 9 FAILED — navigation error: ${err.message}`);
        blockReason = blockReason || `new_story_nav_failed: ${err.message}`;
        stepsCompleted.push('new_story_nav_failed');
        await screenshotAndLog(page, 'step9_nav_error', SCREENSHOT_DIR).catch(() => {});
      }

      // ── Step 10: Screenshot editor ──────────────────────────────────────
      await page.waitForTimeout(3000).catch(() => {});
      await screenshotAndLog(page, 'step10_editor_initial', SCREENSHOT_DIR).catch(() => {});
      stepsCompleted.push('screenshot_editor');
      console.log('[medium] Step 10: Screenshotted editor');

      // Check whether editor loaded
      const editorUrl = page.url().toLowerCase();
      if (editorUrl.includes('new-story') || editorUrl.includes('/p/') || editorUrl.includes('editor')) {
        editorReached = true;
        stepsCompleted.push('editor_reached');
        console.log('[medium] Step 10: Editor page confirmed');
      } else {
        console.warn(`[medium] Step 10: Editor may not have loaded — URL: ${page.url()}`);
        stepsCompleted.push('editor_not_confirmed');
        blockReason = blockReason || `editor_not_loaded: ${page.url()}`;
      }

      // ── Step 11: Fill article title ─────────────────────────────────────
      if (editorReached) {
        console.log('[medium] Step 11: Filling article title...');

        const titleSelectors = [
          '[data-testid="editor-title"]',
          '[aria-label="Title"]',
          '[placeholder="Title"]',
          'h3[contenteditable="true"]',
          'h1[contenteditable="true"]',
          '[contenteditable="true"]:first-of-type',
          '.graf--title',
          'div[data-contents="true"] div:first-child',
        ];

        let filledTitle = false;
        for (const sel of titleSelectors) {
          try {
            const el = await page.$(sel);
            if (el) {
              await page.click(sel);
              await page.keyboard.type(ARTICLE_TITLE);
              filledTitle = true;
              console.log(`[medium] Step 11: Filled title (selector: ${sel})`);
              stepsCompleted.push('filled_title');
              break;
            }
          } catch {
            // try next selector
          }
        }

        if (!filledTitle) {
          console.warn('[medium] Step 11: Could not find title field — editor may use different structure');
          stepsCompleted.push('title_field_not_found');
          await screenshotAndLog(page, 'step11_no_title_field', SCREENSHOT_DIR).catch(() => {});
        } else {
          await screenshotAndLog(page, 'step11_title_filled', SCREENSHOT_DIR).catch(() => {});
        }

        // ── Step 12: Fill article body ────────────────────────────────────
        console.log('[medium] Step 12: Filling article body...');

        const bodySelectors = [
          '[data-testid="editor-body"]',
          '[aria-label="Write your story"]',
          '[placeholder="Tell your story…"]',
          '[placeholder="Write your story..."]',
          '.graf--p',
          'div[data-contents="true"] div:nth-child(2)',
          '[contenteditable="true"]:nth-of-type(2)',
        ];

        let filledBody = false;

        // First try pressing Enter after title to move to body
        if (filledTitle) {
          try {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500).catch(() => {});
          } catch {
            // ignore
          }
        }

        for (const sel of bodySelectors) {
          try {
            const el = await page.$(sel);
            if (el) {
              await page.click(sel);
              await page.keyboard.type(ARTICLE_BODY);
              filledBody = true;
              console.log(`[medium] Step 12: Filled body text (selector: ${sel})`);
              stepsCompleted.push('filled_body');
              break;
            }
          } catch {
            // try next selector
          }
        }

        // If body selectors all fail, try typing after the title cursor
        if (!filledBody && filledTitle) {
          try {
            await page.keyboard.type('\n\n' + ARTICLE_BODY);
            filledBody = true;
            console.log('[medium] Step 12: Filled body via keyboard continue after title');
            stepsCompleted.push('filled_body_via_keyboard');
          } catch (err) {
            console.warn(`[medium] Step 12: Could not fill body: ${err.message}`);
            stepsCompleted.push('body_field_not_found');
          }
        }

        await page.waitForTimeout(1000).catch(() => {});
        await screenshotAndLog(page, 'step12_editor_filled', SCREENSHOT_DIR).catch(() => {});
        console.log('[medium] Step 12: Screenshotted filled editor');

        // ── Step 13: Final check — confirm Publish button NOT clicked ──────
        console.log('[medium] Step 13: Verifying Publish button is NOT being clicked (dry run guard)...');

        const publishButtonSels = [
          'button:has-text("Publish")',
          '[aria-label="Publish"]',
          '[data-testid="publish-button"]',
        ];

        let publishFound = false;
        for (const sel of publishButtonSels) {
          try {
            const el = await page.$(sel);
            if (el) {
              publishFound = true;
              console.log(`[medium] Step 13: Publish button found (selector: ${sel}) — NOT clicking (dry run)`);
              stepsCompleted.push('publish_button_found_not_clicked');
              break;
            }
          } catch {
            // try next
          }
        }

        if (!publishFound) {
          console.log('[medium] Step 13: Publish button not visible at this stage (may appear after more content)');
          stepsCompleted.push('publish_button_not_visible');
        }

        await screenshotAndLog(page, 'step13_final_editor_state', SCREENSHOT_DIR).catch(() => {});
        stepsCompleted.push('dry_run_complete');
        console.log('[medium] Step 13: DRY RUN COMPLETE — no publish action taken');
      }
    } else {
      console.log('[medium] Steps 9-13 skipped — login did not succeed');
      stepsCompleted.push('editor_steps_skipped_login_failed');
    }

  } catch (err) {
    console.error(`[medium] Unhandled error: ${err.message}`);
    blockReason = blockReason || `unhandled_error: ${err.message}`;
    if (page) {
      await screenshotAndLog(page, 'error_unhandled', SCREENSHOT_DIR).catch(() => {});
    }
  } finally {
    if (browser) {
      await closeBrowser(browser);
    }

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  MEDIUM ARTICLE DRAFT — DRY RUN SUMMARY');
    console.log('══════════════════════════════════════════════════════');
    console.log(`  Login account   : ${gmailEmail || '(not set)'}`);
    console.log(`  Steps completed : ${stepsCompleted.join(' → ')}`);
    console.log(`  Login succeeded : ${loginSucceeded}`);
    console.log(`  Editor reached  : ${editorReached}`);
    if (blockReason) {
      console.log(`  Blocked at      : ${blockReason}`);
    }
    console.log('  Published?      : NO (dry run — never publishes)');
    console.log(`  Screenshots     : ${path.resolve(SCREENSHOT_DIR)}`);
    console.log('══════════════════════════════════════════════════════\n');
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────
run().catch((err) => {
  console.error('[medium] Fatal error (should not reach here):', err.message);
  process.exit(1);
});
