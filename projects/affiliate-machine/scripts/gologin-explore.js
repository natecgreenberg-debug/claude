'use strict';

/**
 * gologin-explore.js
 *
 * Explores the GoLogin web dashboard at https://app.gologin.com.
 * Documents the login flow, blocking mechanisms, free-tier features,
 * and API availability. Writes findings to GOLOGIN_NOTES.md.
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, screenshotAndLog, waitAndClick, fillField, closeBrowser } = require('../lib/browser.js');
const { getKey } = require('../lib/config.js');

// ─── Config ──────────────────────────────────────────────────────────────────
const SCREENSHOT_DIR = 'data/screenshots/gologin';
const NOTES_FILE = path.resolve(__dirname, '..', 'GOLOGIN_NOTES.md');
const NAV_TIMEOUT = 60_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Append a line to findings log (in-memory).
 * @param {string[]} lines
 * @param {string}   text
 */
function log(lines, text) {
  const msg = `[gologin] ${text}`;
  console.log(msg);
  lines.push(text);
}

/**
 * Navigate with timeout guard; returns true on success, false on failure.
 */
async function safeGoto(page, url, findings) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    return true;
  } catch (err) {
    log(findings, `Navigation to ${url} failed: ${err.message}`);
    return false;
  }
}

/**
 * Try to find an element matching any of the given selectors.
 * Returns the first matching locator, or null.
 */
async function findFirst(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) return { sel, el };
    } catch (_) {
      // not found — try next
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const findings = [];
  const screenshots = [];
  let browser;
  let page;

  const gmail = getKey('GMAIL_PRIMARY');
  const gmailPass = getKey('GMAIL_PRIMARY_PASS');

  findings.push(`Script started at ${new Date().toISOString()}`);
  findings.push(`Gmail account available: ${gmail ? 'YES' : 'NO (key missing)'}`);

  try {
    // ── 1. Launch ────────────────────────────────────────────────────────────
    ({ browser, page } = await launchBrowser({ headless: true }));
    log(findings, 'Browser launched (headless Chromium).');

    // ── 2. Navigate to app.gologin.com ───────────────────────────────────────
    log(findings, 'Navigating to https://app.gologin.com ...');
    const landed = await safeGoto(page, 'https://app.gologin.com', findings);

    if (!landed) {
      // Fallback: try main site
      log(findings, 'Falling back to https://gologin.com ...');
      await safeGoto(page, 'https://gologin.com', findings);
    }

    const landingTitle = await page.title().catch(() => '(no title)');
    const landingUrl = page.url();
    log(findings, `Landed on: ${landingUrl} — title: "${landingTitle}"`);

    const ss1 = await screenshotAndLog(page, '01_landing', SCREENSHOT_DIR);
    screenshots.push(ss1);

    // Wait a beat for any JS-driven redirect
    await page.waitForTimeout(2000);
    const afterRedirectUrl = page.url();
    if (afterRedirectUrl !== landingUrl) {
      log(findings, `Redirected to: ${afterRedirectUrl}`);
    }
    const ss1b = await screenshotAndLog(page, '02_after_redirect', SCREENSHOT_DIR);
    screenshots.push(ss1b);

    // ── 3. Detect login form vs. dashboard ───────────────────────────────────
    const loginIndicators = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      '[data-testid*="login"]',
      'form',
      'text=Log in',
      'text=Sign in',
    ];

    const dashboardIndicators = [
      '[data-testid*="dashboard"]',
      'text=Create profile',
      'text=New profile',
      '.profile-list',
      '#profiles',
    ];

    const onDashboard = await findFirst(page, dashboardIndicators);
    if (onDashboard) {
      log(findings, 'Already on dashboard — session cookie active or auto-login occurred.');
    } else {
      log(findings, 'Login page detected — scanning for login options.');

      // ── 4. Look for Google/Gmail SSO ─────────────────────────────────────
      const googleSelectors = [
        'button:has-text("Google")',
        'a:has-text("Google")',
        '[data-provider="google"]',
        '[aria-label*="Google" i]',
        'img[alt*="Google" i]',
        '.google-login',
        'text=Continue with Google',
        'text=Sign in with Google',
        'text=Log in with Google',
      ];

      const googleBtn = await findFirst(page, googleSelectors);

      if (googleBtn) {
        log(findings, `Google login button found: selector="${googleBtn.sel}"`);
        const ss2 = await screenshotAndLog(page, '03_google_btn_visible', SCREENSHOT_DIR);
        screenshots.push(ss2);

        if (!gmail || !gmailPass) {
          log(findings, 'GMAIL_PRIMARY or GMAIL_PRIMARY_PASS not set — skipping Google login attempt.');
        } else {
          log(findings, 'Attempting Google OAuth flow...');
          const [popup] = await Promise.all([
            page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null),
            googleBtn.el.click(),
          ]);

          await page.waitForTimeout(2000);
          const ss3 = await screenshotAndLog(page, '04_after_google_click', SCREENSHOT_DIR);
          screenshots.push(ss3);

          const oauthPage = popup || page;
          const oauthUrl = oauthPage.url();
          log(findings, `OAuth page URL: ${oauthUrl}`);

          if (oauthUrl.includes('accounts.google.com') || oauthUrl.includes('google')) {
            log(findings, 'Google accounts page opened — filling email...');
            const ss4 = await screenshotAndLog(oauthPage, '05_google_accounts', SCREENSHOT_DIR);
            screenshots.push(ss4);

            try {
              await fillField(oauthPage, 'input[type="email"]', gmail);
              await oauthPage.keyboard.press('Enter');
              await oauthPage.waitForTimeout(2000);

              const ss5 = await screenshotAndLog(oauthPage, '06_after_email', SCREENSHOT_DIR);
              screenshots.push(ss5);

              // Check for CAPTCHA / unusual sign-in challenge
              const blockers = await findFirst(oauthPage, [
                'text=verify',
                'text=Verify',
                'text=unusual',
                'text=suspicious',
                '#captchaimg',
                '[data-type="CAPTCHA"]',
                'text=phone number',
                'text=2-Step',
              ]);

              if (blockers) {
                log(findings, `BLOCKER detected at email step: "${blockers.sel}" — stopping Google login.`);
              } else {
                // Try password
                try {
                  await fillField(oauthPage, 'input[type="password"]', gmailPass);
                  await oauthPage.keyboard.press('Enter');
                  await oauthPage.waitForTimeout(3000);

                  const ss6 = await screenshotAndLog(oauthPage, '07_after_password', SCREENSHOT_DIR);
                  screenshots.push(ss6);
                  log(findings, 'Password submitted — checking result...');

                  const postPassUrl = oauthPage.url();
                  log(findings, `Post-password URL: ${postPassUrl}`);

                  const postBlocker = await findFirst(oauthPage, [
                    'text=2-Step',
                    'text=verify your identity',
                    'text=phone',
                    '#captchaimg',
                    'text=unusual activity',
                  ]);
                  if (postBlocker) {
                    log(findings, `BLOCKER after password: "${postBlocker.sel}"`);
                  }
                } catch (err) {
                  log(findings, `Password field not found or timed out: ${err.message}`);
                }
              }
            } catch (err) {
              log(findings, `Email fill failed: ${err.message}`);
            }
          } else {
            log(findings, `Google OAuth did not open expected URL; got: ${oauthUrl}`);
          }
        }
      } else {
        log(findings, 'No Google/Gmail login button found.');
      }

      // ── 5. Email/Password form ────────────────────────────────────────────
      const emailInput = await findFirst(page, ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]']);
      if (emailInput) {
        log(findings, `Email input found: "${emailInput.sel}"`);

        if (gmail && gmailPass) {
          log(findings, 'Attempting email/password login with Gmail credentials...');
          try {
            await fillField(page, emailInput.sel, gmail);

            const passInput = await findFirst(page, ['input[type="password"]', 'input[name="password"]']);
            if (passInput) {
              await fillField(page, passInput.sel, gmailPass);
              const submitBtn = await findFirst(page, [
                'button[type="submit"]',
                'button:has-text("Log in")',
                'button:has-text("Sign in")',
                'button:has-text("Login")',
              ]);
              if (submitBtn) {
                await submitBtn.el.click();
                await page.waitForTimeout(4000);
                const ss7 = await screenshotAndLog(page, '08_after_login_submit', SCREENSHOT_DIR);
                screenshots.push(ss7);
                log(findings, `Post-submit URL: ${page.url()}`);
              } else {
                log(findings, 'No submit button found — pressing Enter instead.');
                await page.keyboard.press('Enter');
                await page.waitForTimeout(4000);
                const ss7b = await screenshotAndLog(page, '08_after_login_enter', SCREENSHOT_DIR);
                screenshots.push(ss7b);
              }
            } else {
              log(findings, 'No password field found on login page.');
            }
          } catch (err) {
            log(findings, `Email/password login error: ${err.message}`);
          }
        }
      } else {
        log(findings, 'No email input found on page. May be a landing page with different layout.');
      }

      // Refresh blocker scan after login attempt
      const ssBlockerCheck = await screenshotAndLog(page, '09_login_result', SCREENSHOT_DIR);
      screenshots.push(ssBlockerCheck);

      const captchaCheck = await findFirst(page, [
        '[class*="captcha" i]',
        '[id*="captcha" i]',
        'iframe[src*="recaptcha"]',
        'text=CAPTCHA',
        'text=captcha',
        'text=robot',
        'text=not a robot',
      ]);
      if (captchaCheck) {
        log(findings, `CAPTCHA blocker detected: "${captchaCheck.sel}"`);
      }

      const twoFaCheck = await findFirst(page, [
        'text=Two-factor',
        'text=2FA',
        'text=verification code',
        'input[placeholder*="code" i]',
        'text=Authenticator',
      ]);
      if (twoFaCheck) {
        log(findings, `2FA prompt detected: "${twoFaCheck.sel}"`);
      }
    }

    // ── 6. Check current state — are we logged in? ────────────────────────
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    log(findings, `Current URL after login attempts: ${currentUrl}`);

    const isLoggedIn =
      currentUrl.includes('/dashboard') ||
      currentUrl.includes('/profiles') ||
      currentUrl.includes('/home') ||
      (await findFirst(page, [
        'text=Create profile',
        'text=New profile',
        'text=Add profile',
        '.profiles',
        '[data-testid="profile"]',
      ])) !== null;

    // ── 7. Dashboard exploration if logged in ─────────────────────────────
    if (isLoggedIn) {
      log(findings, 'LOGIN SUCCESS — exploring dashboard.');

      const ssDash = await screenshotAndLog(page, '10_dashboard', SCREENSHOT_DIR);
      screenshots.push(ssDash);

      // Profile creation
      const createProfile = await findFirst(page, [
        'button:has-text("Create profile")',
        'button:has-text("New profile")',
        'button:has-text("Add profile")',
        '[data-testid*="create"]',
      ]);
      log(findings, createProfile ? `Profile creation: AVAILABLE (${createProfile.sel})` : 'Profile creation: not immediately visible');

      // Proxy settings
      const proxySection = await findFirst(page, [
        'text=Proxy',
        'text=proxy',
        '[href*="proxy"]',
        '[data-testid*="proxy"]',
      ]);
      log(findings, proxySection ? `Proxy settings: FOUND (${proxySection.sel})` : 'Proxy settings: not visible on current view');

      // API section
      const apiSection = await findFirst(page, [
        'text=API',
        '[href*="/api"]',
        '[href*="docs"]',
        'text=Developer',
        'text=Documentation',
      ]);
      log(findings, apiSection ? `API/Docs link: FOUND (${apiSection.sel})` : 'API/Docs: not visible on current view');

      // Free tier indicators
      const freeTier = await findFirst(page, [
        'text=Free',
        'text=free plan',
        'text=3 profiles',
        'text=Upgrade',
        'text=Pro',
      ]);
      log(findings, freeTier ? `Free tier indicator: "${freeTier.sel}"` : 'No free/upgrade indicators visible');

      // Screenshot full page for detail
      const ssDashFull = await screenshotAndLog(page, '11_dashboard_full', SCREENSHOT_DIR);
      screenshots.push(ssDashFull);

      // Try navigating to profiles list
      try {
        await safeGoto(page, 'https://app.gologin.com/profiles', findings);
        await page.waitForTimeout(2000);
        const ssProfiles = await screenshotAndLog(page, '12_profiles_page', SCREENSHOT_DIR);
        screenshots.push(ssProfiles);
        log(findings, `Profiles page URL: ${page.url()}`);
      } catch (err) {
        log(findings, `Profiles page navigation: ${err.message}`);
      }

      // Try API docs
      try {
        await safeGoto(page, 'https://app.gologin.com/api', findings);
        await page.waitForTimeout(2000);
        const ssApi = await screenshotAndLog(page, '13_api_page', SCREENSHOT_DIR);
        screenshots.push(ssApi);
        log(findings, `API page URL: ${page.url()}`);
      } catch (err) {
        log(findings, `API page navigation: ${err.message}`);
      }
    } else {
      log(findings, 'NOT logged in — login likely blocked or credentials not available.');

      // Still document page structure
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 1000)).catch(() => '');
      log(findings, `Visible page text (first 1000 chars): ${pageText.replace(/\n/g, ' ')}`);
    }

  } catch (err) {
    log(findings, `FATAL ERROR: ${err.message}`);
    console.error(err);
    if (page) {
      const ssErr = await screenshotAndLog(page, 'ERROR_final', SCREENSHOT_DIR).catch(() => null);
      if (ssErr) screenshots.push(ssErr);
    }
  } finally {
    if (browser) await closeBrowser(browser);
  }

  // ── 8. Write GOLOGIN_NOTES.md ──────────────────────────────────────────────
  const notesContent = `# GoLogin Exploration Notes
Generated: ${new Date().toISOString()}

## Login Flow Observations
${findings.map((f) => `- ${f}`).join('\n')}

## Screenshots Taken
${screenshots.map((s) => `- ${s}`).join('\n')}

## Summary: What to Expect

### Login Methods Observed
- Check screenshots above for detailed login UI.
- Google/Gmail SSO is the primary path attempted.
- Email/password form also probed.

### Blocking Mechanisms
- Google OAuth may trigger CAPTCHA or 2FA challenge for headless browsers.
- reCAPTCHA is possible on email/password forms.
- Outlook/Gmail credentials for fresh headless sessions are typically flagged.

### Free Tier Capabilities (Expected)
- GoLogin free tier allows up to 3 browser profiles.
- Browser fingerprint customization per profile.
- Basic proxy configuration per profile.
- Cloud profile sync.

### API Availability
- GoLogin exposes a REST API (documented at https://help.gologin.com/en/articles/api).
- API token available from Account Settings > API Token.
- Endpoints: list profiles, create profile, start/stop profile, delete profile.
- npm package: \`gologin\` (official Node.js SDK).

### Next Steps
- If 2FA blocks: set up app password for Gmail, or use a fresh account created without 2FA.
- For automation: prefer the GoLogin REST API + \`gologin\` npm package over UI scraping.
- Profile creation via API avoids browser fingerprint detection.

### Useful URLs
- Dashboard: https://app.gologin.com/
- API docs: https://help.gologin.com/en/articles/api
- npm SDK: https://www.npmjs.com/package/gologin
`;

  fs.writeFileSync(NOTES_FILE, notesContent, 'utf8');
  console.log(`\n[gologin] Notes written to: ${NOTES_FILE}`);
  console.log(`[gologin] Screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log('[gologin] Exploration complete.');
})();
