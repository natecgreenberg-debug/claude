# Environment Audit — Consolidated Findings Report
**Date**: 2026-03-05
**Scope**: 4 skills, 1 agent, 1 hook, 3 config files, 1 settings file, VPS security sweep
**Agents dispatched**: 5 code-reviewer agents (1 test + 4 parallel)

---

## Critical

### C1: SSH Password Authentication Enabled
**Source**: VPS security sweep
**File**: `/etc/ssh/sshd_config.d/50-cloud-init.conf`

Two conflicting SSH config files:
- `50-cloud-init.conf`: `PasswordAuthentication yes`
- `60-cloudimg-settings.conf`: `PasswordAuthentication no`

Files are loaded in order, so `60-cloudimg-settings.conf` wins (password auth is currently **off**). However, if cloud-init regenerates `50-cloud-init.conf` after a system update, or if the `60-` file is removed, password auth silently re-enables. SSH is listening on `0.0.0.0:22` (all interfaces), not just Tailscale.

**Fix**: Explicitly set `PasswordAuthentication no` in `50-cloud-init.conf` or the main `sshd_config` so both files agree. Consider also binding SSH to only the Tailscale interface (`ListenAddress 100.114.8.49`).

### C2: UFW Firewall Inactive
**Source**: VPS security sweep

`ufw status` reports `inactive`. Tailscale's iptables rules provide some protection (ts-input/ts-forward chains), but the host-level firewall is off. SSH on port 22 is exposed to all interfaces. If Tailscale goes down or is misconfigured, the VPS is wide open.

**Fix**: Enable UFW with: `ufw default deny incoming && ufw allow in on tailscale0 && ufw enable`. This ensures only Tailscale traffic is accepted even if Tailscale's own iptables rules fail.

### C3: fail2ban Not Running
**Source**: VPS security sweep

`fail2ban` service is `inactive`. With SSH exposed on all interfaces and password auth potentially one config change away from being enabled, there's no brute-force protection.

**Fix**: Install and enable fail2ban, or accept the risk given Tailscale isolation. Lower priority if C1 and C2 are fixed first.

---

## High

### H1: Autonomous Skill — Plan Template Missing Pre-Resolved Decisions Section
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~55-78)

Phase 2 requires "Pre-resolved decisions" in the plan. Phase 4 says to follow them. But the `plan.md` template in Phase 3b has no section for them. After compaction, the agent reloads only from `plan.md` — pre-resolved decisions are lost with the context window.

**Fix**: Add `## Pre-resolved Decisions` section to the plan template between Known Blockers and Autonomy Rules.

### H2: Autonomous Skill — /root/ Guardrail Contradiction
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~105)

Unsafe example says `grep -r ... /root/` is forbidden, but safe example says `/root/projects/Agent/` is allowed. An agent doing `grep -r pattern /root/projects/Agent/` technically matches the unsafe pattern since it starts with `/root/`.

**Fix**: Change unsafe examples to specifically reference `~/.claude/`: `grep -r ... /root/.claude/`, `find /root/.claude/ ...`

### H3: Autonomous Skill — Phase 3c Compact Fallback Writes Empty Progress
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~83)

If `/compact` fails before Phase 4 starts, the fallback says "write the progress checkpoint." But there's no progress yet — the checkpoint format expects completed tasks. Writing an empty/meaningless progress file creates noise.

**Fix**: Change to: "If `/compact` does not execute, continue working without compacting. Do not write a progress checkpoint before work has started."

### H4: deny-commands.sh — rm -rf Pattern Too Narrow
**Source**: Code review — deny-commands.sh
**File**: `.claude/hooks/deny-commands.sh` (line 6)

Only catches `rm -rf /` and `rm -rf ~/`. Misses: `rm -rf /*`, `rm -rf /root`, `rm -fr /`, `rm -r -f /`, `sudo rm -rf /`.

**Fix**: Broaden regex to catch flag reordering (`-fr`, `-rfi`) and `sudo` prefix:
```bash
echo "$COMMAND" | grep -qE '(^|\s|;|&&|\|\|)(sudo\s+)?rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+(/|~/)'
```

### H5: deny-commands.sh — Bypass via sudo and Subshells
**Source**: Code review — deny-commands.sh
**File**: `.claude/hooks/deny-commands.sh` (line 5)

`sudo apt install` and `bash -c "apt install ..."` bypass the hook entirely. Only bare `apt`/`apt-get` at the start of a command segment is caught.

**Fix**: Add `sudo` pattern and subshell detection to the apt check as well.

### H6: Research Skill — "Non-compliant output will be discarded" is Hollow
**Source**: Code review — research/SKILL.md
**File**: `.claude/skills/research/SKILL.md` (line ~110)

The agent brief threatens to discard non-compliant output, but Step 4 has no discard/retry logic. The parent just synthesizes whatever comes back.

**Fix**: Replace with: "Non-compliant output makes synthesis harder — follow the structure exactly." Or add to Step 4: "If an agent's output is missing required sections, extract what you can and note the gap in Contradictions & Gaps."

### H7: Research Skill — No Agent Cap for Multi-Topic Batches
**Source**: Code review — research/SKILL.md

A batch of 5 broad topics could spawn 25 agents in a single message. There's no upper bound.

**Fix**: Add rule: "Maximum total agents per invocation: 10. If a multi-topic batch would exceed this, reduce per-topic count or process sequentially."

### H8: SSH Exposed on All Interfaces
**Source**: VPS security sweep

`sshd` listens on `0.0.0.0:22` and `[::]:22`. Even with Tailscale, SSH is reachable from the public internet if the VPS has a public IP.

**Fix**: Bind SSH to Tailscale only: `ListenAddress 100.114.8.49` in sshd_config. Or rely on UFW (see C2).

---

## Medium

### M1: Winddown Skill — HEAD~N Off-by-One
**Source**: Code review — winddown/SKILL.md
**File**: `.claude/skills/winddown/SKILL.md` (lines 36, 87)

`git diff --name-status HEAD~N` fails when N equals the total commit count (reaches before initial commit). Should use `min(count - 1, 10)`.

**Fix**: Guard with: "N is the minimum of (total commit count - 1) and 10. If only 1 commit, use `--root HEAD`."

### M2: Winddown Skill — Push Rule Contradicts Procedure
**Source**: Code review — winddown/SKILL.md
**File**: `.claude/skills/winddown/SKILL.md` (lines 126, 152)

Rules say "push after every commit" but Step 6 does two commits then one push. Following the rule literally means two pushes.

**Fix**: Soften rule to: "Always push after committing — never leave unpushed commits at the end of the skill."

### M3: Winddown Skill — Relative Paths in Step 6
**Source**: Code review — winddown/SKILL.md
**File**: `.claude/skills/winddown/SKILL.md` (line ~123)

`git add context_dumps/{filename}` is relative. If cwd isn't the repo root, this fails.

**Fix**: Use absolute paths or prefix with `cd ~/projects/Agent &&`.

### M4: Winddown Skill — git diff --name-only Missing --cached
**Source**: Code review — winddown/SKILL.md
**File**: `.claude/skills/winddown/SKILL.md` (line 87)

`git diff --name-only` only shows unstaged changes. Staged-but-uncommitted changes to `.claude/` files would be missed.

**Fix**: Use `git diff --name-only HEAD` to catch both staged and unstaged.

### M5: Startsession — Step 6/7 Ordering
**Source**: Code review — startsession/SKILL.md
**File**: `.claude/skills/startsession/SKILL.md` (lines 52-72)

Handoff file is deleted in Step 6, but Step 7 needs its contents for the summary. Agent may try to re-read the deleted file.

**Fix**: Move deletion to after Step 7, or add: "Use contents already captured in Step 1."

### M6: Startsession — Context Dump Discovery Fragile
**Source**: Code review — startsession/SKILL.md
**File**: `.claude/skills/startsession/SKILL.md` (line 18)

`ls | sort | tail -1` would pick up non-numbered files (README.md, .DS_Store).

**Fix**: Add filter: `ls | grep -E '^[0-9]+_' | sort -t_ -k1 -n | tail -1`

### M7: Startsession — Memory Path May Be Wrong
**Source**: Code review — startsession/SKILL.md
**File**: `.claude/skills/startsession/SKILL.md` (line 37)

References `~/.claude/projects/-root-projects/memory/MEMORY.md` but the actual project memory is at `~/.claude/projects/-root-projects-Agent/memory/MEMORY.md`. The bare `-root-projects` path may not exist.

**Fix**: Verify actual paths and correct.

### M8: claude.md vs workflow.md — Push Rule Missing from workflow.md
**Source**: Code review — config files
**Files**: `.claude/claude.md` (line 13), `.claude/rules/workflow.md`

claude.md says "ALWAYS push after every commit. No exceptions." workflow.md says nothing about pushing. An agent loading only workflow.md would miss this.

**Fix**: Add to workflow.md Git Habits: `- **Always push after every commit** — git commit must be followed by git push`

### M9: Autonomous Skill — Slug Format Unspecified
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~44)

No definition of "slugified" — format, max length, separator character all undefined.

**Fix**: Add: "Slug rules: lowercase, alphanumeric and hyphens only, max 30 characters."

### M10: Autonomous Skill — Sub-Agent Guardrail Brief Underspecified
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~97)

Says to "include the autonomy guardrails in their brief" but doesn't say which or how. Sub-agents can't read SKILL.md.

**Fix**: Inline the critical rules: "(1) never read/write inside ~/.claude/, (2) never run apt/apt-get, (3) never use rm -rf, (4) never create GitHub issues/PRs, (5) never prompt the user."

### M11: Autonomous Skill — Checkpoint Double-Write
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~136-140)

Checkpoint step 1 writes progress.md, then step 3 says "write the progress checkpoint" again if compact fails. Since progress.md is append-only, this duplicates the entry.

**Fix**: Change step 3 to: "Continue working without compacting. The checkpoint was already written in step 1."

### M12: settings.local.json — Bash Not in Allow List
**Source**: Code review — config files
**File**: `.claude/settings.local.json`

`Bash` is not auto-allowed but `Write` is. An agent can silently write any file but must ask to execute shell commands. This is inverted from a security standpoint.

**Fix**: Either add `Bash` to the allow list (matching the aggressive-permissions philosophy) or keep it as-is for intentional human review of shell commands. Document the rationale either way.

### M13: X11Forwarding Enabled in SSH
**Source**: VPS security sweep
**File**: `/etc/ssh/sshd_config`

`X11Forwarding yes` is enabled. Unnecessary on a headless VPS and adds attack surface.

**Fix**: Set `X11Forwarding no` in sshd_config.

### M14: PermitRootLogin yes in SSH
**Source**: VPS security sweep
**File**: `/etc/ssh/sshd_config`

Root login via SSH is enabled. Combined with password auth being one config drift away from enabled (C1), this is elevated risk.

**Fix**: Set `PermitRootLogin prohibit-password` (allows key-only root login) or create a non-root user and set `PermitRootLogin no`.

---

## Low

### L1: Winddown Skill — Heading Says "Context Dump Skill"
**Source**: Code review — winddown/SKILL.md
**File**: `.claude/skills/winddown/SKILL.md` (line 7)

Skill was renamed from `/context` to `/winddown` but the heading still says "Context Dump Skill."

**Fix**: Change to "Winddown Skill."

### L2: Winddown Skill — Slug Truncation Vague
**Source**: Code review — winddown/SKILL.md
**File**: `.claude/skills/winddown/SKILL.md` (line 24)

"truncate to ~50 chars" — the tilde makes it ambiguous.

**Fix**: "truncate to 50 characters, breaking at the last hyphen before the limit."

### L3: Research Skill — Pipe Delimiter Ambiguity
**Source**: Code review — research/SKILL.md

Topics containing `|` (e.g., `grep | awk performance`) would be incorrectly split.

**Fix**: Add heuristic: "If all segments after splitting are fewer than 3 words, treat entire input as a single topic."

### L4: Research Skill — Slug Collision
**Source**: Code review — research/SKILL.md

Two different topics could produce the same slug after truncation. Same-day research on similar topics would collide.

**Fix**: Check report title match, not just slug. Append `-2` suffix for true collisions.

### L5: Research Skill — Citation Upgrade Logic Ambiguous
**Source**: Code review — research/SKILL.md

"2+ agents found the same fact → upgrade to [Verified]" but two agents citing the same URL isn't cross-verification.

**Fix**: Add: "Only upgrade to [Verified] when underlying sources are independent."

### L6: Autonomous Skill — AskUserQuestion Availability
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~34)

`AskUserQuestion` may not exist in all Claude Code environments.

**Fix**: Add fallback: "If AskUserQuestion is unavailable, present the plan in chat and ask Nate to reply."

### L7: Autonomous Skill — Checkpoint Timestamp Format
**Source**: Code review — autonomous/SKILL.md
**File**: `.claude/skills/autonomous/SKILL.md` (line ~149)

`{timestamp}` format unspecified.

**Fix**: Specify: `## Checkpoint {YYYY-MM-DD HH:MM}`

### L8: code-reviewer.md — No Mention of Markdown/Skill Review Capability
**Source**: Code review — code-reviewer.md
**File**: `.claude/agents/code-reviewer.md`

The agent's "What to Look For" section only lists code concerns (security, bugs, performance). It doesn't mention reviewing instruction clarity, contradictions, or edge cases in non-code files like skill definitions.

**Fix**: Add a category: "**Instruction quality** (for skill/config files): contradictions, ambiguous wording, missing edge cases, logic sequencing errors."

### L9: code-style.md — No Dependency Management Guidance
**Source**: Code review — config files
**File**: `.claude/rules/code-style.md`

Specifies `httpx` over `requests` but never mentions how to track dependencies (requirements.txt, pyproject.toml).

**Fix**: Add Dependencies section with guidance on tracking and pinning.

### L10: claude.md — Tailscale IP Hardcoded
**Source**: Code review — config files
**File**: `.claude/claude.md` (line 29)

Tailscale IP `100.114.8.49` is committed to git. Low severity (internal-only IP) but unnecessary exposure.

**Fix**: Move to `.env` or remove if not needed in the file.

### L11: Winddown — Duplicate Git Diff Stat Step
**Source**: Code review — winddown/SKILL.md
**File**: `.claude/skills/winddown/SKILL.md` (Step 3, items 2-3)

Items 2 and 3 both say "Git diff stat" with identical commands. Duplicate.

**Fix**: Remove the duplicate item.

---

## Info / Notes

### I1: No .env File Exists Yet
The `.env` file referenced in claude.md and code-style.md doesn't exist yet. `.gitignore` properly excludes it. No issue, just noting.

### I2: n8n Container Running Properly
Docker container `n8n-n8n-1` is running, bound to `127.0.0.1:5678` (localhost only). Good — not exposed to the network.

### I3: Unattended Upgrades Active
`unattended-upgrades.service` is running. Good — security patches are being applied automatically.

### I4: ModemManager Running Unnecessarily
`ModemManager.service` is active on a VPS with no modem hardware. Harmless but wasteful.

**Optional**: `systemctl disable --now ModemManager`

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 8 |
| Medium | 14 |
| Low | 11 |
| Info | 4 |
| **Total** | **40** |

### Top 5 Priorities
1. **C1+C2+H8**: SSH security — fix password auth conflict, enable UFW, bind SSH to Tailscale
2. **H1**: Add Pre-resolved Decisions to autonomous plan template (breaks autonomous execution after compaction)
3. **H4+H5**: Harden deny-commands.sh regex (current patterns are trivially bypassable)
4. **M8**: Add push rule to workflow.md (contradicts claude.md)
5. **H2**: Fix /root/ guardrail contradiction in autonomous skill
