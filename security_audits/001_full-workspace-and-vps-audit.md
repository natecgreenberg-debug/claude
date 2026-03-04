# Security & Workspace Audit — 2026-03-04

## 1. VPS Security — 3 CRITICAL Issues

| Severity | Finding | Details |
|----------|---------|---------|
| **CRITICAL** | SSH password auth is ON | `/etc/ssh/sshd_config.d/50-cloud-init.conf` sets `PasswordAuthentication yes` and wins over `60-cloudimg-settings.conf` that tries to set `no` (sshd uses first match) |
| **CRITICAL** | Root login allowed | `PermitRootLogin yes` in sshd_config — anyone can attempt root password login |
| **CRITICAL** | No brute-force protection | fail2ban is not installed. No crowdsec or sshguard either |
| **WARNING** | Firewall is OFF | UFW is inactive. iptables rules are only from Tailscale/Docker. SSH port 22 is exposed on public IP `187.77.218.185` |
| **WARNING** | `~/.claude/` is world-readable | Directory is 755 — credentials file inside is 600 (good) but directory listing is visible |
| **OK** | n8n bound to localhost only | Port 5678 not exposed publicly |
| **OK** | Tailscale working | Two devices connected, direct connection |
| **OK** | Auto security updates enabled | unattended-upgrades running |
| **OK** | Disk: 6.3G of 96G used (7%) | Plenty of space |
| **OK** | Docker daemon not exposed | No remote API, n8n on localhost only |
| **OK** | No unexpected users | Only root, ubuntu (default), sync (system) |
| **OK** | No suspicious cron jobs | Standard Ubuntu entries only |

### Priority Remediation

1. **Fix SSH password auth** — edit or remove `/etc/ssh/sshd_config.d/50-cloud-init.conf`, set `PasswordAuthentication no`, then `systemctl restart ssh`
2. **Set `PermitRootLogin prohibit-password`** in `/etc/ssh/sshd_config` (line 130), then restart SSH
3. **Install fail2ban** — `apt install fail2ban` and enable the sshd jail
4. **Enable UFW** — `ufw allow from 100.64.0.0/10` then `ufw enable` (allow Tailscale range first so you don't lock yourself out)
5. **chmod 700 ~/.claude/** — minor but good practice

**Bottom line**: SSH is exposed to the public internet with password auth enabled and no brute-force protection. Most urgent thing to fix.

---

## 2. Project Security — Clean

| Finding | Status |
|---------|--------|
| Secrets in git history | **OK** — none found |
| .gitignore coverage | **WARNING** — missing `*.pem`, `*.key`, `*.p12`, `*.pfx` patterns |
| .env files | **OK** — no live .env, example has no real values |
| Hardcoded secrets | **OK** — none |
| File permissions | **OK** — no world-writable files |
| Claude settings | **OK** — no sensitive data |
| Docker files | **OK** — none in repo |
| Tailscale IP in .env.example | **INFO** — `100.114.8.49` is in a public repo, not routable but reveals topology |

### Recommended Actions
1. Add `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt` to `.gitignore`
2. Consider replacing Tailscale IP in `.env.example` with placeholder

---

## 3. Workspace Health — Good Shape

| Area | Status |
|------|--------|
| Git state | **OK** — main branch, synced with remote |
| Skills (research + winddown) | **OK** — both valid, well-formed |
| Agents (code-reviewer) | **OK** — present and documented |
| Rules (workflow + code-style) | **OK** |
| Context dumps (001-003) | **OK** — sequential, no gaps |
| Research outputs (2 reports) | **OK** |
| README | **OK** — reflects actual state |

---

## 4. Pending Work

### Started/Planned But Not Done
1. **MCP servers** — 3 researched with ready-to-paste config, never installed (Brave Search, Reddit, Stealth Browser)
2. **/research v2 issues** — citation inconsistency, `--quick` mode untested, append mode untested
3. **Project memory stale** — `/root/.claude/projects/-root-projects-Agent/memory/MEMORY.md` missing /winddown skill and dump 003
4. **Code reviewer agent model** — uses `sonnet-4-5` instead of shorthand `sonnet`
5. **PreToolUse hooks** — needed to enforce apt/rm -rf denies (deny rules are broken)

### Opportunities
1. **PostToolUse hooks** for auto-formatting (black/ruff) — makes code-style rules enforceable
2. **n8n MCP integration** — bridge Claude Code to existing n8n instance
3. **First revenue project** — affiliate content pipeline using /research + n8n + OpenRouter
4. **Additional skills** — `/deploy`, `/fix-issue`, `/review-pr`
5. **Context7 MCP** for real-time library/API documentation access

### Priority Recommendation
Fix VPS security first (SSH hardening), then MCP server install (config is already written).

---

## 5. Permissions Findings (This Session)

### What Works
- Global `~/.claude/settings.json` allow list: `Bash(*)`, `WebSearch`, `WebFetch`, `Read`, `Edit`, `Write`
- All tools work without prompting, including in sub-agents (verified 22/22 operations)

### What Doesn't Work
- **Deny rules are broken** — confirmed bug, multiple GitHub issues (#6699, #6631, #8961)
- **Project-level permissions unreliable** — WebSearch/WebFetch/Read prompted when only in settings.local.json
- **`Read(*)` with wildcard caused issues** — plain `Read` works correctly
- **Claude's own config files always prompt** — built-in safety, can't override

### Skill Discovery
- `/context` collides with built-in Claude Code command (visualizes context usage)
- Renamed to `/winddown` — hyphens in skill names also failed (`/wind-down` = unknown)
- New skills require session restart to be discovered (cached at startup)
