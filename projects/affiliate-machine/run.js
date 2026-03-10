'use strict';

/**
 * run.js — Master CLI runner for the affiliate machine.
 *
 * Usage:
 *   node run.js status              Show system status overview
 *   node run.js programs            List all affiliate programs
 *   node run.js generate --dry-run  Preview content generation plan
 *   node run.js generate --live     Generate one article (first pending keyword)
 *   node run.js signup --dry-run <platform>  Run signup script for a platform
 *   node run.js help                Show available commands
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load and parse a JSON file. Returns null if file doesn't exist.
 * @param {string} filePath
 * @returns {unknown|null}
 */
function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Run a child script synchronously, inheriting stdio.
 * @param {string} cmd
 */
function runScript(cmd) {
  try {
    execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  } catch (err) {
    // execSync throws on non-zero exit — the child already printed its output
    process.exit(err.status || 1);
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdStatus() {
  console.log('\n=== Affiliate Machine — Status ===\n');

  // Credentials
  const creds = loadJson(path.join(PROJECT_ROOT, 'data', 'credentials.json'));
  if (creds && Array.isArray(creds)) {
    const byPlatform = {};
    for (const c of creds) {
      const p = c.platform || 'unknown';
      byPlatform[p] = (byPlatform[p] || 0) + 1;
    }
    console.log(`Credentials: ${creds.length} total`);
    for (const [platform, count] of Object.entries(byPlatform)) {
      console.log(`  ${platform}: ${count}`);
    }
  } else {
    console.log('Credentials: 0 (no credentials.json or empty)');
  }

  console.log('');

  // Content files
  const contentDir = path.join(PROJECT_ROOT, 'content');
  let contentCount = 0;
  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
    contentCount = files.length;
  }
  console.log(`Content files: ${contentCount}`);

  // Programs
  const programs = loadJson(path.join(PROJECT_ROOT, 'programs.json'));
  if (programs && Array.isArray(programs)) {
    const active = programs.filter(p => p.status === 'active').length;
    const withLink = programs.filter(p => p.affiliate_link && p.affiliate_link.length > 0).length;
    console.log(`Programs: ${programs.length} total, ${active} active, ${withLink} with affiliate links`);
  } else {
    console.log('Programs: 0 (no programs.json)');
  }

  // Keywords
  const keywords = loadJson(path.join(PROJECT_ROOT, 'keywords.json'));
  if (keywords && Array.isArray(keywords)) {
    const notStarted = keywords.filter(k => k.status === 'not_started').length;
    console.log(`Keywords: ${keywords.length} total, ${notStarted} not started`);
  } else {
    console.log('Keywords: 0 (no keywords.json)');
  }

  // Templates
  const templatesDir = path.join(PROJECT_ROOT, 'templates');
  let templateCount = 0;
  if (fs.existsSync(templatesDir)) {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    templateCount = files.length;
  }
  console.log(`Templates: ${templateCount}`);

  console.log('');
}

function cmdPrograms() {
  console.log('\n=== Affiliate Programs ===\n');

  const programs = loadJson(path.join(PROJECT_ROOT, 'programs.json'));
  if (!programs || !Array.isArray(programs) || programs.length === 0) {
    console.log('No programs found in programs.json.');
    return;
  }

  // Column widths
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);

  const header =
    pad('#', 4) +
    pad('Name', 20) +
    pad('Status', 16) +
    pad('Commission', 14) +
    pad('Recurring', 12) +
    pad('Tier', 6) +
    pad('Score', 7) +
    'Affiliate Link';

  const divider = '-'.repeat(header.length + 10);

  console.log(header);
  console.log(divider);

  programs.forEach((p, i) => {
    const commission = p.commission_pct > 0
      ? `${p.commission_pct}%`
      : (p.commission_flat ? `$${p.commission_flat} flat` : 'N/A');

    const hasLink = p.affiliate_link && p.affiliate_link.length > 0 ? 'YES' : 'no';

    const row =
      pad(i + 1, 4) +
      pad(p.name, 20) +
      pad(p.status, 16) +
      pad(commission, 14) +
      pad(p.recurring, 12) +
      pad(p.tier, 6) +
      pad(p.priority_score, 7) +
      hasLink;

    console.log(row);
  });

  console.log(divider);
  console.log(`\n${programs.length} programs total.\n`);
}

function cmdGenerate(args) {
  const mode = args.includes('--live') ? '--live' : '';
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'generate-content-batch.js');

  if (!fs.existsSync(scriptPath)) {
    console.error('Error: scripts/generate-content-batch.js not found.');
    process.exit(1);
  }

  runScript(`node "${scriptPath}" ${mode}`);
}

function cmdSignup(args) {
  const dryRun = args.includes('--dry-run');
  const platform = args.filter(a => !a.startsWith('--'))[0];

  if (!platform) {
    console.error('Error: please specify a platform. Usage: node run.js signup --dry-run <platform>');
    process.exit(1);
  }

  const signupRunnerPath = path.join(PROJECT_ROOT, 'scripts', 'signup-runner.js');
  if (!fs.existsSync(signupRunnerPath)) {
    console.log('signup-runner not yet available');
    console.log('');
    console.log('Available individual signup scripts:');

    const scriptsDir = path.join(PROJECT_ROOT, 'scripts');
    const signupScripts = fs.readdirSync(scriptsDir).filter(f => f.startsWith('signup-'));
    if (signupScripts.length > 0) {
      signupScripts.forEach(s => console.log(`  node scripts/${s}`));
    } else {
      console.log('  (none found)');
    }
    return;
  }

  const dryFlag = dryRun ? '--dry-run' : '';
  runScript(`node "${signupRunnerPath}" ${dryFlag} ${platform}`);
}

function cmdHelp() {
  console.log(`
=== Affiliate Machine CLI ===

Usage: node run.js <command> [options]

Commands:
  status                       Show system status (credentials, content, programs, templates)
  programs                     List all affiliate programs with status and link info
  generate --dry-run           Preview what content would be generated from keywords.json
  generate --live              Generate one article for the first pending keyword
  signup --dry-run <platform>  Run signup script for a platform (proxies to signup-runner.js)
  help                         Show this help message

Examples:
  node run.js status
  node run.js programs
  node run.js generate --dry-run
  node run.js generate --live
  node run.js signup --dry-run systemeio
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'status':
    cmdStatus();
    break;
  case 'programs':
    cmdPrograms();
    break;
  case 'generate':
    cmdGenerate(args.slice(1));
    break;
  case 'signup':
    cmdSignup(args.slice(1));
    break;
  case 'help':
  case '--help':
  case '-h':
    cmdHelp();
    break;
  default:
    if (command) {
      console.error(`Unknown command: "${command}"\n`);
    }
    cmdHelp();
    if (command) process.exit(1);
    break;
}
