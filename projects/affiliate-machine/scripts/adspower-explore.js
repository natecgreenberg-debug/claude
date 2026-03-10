'use strict';

/**
 * AdsPower Web Dashboard Explorer
 *
 * Navigates to app.adspower.com, attempts login via Google/Gmail,
 * and documents the login flow, blocking mechanisms, free tier
 * capabilities, and API availability.
 *
 * Findings are written to: ../ADSPOWER_NOTES.md
 * Screenshots are saved to: ../data/screenshots/adspower/
 */

const path = require('path');
const fs = require('fs');

const { launchBrowser, screenshotAndLog, waitAndClick, fillField, closeBrowser } = require('../lib/browser.js');
const { getKey } = require('../lib/config.js');

const SCREENSHOT_DIR = path.resolve(__dirname, '../data/screenshots/adspower');
const NOTES_FILE = path.resolve(__dirname, '../ADSPOWER_NOTES.md');
const NAV_TIMEOUT = 60_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function shot(page, name) {
  return screenshotAndLog(page, name, SCREENSHOT_DIR);
}

/**
 * Check whether a selector exists on the page without throwing.
 */
async function exists(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Navigate with a 60-second hard cap and domcontentloaded wait.
 */
async function navigate(page, url) {
  log(`Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  // Additional brief wait for JS-heavy SPAs to settle
  await page.waitForTimeout(2000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const gmailUser = getKey('GMAIL_PRIMARY');
  const gmailPass = getKey('GMAIL_PRIMARY_PASS');

  if (!gmailUser || !gmailPass) {
    log('ERROR: GMAIL_PRIMARY or GMAIL_PRIMARY_PASS not set in config. Aborting.');
    process.exit(1);
  }

  const findings = {
    url: 'https://app.adspower.com',
    loginFlowSteps: [],
    blockingMechanisms: [],
    freeTierCapabilities: [],
    apiAvailability: 'Unknown',
    screenshots: [],
    dashboardSections: [],
    loginOutcome: 'unknown',
    rawNotes: [],
  };

  function note(msg) {
    log(msg);
    findings.rawNotes.push(msg);
  }

  const { browser, page } = await launchBrowser({ headless: true });

  try {
    // ── Step 1: Navigate to AdsPower ──────────────────────────────────────────
    note('Step 1: Navigating to app.adspower.com');
    try {
      await navigate(page, 'https://app.adspower.com');
    } catch (err) {
      note(`Navigation to app.adspower.com failed: ${err.message} — trying adspower.com`);
      await navigate(page, 'https://www.adspower.com');
    }

    const titleAfterLand = await page.title();
    note(`Landing page title: "${titleAfterLand}"`);
    findings.loginFlowSteps.push(`Landed on: ${page.url()} — title: "${titleAfterLand}"`);

    // ── Step 2: Screenshot login page ─────────────────────────────────────────
    note('Step 2: Screenshotting login/landing page');
    const shotLanding = await shot(page, '01_landing');
    findings.screenshots.push(shotLanding);

    // Check current URL — may have redirected to login page already
    const landingUrl = page.url();
    note(`Current URL after landing: ${landingUrl}`);

    // If we landed somewhere other than the login page, try to find a login link
    const loginLinkSelectors = [
      'a[href*="login"]',
      'a[href*="signin"]',
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
      'a:has-text("Log in")',
      'a:has-text("Sign in")',
      'a:has-text("Login")',
    ];

    let navigatedToLogin = false;
    if (!landingUrl.includes('login') && !landingUrl.includes('signin')) {
      note('Not yet on login page — searching for login link');
      for (const sel of loginLinkSelectors) {
        if (await exists(page, sel, 3000)) {
          note(`Found login link with selector: ${sel}`);
          try {
            await waitAndClick(page, sel);
            await page.waitForTimeout(2000);
            navigatedToLogin = true;
            break;
          } catch (err) {
            note(`Click on "${sel}" failed: ${err.message}`);
          }
        }
      }
      if (!navigatedToLogin) {
        note('Could not find login link — attempting direct navigation to /login');
        try {
          await navigate(page, 'https://app.adspower.com/login');
        } catch (err) {
          note(`Direct /login navigation failed: ${err.message}`);
        }
      }
    } else {
      note('Already on login page');
    }

    const loginUrl = page.url();
    note(`Login page URL: ${loginUrl}`);
    findings.loginFlowSteps.push(`Login page URL: ${loginUrl}`);

    const shotLogin = await shot(page, '02_login_page');
    findings.screenshots.push(shotLogin);

    // ── Step 3: Look for Google/Gmail login ───────────────────────────────────
    note('Step 3: Looking for Google/Gmail login option');

    const googleSelectors = [
      'button:has-text("Google")',
      'a:has-text("Google")',
      '[class*="google"]',
      '[id*="google"]',
      'button:has-text("Sign in with Google")',
      'a:has-text("Sign in with Google")',
      'button:has-text("Continue with Google")',
      'a:has-text("Continue with Google")',
      '[data-provider="google"]',
      'button[aria-label*="Google"]',
      'img[alt*="Google"]',
      '.google-login',
      '.login-google',
    ];

    let googleLoginFound = false;
    let googleSelector = null;

    for (const sel of googleSelectors) {
      if (await exists(page, sel, 2000)) {
        googleLoginFound = true;
        googleSelector = sel;
        note(`Found Google login option: "${sel}"`);
        break;
      }
    }

    if (!googleLoginFound) {
      note('No Google login button found — inspecting page text for hints');
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
      note(`Page text snippet: ${pageText.replace(/\n+/g, ' ').slice(0, 500)}`);
      findings.loginFlowSteps.push('Google login option: NOT FOUND');
    } else {
      findings.loginFlowSteps.push(`Google login option: FOUND (selector: ${googleSelector})`);
    }

    // ── Step 4: Attempt login ─────────────────────────────────────────────────
    note('Step 4: Attempting login');

    if (googleLoginFound && googleSelector) {
      // ── 4a: Google OAuth flow ──────────────────────────────────────────────
      note('Attempting Google OAuth login');
      findings.loginFlowSteps.push('Attempting: Google OAuth button click');

      try {
        // Intercept popup if Google opens a popup window
        const [popup] = await Promise.all([
          page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null),
          page.click(googleSelector),
        ]);

        await page.waitForTimeout(2000);
        const shotAfterGoogle = await shot(page, '03_after_google_click');
        findings.screenshots.push(shotAfterGoogle);

        const targetPage = popup || page;
        const oauthUrl = targetPage.url();
        note(`OAuth URL: ${oauthUrl}`);
        findings.loginFlowSteps.push(`OAuth redirect URL: ${oauthUrl}`);

        if (oauthUrl.includes('accounts.google.com')) {
          note('Redirected to Google accounts — filling credentials');
          findings.loginFlowSteps.push('Google accounts page reached');

          // Fill email
          const emailSelectors = ['input[type="email"]', '#identifierId', 'input[name="identifier"]'];
          let emailFilled = false;
          for (const sel of emailSelectors) {
            if (await exists(targetPage, sel, 5000)) {
              await fillField(targetPage, sel, gmailUser);
              emailFilled = true;
              note(`Filled email with selector: ${sel}`);
              break;
            }
          }

          if (emailFilled) {
            const shotEmail = await shot(targetPage, '04_google_email_filled');
            findings.screenshots.push(shotEmail);

            // Click Next
            const nextSelectors = ['#identifierNext', 'button:has-text("Next")', '[data-primary-action-label="Next"]'];
            for (const sel of nextSelectors) {
              if (await exists(targetPage, sel, 3000)) {
                await waitAndClick(targetPage, sel);
                note(`Clicked Next with: ${sel}`);
                break;
              }
            }

            await targetPage.waitForTimeout(3000);
            const shotAfterEmail = await shot(targetPage, '05_after_email_next');
            findings.screenshots.push(shotAfterEmail);

            // Fill password
            const passSelectors = ['input[type="password"]', 'input[name="password"]', '#password'];
            let passFilled = false;
            for (const sel of passSelectors) {
              if (await exists(targetPage, sel, 8000)) {
                await fillField(targetPage, sel, gmailPass);
                passFilled = true;
                note(`Filled password with selector: ${sel}`);
                break;
              }
            }

            if (passFilled) {
              const shotPass = await shot(targetPage, '06_google_pass_filled');
              findings.screenshots.push(shotPass);

              // Click Next/Sign in
              const signInSelectors = ['#passwordNext', 'button:has-text("Next")', 'button:has-text("Sign in")'];
              for (const sel of signInSelectors) {
                if (await exists(targetPage, sel, 3000)) {
                  await waitAndClick(targetPage, sel);
                  note(`Clicked sign-in with: ${sel}`);
                  break;
                }
              }

              await targetPage.waitForTimeout(4000);
              const shotSignIn = await shot(targetPage, '07_after_signin');
              findings.screenshots.push(shotSignIn);

              const postSignInUrl = targetPage.url();
              note(`URL after sign-in attempt: ${postSignInUrl}`);

              // Check for blockers
              const blockerSelectors = [
                '[class*="captcha"]',
                '[id*="captcha"]',
                'iframe[src*="recaptcha"]',
                '[class*="2fa"]',
                '[class*="two-factor"]',
                '[class*="verify"]',
                'input[name="totpPin"]',
                '[class*="challenge"]',
              ];

              for (const bSel of blockerSelectors) {
                if (await exists(targetPage, bSel, 2000)) {
                  const blocker = `Blocker detected: ${bSel}`;
                  note(blocker);
                  findings.blockingMechanisms.push(blocker);
                }
              }

              // Determine if we made it back to AdsPower
              if (postSignInUrl.includes('adspower.com') && !postSignInUrl.includes('login')) {
                note('Login appears successful — now on AdsPower dashboard');
                findings.loginOutcome = 'success_google_oauth';
              } else if (postSignInUrl.includes('accounts.google.com')) {
                note('Still on Google — likely blocked by 2FA or account challenge');
                findings.loginOutcome = 'blocked_google_challenge';
                findings.blockingMechanisms.push('Google account challenge / 2FA required');
              } else {
                note(`Post-signin URL unclear: ${postSignInUrl}`);
                findings.loginOutcome = 'unknown_post_signin';
              }
            } else {
              note('Could not find password field — likely 2FA or challenge screen');
              findings.loginOutcome = 'blocked_no_password_field';
              findings.blockingMechanisms.push('No password field appeared after email (2FA or challenge)');
            }
          } else {
            note('Could not fill email — Google form structure unexpected');
            findings.loginOutcome = 'failed_no_email_field';
          }
        } else if (oauthUrl.includes('adspower.com')) {
          note('Google OAuth succeeded and returned to AdsPower without further prompts');
          findings.loginOutcome = 'success_google_oauth_seamless';
        } else {
          note(`Unexpected OAuth destination: ${oauthUrl}`);
          findings.loginOutcome = 'unknown_oauth_destination';
          findings.blockingMechanisms.push(`Unexpected OAuth URL: ${oauthUrl}`);
        }
      } catch (err) {
        note(`Google OAuth flow error: ${err.message}`);
        findings.loginOutcome = 'error_google_oauth';
        findings.blockingMechanisms.push(`Google OAuth flow error: ${err.message}`);
        await shot(page, '03_error_google_oauth').then(p => findings.screenshots.push(p)).catch(() => {});
      }
    } else {
      // ── 4b: Email/password fallback ────────────────────────────────────────
      note('No Google login found — attempting email/password login');
      findings.loginFlowSteps.push('Attempting: email/password form login');

      // AdsPower email field is a type="text" with el-input__inner class
      const emailSelectors = [
        'input.el-input__inner[type="text"]',
        'input[placeholder*="email address" i]',
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        '#email',
        'input[type="text"][name*="user"]',
      ];

      let emailField = null;
      for (const sel of emailSelectors) {
        if (await exists(page, sel, 3000)) {
          emailField = sel;
          break;
        }
      }

      if (emailField) {
        note(`Found email field: ${emailField}`);
        await fillField(page, emailField, gmailUser);

        // AdsPower uses el-input__inner for the visible password field;
        // there is also a hidden input[name="password"] that is not interactable
        const passSelectors = [
          'input[type="password"].el-input__inner',
          'input[placeholder*="password" i]',
          'input[placeholder*="Password" i]',
          '.el-input__inner[type="password"]',
          'input[type="password"]:not([class*="hidden"])',
        ];

        let passField = null;
        for (const sel of passSelectors) {
          if (await exists(page, sel, 3000)) {
            passField = sel;
            break;
          }
        }

        if (passField) {
          await fillField(page, passField, gmailPass);
          const shotFormFilled = await shot(page, '03_form_filled');
          findings.screenshots.push(shotFormFilled);

          // Submit
          const submitSelectors = [
            'button[type="submit"]',
            'button:has-text("Log in")',
            'button:has-text("Sign in")',
            'button:has-text("Login")',
            'input[type="submit"]',
          ];

          for (const sel of submitSelectors) {
            if (await exists(page, sel, 3000)) {
              await waitAndClick(page, sel);
              note(`Submitted form with: ${sel}`);
              break;
            }
          }

          await page.waitForTimeout(4000);
          const shotSubmit = await shot(page, '04_after_submit');
          findings.screenshots.push(shotSubmit);

          const postUrl = page.url();
          note(`URL after email/pass submit: ${postUrl}`);

          if (postUrl.includes('adspower.com') && !postUrl.includes('login')) {
            findings.loginOutcome = 'success_email_pass';
          } else {
            findings.loginOutcome = 'failed_email_pass';

            // Check for CAPTCHA
            const captchaPresent = await exists(page, 'iframe[src*="recaptcha"]', 2000)
              || await exists(page, '[class*="captcha"]', 2000)
              || await exists(page, '[id*="captcha"]', 2000);
            if (captchaPresent) {
              findings.blockingMechanisms.push('CAPTCHA detected on email/pass submit');
              note('CAPTCHA detected');
            }

            const errorText = await page.evaluate(() => {
              const errEl = document.querySelector('[class*="error"], [class*="alert"], [role="alert"]');
              return errEl ? errEl.innerText : null;
            });
            if (errorText) {
              note(`Login error text: ${errorText}`);
              findings.blockingMechanisms.push(`Login error: ${errorText}`);
            }
          }
        } else {
          note('Password field not found after email field');
          findings.loginOutcome = 'failed_no_pass_field';
        }
      } else {
        note('No email field found on login page — may require different approach');
        findings.loginOutcome = 'failed_no_form_found';

        const pageHtml = await page.content();
        const snippet = pageHtml.slice(0, 3000);
        note(`HTML snippet (first 3000 chars): ${snippet}`);
      }
    }

    // ── Step 5: Dashboard exploration (if logged in) ──────────────────────────
    const currentUrl = page.url();
    const onDashboard = findings.loginOutcome.startsWith('success')
      || (currentUrl.includes('adspower.com') && !currentUrl.includes('login'));

    if (onDashboard) {
      note('Step 5: Exploring dashboard');
      findings.loginFlowSteps.push('Dashboard reached — starting exploration');

      const shotDash = await shot(page, '08_dashboard_overview');
      findings.screenshots.push(shotDash);

      // Check for profile creation
      const profileSelectors = [
        'button:has-text("New Profile")',
        'button:has-text("Create Profile")',
        'button:has-text("Add Profile")',
        '[class*="create-profile"]',
        'a:has-text("Profile")',
      ];
      for (const sel of profileSelectors) {
        if (await exists(page, sel, 3000)) {
          findings.freeTierCapabilities.push(`Profile creation button found: ${sel}`);
          note(`Profile button: ${sel}`);
          break;
        }
      }

      // Check for proxy settings
      const proxySelectors = [
        'a:has-text("Proxy")',
        '[class*="proxy"]',
        'a[href*="proxy"]',
        'button:has-text("Proxy")',
      ];
      for (const sel of proxySelectors) {
        if (await exists(page, sel, 3000)) {
          findings.freeTierCapabilities.push(`Proxy settings found: ${sel}`);
          note(`Proxy element: ${sel}`);
          break;
        }
      }

      // Check for API docs link
      const apiSelectors = [
        'a:has-text("API")',
        'a[href*="api"]',
        '[class*="api"]',
        'a:has-text("Developer")',
      ];
      for (const sel of apiSelectors) {
        if (await exists(page, sel, 3000)) {
          findings.apiAvailability = `API link found: ${sel}`;
          note(`API element: ${sel}`);
          break;
        }
      }

      // Collect nav/sidebar links
      const navItems = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('nav a, aside a, .sidebar a, [class*="menu"] a'));
        return links.map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text);
      });

      if (navItems.length > 0) {
        findings.dashboardSections = navItems.map(l => `${l.text} → ${l.href}`);
        note(`Found ${navItems.length} nav links`);
      }

      // Screenshot any visible plan/limit info
      const planText = await page.evaluate(() => {
        const el = document.querySelector('[class*="plan"], [class*="tier"], [class*="quota"], [class*="limit"]');
        return el ? el.innerText.trim() : null;
      });
      if (planText) {
        findings.freeTierCapabilities.push(`Plan/quota text: ${planText}`);
        note(`Plan text: ${planText}`);
      }

      const shotDash2 = await shot(page, '09_dashboard_detail');
      findings.screenshots.push(shotDash2);
    } else {
      note('Step 5: Skipped — not on dashboard (login did not succeed)');
      const shotFinal = await shot(page, '08_final_state');
      findings.screenshots.push(shotFinal);
    }

  } catch (err) {
    log(`FATAL ERROR: ${err.message}`);
    findings.rawNotes.push(`FATAL ERROR: ${err.message}`);
    findings.blockingMechanisms.push(`Script error: ${err.message}`);
    try {
      const shotErr = await shot(page, '99_fatal_error');
      findings.screenshots.push(shotErr);
    } catch { /* ignore screenshot failure */ }
  } finally {
    await closeBrowser(browser);
  }

  // ── Write findings to ADSPOWER_NOTES.md ───────────────────────────────────
  writeNotes(findings);
  log(`Findings written to: ${NOTES_FILE}`);
}

function writeNotes(f) {
  const now = new Date().toISOString();

  const screenshotList = f.screenshots.length > 0
    ? f.screenshots.map(p => `- \`${p}\``).join('\n')
    : '- None captured';

  const loginSteps = f.loginFlowSteps.length > 0
    ? f.loginFlowSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : 'No login steps recorded.';

  const blockers = f.blockingMechanisms.length > 0
    ? f.blockingMechanisms.map(b => `- ${b}`).join('\n')
    : '- None detected';

  const freeTier = f.freeTierCapabilities.length > 0
    ? f.freeTierCapabilities.map(c => `- ${c}`).join('\n')
    : '- Not observed (login may not have succeeded)';

  const dashSections = f.dashboardSections.length > 0
    ? f.dashboardSections.map(s => `- ${s}`).join('\n')
    : '- Not observed';

  const rawNotes = f.rawNotes.map(n => `- ${n}`).join('\n');

  const content = `# AdsPower Web Dashboard Exploration Notes

**Run date**: ${now}
**Script**: \`scripts/adspower-explore.js\`
**Login outcome**: \`${f.loginOutcome}\`

---

## Login Flow

${loginSteps}

## Blocking Mechanisms

${blockers}

## Free Tier Capabilities Observed

${freeTier}

## Dashboard Sections / Nav Links

${dashSections}

## API Availability

${f.apiAvailability}

## Screenshots Taken

${screenshotList}

---

## Raw Run Log

${rawNotes}
`;

  fs.writeFileSync(NOTES_FILE, content, 'utf8');
}

// ─── Entry point ──────────────────────────────────────────────────────────────
main().catch(err => {
  console.error('[UNHANDLED]', err.message);
  process.exit(1);
});
