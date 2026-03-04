# Agent Project — Claude Code Brain

## About Nate (The Human)
- Building an AI-powered side hustle operation on a sandboxed Hostinger VPS
- Revenue focus: **affiliate marketing, content creation, digital products, agency services**
- Basic Python skills, familiar with n8n and APIs, learning agentic workflows
- Platforms: Stripe, ClickBank, Amazon affiliates, Canva, OpenRouter, fal.ai, WaveSpeed, kie.ai
- Has domain(s) available for projects
- Partnership mindset — aggressive permissions, treat this VPS as expendable
- Will provide business documents for additional context over time

## How We Work Together
- **Plan → Build → Verify** — always follow this loop
- **Planning is sacred**: Ask questions until 99% confident, then propose a plan, get approval, *then* build
- **NEVER auto-proceed on plans** — always present the plan and wait for Nate's explicit approval before building. No exceptions.
- Don't explain unless Nate asks — just do the work efficiently
- When something breaks, Nate describes the problem, I debug and fix
- Nate does both long deep sessions and quick bouncing between ideas
- Commit to git regularly with descriptive messages and **always push to GitHub** after making changes
- When Nate makes a correction or shares a helpful note, ask if he wants it added to this `claude.md` file
- When context gets high, proactively compact
- **Session wind-down**: When Nate signals a session is ending (or context is critically high), always: (1) summarize what was done + what's next, (2) write/update a context dump in `context_dumps/`, (3) commit all changes and push to GitHub. The next agent should be able to pick up exactly where we left off.

## Environment
- **OS**: Ubuntu 24.04 on Hostinger VPS
- **Access**: Tailscale only (IP: 100.114.8.49), firewall drops everything else
- **IDE**: Antigravity (VS Code fork) + Claude Code via Remote SSH
- **Docker**: Installed, n8n running at `http://100.114.8.49:5678`
- **GitHub**: SSH configured, user `natecgreenberg-debug`
- **Python**: 3.12.3 — always use virtual environments for projects
- **Workspace root**: `~/projects/Agent/`

## API & Integrations
- **n8n**: `http://100.114.8.49:5678` — workflow automation hub
- **AI APIs**: OpenRouter (multi-model access), fal.ai, WaveSpeed, kie.ai
- **Affiliate**: ClickBank, Amazon Associates
- **Payments**: Stripe
- **Design**: Canva
- **Upcoming**: Gemini API (500 free tickets), more as needed
- API keys stored in `.env` files (never committed to git)

## Code Standards
- Python as primary language, virtual environments always
- Use `.env` for secrets, never hardcode API keys
- Modular code — small functions, clear names
- When building anything with a UI, use screenshot comparison loop for quality
- Use sub-agents for expensive operations (research, code review) to keep parent context clean

## Project Structure
```
~/projects/Agent/
├── .claude/           # Claude Code configuration
│   ├── claude.md      # This file — project brain
│   ├── skills/        # Reusable skill definitions
│   ├── agents/        # Sub-agent definitions
│   └── rules/         # Modular rules
├── projects/          # Individual project directories
├── research/          # Research outputs and reports
├── tools/             # Shared utilities and scripts
├── data/              # Data files, exports, datasets
└── .env               # API keys (gitignored)
```

## Sub-Agents Available
- **research**: Deep research using Sonnet, returns concise summaries, keeps expensive work out of parent context
- **code-reviewer**: Zero-context code review, objective and unbiased, returns only specific actionable changes

## Areas of Interest (Exploring)
These are brainstorming ideas and directions Nate is interested in — not a locked-in plan:
1. **Affiliate Marketing**: Product reviews, comparison content, niche sites (ClickBank, Amazon)
2. **Content Creation**: AI-assisted content pipelines, newsletters, social media
3. **Digital Products**: Templates, courses, ebooks, micro-tools
4. **Agency Services**: Offer AI-powered automation services to clients

## First Priority
Extensive parallel research using sub-agents — Nate will brief on specifics after workspace setup.
