# Automated Affiliate Machine

Fully autonomous agent systems for affiliate marketing at scale. $10K MRR target.

## Vision
AI agents that create content and post across platforms 24/7 without human review. Volume approach — accounts are expendable, systems are resilient.

## Architecture
- **Multi-account management**: GoLogin (free tier = 3 profiles, scale to paid)
- **All-channel approach**: Every platform that works for automated affiliate posting
- **Mixed offers**: Recurring SaaS + high-ticket SaaS + ClickBank + Amazon Associates
- **Account creation pipeline**: Automated signup via Playwright, credentials stored in local JSON tracker

## Tech Stack ($0)
| Tool | Purpose | Status |
|------|---------|--------|
| Playwright | Browser automation, account creation, posting | Installed |
| n8n | Workflow orchestration, scheduling | Running (port 5678) |
| Firecrawl | Web scraping, offer discovery | Self-hosted (port 3002) |
| OpenRouter | AI content generation | Active ($10 balance) |
| Shlink | Affiliate link tracking | To deploy |
| GoLogin | Multi-account browser profiles | Free tier (3 profiles) |

## Offer Sources
- **SaaS Recurring**: Systeme.io (60% lifetime), GetResponse (33-60%), AWeber (30-50%), etc.
- **High-ticket SaaS**: SEMrush ($200/sale), Kinsta ($500+10%), HubSpot (up to $1K)
- **ClickBank**: High-gravity digital products (categories TBD by research)
- **Amazon Associates**: High-commission niches ($20+/sale, categories TBD)

## Project Structure
```
affiliate-machine/
  README.md              -- this file
  ARCHITECTURE.md        -- agent system designs (TBD)
  programs.json          -- affiliate program database
  keywords.json          -- target keyword research
  content_calendar.py    -- content planning script
  n8n_workflows/         -- n8n workflow documentation
  requirements.txt       -- Python dependencies
```

## Research
- Run 003: `research/deep-research/2026-03-10_*.md` (9 SaaS-focused reports)
- Run 004: `research/deep-research/2026-03-10_automated-*.md` (automation-focused)
