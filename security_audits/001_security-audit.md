# Security & Workspace Audit 001

**Date:** 2026-03-05
**Server:** srv1416588 (Hostinger VPS, Ubuntu 24.04)
**Auditor:** Claude Code (automated)

---

## 1. VPS Security

| Check | Finding | Severity |
|-------|---------|----------|
| **SSH: PermitRootLogin** | `yes` -- root login over SSH is enabled | INFO |
| **SSH: PasswordAuthentication** | Effective value is `yes` (sshd -T confirms). Two conflicting config.d files exist: `50-cloud-init.conf` sets `yes`, `60-cloudimg-settings.conf` sets `no`. OpenSSH uses first match, so `50-cloud-init.conf` wins. | MEDIUM |
| **SSH: PubkeyAuthentication** | `yes` -- enabled | OK |
| **SSH: KbdInteractiveAuthentication** | `no` -- disabled | OK |
| **SSH: X11Forwarding** | `yes` -- enabled but low risk on headless server | INFO |
| **Fail2ban** | Not installed | MEDIUM |
| **UFW (on-server firewall)** | Installed but **inactive** | INFO |
| **Listening ports** | SSH (0.0.0.0:22, [::]:22) is bound on all interfaces. All other services (n8n/5678, node, language_server) are bound to 127.0.0.1 only. Tailscale listens on its own IP. | OK |
| **Unattended upgrades** | Active and running | OK |
| **Disk usage** | 6.3G / 96G used (7%) | OK |
| **Docker containers** | 1 running: `n8n-n8n-1` (n8n on 127.0.0.1:5678) | OK |
| **Users with login shells** | `root` (/bin/bash), `sync` (/bin/sync), `ubuntu` (/bin/bash) | INFO |
| **Recent logins** | All from Tailscale IPs (100.116.143.25) or localhost (tmux, 169.254.0.1). No suspicious external IPs. | OK |
| **Tailscale** | Active, 2 nodes (this server + macbook-pro-67) | OK |

### SSH Config Detail

The main `sshd_config` includes `/etc/ssh/sshd_config.d/*.conf` at the top, and sets `PermitRootLogin yes` at the bottom. Two drop-in files conflict:

- `/etc/ssh/sshd_config.d/50-cloud-init.conf` -- `PasswordAuthentication yes`
- `/etc/ssh/sshd_config.d/60-cloudimg-settings.conf` -- `PasswordAuthentication no`

In OpenSSH, the **first** matching directive wins. Since `50-cloud-init.conf` loads before `60-cloudimg-settings.conf`, password authentication is effectively **enabled**. However, the Hostinger firewall drops all inbound traffic except UDP 41641 (WireGuard/Tailscale), so SSH is only reachable via Tailscale. This significantly reduces the risk, but password auth being enabled is still not ideal.

### Port Analysis

All non-SSH services are bound to `127.0.0.1` only (n8n, VS Code language server, node processes). SSH is the only service exposed on `0.0.0.0`, but protected by the Hostinger firewall allowing only Tailscale traffic.

---

## 2. Project Security

| Check | Finding | Severity |
|-------|---------|----------|
| **`.gitignore` covers `.env`** | Yes -- `.env`, `.env.*`, `!.env.example` | OK |
| **`.gitignore` covers certs** | Yes -- `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt` | OK |
| **Secrets in git history** | `.env.example` was committed (expected). Initial commit contained Tailscale IP (`100.114.8.49`) in `.env.example` which was later removed in commit `30cc840`. No actual secrets (API keys, passwords) found in git history. | OK |
| **Hardcoded secrets in code** | None found. Grep for `sk-`, `api_key=`, `password=`, `token=` across Python/JS/JSON/YAML files returned zero matches. | OK |
| **`.env` files** | Only `.env.example` exists (no actual `.env` with secrets). Permissions: `644` (readable by all local users, but only root and ubuntu have shells). | OK |
| **Claude settings files** | `~/.claude/settings.json` contains no secrets -- only permission rules, hook config, and statusline command. | OK |

### Git History Note

The Tailscale IP `100.114.8.49` was committed in the initial `.env.example` and later scrubbed. This is a private Tailscale IP (not routable on the public internet), so the exposure risk is negligible. The IP remains in git history but poses no practical threat.

---

## 3. Claude Code Security

### Permissions Configuration (`~/.claude/settings.json`)

```
Allow: Bash(*), WebSearch, WebFetch, Read, Edit, Write
Deny:  Bash(apt *), Bash(apt-get *), Bash(rm -rf /*), Bash(rm -rf ~*)
```

**Note:** Per project documentation, deny rules are broken (known Claude Code bug) and not enforced. The PreToolUse hook serves as the actual enforcement mechanism.

### PreToolUse Hook

| Check | Finding | Severity |
|-------|---------|----------|
| **Hook script exists** | Yes, at `/root/projects/Agent/.claude/hooks/deny-commands.sh` | OK |
| **Hook is executable** | Yes (`-rwxr-xr-x`) | OK |
| **Hook registered in settings** | Yes, as PreToolUse matcher for "Bash" | OK |
| **Catches `apt`/`apt-get`** | Yes -- regex `(^|\s|;|&&|\|\|)(apt|apt-get)(\s|$)` | OK |
| **Catches `rm -rf /`** | Yes -- regex `rm\s+-rf\s+(/|~)` | OK |
| **Catches `rm -rf ~/`** | Yes -- same regex matches `~` | OK |
| **Hook action** | Sets `permissionDecision` to `"ask"` (prompts user for approval) | OK |

**Assessment:** The hook correctly intercepts the four dangerous command patterns and prompts for user approval. The regex is well-constructed and handles commands chained with `;`, `&&`, and `||`.

---

## 4. Workspace Health

| Check | Finding | Status |
|-------|---------|--------|
| **Git repo state** | On `main`, up to date with `origin/main`. One deleted file pending: `security_audits/001_full-workspace-and-vps-audit.md` | OK |
| **Skills directory** | Contains `research/SKILL.md` and `winddown/SKILL.md` | OK |
| **Agents directory** | Contains `code-reviewer.md` | OK |
| **Rules directory** | Contains `workflow.md` and `code-style.md` | OK |
| **Context dumps** | 5 files (001-005), sequentially numbered | OK |
| **Research directory** | 2 research reports + `.gitkeep` | OK |
| **README** | Exists at project root | OK |

**Overall workspace health: Good.** All expected files and directories are present. Sequential numbering is intact. No orphaned or unexpected files.

---

## 5. Recommendations

### Priority: MEDIUM

1. **Disable SSH password authentication.** The effective setting is `PasswordAuthentication yes` due to config.d file ordering. Fix by either:
   - Deleting `/etc/ssh/sshd_config.d/50-cloud-init.conf`, or
   - Changing its content to `PasswordAuthentication no`, then running `systemctl restart ssh`
   - The Hostinger firewall mitigates this, but defense-in-depth is good practice.

2. **Install fail2ban.** Even with Tailscale-only access, fail2ban provides an additional layer against brute-force attempts if the firewall config ever changes.
   ```
   apt install fail2ban
   systemctl enable --now fail2ban
   ```

### Priority: LOW

3. **Disable SSH root login (optional).** Currently `PermitRootLogin yes`. Since Nate is the sole user operating as root via Tailscale, this is acceptable. If the `ubuntu` user is ever set up with sudo, consider switching to `PermitRootLogin no`.

4. **UFW is inactive.** The Hostinger firewall handles perimeter security, so the on-server UFW being inactive is not critical. Enabling it would add defense-in-depth but is not urgent given the current Tailscale-only access model.

5. **Review `ubuntu` user.** The `ubuntu` user has a login shell but may be a default cloud image artifact. If unused, consider locking the account: `usermod -L ubuntu`.

### Priority: NONE (Informational)

6. **X11Forwarding is enabled** in SSH config. No practical risk on a headless VPS, but can be disabled for cleanliness.

7. **`.env.example` permissions are 644.** Since it contains no secrets (only placeholder keys), this is fine.

---

*End of audit.*
