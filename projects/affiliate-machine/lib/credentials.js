'use strict';

/**
 * credentials.js — Credential tracker for the affiliate machine.
 *
 * Manages data/credentials.json, relative to this file's project root.
 * No external dependencies — uses only Node's built-in `fs` module.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '..', 'data', 'credentials.json');

/**
 * Read the credentials store from disk.
 * Returns an empty array if the file does not exist or is empty.
 * @returns {Array}
 */
function _read() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  if (!raw || raw === '') {
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse credentials.json: ${err.message}`);
  }
}

/**
 * Write the credentials array to disk.
 * @param {Array} accounts
 */
function _write(accounts) {
  // Ensure the data directory exists
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

/**
 * Add a new account entry.
 * If an account with the same platform + email already exists, it is overwritten.
 *
 * @param {string} platform   - e.g. "clickbank", "amazon", "gologin"
 * @param {string} email      - Login email for the account
 * @param {string} password   - Login password
 * @param {Object} [metadata] - Any extra fields (proxy, profileId, notes, etc.)
 * @returns {Object} The newly created account record
 */
function addAccount(platform, email, password, metadata = {}) {
  if (!platform || !email || !password) {
    throw new Error('addAccount requires platform, email, and password.');
  }

  const accounts = _read();
  const existingIdx = accounts.findIndex(
    (a) => a.platform === platform && a.email === email
  );

  const record = {
    platform,
    email,
    password,
    status: 'active',
    createdAt: new Date().toISOString(),
    ...metadata,
  };

  if (existingIdx !== -1) {
    // Preserve createdAt from original record if overwriting
    record.createdAt = accounts[existingIdx].createdAt;
    record.updatedAt = new Date().toISOString();
    accounts[existingIdx] = record;
  } else {
    accounts.push(record);
  }

  _write(accounts);
  return record;
}

/**
 * Retrieve all accounts for a given platform.
 *
 * @param {string} platform
 * @returns {Array} Matching account records
 */
function getAccounts(platform) {
  if (!platform) {
    throw new Error('getAccounts requires a platform argument.');
  }
  const accounts = _read();
  return accounts.filter((a) => a.platform === platform);
}

/**
 * Update the status field of a specific account.
 * Common statuses: "active", "banned", "suspended", "needs_review"
 *
 * @param {string} platform
 * @param {string} email
 * @param {string} newStatus
 * @returns {Object|null} The updated record, or null if not found
 */
function updateStatus(platform, email, newStatus) {
  if (!platform || !email || !newStatus) {
    throw new Error('updateStatus requires platform, email, and newStatus.');
  }

  const accounts = _read();
  const idx = accounts.findIndex(
    (a) => a.platform === platform && a.email === email
  );

  if (idx === -1) {
    return null;
  }

  accounts[idx].status = newStatus;
  accounts[idx].updatedAt = new Date().toISOString();
  _write(accounts);
  return accounts[idx];
}

/**
 * List all accounts across all platforms.
 *
 * @returns {Array} All account records
 */
function listAll() {
  return _read();
}

module.exports = { addAccount, getAccounts, updateStatus, listAll };

// ---------------------------------------------------------------------------
// Self-test — runs when executed directly: `node lib/credentials.js`
// ---------------------------------------------------------------------------
if (require.main === module) {
  const assert = require('assert');
  const ORIGINAL = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : null;

  console.log('Running credentials.js self-test...\n');

  try {
    // Start from a clean state for the test
    _write([]);

    // 1. Add a test account
    console.log('1. addAccount("clickbank", "test@example.com", "s3cr3t", { notes: "test run" })');
    const added = addAccount('clickbank', 'test@example.com', 's3cr3t', { notes: 'test run' });
    assert.strictEqual(added.platform, 'clickbank');
    assert.strictEqual(added.email, 'test@example.com');
    assert.strictEqual(added.status, 'active');
    assert.strictEqual(added.notes, 'test run');
    console.log('   OK —', JSON.stringify(added));

    // 2. Add a second account on a different platform
    console.log('\n2. addAccount("amazon", "amazon@example.com", "amzp4ss")');
    addAccount('amazon', 'amazon@example.com', 'amzp4ss');

    // 3. Retrieve accounts for clickbank
    console.log('\n3. getAccounts("clickbank")');
    const cb = getAccounts('clickbank');
    assert.strictEqual(cb.length, 1);
    assert.strictEqual(cb[0].email, 'test@example.com');
    console.log('   OK — found', cb.length, 'account(s)');

    // 4. Update status
    console.log('\n4. updateStatus("clickbank", "test@example.com", "banned")');
    const updated = updateStatus('clickbank', 'test@example.com', 'banned');
    assert.ok(updated, 'updateStatus should return the updated record');
    assert.strictEqual(updated.status, 'banned');
    console.log('   OK — status is now:', updated.status);

    // 5. List all
    console.log('\n5. listAll()');
    const all = listAll();
    assert.strictEqual(all.length, 2);
    console.log('   OK — total accounts:', all.length);
    all.forEach((a) => console.log('   ', a.platform, '|', a.email, '|', a.status));

    // 6. Null return for missing account
    console.log('\n6. updateStatus for non-existent account returns null');
    const missing = updateStatus('clickbank', 'nobody@example.com', 'active');
    assert.strictEqual(missing, null);
    console.log('   OK — returned null');

    console.log('\nAll tests passed.');
  } finally {
    // Restore original file state
    if (ORIGINAL === null) {
      // File did not exist before — write back an empty array
      _write([]);
    } else {
      fs.writeFileSync(DATA_FILE, ORIGINAL, 'utf8');
    }
  }
}
