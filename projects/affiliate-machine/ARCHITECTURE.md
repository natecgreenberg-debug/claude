# Affiliate Machine -- Architecture

**Last updated**: 2026-03-10
**Goal**: Fully autonomous agent-driven affiliate marketing system targeting $10K MRR.

---

## System Overview

The affiliate machine is a Node.js-based automation system that generates affiliate marketing content, manages platform accounts, and tracks affiliate links. It uses Playwright for browser automation, OpenRouter (Claude Sonnet) for AI content generation, and a local JSON credential store for account management.

The system is designed around a volume-first strategy: AI-generated content published across multiple platforms (Medium, LinkedIn, Pinterest, blogs) promoting SaaS tools with recurring commissions. Accounts are treated as expendable, and multi-account support is planned via GoLogin/AdsPower anti-detect browsers.

---

## Directory Structure

```
affiliate-machine/
├── lib/                        # Core library modules
│   ├── browser.js              # Playwright browser helpers
│   ├── config.js               # Environment config loader (dotenv)
│   ├── content-generator.js    # OpenRouter AI content generation
│   ├── credentials.js          # JSON credential store (CRUD)
│   └── link-tracker.js         # UTM affiliate link generator
│
├── scripts/                    # Runnable automation scripts
│   ├── create-outlook-account.js   # Outlook/Hotmail account creation
│   ├── temp-mail-client.js         # Temp email client (3 providers)
│   ├── gologin-explore.js          # GoLogin dashboard exploration
│   ├── adspower-explore.js         # AdsPower dashboard exploration
│   ├── signup-systemeio.js         # Systeme.io affiliate signup
│   ├── post-linkedin.js            # LinkedIn posting flow (dry run)
│   ├── post-medium.js              # Medium article publishing (dry run)
│   └── generate-content-batch.js   # Batch content generation
│
├── templates/                  # Content generation templates
│   ├── comparison.json         # Product comparison articles
│   ├── review.json             # Single-product review articles
│   ├── best-list.json          # "Best X for Y" listicle articles
│   ├── tutorial.json           # How-to / tutorial articles
│   └── social-post.json        # Platform-specific social posts
│
├── signup-configs/             # Platform signup configuration
│   ├── systemeio.json          # Systeme.io signup config
│   ├── snovio.json             # Snov.io signup config
│   └── mangools.json           # Mangools signup config
│
├── content/                    # Generated content output (*.md)
├── data/                       # Runtime data
│   ├── credentials.json        # Account credentials store
│   └── screenshots/            # Playwright screenshots by script
│       ├── outlook/
│       ├── gologin/
│       ├── adspower/
│       ├── systemeio/
│       ├── linkedin/
│       └── medium/
│
├── n8n_workflows/              # n8n automation workflows (planned)
│
├── programs.json               # Affiliate programs database (27 programs)
├── keywords.json               # Target keywords for content (28 keywords)
├── package.json                # Node.js project config
├── requirements.txt            # Python dependencies (content calendar)
├── content_calendar.py         # Python content calendar generator
├── run.js                      # Master CLI runner
│
├── BUILD_PRIORITIES.md         # Strategy: platforms, programs, build order
├── GOLOGIN_NOTES.md            # GoLogin exploration findings
├── ADSPOWER_NOTES.md           # AdsPower exploration findings
├── README.md                   # Project readme
└── ARCHITECTURE.md             # This file
```

---

## Module Descriptions (lib/)

### `lib/credentials.js`

Local JSON credential store at `data/credentials.json`. Manages account records with CRUD operations. Each record has: `platform`, `email`, `password`, `status`, `createdAt`, and optional metadata.

**Exports:**
- `addAccount(platform, email, password, metadata)` -- Upsert an account record
- `getAccounts(platform)` -- Retrieve all accounts for a platform
- `updateStatus(platform, email, newStatus)` -- Change account status (active/banned/suspended)
- `listAll()` -- Return all accounts across all platforms

**Statuses:** `active`, `banned`, `suspended`, `needs_review`, `pending_verification`

### `lib/config.js`

Environment configuration loader. Loads `.env` files in order: parent project (`/root/projects/Agent/.env`) first, then project-local `.env` for overrides. Uses `dotenv`.

**Exports:**
- `getConfig()` -- Returns full env snapshot
- `getKey(name)` -- Returns a single env var
- `OPENROUTER_API_KEY()` -- Shortcut for the OpenRouter key
- `GMAIL_PRIMARY()` / `GMAIL_PRIMARY_PASS()` -- Gmail credentials

**Expected env vars:** `OPENROUTER_API_KEY`, `GMAIL_PRIMARY`, `GMAIL_PRIMARY_PASS`

### `lib/browser.js`

Playwright browser helper functions. All operations have 60-second timeout protection. Launches headless Chromium with a 1280x800 viewport.

**Exports:**
- `launchBrowser(options)` -- Launch Chromium, return `{ browser, page }`
- `screenshotAndLog(page, name, dir)` -- Timestamped screenshot to disk
- `waitAndClick(page, selector, timeout)` -- Wait for element then click
- `fillField(page, selector, value)` -- Wait for element then fill
- `closeBrowser(browser)` -- Graceful close with timeout guard

**Options:** `headless` (default true), `slowMo`, `proxy` config

### `lib/content-generator.js`

AI content generation via OpenRouter API using Claude Sonnet (`anthropic/claude-sonnet-4`). Includes retry logic (2 attempts, 30s delay), 120s API timeout, and cost estimation.

**Exports:**
- `callOpenRouter(messages, options)` -- Raw API call with retry
- `generateArticle(topic, template, options)` -- Full article from template
- `generateSocialPost(topic, platform, affiliateLink)` -- Platform-specific social post
- `generateComparison(product1, product2, template)` -- Head-to-head comparison article

**Pricing:** $3/MTok input, $15/MTok output (Claude Sonnet rates)

### `lib/link-tracker.js`

UTM-tagged affiliate link generator. Reads `programs.json` and builds tracking URLs with `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` parameters.

**Exports:**
- `generateLink(programName, platform, contentType, campaignId)` -- Single UTM link
- `generateBatchLinks(programName, platforms, contentType)` -- Links across multiple platforms
- `getProgram(name)` -- Look up a program by name (case-insensitive)
- `listPrograms()` -- Return all program names

---

## Script Descriptions (scripts/)

### `scripts/create-outlook-account.js`

Automated Outlook/Hotmail account creation via `signup.live.com`. Documents the full signup flow step-by-step with screenshots at each stage. Handles CAPTCHA detection, phone verification detection, and profile field filling (name, birthdate). Stores credentials on success.

**Status:** Blocked by CAPTCHA/phone verification in headless mode.

### `scripts/temp-mail-client.js`

Unified client for three free temporary email providers: 1secmail, Guerrilla Mail, and mail.tm. Used by other scripts (like `signup-systemeio.js`) to get disposable email addresses for account creation. Supports getting addresses, checking inboxes, and reading messages.

**Note:** Uses ESM `export` syntax (unlike other scripts which use CommonJS).

### `scripts/gologin-explore.js`

Explores the GoLogin web dashboard at `app.gologin.com`. Documents login flow, attempts Google OAuth and email/password login, screenshots each step. Writes findings to `GOLOGIN_NOTES.md`.

**Findings:** Google OAuth blocked by headless fingerprint detection. Native form blocked by CAPTCHA. Recommended path: use GoLogin REST API with manually obtained API token.

### `scripts/adspower-explore.js`

Explores the AdsPower web dashboard at `app.adspower.com`. Documents login flow and page structure. Writes findings to `ADSPOWER_NOTES.md`.

**Findings:** Web app has no Google OAuth -- only email/password. Accounts created via Google (desktop app) have no password set and cannot log in via web. Must use desktop app or register with email directly.

### `scripts/signup-systemeio.js`

Automated Systeme.io affiliate program signup. Uses temp email (Guerrilla Mail with mail.tm fallback), fills signup form, handles CAPTCHA/phone/email verification detection, polls inbox for verification emails. Updates `programs.json` status on completion.

**Status:** Functional flow, but may hit CAPTCHA or email verification gates.

### `scripts/post-linkedin.js`

DRY RUN script for LinkedIn posting. Documents the full flow: login, navigate to feed, open post composer, fill sample text. Never clicks the Post button. Screenshots every step.

**Status:** Dry run only. Blocked by CAPTCHA/2FA in headless mode.

### `scripts/post-medium.js`

DRY RUN script for Medium article publishing. Documents login flow (Google OAuth and email paths), navigates to editor, fills title and body text. Never clicks Publish. Detects Cloudflare Turnstile.

**Status:** Dry run only. Medium blocks headless browsers with Cloudflare Turnstile.

### `scripts/generate-content-batch.js`

Batch content generation from `keywords.json`. Two modes:
- **Dry run** (default): Prints a plan table of all pending keywords with template mappings
- **Live** (`--live`): Generates one article for the first `not_started` keyword, saves to `content/{slug}.md` with YAML frontmatter

Supports content types: comparison, versus, review, best-list, tutorial, social-post.

---

## Data Files and Formats

### `programs.json`

Array of 27 affiliate programs. Each entry:

```json
{
  "name": "Systeme.io",
  "commission_pct": 60,
  "recurring": "lifetime",
  "cookie_days": 365,
  "plan_range": "$27-97/mo",
  "category": "funnel-builder",
  "signup_url": "https://...",
  "affiliate_link": "https://...",    // present for active programs
  "difficulty": "easy",
  "tier": 1,
  "priority_score": 95,
  "payment_reliability": "high",
  "status": "active",
  "notes": "..."
}
```

**Active programs with affiliate links:** Systeme.io, GoHighLevel, Fliki, BasedLabs, MagAI (5 active, 22 not_applied)

### `keywords.json`

Array of 28 target keywords for content generation. Each entry:

```json
{
  "keyword": "best email marketing tool for small business 2026",
  "intent": "buyer",
  "difficulty": "medium",
  "programs": ["GetResponse", "AWeber", "ConvertKit"],
  "content_type": "comparison",
  "platform": ["medium", "blog", "youtube"],
  "status": "not_started"
}
```

**Content types:** comparison, versus, review, tutorial
**Platforms:** medium, blog, youtube, quora, reddit, linkedin

### `data/credentials.json`

Array of account records managed by `lib/credentials.js`. Contains platform login credentials and metadata. Gitignored.

### `templates/*.json`

Content generation templates with system prompts, section definitions (name, prompt, target word count), and structure guidance (intro/conclusion). Five templates covering comparison, review, best-list, tutorial, and social-post formats.

### `signup-configs/*.json`

Platform-specific signup configuration files for automated account creation (systemeio, snovio, mangools).

---

## How to Run

### Prerequisites

```bash
cd /root/projects/Agent/projects/affiliate-machine
npm install                         # installs dotenv
npx playwright install chromium     # install browser (if not present)
```

Required env vars in `/root/projects/Agent/.env`:
- `OPENROUTER_API_KEY` -- for content generation
- `GMAIL_PRIMARY` -- for platform logins
- `GMAIL_PRIMARY_PASS` -- for platform logins

### CLI Runner

```bash
node run.js status          # Show credential, content, program, template counts
node run.js programs        # List all programs with status and link info
node run.js generate --dry-run  # Preview what content would be generated
node run.js generate --live     # Generate one article (first pending keyword)
node run.js help            # Show all available commands
```

### Individual Scripts

```bash
# Content generation
node scripts/generate-content-batch.js           # dry run
node scripts/generate-content-batch.js --live     # generate 1 article

# Account creation
node scripts/create-outlook-account.js            # attempt Outlook signup
node scripts/signup-systemeio.js                   # attempt Systeme.io signup

# Platform exploration (dry runs)
node scripts/post-linkedin.js                      # LinkedIn posting flow
node scripts/post-medium.js                        # Medium publishing flow
node scripts/gologin-explore.js                    # GoLogin dashboard
node scripts/adspower-explore.js                   # AdsPower dashboard

# Library self-tests
node lib/credentials.js
node lib/config.js
node lib/browser.js
node lib/content-generator.js
node lib/link-tracker.js
```

---

## Current Status

### What Works
- Content generation pipeline (templates + OpenRouter + batch runner)
- Credential store (CRUD operations, tested)
- UTM link generation with program lookup
- Browser automation helpers (Playwright with timeout protection)
- All 5 content templates (comparison, review, best-list, tutorial, social-post)
- 27 affiliate programs catalogued with priority scores
- 28 target keywords mapped to programs and content types
- Systeme.io signup flow (may hit CAPTCHA)

### What's Blocked
- **LinkedIn posting**: CAPTCHA/2FA in headless mode
- **Medium publishing**: Cloudflare Turnstile blocks headless browsers
- **Outlook account creation**: CAPTCHA/phone verification required
- **GoLogin web login**: CAPTCHA on native form, Google OAuth blocked for headless -- must use REST API with manual token
- **AdsPower web login**: No OAuth on web app, accounts created via Google have no password

### Not Yet Built
- Signup runner (generic multi-platform signup automation)
- n8n workflow integration
- Pinterest automation
- Short-form video pipeline
- WordPress autoblog publishing
- Analytics/optimization agent
- Multi-account scaling via GoLogin API

---

## Roadmap

See `BUILD_PRIORITIES.md` for the full strategy. High-level phases:

1. **Foundation** (Weeks 1-2): Content pipeline + first posts live. Sign up for Systeme.io, Snov.io, AWeber, Mangools. WordPress autoblog setup. Pinterest account creation.
2. **Automation** (Weeks 3-4): n8n content scheduling. Link tracking (Shlink/PrettyLinks). Short-form video pipeline. GoLogin multi-account profiles.
3. **Scale** (Weeks 5-8): 3 posts/day, 10 pins/day, 2 videos/day. ClickBank product rotation. Analytics agent.
4. **Compound** (Months 3-6): Email list building. Tier 2/3 program applications. Additional niche site domains. Target: $10K MRR.
