# Accessing Claude Code From Your Phone

**Date**: 2026-03-09
**Setup**: Hostinger VPS (Ubuntu 24.04), Tailscale-only access, Antigravity IDE, tmux, Claude Code CLI

---

## TL;DR — Recommended Approaches

**Primary: Claude Code Remote Control** — Official Anthropic feature. Run `/rc` in your existing Claude Code session, scan QR code with phone, get full interactive control from the Claude mobile app. Zero infrastructure to set up. Works on all paid plans.

**Backup: Tailscale + SSH + tmux** — For when Remote Control isn't suitable (e.g., you need raw terminal access, or want to run non-Claude commands). Install Tailscale on phone, use Termius or Blink Shell to SSH in, attach to existing tmux session. You already have the infrastructure for this.

---

## Option 1: Claude Code Remote Control (RECOMMENDED)

### What It Is
Shipped February 2026, Remote Control bridges your local Claude Code terminal session with claude.ai/code and the Claude iOS/Android apps. Your session keeps running locally on the VPS — the phone is just a window into it.

### Setup
1. Ensure Claude Code v2.1.52+ is installed
2. Authenticate via `/login` if not already
3. From an active session, run `/remote-control` (or `/rc`)
4. Terminal displays a session URL and QR code (press spacebar to toggle QR)
5. Scan QR with phone or open URL in Claude mobile app / browser

To start a fresh session directly in Remote Control mode:
```bash
claude remote-control --name "My Project"
```

To enable Remote Control for ALL sessions automatically: run `/config` and set "Enable Remote Control for all sessions" to `true`.

### What You Can Do From Phone
- See exactly what Claude is doing in real-time
- Send messages / give additional instructions
- Approve or reject file changes
- Redirect work if needed
- Conversation stays in sync across terminal, browser, and phone simultaneously

### Security Model
- Outbound HTTPS only — no inbound ports opened on VPS
- All traffic goes through Anthropic API over TLS
- Short-lived, scoped credentials
- Files and MCP servers never leave your machine — only chat messages and tool results flow through the encrypted bridge

### Phone Screen Experience
- The Claude mobile app is designed for phone screens — responsive UI, not a terminal crammed into a small viewport
- Much better than any terminal-on-phone approach for interacting with Claude specifically

### Requirements
- Available on Pro ($20/mo), Max ($100-$200/mo), Team, and Enterprise plans
- API keys NOT supported — must use claude.ai account auth
- Terminal must stay open on VPS (tmux keeps it alive)
- Network outage >10 min causes session timeout

### Limitations
- One remote session per Claude Code instance
- If you close the terminal/process, session ends (but tmux solves this)
- Only controls Claude Code — can't run arbitrary terminal commands

### For Your Setup Specifically
Since you run Claude Code in tmux on the VPS, this is ideal. Start Claude Code inside tmux, run `/rc`, scan QR, walk away. The tmux session keeps the process alive even if your desktop SSH disconnects. You interact from phone via the Claude app — no terminal typing needed.

---

## Option 2: Tailscale + SSH + tmux (BACKUP)

### What It Is
SSH into your VPS from your phone over Tailscale's encrypted mesh network, then attach to your existing tmux session to see Claude Code's terminal output directly.

### Setup

**Phone side:**
- Install Tailscale app (iOS App Store / Google Play) — sign in with same account as VPS
- Install a terminal app:
  - **iOS**: Blink Shell (best — has Tailscale + Mosh integration built in) or Termius
  - **Android**: Termius or JuiceSSH

**VPS side (likely already done):**
- Tailscale installed and running
- Optionally enable Tailscale SSH for keyless auth: `tailscale up --ssh`
- tmux already in use (you have this)

**Connect:**
```bash
# From phone terminal app:
ssh user@your-vps-tailscale-hostname
# Then:
tmux attach -t <session-name>
```

### tmux Tips for Phone
Add to `~/.tmux.conf`:
```
set -g mouse on           # Enable touch scrolling
set -g status off          # Hide status bar, save screen space
bind -n PageUp copy-mode -eu  # PageUp enters scroll mode without prefix
set -g history-limit 10000
```

### What You Can Do
- Full terminal access — run any command, not just Claude Code
- See Claude Code output in real-time
- Type responses to Claude Code prompts
- Run other commands in other tmux panes/windows

### Phone Screen Experience
- Text-only terminal on a small screen — functional but not comfortable for extended use
- Typing commands on phone keyboard is slow and error-prone
- Voice-to-text (Wispr Flow on iOS) helps significantly
- Two-finger swipe in Termius triggers PageUp for scrolling
- Higher information density than a GUI, but readability suffers

### Security
- Tailscale encrypts everything via WireGuard — no public ports exposed
- With Tailscale SSH enabled, no key management needed
- Already fits your Tailscale-only security model perfectly

### Setup Complexity
Minimal — you already have Tailscale and tmux. Just need a phone terminal app.

---

## Option 3: Tailscale Web SSH Console

### What It Is
Tailscale has a built-in browser-based SSH console accessible from the Tailscale admin panel. No app installation needed on the phone beyond Tailscale itself.

### How to Use
1. Open Tailscale admin console in phone browser
2. Hover/tap on your VPS device
3. Click "SSH" button
4. Authenticate with Tailscale identity
5. Get a terminal in the browser

### Pros
- Zero setup — works if Tailscale SSH is enabled on VPS
- No additional apps needed
- End-to-end encrypted, ephemeral session

### Cons
- Browser-based terminal on phone is clunky
- Not clear how well it handles tmux sessions
- Less feature-rich than a dedicated terminal app
- Session is ephemeral — doesn't persist like a real SSH connection

### Verdict
Good for quick emergency checks, not for regular use.

---

## Option 4: ttyd (Web Terminal)

### What It Is
ttyd serves a terminal session via WebSocket to any browser. Bind it to your Tailscale IP and access from phone browser.

### Setup
```bash
apt install ttyd
# Bind to Tailscale IP only — never 0.0.0.0
ttyd -p 7681 -i $(tailscale ip -4) -c user:password tmux attach
```

### Pros
- Full terminal in phone browser
- Can attach directly to tmux session
- No app install on phone beyond Tailscale

### Cons
- Another service to maintain and secure
- Browser terminal UX on phone is mediocre
- Need to manage authentication (basic auth + Tailscale)
- Adds attack surface (even behind Tailscale, it's another listening port)

### Security
- Bind ONLY to Tailscale IP — never expose publicly
- Use `-c user:password` for basic auth as second layer
- Behind Tailscale, only devices on your tailnet can reach it

### Verdict
Overkill given that Remote Control exists. Only useful if you need browser-based raw terminal access and don't want to install an SSH app.

---

## Option 5: code-server (VS Code in Browser)

### What It Is
Runs VS Code in the browser. Actively maintained (v4.109.5 released March 2026).

### Setup
```bash
curl -fsSL https://code-server.dev/install.sh | sh
# Configure to bind to Tailscale IP
code-server --bind-addr $(tailscale ip -4):8080
```

### Phone Screen Experience
- VS Code UI is not designed for phone screens — panels, sidebars, and file trees are painful to navigate
- Integrated terminal works but is tiny
- Better on tablet than phone

### Verdict
Not recommended for phone use. If you want VS Code on the go, a tablet with code-server behind Tailscale would work. On a phone screen, it's frustrating.

---

## Option 6: Monitoring-Only (Notifications)

### What It Is
Don't interact from phone — just get notified when something completes.

### Telegram Bot (Simplest)
```bash
# Create bot via @BotFather on Telegram, get token
# Get your chat_id by messaging the bot and checking:
# https://api.telegram.org/bot<TOKEN>/getUpdates

# Add to end of autonomous run scripts:
notify() {
  curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$1"
}

# Usage:
claude --remote "Fix the bug" && notify "Task complete" || notify "Task FAILED"
```

### Claude Code Hooks
You could add a hook that fires on session end or task completion to send a notification.

### Pros
- No terminal interaction needed on phone
- Works with any phone, any screen size
- Very lightweight

### Cons
- Monitoring only — can't steer or approve from phone
- Need to set up bot (one-time, ~5 minutes)

### Verdict
Good complement to Remote Control. Set up Telegram notifications for autonomous runs, use Remote Control when you need to interact.

---

## Comparison Matrix

| Option | Interaction Level | Phone Screen UX | Setup Complexity | Security Risk | Best For |
|--------|------------------|-----------------|------------------|---------------|----------|
| **Remote Control** | Full (Claude-specific) | Excellent | None (built-in) | None (TLS/Anthropic) | Daily use with Claude Code |
| **SSH + tmux** | Full (any terminal) | Functional | Low (install app) | None (Tailscale) | Raw terminal access |
| **Tailscale Web SSH** | Full (any terminal) | Poor | None | None (Tailscale) | Emergency quick checks |
| **ttyd** | Full (any terminal) | Mediocre | Medium | Low (extra port) | Browser-only access |
| **code-server** | Full (VS Code) | Poor on phone | Medium | Low (extra port) | Tablet use only |
| **Telegram notify** | Monitor only | Excellent | Low (one-time) | None | Autonomous run alerts |

---

## Recommended Setup for Your VPS

### Step 1: Enable Remote Control (5 minutes)
1. Update Claude Code to latest version
2. In your Claude Code session, run `/config` and enable "Remote Control for all sessions"
3. Install Claude app on phone (iOS/Android)
4. When you walk away: `/rc` in Claude Code, scan QR, done

### Step 2: Install Termius/Blink on Phone (5 minutes)
1. Install Termius (both platforms) or Blink Shell (iOS)
2. Add your VPS as a host using its Tailscale hostname
3. Use for raw terminal access when needed

### Step 3: Set Up Telegram Notifications (optional, 10 minutes)
1. Create bot via @BotFather
2. Store token in `.env` on VPS
3. Add `notify()` function to your shell profile
4. Use for autonomous run completion alerts

This gives you full coverage: interactive Claude control (Remote Control), raw terminal when needed (SSH), and passive monitoring (Telegram).

---

## Sources

- [Claude Code Remote Control Docs](https://code.claude.com/docs/en/remote-control)
- [Claude Code on the Web Docs](https://code.claude.com/docs/en/claude-code-on-the-web)
- [Seamless Claude Code Handoff: SSH From Your Phone With tmux](https://elliotbonneville.com/phone-to-mac-persistent-terminal/)
- [Code From Your Phone: tmux + Tailscale + Termius + Claude Code](https://emreisik.dev/code-from-your-phone-like-a-boss-tmux-tailscale-termius-claude-code-developer-heaven-95119c704f20)
- [Running Claude Code from iPhone via SSH + tmux](https://dev.to/shimo4228/running-claude-code-from-iphone-via-ssh-tmux-4c10)
- [Blink Shell Tailscale Integration](https://docs.blink.sh/integrations/tailscale+mosh)
- [Tailscale Web-Based SSH Console](https://tailscale.com/blog/tailscale-web-ssh-console)
- [Tailscale iOS Install Docs](https://tailscale.com/kb/1020/install-ios)
- [ttyd GitHub](https://github.com/tsl0922/ttyd)
- [code-server GitHub](https://github.com/coder/code-server)
- [claude-code-remote (ttyd + Tailscale helper)](https://github.com/buckle42/claude-code-remote)
- [Vibe Coding 24/7 On A Screen For Ants](https://www.panozzaj.com/blog/2026/01/07/vibe-coding-24-7-on-a-screen-for-ants/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
