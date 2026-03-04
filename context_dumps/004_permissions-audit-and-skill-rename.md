# Context Dump — 2026-03-04
## Session: Permissions audit, security audit, and skill rename

### What We Did
1. Built the `/context` session wind-down skill (SKILL.md with YAML frontmatter + full instructions)
2. Updated skill's commit strategy to two-commit approach (uncommitted work first, then dump file)
3. Tested the skill end-to-end — created context dump 003
4. Fixed global permissions — moved WebSearch, WebFetch, Read, Edit, Write to `~/.claude/settings.json`
5. Discovered project-level `settings.local.json` permissions are unreliable (especially for sub-agents)
6. Ran full permission test suite — 22/22 operations across 4 sub-agents + 6 direct calls, zero prompts
7. Discovered deny rules (`Bash(apt *)`, `Bash(rm -rf /*)`) are completely broken — known Claude Code bug
8. Ran full workspace health check, VPS security audit, project security audit, and pending tasks review
9. Found 3 CRITICAL VPS security issues: SSH password auth enabled, root login allowed, no fail2ban
10. Renamed skill from `/context` → `/winddown` (built-in command collision + hyphens don't work in skill names)
11. Created `security_audits/` directory with first audit report (001)
12. Strengthened "always push to GitHub" rule — moved to top of claude.md, added to both skill files
13. Updated all memory files (MEMORY.md, permissions.md) with session findings

### What Went Right
- Permission system finally working — all tools run without prompting after moving to global settings
- Sub-agent autonomy verified — can run complex parallel tasks without user intervention
- Audit surfaced real VPS security issues that need fixing
- Good documentation habits — everything learned was captured in memory files

### What Went Wrong / Needs Improvement
- Forgot to `git push` after multiple commits — violated our own rule. Fixed by strengthening wording in claude.md
- Permission debugging took many iterations (project-level → global, plain names → wildcards → back to plain)
- Deny rules wasted time — they look correct but are a confirmed Claude Code bug
- `/context` name collision wasn't caught during planning — should have checked built-in commands first
- `/wind-down` (hyphenated) also failed — skill names can't have hyphens
- `/winddown` still shows "unknown skill" in current session — needs session restart to be discovered
- Read tool prompted on `~/.claude/settings.json` — Claude's own config files have built-in protection
- `apt update` accidentally ran during deny rule testing — no harm done but proves deny rules are broken

### Pending / Next Session
- **URGENT: SSH hardening** — password auth is ON, root login allowed, no fail2ban, firewall off. See `security_audits/001_full-workspace-and-vps-audit.md` for full details and remediation steps
- **Set up PreToolUse hooks** to enforce apt/rm -rf denies (since deny rules are broken)
- **Test `/winddown` skill** after session restart to confirm it works
- **MCP servers** — 3 researched with ready config, never installed (Brave Search, Reddit, Stealth Browser)
- **Fix /research v2 issues** — citation inconsistency, `--quick` mode untested, append mode untested
- **Update project-level memory** at `/root/.claude/projects/-root-projects-Agent/memory/MEMORY.md` — stale (missing winddown skill, dump 003-004)
- **Add `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt` to .gitignore**
- **Consider replacing Tailscale IP in .env.example** with placeholder

### Git State
- Branch: `main`
- Latest commits (newest first):
  - `3f5a9ca` chore: strengthen git push rule — top of claude.md + both skill files
  - `ee64e08` feat: rename /context skill to /winddown, add security audit
  - `25cad5f` docs: context dump 003 — context-skill-build-and-test
  - `48ba980` wip: uncommitted changes before context dump 003
  - `e505a51` docs: context dump 003 — foundation cleanup and code review session
- Uncommitted changes: none (clean working tree before this dump)

### Files Modified This Session
| File | Action |
|------|--------|
| `~/.claude/settings.json` | Modified — added WebSearch, WebFetch, Read, Edit, Write to global allow |
| `.claude/settings.local.json` | Modified — added Read, Edit, Write (redundant fallback) |
| `.claude/claude.md` | Modified — strengthened git push rule, moved to top |
| `.claude/skills/context/SKILL.md` | Deleted — renamed to winddown |
| `.claude/skills/winddown/SKILL.md` | Created — renamed from context, updated frontmatter + changelog |
| `.claude/skills/research/SKILL.md` | Modified — added git push rule |
| `context_dumps/003_context-skill-build-and-test.md` | Created |
| `security_audits/001_full-workspace-and-vps-audit.md` | Created |
| `~/.claude/projects/-root-projects/memory/MEMORY.md` | Modified — skill rename, permission findings |
| `~/.claude/projects/-root-projects/memory/permissions.md` | Created/rewritten — full permissions documentation |

### Key Decisions / Preferences Learned
- **All permissions must go in global `~/.claude/settings.json`** — project-level is unreliable
- **Deny rules don't work** — use PreToolUse hooks instead (TODO)
- **Don't use `Read(*)` wildcards** — plain `Read` works; wildcards cause issues
- **Skill names can't have hyphens** and can't collide with built-in commands
- **New skills need a session restart** to be discovered
- **Always check built-in commands** before naming a skill (`/context`, `/compact`, etc. are taken)
- **Git push after EVERY commit** — Nate expects this, it's now the #1 rule in claude.md
- **Claude's own config files always prompt for edit permission** — this is by design and can't be overridden
- **For long autonomous sessions**: save tasks requiring apt or rm -rf as pending for when Nate is at the computer
