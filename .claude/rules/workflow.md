---
description: How to approach tasks in this workspace
---

# Workflow Rules

## The Loop: Plan → Build → Verify
Every task follows this pattern. No exceptions.

### Plan
1. Ask clarifying questions until 99% confident you understand the requirement
2. Write a brief plan (in chat or as an artifact for complex tasks)
3. Get explicit approval before building

### Build
1. Create/modify code in small, logical steps
2. Commit to git after each meaningful chunk with descriptive messages
3. Use sub-agents for expensive operations (research, code review)
4. Store secrets in `.env`, never hardcode

### Verify
1. Every task must include a verification step
2. Run the code, check the output, confirm it works
3. For UI work: use screenshot comparison loop
4. For APIs: test the endpoints
5. For automations: run a dry test

## When Context Gets High
- Proactively compact before you lose important context
- Summarize what's been done and what's next before compacting
- Leave breadcrumbs in code comments or task files

## Git Habits
- Commit early, commit often
- Always `git push` after committing — never leave unpushed commits
- Message format: `type: description` (e.g., `feat: add research agent`, `fix: handle empty API response`)
- Never commit `.env` files or API keys
