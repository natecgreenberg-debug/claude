# Claude Code Plugins, Skills, Tips & Tricks — Research Report

**Generated:** 2026-03-09 | **Date Range:** 2026-02-07 to 2026-03-09
**Sources:** Reddit, Polymarket, Web (X/YouTube unavailable this run)

---

## What I learned

**Plugins are exploding — the ecosystem just crossed critical mass.** The r/ClaudeCode and r/ClaudeAI subreddits are full of plugin announcements. The highest-engagement post was **crit** (90 upvotes, 26 comments on r/ClaudeCode), a terminal review tool for reviewing Claude Code plans and documents before execution. A **SwiftUI audit plugin** got 48 upvotes on r/iOSProgramming — it found 24 issues that every other tool missed. A **hexagonal architecture enforcement plugin** for Symfony projects hit r/symfony. And a **persistent project memory plugin** on r/AskVibecoders solves the "Claude forgets between sessions" problem that people constantly complain about.

**Skills are becoming domain-specific power tools.** Skills for PowerApps/Power Automate appeared on r/PowerApps, and the official Anthropic skills repo (github.com/anthropics/skills) is growing. The **claude-code-plugins-plus-skills** repo on GitHub now lists 270+ plugins with 739 agent skills, including a CCPI package manager. A curated **awesome-claude-plugins** repo tracks adoption metrics across GitHub using n8n workflows.

**Token optimization is a hot discussion.** A "Token Optimization Starter Template" on r/claude got strong engagement — top comment: "The '1-2 steps per response' and 'one decision at a time' rules alone probably save 50% of wasted tokens from Claude going off on tangents." The broader consensus per r/ClaudeAI: "Claude Code doesn't get lazy. You get lazy with your prompts."

**Multi-agent workflows are going mainstream.** A post on r/ClaudeAI about running 3 AI agents simultaneously (strategist, UX designer, programmer) on the same project got attention. This matches the web sources — per Stackademic and Level Up Coding, spinning up parallel agents via Git Worktrees, each with their own context window coordinating through shared task lists, is considered the advanced productivity play.

**MCP integrations are the new frontier.** Per r/CRM discussions, connecting CRMs via MCP servers to Claude is already happening. Web sources emphasize Context7 MCP for grabbing live documentation — "if you're not using MCPs, you're basically driving a Ferrari in first gear," per Stackademic.

**CLAUDE.md is the most important file in your repo.** Multiple web sources (InfoQ, White Prompt Blog, Boris Tane's blog) converge on this: the CLAUDE.md file is your single most important tool for guiding Claude Code. Teams at Anthropic maintain CLAUDE.md in git to document mistakes so Claude improves over time. Best practices include style conventions, design guidelines, PR templates, and error logs.

**Plan Mode is the consensus #1 tip.** Nearly every source — Reddit, blogs, and the official Claude Code docs — says the same thing: never let Claude write code until you've reviewed and approved a plan. Use Plan mode, iterate until the plan is solid, then switch to auto-accept. Per InfoQ's interview with Claude Code's creator, this separation of planning and execution is "the single most important thing."

**Verification loops multiply quality 2-3x.** Per the official Claude Code common workflows docs and multiple blog posts, giving Claude a way to verify its own work (bash command, test suite, browser testing) improves final output quality by a factor of 2-3x.

## KEY PATTERNS from the research

1. **Plugin-first development** — The ecosystem is shifting from "prompt engineering" to "plugin engineering." Dedicated tools like crit, SwiftUI auditor, and architecture enforcers let Claude Code check its own work against domain rules. Per r/ClaudeCode.

2. **Skills as reusable workflows** — Skills (SKILL.md files) are becoming the standard way to package repeatable multi-step processes. The official Anthropic skills repo and 270+ community plugins show this is the dominant pattern. Per Composio.

3. **Context management is everything** — Token optimization templates, CLAUDE.md documentation, and persistent memory plugins all attack the same problem: Claude loses context and goes off-track. The community consensus is that structured context beats raw conversation length. Per r/claude.

4. **Multi-agent parallelism** — Running multiple Claude Code agents on the same project (via worktrees or separate terminals) is the power-user move. Each agent gets its own context window and role. Per r/ClaudeAI.

5. **Plan-then-execute discipline** — The #1 productivity tip across all sources: use Plan mode, get the plan right, then auto-accept. Don't let Claude improvise. Per InfoQ.

---

## Relevant Prediction Markets

- **Claude 5 release by March 31:** 28% (down 10.6% this month) — $2.2M volume on Polymarket. Market is skeptical of an imminent release.
- **Claude on Humanity's Last Exam (45%+ by June 30):** 94% confidence — market believes Claude will hit this benchmark.
- **Claude on FrontierMath (50%+ by June 30):** 81% Yes (up 35% today) — strong bullish signal on Claude's math capabilities.

---

## Source Counts

```
---
├─ Reddit: 86 threads | 208 upvotes | 93 comments
├─ Polymarket: 9 markets | Claude 5: 28%, HLE 45%: 94%, FrontierMath 50%: 81%
├─ Web: 20 pages — Composio, Level Up Coding, Geeky Gadgets, Medium/ArcKit, Claude Code Docs, InfoQ, Boris Tane, White Prompt Blog, Stackademic, DEV Community, F22 Labs, Intelligent Tools, Claude Code Plugins Hub
└─ Top voices: r/ClaudeCode, r/ClaudeAI, r/claude, r/iOSProgramming, r/symfony, r/AskVibecoders
---
```

**Sources not available this run:**
- X/Twitter: 0 posts (no XAI_API_KEY configured)
- YouTube: 0 videos (yt-dlp search returned no results for this query)
- TikTok: not configured
- Instagram: not configured
- Hacker News: 0 stories (no matches)

---

## Notable Plugins & Tools Mentioned

| Plugin/Tool | What It Does | Source |
|---|---|---|
| **crit** | Terminal review tool for Claude Code plans/documents | r/ClaudeCode (90 upvotes) |
| **SwiftUI Audit Plugin** | Audits SwiftUI apps from user perspective, found 24 issues | r/iOSProgramming (48 upvotes) |
| **Hexagonal Architecture Plugin** | Enforces hexagonal architecture in Symfony projects | r/symfony (22 upvotes) |
| **Persistent Memory Plugin** | Makes Claude persist project memory between sessions | r/AskVibecoders (18 upvotes) |
| **OnUI** | Solves "which element?" problem in UI workflows | r/ClaudeCode |
| **Event Horizon** | VS Code extension for agent visualization | r/SideProject |
| **Claude-Mem** | Long-term memory for context across sessions | Composio |
| **Superpowers** | Structured lifecycle planning + skills framework | Composio |
| **Local-Review** | Parallel local diff code reviews with multiple agents | Composio |
| **Plannotator** | Structured, annotated plans in planning mode | Composio |
| **Ralph Wiggum Plugin** | Visual testing by driving Xcode simulator | Composio |
| **Context7 MCP** | Grabs live documentation for any technology on the fly | Stackademic |
| **claude-code-plugins-plus-skills** | 270+ plugins, 739 skills, CCPI package manager | GitHub |
| **awesome-claude-plugins** | Adoption metrics tracker using n8n workflows | GitHub |

---

## Top Productivity Tips (Consensus Across Sources)

1. **Use Plan Mode religiously** — iterate on plan before any code generation
2. **Maintain CLAUDE.md** — document project conventions, mistakes, and style guides
3. **Add verification loops** — let Claude run tests/commands to check its own work (2-3x quality improvement)
4. **Use skills for repeatable workflows** — package multi-step processes as SKILL.md files
5. **Install plugins for domain guardrails** — architecture enforcers, audit tools, review tools
6. **Token optimization** — "1-2 steps per response," "one decision at a time," structured context over raw conversation
7. **Multi-agent parallelism** — use Git Worktrees to run multiple Claude instances on the same project
8. **MCP integrations** — connect external tools (CRMs, docs, databases) via Model Context Protocol
9. **Run `claude update latest` regularly** — minor releases carry major quality-of-life improvements
10. **Custom slash commands** — turn complex multi-step workflows into single commands

---

*Research conducted with /last30days v2.9.5. Reddit bug fix confirmed working (86 threads returned vs 0 in previous run).*
