'use strict';

/**
 * Playwright browser helper functions for the affiliate machine project.
 * All functions include 60-second overall timeout protection.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DEFAULT_TIMEOUT = 60_000; // 60 seconds
const DEFAULT_SCREENSHOT_DIR = 'data/screenshots';

/**
 * Launch a Chromium browser and return browser + page objects.
 * @param {object} options
 * @param {boolean} [options.headless=true] - Run browser in headless mode
 * @param {number}  [options.slowMo]        - Slow down Playwright operations by given ms
 * @param {object}  [options.proxy]         - Playwright proxy config { server, username, password }
 * @returns {Promise<{ browser: import('playwright').Browser, page: import('playwright').Page }>}
 */
async function launchBrowser(options = {}) {
  const { headless = true, slowMo, proxy } = options;

  const launchOptions = {
    headless,
    timeout: DEFAULT_TIMEOUT,
  };

  if (slowMo !== undefined) launchOptions.slowMo = slowMo;
  if (proxy !== undefined) launchOptions.proxy = proxy;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    // Reasonable viewport
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Apply 60-second default navigation timeout
  page.setDefaultTimeout(DEFAULT_TIMEOUT);
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT);

  return { browser, page };
}

/**
 * Take a screenshot and save it with a timestamp suffix.
 * @param {import('playwright').Page} page
 * @param {string} name - Base name for the screenshot file (no extension)
 * @param {string} [dir='data/screenshots'] - Directory to save the screenshot
 * @returns {Promise<string>} - Resolved file path
 */
async function screenshotAndLog(page, name, dir = DEFAULT_SCREENSHOT_DIR) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}_${timestamp}.png`;
  const filepath = path.resolve(dir, filename);

  // Ensure directory exists
  fs.mkdirSync(path.resolve(dir), { recursive: true });

  await Promise.race([
    page.screenshot({ path: filepath, fullPage: false, type: 'png' }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('screenshotAndLog: 60s timeout exceeded')), DEFAULT_TIMEOUT)
    ),
  ]);

  console.log(`[screenshot] Saved: ${filepath}`);
  return filepath;
}

/**
 * Wait for a selector to appear and click it.
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS or text selector
 * @param {number} [timeout=30000] - Wait timeout in ms (capped at 60s)
 * @returns {Promise<void>}
 */
async function waitAndClick(page, selector, timeout = 30_000) {
  const effectiveTimeout = Math.min(timeout, DEFAULT_TIMEOUT);

  await Promise.race([
    (async () => {
      await page.waitForSelector(selector, { timeout: effectiveTimeout });
      await page.click(selector);
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`waitAndClick: 60s timeout exceeded for "${selector}"`)), DEFAULT_TIMEOUT)
    ),
  ]);
}

/**
 * Wait for a selector to appear and fill it with a value.
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS or text selector
 * @param {string} value    - Value to fill into the field
 * @returns {Promise<void>}
 */
async function fillField(page, selector, value) {
  await Promise.race([
    (async () => {
      await page.waitForSelector(selector, { timeout: DEFAULT_TIMEOUT });
      await page.fill(selector, value);
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`fillField: 60s timeout exceeded for "${selector}"`)), DEFAULT_TIMEOUT)
    ),
  ]);
}

/**
 * Gracefully close the browser.
 * @param {import('playwright').Browser} browser
 * @returns {Promise<void>}
 */
async function closeBrowser(browser) {
  try {
    await Promise.race([
      browser.close(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('closeBrowser: 60s timeout exceeded')), DEFAULT_TIMEOUT)
      ),
    ]);
    console.log('[browser] Browser closed.');
  } catch (err) {
    console.error(`[browser] Error closing browser: ${err.message}`);
  }
}

module.exports = {
  launchBrowser,
  screenshotAndLog,
  waitAndClick,
  fillField,
  closeBrowser,
};

// ─── Self-test (run directly) ────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    console.log('[self-test] Starting browser helpers self-test...');

    let browser;
    let page;
    try {
      // 1. Launch headless browser
      ({ browser, page } = await launchBrowser({ headless: true }));
      console.log('[self-test] Browser launched.');

      // 2. Navigate to example.com
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      console.log('[self-test] Navigated to https://example.com');

      // 3. Take screenshot to data/screenshots/test/
      await screenshotAndLog(page, 'self-test', 'data/screenshots/test');

      // 4. Log page title
      const title = await page.title();
      console.log(`[self-test] Page title: "${title}"`);

      // 5. Close browser
      await closeBrowser(browser);
      browser = null;

      // 6. All done
      console.log('Browser helpers: all tests passed');
    } catch (err) {
      console.error('[self-test] FAILED:', err.message);
      if (browser) await closeBrowser(browser);
      process.exit(1);
    }
  })();
}
