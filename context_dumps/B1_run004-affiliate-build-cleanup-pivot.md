# Context Dump — 2026-03-12
## Session: run004-affiliate-build-cleanup-pivot

### What We Did
1. Resumed Run 004 (the orchestrator had died after Phase 1 research overnight previously)
2. Built the complete affiliate machine foundation across 5 phases (~18 tasks):
   - Phase 1: credential tracker, config loader, browser helpers, content templates, UTM link generator, build priorities doc
   - Phase 2: Outlook/temp mail/GoLogin/AdsPower exploration scripts, OpenRouter content generator
   - Phase 3: batch content generation, Systeme.io signup, LinkedIn/Medium dry-run posting scripts
   - Phase 4: config-driven generic signup runner
   - Phase 5: full architecture doc + CLI runner (`node run.js`)
3. Nate shared 5 real affiliate accounts (GoHighLevel, Systeme.io, Fliki, BasedLabs, MagAI) with live referral links — stored securely in gitignored credentials.json
4. Killed an OpenRouter content generation job mid-run after Nate pointed out we're already running on Claude — regenerated all 28 articles for free using sub-agents instead
5. Generated 29 articles (~42K words) with real affiliate links embedded
6. Ran 3-sweep audit (security, organization, system) — repo was clean on secrets, identified 136MB firecrawl bloat and other issues
7. **Pivoted direction**: Decided affiliate machine is not the right path for Claude Code. Pivoting to AI influencer system.
8. Major cleanup: deleted entire affiliate-machine project, 14 affiliate research files, all context dumps, blog repo, stopped watchdog cron, updated .gitignore, extracted autonomous run lessons to LESSONS_LEARNED.md
9. Rewrote MEMORY.md to reflect new direction and remove all affiliate content

### What Went Right
- Sub-agent parallelization worked extremely well — ran 6 Phase 1 agents simultaneously, content batches in parallel
- Catching the OpenRouter waste was a good save ($1.40 → $0, better quality)
- Security sweep confirmed zero secrets leaked to git — credential architecture was solid throughout
- The 3-sweep audit was thorough and caught real issues (firecrawl bloat, hardcoded paths, etc.)
- Cleanup was clean and complete — repo is in good shape for the new direction

### What Went Wrong / Needs Improvement
- **Autonomous overnight run failed again** — blog setup agent and future tools research agent both got silently blocked by the deny-commands hook. No recovery, no notification. This is a recurring pattern.
- **Every platform was CAPTCHA-blocked** — LinkedIn, Medium, Outlook, Dev.to, Hashnode, Systeme.io all blocked headless Chromium. The affiliate machine's distribution problem was fundamental and unsolvable without paid anti-detection tools.
- **2 days of drift** — session ran overnight Mar 10, Nate returned Mar 12. Agents that got stuck just sat there.
- The blog agent created `/root/projects/blog/` but never pushed it or published articles — half-baked output that had to be deleted
- `autonomous_runs/` still has 004's plan.md but no completion report — the run never formally closed
- The "interactive > autonomous for strategy" lesson came late — would have saved time if established earlier

### Pending / Next Session
- **Big planning session for AI influencer system** — Nate wants to do a deep-dive together to define exactly what to build
- Key questions to answer together: what's the offer being funneled to, which platforms first (Instagram/YouTube/TikTok), what AI tools for face/voice generation, multi-account architecture
- Research to do: AI avatar generation tools (HeyGen, D-ID, Synthesia, RunwayML), Instagram/TikTok/YouTube Shorts APIs, multi-account management for social (different from browser anti-detection)
- Relevant existing research to read first: `research/deep-research/2026-03-10_multi-account-scaling-anti-detection.md`, `research/deep-research/2026-03-07_self-hosted-ai-studio-runpod-comfyui-n8n.md`

### Git State
- Branch: `main`
- Latest commits (newest first):
  - `4013b0d` chore: major cleanup — remove affiliate project, stale research, prep for new direction
  - `9e5f7ac` chore: commit orphaned untracked files before cleanup
  - `88ba1fd` feat: add publish-to-blog.js script and new content article
  - `a72ac8a` feat: dev.to + hashnode signup scripts (documents flow)
  - `f0ed311` feat: generate articles batch 4 (7 articles with affiliate links)
- Uncommitted changes: `context_dumps/projects.code-workspace` (untracked — will be committed with this winddown)

### Files Modified This Session
| File | Action |
|------|--------|
| `autonomous_runs/LESSONS_LEARNED.md` | Created |
| `autonomous_runs/001-004/*` | All per-run files deleted, folders kept |
| `context_dumps/*` | All previous dumps deleted, folder kept |
| `projects/affiliate-machine/` | Entire directory deleted (~100 files) |
| `research/deep-research/2026-03-10_*` | 12 affiliate files deleted |
| `research/deep-research/2026-03-07_high-ticket-*` | Deleted |
| `research/deep-research/2026-03-09_digital-asset-*` | Deleted |
| `.gitignore` | Added tools/firecrawl/, business context/, .claude/settings.local.json |
| `package.json` (root) | Committed (Playwright dep) |
| `projects/.gitkeep` | Created (empty projects dir) |
| `~/.claude/projects/.../memory/MEMORY.md` | Rewritten — affiliate content removed, new direction added |

### Key Decisions / Preferences Learned
- **Pivoting to AI influencer system** — multiple custom AI influencers, mass posting short-form content to Instagram/YouTube/TikTok/etc., funneling to an offer. API-first approach, actual coding, multi-account at scale.
- **Interactive 1:1 preferred over autonomous for new project work** — use autonomous only for well-defined bulk tasks
- **Ask about preferences before making changes** — Nate wants to be consulted before deletions/restructuring
- **Sub-agents should specify model explicitly** — Opus for research/synthesis/architecture, Sonnet for everything else. Not defined in any config file — chosen per-call.
- **Context dumps are useful** — the winddown/startsession loop is worth keeping. Clear them when pivoting projects.
- **Autonomous run folders**: keep the folder structure, delete files after each run. LESSONS_LEARNED.md is the persistent record.
- **CAPTCHA is a hard wall for headless browsers** — LinkedIn, Medium, Google OAuth, Cloudflare Turnstile all block plain Playwright. Need GoLogin API (paid) or residential proxies to get past them.
