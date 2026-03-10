/**
 * Environment config loader for the affiliate-machine project.
 *
 * Load order (later values override earlier ones):
 *   1. /root/projects/Agent/.env  — parent project env (holds the real keys)
 *   2. <project-root>/.env        — project-local overrides (optional)
 */

"use strict";

const path = require("path");
const dotenv = require("dotenv");

// Paths to .env files (load order matters — last wins on conflicts)
const PARENT_ENV = "/root/projects/Agent/.env";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PROJECT_ENV = path.join(PROJECT_ROOT, ".env");

let _loaded = false;

function _load() {
  if (_loaded) return;

  // Load parent .env first so project-local can override
  dotenv.config({ path: PARENT_ENV });
  dotenv.config({ path: PROJECT_ENV });

  _loaded = true;
}

/**
 * Returns all config values as a plain object.
 * Includes every key present in process.env after both .env files are loaded.
 * NOTE: This returns the live process.env snapshot — do not log the return value.
 *
 * @returns {Record<string, string | undefined>}
 */
function getConfig() {
  _load();
  return { ...process.env };
}

/**
 * Returns the value of a single config key.
 *
 * @param {string} name - The environment variable name
 * @returns {string | undefined}
 */
function getKey(name) {
  _load();
  return process.env[name];
}

// Named exports for the keys we explicitly depend on
function getOpenRouterApiKey() {
  return getKey("OPENROUTER_API_KEY");
}
function getGmailPrimary() {
  return getKey("GMAIL_PRIMARY");
}
function getGmailPrimaryPass() {
  return getKey("GMAIL_PRIMARY_PASS");
}

module.exports = {
  getConfig,
  getKey,
  OPENROUTER_API_KEY: getOpenRouterApiKey,
  GMAIL_PRIMARY: getGmailPrimary,
  GMAIL_PRIMARY_PASS: getGmailPrimaryPass,
};

// Self-test: run directly with `node lib/config.js`
if (require.main === module) {
  _load();
  const config = getConfig();
  const count = Object.keys(config).length;
  console.log(`Config loaded: ${count} keys available`);

  // Confirm our expected keys are present (values not printed)
  const expectedKeys = ["OPENROUTER_API_KEY", "GMAIL_PRIMARY", "GMAIL_PRIMARY_PASS"];
  const missing = expectedKeys.filter((k) => !config[k]);
  if (missing.length > 0) {
    console.warn(`Warning: missing expected keys: ${missing.join(", ")}`);
  } else {
    console.log(`Expected keys present: ${expectedKeys.join(", ")}`);
  }
}
