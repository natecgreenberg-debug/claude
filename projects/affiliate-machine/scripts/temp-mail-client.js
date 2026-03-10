/**
 * temp-mail-client.js
 * Unified client for 3 free temporary email providers.
 *
 * Providers:
 *   - 1secmail  (1secmail.com)
 *   - guerrilla (guerrillamail.com)
 *   - mailtm    (mail.tm)
 *
 * Exports:
 *   getTempEmail(provider)                        → { address, meta }
 *   checkInbox(provider, address, meta)           → [ message, ... ]
 *   getMessage(provider, address, messageId, meta)→ { subject, from, body, ... }
 */

'use strict';

const TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    // Retry once after a short pause
    await new Promise(r => setTimeout(r, 1500));
    return fn();
  }
}

// ---------------------------------------------------------------------------
// 1secmail provider
// ---------------------------------------------------------------------------

const SECMAIL_BASE = 'https://www.1secmail.com/api/v1/';

async function secmail_getTempEmail() {
  const data = await withRetry(() =>
    fetchJSON(`${SECMAIL_BASE}?action=genRandomMailbox&count=1`)
  );
  const address = data[0];
  const [login, domain] = address.split('@');
  return { address, meta: { login, domain } };
}

async function secmail_checkInbox(address, meta) {
  const { login, domain } = meta ?? parseAddress(address);
  const messages = await withRetry(() =>
    fetchJSON(`${SECMAIL_BASE}?action=getMessages&login=${login}&domain=${domain}`)
  );
  return messages; // array of { id, from, subject, date }
}

async function secmail_getMessage(address, messageId, meta) {
  const { login, domain } = meta ?? parseAddress(address);
  return withRetry(() =>
    fetchJSON(
      `${SECMAIL_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${messageId}`
    )
  );
}

// ---------------------------------------------------------------------------
// Guerrilla Mail provider
// ---------------------------------------------------------------------------

const GUERRILLA_BASE = 'https://api.guerrillamail.com/ajax.php';

async function guerrilla_getTempEmail() {
  const data = await withRetry(() => fetchJSON(`${GUERRILLA_BASE}?f=get_email_address`));
  return {
    address: data.email_addr,
    meta: {
      sid_token: data.sid_token,
      seq: 0,
    },
  };
}

async function guerrilla_checkInbox(address, meta) {
  const sid = meta?.sid_token ?? '';
  const seq = meta?.seq ?? 0;
  const data = await withRetry(() =>
    fetchJSON(`${GUERRILLA_BASE}?f=check_email&seq=${seq}&sid_token=${sid}`)
  );
  // data.list is an array of message objects (may be undefined if empty)
  return data.list ?? [];
}

async function guerrilla_getMessage(address, messageId, meta) {
  const sid = meta?.sid_token ?? '';
  return withRetry(() =>
    fetchJSON(`${GUERRILLA_BASE}?f=fetch_email&email_id=${messageId}&sid_token=${sid}`)
  );
}

// ---------------------------------------------------------------------------
// mail.tm provider
// ---------------------------------------------------------------------------

const MAILTM_BASE = 'https://api.mail.tm';

function randomString(len = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function mailtm_getDomain() {
  const data = await withRetry(() => fetchJSON(`${MAILTM_BASE}/domains?page=1`));
  // Hydra collection — members in 'hydra:member'
  const members = data['hydra:member'] ?? data.member ?? [];
  if (!members.length) throw new Error('mail.tm: no domains available');
  return members[0].domain;
}

async function mailtm_getTempEmail() {
  const domain = await mailtm_getDomain();
  const local = randomString(10);
  const address = `${local}@${domain}`;
  const password = randomString(16);

  const account = await withRetry(() =>
    fetchJSON(`${MAILTM_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    })
  );

  // Obtain JWT token
  const tokenData = await withRetry(() =>
    fetchJSON(`${MAILTM_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    })
  );

  return {
    address,
    meta: {
      accountId: account.id,
      token: tokenData.token,
      password,
    },
  };
}

async function mailtm_checkInbox(address, meta) {
  const token = meta?.token;
  const data = await withRetry(() =>
    fetchJSON(`${MAILTM_BASE}/messages?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
  return data['hydra:member'] ?? data.member ?? [];
}

async function mailtm_getMessage(address, messageId, meta) {
  const token = meta?.token;
  return withRetry(() =>
    fetchJSON(`${MAILTM_BASE}/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAddress(address) {
  const [login, domain] = address.split('@');
  return { login, domain };
}

// ---------------------------------------------------------------------------
// Public API — provider-dispatched
// ---------------------------------------------------------------------------

const PROVIDERS = {
  '1secmail': {
    getTempEmail: secmail_getTempEmail,
    checkInbox: secmail_checkInbox,
    getMessage: secmail_getMessage,
  },
  guerrilla: {
    getTempEmail: guerrilla_getTempEmail,
    checkInbox: guerrilla_checkInbox,
    getMessage: guerrilla_getMessage,
  },
  mailtm: {
    getTempEmail: mailtm_getTempEmail,
    checkInbox: mailtm_checkInbox,
    getMessage: mailtm_getMessage,
  },
};

/**
 * Get a new temporary email address.
 * @param {string} provider - '1secmail' | 'guerrilla' | 'mailtm'
 * @returns {Promise<{ address: string, meta: object }>}
 */
export async function getTempEmail(provider) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}. Valid: ${Object.keys(PROVIDERS).join(', ')}`);
  return p.getTempEmail();
}

/**
 * Check inbox for new messages.
 * @param {string} provider
 * @param {string} address
 * @param {object} [meta] - Provider-specific session data returned by getTempEmail
 * @returns {Promise<Array>}
 */
export async function checkInbox(provider, address, meta) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);
  return p.checkInbox(address, meta);
}

/**
 * Fetch a specific message body.
 * @param {string} provider
 * @param {string} address
 * @param {string|number} messageId
 * @param {object} [meta]
 * @returns {Promise<object>}
 */
export async function getMessage(provider, address, messageId, meta) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);
  return p.getMessage(address, messageId, meta);
}

// ---------------------------------------------------------------------------
// Self-test (runs when executed directly)
// ---------------------------------------------------------------------------

async function selfTest() {
  console.log('=== Temp Mail Client — Self-Test ===\n');

  const results = {};

  for (const provider of Object.keys(PROVIDERS)) {
    console.log(`--- Testing provider: ${provider} ---`);
    const result = { provider, ok: false, address: null, inboxCount: null, error: null };

    try {
      // Step 1: get a temp address
      const { address, meta } = await getTempEmail(provider);
      result.address = address;
      console.log(`  Address: ${address}`);

      // Step 2: check inbox (expected empty, but must not throw)
      const inbox = await checkInbox(provider, address, meta);
      result.inboxCount = inbox.length;
      console.log(`  Inbox messages: ${inbox.length}`);

      result.ok = true;
      console.log(`  Status: PASS\n`);
    } catch (err) {
      result.error = err.message;
      console.log(`  Status: FAIL — ${err.message}\n`);
    }

    results[provider] = result;
  }

  // Summary
  console.log('=== Summary ===');
  let anyPass = false;
  for (const [prov, r] of Object.entries(results)) {
    const status = r.ok ? 'PASS' : 'FAIL';
    const detail = r.ok
      ? `address=${r.address}, inbox=${r.inboxCount} msgs`
      : `error=${r.error}`;
    console.log(`  ${prov}: ${status} (${detail})`);
    if (r.ok) anyPass = true;
  }

  console.log('');
  if (anyPass) {
    console.log('Result: OK — at least 1 provider is working.');
    process.exit(0);
  } else {
    console.log('Result: FAIL — no providers responded successfully.');
    process.exit(1);
  }
}

// Detect direct execution (works with ESM)
const isMain = process.argv[1] && (
  process.argv[1].endsWith('temp-mail-client.js') ||
  process.argv[1] === new URL(import.meta.url).pathname
);

if (isMain) {
  selfTest().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}
