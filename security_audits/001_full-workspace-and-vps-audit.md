# Security & Workspace Audit — 2026-03-04

## 1. VPS Security

### External Firewall (Hostinger Control Panel)

**The VPS is protected by Hostinger's network-level firewall.** This was confirmed on 2026-03-05 by reviewing the Hostinger control panel. Rules:

| Action | Protocol | Port | Source IP | Dest IP |
|--------|----------|------|-----------|---------|
| **ACCEPT** | UDP | 41641 | any | any |
| **DROP** | any | any | any | any |

- **UDP 41641** is Tailscale's WireGuard port — the only traffic allowed through
- **Everything else is dropped** at the network level before reaching the VPS
- SSH (port 22) is **NOT reachable** from the public internet
- The public IP `187.77.218.185` is effectively locked down — only Tailscale peers can connect

This means the on-server SSH findings below are **defense-in-depth recommendations, not urgent vulnerabilities**.

### On-Server Findings

| Severity | Finding | Details |
|----------|---------|---------|
| **LOW** | SSH password auth is ON | `/etc/ssh/sshd_config.d/50-cloud-init.conf` sets `PasswordAuthentication yes` — mitigated by Hostinger firewall blocking port 22 from public internet |
| **LOW** | Root login allowed | `PermitRootLogin yes` in sshd_config — mitigated by firewall, only Tailscale peers can reach SSH |
| **LOW** | No brute-force protection | fail2ban not installed — low risk since SSH isn't publicly reachable |
| **INFO** | UFW inactive | On-server firewall is off, but Hostinger's network firewall handles this. UFW would be a redundant backup layer |
| **LOW** | `~/.claude/` is world-readable | Directory is 755 — credentials file inside is 600 (good) but directory listing is visible to other local users |
| **OK** | n8n bound to localhost only | Port 5678 not exposed publicly |
| **OK** | Tailscale working | Two devices connected (VPS + MacBook), direct connection |
| **OK** | Auto security updates enabled | unattended-upgrades running |
| **OK** | Disk: 6.3G of 96G used (7%) | Plenty of space |
| **OK** | Docker daemon not exposed | No remote API, n8n on localhost only |
| **OK** | No unexpected users | Only root, ubuntu (default), sync (system) |
| **OK** | No suspicious cron jobs | Standard Ubuntu entries only |

### Defense-in-Depth Recommendations (Not Urgent)

These are all nice-to-haves since Hostinger's firewall is the primary protection:

1. **Disable SSH password auth** — edit `/etc/ssh/sshd_config.d/50-cloud-init.conf`, set `PasswordAuthentication no`, restart SSH
2. **Set `PermitRootLogin prohibit-password`** in `/etc/ssh/sshd_config`
3. **Install fail2ban** — extra safety net
4. **Enable UFW** — redundant backup to Hostinger firewall (`ufw allow from 100.64.0.0/10` then `ufw enable`)
- ~~chmod 700 ~/.claude/~~ — skipped, Nate is the only user on the VPS

---

## 2. Project Security — Clean

| Finding | Status |
|---------|--------|
| Secrets in git history | **OK** — none found |
| .gitignore coverage | **FIXED** — added `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt` (2026-03-05) |
| .env files | **OK** — no live .env, example has no real values |
| Hardcoded secrets | **OK** — none |
| File permissions | **OK** — no world-writable files |
| Claude settings | **OK** — no sensitive data |
| Docker files | **OK** — none in repo |
| Tailscale IP in .env.example | **FIXED** — replaced with `YOUR_TAILSCALE_IP` placeholder (2026-03-05). Note: old IP still in git history, but non-routable and low risk. |

### Recommended Actions
All completed — no remaining project security actions.

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
MCP server install is highest priority next step (config is already written). VPS SSH hardening is defense-in-depth, not urgent.

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
