# Autonomous Runs — Lessons Learned
**Last updated**: 2026-03-12
**Covers**: Runs 001, 002, 003, 004

---

## Run 001 — Environment Audit (2026-03-05)

### What Happened
5 code-reviewer agents audited all skills, agents, config files, and performed a live VPS security sweep. Produced 40 findings (3 critical, 8 high, 14 medium, 11 low, 4 info). Audit only — no fixes applied.

### Key Security Findings
- **SSH password auth conflict**: `50-cloud-init.conf` sets `PasswordAuthentication yes`, overridden by `60-cloudimg-settings.conf`. Risk: cloud-init regeneration could silently re-enable password auth. Fix: explicitly set `no` in both files.
- **UFW firewall inactive**: Only Tailscale iptables rules provide protection. Fix: `ufw default deny incoming && ufw allow in on tailscale0 && ufw enable`.
- **fail2ban not running**: No brute-force protection if SSH exposure widens.
- **SSH listens on all interfaces**: `0.0.0.0:22` — should bind to Tailscale only (`ListenAddress 100.114.8.49`) or rely on UFW.
- **X11Forwarding enabled**: Unnecessary on headless VPS.
- **PermitRootLogin yes**: Combined with password-auth drift risk, elevated threat.

### Key Skill/Config Findings
- `deny-commands.sh` regex too narrow — misses `rm -fr`, `-rfi`, `sudo rm -rf`, and subshell bypasses.
- `autonomous/SKILL.md` plan template missing `## Pre-resolved Decisions` section — critical for post-compaction recovery.
- `/compact` is a user-side slash command, not invocable by the assistant — skill incorrectly treated it as a tool call.
- Winddown skill heading said "Context Dump Skill" after rename.
- `startsession` memory path was wrong (`-root-projects` vs `-root-projects-Agent`).
- workflow.md missing push rule; claude.md contradicts it.

### Process Lessons
- `/compact` cannot be called by the assistant — replace with disk-persist + checkpoint approach.
- Adding `## Pre-resolved Decisions` to plan.md template is critical — decisions are lost after compaction without it.
- "Test one agent, evaluate quality, then batch" pattern works well for sub-agent work.
- Parallel launch (all independent agents in one message) is efficient and should be default.
- Commit-after-each-chunk rule is naturally task-dependent — audit-only runs may have nothing to commit until the end.

### Status
All critical/high/medium findings were addressed in session 009 (audit round 2) and subsequent skill updates.

---

## Run 002 — Business Idea Research & Build (2026-03-07)

### What Happened
Cataloged 13 business ideas, scored top 5 against VPS environment, ran 4 of 5 deep research agents (1 stalled), ranked all ideas, scaffolded the #1 pick (High-Ticket/Recurring Affiliate Machine).

### Key Research Findings
- **#1 pick**: Recurring SaaS Affiliate Machine — $0 to start, works today, compounding recurring commissions
- **#2**: Personal Brand Monetization Partner — strong concept but bottleneck is finding partners with traffic
- **#3**: Digital Asset Landlord — solid math (10K assets × $0.50/mo = $5K/mo) but requires pip + browser automation
- **#4**: Optic Stage (AI Visual Agency) — technology works but market is brutal ($0.24/image competitors); 70% of first 6 months is sales
- **#5**: Infinite AI Content Studio — infrastructure, not a business; only makes sense for video at 100+ clips/day

### Process Failures
1. **Stalled agent caused 6-hour hang**: One of 5 background research agents (Digital Asset Landlord) stalled after ~1 minute. No failure notification surfaced. Main process waited from ~2:00 AM to ~8:00 AM.
   - Root cause: Sub-agent process crash not surfaced as failure notification.
   - Fix: Implement 10-minute timeout for background agents — poll output file, declare dead if nothing, continue.
2. **No incremental commits**: Everything batched at the end. If session crashed, all work lost.
3. **Context bloat**: Full docx extraction (117K chars) consumed too much context early. Should extract only needed sections.
4. **progress.md infrequently updated**: Only updated twice. Should be updated after every task.

### Process Wins
- Tasks 1–2 completed quickly using targeted document extraction.
- 4/5 research agents returned high-quality reports with real citations and pricing data.
- Parallel launch of all 5 agents was efficient.
- Feasibility scoring caught real blockers (no pip, n8n cred storage, Tailscale blocking public webhooks).
- Scaffold was minimal but functional using stdlib only (no pip required).

### Lessons
- **10-minute agent timeout is mandatory** — if 4/5 agents finish in 5 minutes and 1 hasn't, check immediately.
- **Commit after every task** — never batch commits at the end of a long run.
- **Extract only needed data from large documents** — do NOT read full large docs into context.
- **progress.md is a real-time status board** — update after every task completion, not just at milestones.
- **Agent failure ≠ failure notification** — always have a timeout-based fallback, not just a completion-wait.

---

## Run 003 — Recurring SaaS Affiliate Pipeline Research (2026-03-10)

### What Happened
13 tasks completed (0 failures, 0 timeouts). Produced 9 deep research reports on the affiliate pipeline strategy, updated affiliate-machine workspace, and pivoted direction from "explore 5 ideas" to "focus on SaaS affiliate marketing."

### Key Research Findings
- SaaS affiliate commissions: 20-70%, lifetime recurring becoming standard.
- Referral leads convert at 3.63% vs 0.78% traditional — 4.6x better.
- LinkedIn organic engagement: 2% avg (11x Facebook's 0.18%).
- Google does NOT penalize quality AI-assisted content; Medium BANS AI SEO/affiliate content.
- YouTube requires disclosure but welcomes AI-enhanced content.
- Average affiliate earns $8,038/year; top 10% earn $73,000+/year.
- Free-method case studies: $267/mo → $21,853/mo growth over 19 months.
- WebFetch had ~50% failure rate (403 errors) — search snippets more reliable than full page fetches.

### Top Programs (from research)
1. Systeme.io — 60% lifetime, 365d cookie, instant approval
2. Snov.io — 40% lifetime, lifetime cookie
3. AWeber — 30-50% lifetime, 365d cookie
4. GetResponse — 33-60% lifetime, 120d cookie
5. Pabbly — 30% lifetime, 365d cookie

### Process Notes
- All 13 tasks completed without timeout — incremental commits after each group worked well.
- 22+ search queries in parallel for maximum efficiency.
- Platform policies change frequently — research needs periodic refresh.

### Limitation (Superseded)
This run assumed manual, single-account, conservative approach. Nate later pivoted to automated multi-account vision (Run 004 plan). Run 003 findings are still valid for program selection and content strategy.

---

## Run 004 — Automated Affiliate Research + Build (2026-03-10, Incomplete)

### What Happened
Plan was created (Phases 1–6 defined) but the run did not execute. The plan called for research on automated case studies, account creation pipelines, ClickBank/Amazon/high-ticket offers, and a full build phase including GoLogin setup, Playwright scripts, n8n workflows, and credential tracking. Research files were committed separately (3 reports + updated plan) but the build phase never ran.

### Plan Summary
- **Research Phase A**: 5 parallel agents on automated affiliate case studies, all viable channels, automation tools, ClickBank/Amazon/high-ticket, what's making money now
- **Research Phase B**: Deep dives on winners from Phase A
- **Build Phase**: GoLogin profiles, platform account creation, credentials tracker, Playwright agents, n8n workflows, content generation templates, Shlink tracking
- **Fallback rule**: If stuck, identify highest-value project and build that instead.

### Pre-Resolved Decisions from Plan
- Never question Nate during the run (sleeping).
- Build systems but do NOT post live.
- Accounts are expendable — volume approach.
- Commit after every meaningful chunk + push.

### Lessons (from incomplete run)
- A plan with 6 phases and a 45-step build is too large for a single autonomous run without a mid-run human checkpoint.
- The build phase (Phase 5) required browser automation that may not be available in the sandbox environment.
- The entire run was superseded by a direction change — projects should be scoped more narrowly to avoid abandonment mid-plan.

---

## Cross-Run Patterns & Principles

### What Works
1. **Parallel agent launch** — always launch independent agents in one message
2. **Incremental commits** — commit after every task group, never batch
3. **Targeted doc reads** — never load full large documents; extract only needed sections
4. **Test-then-batch** — for sub-agent work, test one agent first before launching full batch
5. **Pre-resolved decisions in plan.md** — decisions must survive compaction; they go in the plan, not just context
6. **progress.md as real-time board** — update after every task, not just milestones

### What Fails
1. **Waiting indefinitely for background agents** — always implement a 10-minute timeout
2. **Treating `/compact` as a tool call** — it's a user-side command; persist state to disk instead
3. **Batching commits at run end** — if the session crashes, everything is lost
4. **Reading entire large documents** — 117K char context load causes problems downstream
5. **Overly large run scope** — 6-phase plans with 40+ build steps are too large for a single autonomous run

### Agent Timeout Protocol
If a background agent has not returned after 10 minutes:
1. Read its expected output file — if content exists, use it.
2. If no output file exists, log: "Agent timed out after 10min — no output recovered."
3. Continue with remaining tasks. Do not wait.
4. Document the gap in the completion report under "Failed Tasks."

### Commit Discipline
- After every completed task or logical group of tasks: `git add <specific files> && git commit -m "..." && git push`
- Never use `git add -A` without checking what's being staged (risk of committing credentials)
- Always check for API keys before committing: scan for `sk-`, `token`, `password`, `secret`, `API_KEY` patterns
