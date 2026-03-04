# Agent

AI-powered workspace for exploring side hustle ideas through automation, content, and agentic workflows.

## What This Is
A sandbox environment running on a Hostinger VPS (Ubuntu 24.04) behind Tailscale, powered by Claude Code. Areas being explored include:

- **Affiliate Marketing** — AI-generated reviews, comparisons, and content funnels
- **Content Creation** — Automated content pipelines for blogs, newsletters, and social
- **Digital Products** — Templates, tools, courses, and ebooks
- **Agency Services** — AI-powered automation services for clients

## Stack
- **AI**: Claude Code, OpenRouter, fal.ai, WaveSpeed, kie.ai
- **Automation**: n8n (self-hosted)
- **Payments**: Stripe, ClickBank, Amazon Associates
- **Language**: Python 3.12
- **Infra**: Docker, Tailscale, GitHub

## Structure
```
.claude/          → Claude Code config, agents, skills, rules
projects/         → Individual project directories
research/         → Research outputs and reports
tools/            → Shared utilities and scripts
data/             → Data files, exports, datasets
```

## Setup
```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Copy and fill in your API keys
cp .env.example .env
```
