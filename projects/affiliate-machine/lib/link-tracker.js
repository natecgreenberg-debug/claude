'use strict';

/**
 * UTM link generator for the affiliate machine.
 * Reads programs from ../programs.json and builds UTM-tagged affiliate URLs.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _programs = null;

/** Load programs.json once, cache for subsequent calls. */
function _loadPrograms() {
  if (_programs) return _programs;
  const filePath = path.resolve(__dirname, '..', 'programs.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  _programs = JSON.parse(raw);
  return _programs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a program by name (case-insensitive).
 * @param {string} name
 * @returns {object|null}
 */
function getProgram(name) {
  const programs = _loadPrograms();
  const lower = name.toLowerCase();
  return programs.find(p => p.name.toLowerCase() === lower) || null;
}

/**
 * Return all program names from programs.json.
 * @returns {string[]}
 */
function listPrograms() {
  return _loadPrograms().map(p => p.name);
}

/**
 * Generate a UTM-tagged affiliate URL for a single platform.
 *
 * UTM params applied:
 *   utm_source   = platform
 *   utm_medium   = affiliate
 *   utm_campaign = contentType
 *   utm_content  = campaignId
 *
 * Uses signup_url as the base URL until real affiliate links are available.
 *
 * @param {string} programName  - Must match a name in programs.json
 * @param {string} platform     - Traffic source (e.g. 'medium', 'reddit')
 * @param {string} contentType  - Content format / angle (e.g. 'comparison', 'review')
 * @param {string} campaignId   - Unique identifier for this piece of content
 * @returns {string} Full URL with UTM params
 * @throws {Error} If program is not found
 */
function generateLink(programName, platform, contentType, campaignId) {
  const program = getProgram(programName);
  if (!program) {
    throw new Error(`Program not found: "${programName}". Run listPrograms() to see available options.`);
  }

  const base = program.signup_url;
  const url = new URL(base);

  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', 'affiliate');
  url.searchParams.set('utm_campaign', contentType);
  url.searchParams.set('utm_content', campaignId);

  return url.toString();
}

/**
 * Generate UTM-tagged links for a program across multiple platforms.
 * campaignId is auto-generated as `{programSlug}-{contentType}-{index}`.
 *
 * @param {string}   programName  - Must match a name in programs.json
 * @param {string[]} platforms    - Array of platform names
 * @param {string}   contentType  - Content format / angle
 * @returns {Array<{platform: string, url: string}>}
 */
function generateBatchLinks(programName, platforms, contentType) {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    throw new Error('platforms must be a non-empty array');
  }

  const slug = programName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return platforms.map((platform, index) => {
    const campaignId = `${slug}-${contentType}-${index + 1}`;
    return {
      platform,
      url: generateLink(programName, platform, contentType, campaignId),
    };
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { generateLink, generateBatchLinks, getProgram, listPrograms };

// ---------------------------------------------------------------------------
// Self-test (run directly: node lib/link-tracker.js)
// ---------------------------------------------------------------------------

if (require.main === module) {
  console.log('=== UTM Link Tracker — Self-test ===\n');

  // 1. Single link
  console.log('1. Single link — Systeme.io on Medium (comparison):');
  const singleLink = generateLink('Systeme.io', 'medium', 'comparison', 'systemeio-comparison-001');
  console.log('  ', singleLink);

  // 2. Batch links
  console.log('\n2. Batch links — Systeme.io across [medium, linkedin, reddit]:');
  const batchLinks = generateBatchLinks('Systeme.io', ['medium', 'linkedin', 'reddit'], 'comparison');
  batchLinks.forEach(({ platform, url }) => {
    console.log(`  [${platform}]`, url);
  });

  // 3. List all programs
  console.log('\n3. All available programs:');
  listPrograms().forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });

  console.log('\nSelf-test complete.');
}
