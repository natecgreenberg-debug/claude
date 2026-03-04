# Research Report: Claude Code Best Practices for Agentic Workflows
**Date**: 2026-03-04
**Mode**: Deep parallel research (4 source categories)

## Executive Summary
Context window management is the single most critical discipline for effective Claude Code agentic workflows — performance degrades as context fills, and virtually every best practice flows from this constraint. The five core extension mechanisms (CLAUDE.md, Skills, Sub-agents, Hooks, MCP servers) form a layered system where CLAUDE.md provides persistent project context, Skills deliver reusable on-demand workflows, Sub-agents isolate expensive operations, Hooks enforce deterministic automation, and MCP servers connect external tools. The most impactful immediate actions are: keeping CLAUDE.md under 200 lines, using sub-agents for all research/exploration, setting up PostToolUse hooks for auto-formatting, and creating custom Skills for repeatable workflows.

## General Web Findings

### Core Architecture: Five Extension Mechanisms

Claude Code provides five primary ways to extend its capabilities:

| Extension | Loads When | Separate Context | Best For |
|-----------|-----------|-----------------|----------|
| **CLAUDE.md** | Every session (auto) | No | Always-true project rules, build commands |
| **Skills** | On-demand or auto-matched | No (unless `context: fork`) | Reusable workflows, templates |
| **Sub-agents** | When spawned | Yes (isolated) | Research, code review, parallel tasks |
| **Hooks** | At lifecycle events | N/A (deterministic) | Auto-format, linting, quality gates |
| **MCP Servers** | Session start | N/A (external) | GitHub, databases, APIs, Slack |

### CLAUDE.md Best Practices

**Include:** Build/test/lint commands Claude can't infer, code style deviations from defaults, workflow constraints, architectural decisions, common gotchas.

**Exclude:** Anything Claude can read from code, standard language conventions, detailed API docs (link instead), long tutorials.

**Key principles:**
- Target under 200 lines per file — bloated files get deprioritized as context fills
- Use emphasis ("IMPORTANT", "YOU MUST") for critical rules
- Hierarchical loading: global (`~/.claude/CLAUDE.md`) → project (`./CLAUDE.md`) → directory-specific → local (`.local.md`)
- Import files with `@path/to/file` syntax (max 5 hops)
- Use `.claude/rules/` for modular, path-scoped rules with YAML `paths:` frontmatter
- CLAUDE.md survives compaction — Claude re-reads from disk after `/compact`
- Instructions suffer from "context drift" in long sessions — no enforcement mechanism exists

### Sub-agent Patterns

**When to use parallel dispatch (ALL must be true):**
- 3+ independent tasks across different domains
- No shared state between operations
- Clear file boundaries without overlap

**When to use sequential dispatch (ANY triggers):**
- Tasks have dependencies
- Shared files creating merge conflict risk
- Unclear scope requiring exploration first

**Effective patterns:**
- Context isolation: delegate research/exploration so verbose output stays out of main context
- Parallel research: spawn multiple sub-agents for independent investigations
- Writer/Reviewer: one session writes code, another reviews in fresh context
- Resumption: sub-agents can be resumed with full history preserved

**Cost tip:** Set `CLAUDE_CODE_SUBAGENT_MODEL` to Sonnet while keeping main session on Opus.

### Skills System

Skills are defined as `SKILL.md` files in `.claude/skills/<skill-name>/`. Two types:
- **Reference content**: Conventions, patterns loaded when relevant (auto-invocation)
- **Task content**: Step-by-step workflows invoked with `/skill-name`

Key frontmatter: `name`, `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `context: fork`, `agent`, `model`.

Dynamic context injection via `` !`command` `` syntax runs shell commands before skill content is sent.

### Hooks System

Hooks provide **deterministic** automation that CLAUDE.md instructions cannot guarantee. 16 event types cover the full lifecycle:

- `PreToolUse` / `PostToolUse` — before/after tool execution (match by tool name)
- `SessionStart` / `SessionEnd` — session lifecycle
- `SubagentStart` / `SubagentStop` — sub-agent lifecycle
- `Stop` — when Claude finishes responding
- `TaskCompleted` — when a task is marked done

Four handler types: `command` (shell), `http` (webhook), `prompt` (LLM evaluation), `agent` (multi-turn verification).

### Workflow Optimization

- **Plan Mode reduces token consumption by 25-45%** on complex tasks
- **Spec-driven development** works exceptionally well — detailed upfront specs save 6-10x manual effort
- **Self-verification loops** dramatically improve output quality (tests, screenshots, linting)
- **Course-correct early**: after 2+ failed corrections, `/clear` and restart rather than spiraling

## Community Insights (Reddit/Forums)

### What Power Users Agree On

- **Context hygiene is non-negotiable**: `/clear` between unrelated tasks, `/compact` at ~60% capacity, specify files explicitly rather than letting Claude scan everything
- **Claude Code works best as a "non-deterministic compiler"** requiring constant human steering — not an autonomous replacement for developer judgment
- **Commit obsessively** as checkpoints against Claude's tendency to rewrite working code
- **Small steps beat big prompts**: "Build me a dashboard" produces worse results than decomposed step-by-step requests
- **Cache expiry matters**: prompt cache expires after 5-15 minutes idle — don't leave sessions sitting

### Common Pitfalls (Consensus Warnings)

1. **YOLO mode / full autonomy fails**: Letting Claude make all decisions without checkpoints leads to wrong-turn spirals that waste tokens
2. **Over-specified CLAUDE.md gets ignored**: Exhaustive rule files are deprioritized. Iterative correction sometimes works better
3. **Complex refactors and performance optimization** are weak spots — agents struggle with abstract system-wide reasoning
4. **Trusting completion signals**: Claude cannot reliably communicate confidence or whether it actually completed correctly
5. **Long idle sessions**: cache expires, context degrades, costs balloon when resuming stale sessions

### Language Considerations (from Armin Ronacher / Flask creator)

- **Go** is strongly recommended for backend agentic work: explicit context passing, fast tests, stable ecosystem
- **Python** poses challenges: pytest fixtures confuse agents, async issues, slow startup compounds in loops
- Prefer **simple functions** over classes and inheritance
- Use **plain SQL** over ORMs — agents match generated SQL to logs effectively
- Write **more custom code, fewer dependencies** — agents handle dependency maintenance poorly

### Practical Cost Data

- Reported daily costs range from **$0.50/task to $100+/day**
- The difference is almost entirely about: specifying files explicitly, breaking tasks into small steps, and clearing context between tasks
- If monthly API usage exceeds $100, Max 5x plan ($100/mo) saves money
- Max 20x ($200/mo) is for power users running agent teams or multi-session workflows

## Documentation & Guides

### Official Documentation Structure (code.claude.com/docs/en/)

The official docs are comprehensive and well-maintained. Key pages:

- **Best Practices** — the #1 principle: "Give Claude a way to verify its own work"
- **Memory** — CLAUDE.md hierarchy, auto-memory, rules, troubleshooting
- **Skills** — complete SKILL.md format with frontmatter fields and examples
- **Sub-agents** — custom agent creation, configuration, and patterns
- **Hooks** — all 16 hook events, configuration schema, handler types
- **MCP** — server setup, scopes, authentication, management
- **Agent Teams** — experimental multi-session orchestration

### CLAUDE.md File Hierarchy (by priority)

1. Managed policy: `/etc/claude-code/CLAUDE.md` (Linux)
2. Project: `./CLAUDE.md` or `./.claude/CLAUDE.md`
3. User: `~/.claude/CLAUDE.md`
4. Local (gitignored): `./CLAUDE.local.md`

### Custom Sub-agent Configuration

Defined as markdown with YAML frontmatter in `.claude/agents/`:

```yaml
---
name: my-agent
description: When Claude should use this agent
tools: Read, Grep, Glob, Bash
model: sonnet  # sonnet, opus, haiku, or inherit
permissionMode: default
maxTurns: 20
skills:
  - api-conventions
memory: user  # user, project, or local
background: false
isolation: worktree
---

System prompt content in markdown.
```

Key fields: `tools`/`disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills` (preloaded — skills are NOT inherited from parent), `memory` (persistent across sessions), `background`, `isolation: worktree`.

**Persistent memory**: When `memory` is set, agents get `~/.claude/agent-memory/<name>/` directory. First 200 lines of `MEMORY.md` loaded at startup.

### Skill Authoring Reference

```
.claude/skills/<skill-name>/
  SKILL.md           # Required
  template.md        # Optional
  examples/          # Optional
  scripts/           # Optional
```

Frontmatter fields: `name`, `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `context: fork`, `agent`, `model`, `hooks`.

String substitutions: `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `${CLAUDE_SESSION_ID}`.

Bundled skills: `/simplify` (3 parallel review agents), `/batch <instruction>` (parallel changes via git worktrees), `/debug [description]` (session troubleshooting).

### Context Management (Official Recommendations)

- Use `/clear` between unrelated tasks
- Keep sessions to **30-45 minutes**
- Delegate research to sub-agents
- `/compact <instructions>` for focused compaction (e.g., "Focus on API changes")
- Auto-compaction at ~95% capacity (configurable via `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`)
- `Esc + Esc` or `/rewind` to restore previous checkpoints
- Sessions stopping at **75% context utilization** produce higher-quality output

### Agent Teams (Experimental)

Enable: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

Architecture: Team Lead coordinates independent Teammates, each with own context window. Shared task list with self-coordination and direct messaging.

Best for: parallel code review, competing hypothesis debugging, cross-layer coordination.

Cost: ~3-4x tokens vs sequential single-session work. Recommended team size: 3-5 teammates.

Limitations: no session resumption, no nested teams, one team per session.

## Tools & Products

### MCP Servers Worth Installing

**Core Development (start here):**
| Server | Purpose | Cost |
|--------|---------|------|
| **GitHub MCP** | Repos, PRs, issues, CI/CD | Free (official) |
| **Filesystem MCP** | Advanced file operations | Free (official) |
| **Sequential Thinking** | Structured reflective problem-solving | Free |
| **Context7** | Real-time documentation from source repos | Free |
| **Playwright** | Browser automation via accessibility trees | Free |

**Cloud Infrastructure:**
| Server | Purpose |
|--------|---------|
| **AWS MCP** | Lambda, DynamoDB, CloudFormation |
| **Cloudflare MCP** | 16 specialized servers for Workers, R2, D1 |

**Project Management:**
| Server | Purpose |
|--------|---------|
| **Linear MCP** | Issue tracking via OAuth |
| **Notion MCP** | Workspace documentation |
| **n8n MCP** | Build n8n workflows from Claude Code |

**Important:** MCP Tool Search enables lazy loading — register many servers without bloating every prompt (up to 95% context savings).

Install via: `claude mcp add <server-name>`

### Competitive Landscape (2026)

| Tool | Type | Price | Best For |
|------|------|-------|----------|
| **Claude Code** | Terminal agent | $20-200/mo or API | Autonomous multi-file execution, terminal workflows |
| **Cursor** | AI IDE | $0-200/mo | Autocomplete + IDE, background agents |
| **GitHub Copilot** | IDE extension | $0-39/mo | Widest IDE support, free tier, IP indemnity |
| **Windsurf** | AI IDE | $0-60/mo | Deep-context "Cascade" agent, live previews |
| **Cline** | VS Code extension | Free + API costs | Open source, full repo context, diff transparency |
| **Aider** | Terminal tool | Free + API costs | Outstanding git automation, any IDE |

**Claude Code's strongest differentiator**: autonomous multi-file execution from terminal. For inline editing and autocomplete, Cursor/Copilot supplement well.

**Complementary setup**: Claude Code as execution engine + Cursor/Copilot for inline editing. Use `claude mcp serve` to expose Claude Code as MCP server to other tools.

### API Pricing (Anthropic)

| Model | Input/1M tokens | Output/1M tokens |
|-------|-----------------|-------------------|
| Opus 4.6 | $5.00 | $25.00 |
| Sonnet 4.5 | $3.00 | $15.00 |
| Haiku 4.5 | $1.00 | $5.00 |

Prompt caching reduces input costs by up to 90%. Batch API gives 50% off.

## Key Takeaways

- **Keep CLAUDE.md under 200 lines** — include only what Claude can't infer from code. Run `/init` to start, then prune aggressively.
- **Use sub-agents for all research and exploration** — this is the single highest-leverage pattern for preserving main context quality
- **Set up PostToolUse hooks** for auto-formatting (black/prettier on Write|Edit) — deterministic and reliable unlike CLAUDE.md instructions
- **Create Skills for repeatable workflows** — more token-efficient than CLAUDE.md entries since they load on-demand
- **Clear context aggressively** — `/clear` between tasks, `/compact` at 60%, keep sessions under 45 minutes
- **Always provide verification criteria** — tests, screenshots, linter output. This is the #1 official best practice
- **Commit obsessively** as checkpoints against wrong-turn spirals
- **Use Plan Mode for multi-file changes** (25-45% token savings)
- **Consider language choice** — strongly typed languages with fast feedback loops (Go, TypeScript) produce better agentic results
- **Install 3-5 MCP servers max** — GitHub MCP and Sequential Thinking are highest ROI
- **Don't over-invest in Agent Teams yet** — experimental, 3-4x token cost, 95% of tasks better served by sub-agents

## Recommended Next Steps

1. **Audit current CLAUDE.md** — trim to under 200 lines, move domain-specific rules to `.claude/rules/` with path-scoping
2. **Set up core hooks** — auto-format on PostToolUse for Write|Edit events, consider PreToolUse blockers for dangerous operations
3. **Install GitHub MCP** — `claude mcp add github` for direct PR/issue access
4. **Build 2-3 more custom skills** — `/deploy`, `/fix-issue`, and `/review-pr` are high-value targets
5. **Enable sub-agent persistent memory** — add `memory: project` to research agent so it retains learnings across sessions
6. **Create handoff document templates** — for session continuity when context gets high
7. **Explore the n8n MCP server** — given the existing n8n setup, this could bridge Claude Code and automation workflows

## Sources

### General Web
- [Best Practices for Claude Code - Official Docs](https://code.claude.com/docs/en/best-practices) — core recommended workflow and principles
- [Context Management with Subagents - RichSnapp.com](https://www.richsnapp.com/article/2025/10-05-context-management-with-subagents-in-claude-code) — practical sub-agent patterns
- [Claude Code Best Practices - ThoughtMinds](https://thoughtminds.ai/blog/claude-code-best-practices-for-agentic-coding-in-modern-software-development) — comprehensive overview
- [Agentic Coding Best Practices - Tessl](https://tessl.io/blog/claude-code-best-practices/) — workflow optimization
- [Claude Code Agent Teams Guide - ClaudeFast](https://claudefa.st/blog/guide/agents/agent-teams) — team orchestration patterns
- [Using CLAUDE.MD Files - Anthropic Blog](https://claude.com/blog/using-claude-md-files) — official CLAUDE.md guidance
- [Writing a Good CLAUDE.md - HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — community best practices
- [How I Use Every Claude Code Feature - Shrivu Shankar](https://blog.sshh.io/p/how-i-use-every-claude-code-feature) — power user walkthrough

### Community
- [Claude Code Best Practices - Hacker News](https://news.ycombinator.com/item?id=43735550) — community discussion on official best practices
- [Getting Good Results from Claude Code - Hacker News](https://news.ycombinator.com/item?id=44836879) — practical tips from experienced users
- [Claude Code Is All You Need - Hacker News](https://news.ycombinator.com/item?id=44864185) — opinions on Claude Code as primary tool
- [Agentic Coding Recommendations - Armin Ronacher](https://lucumr.pocoo.org/2025/6/12/agentic-coding/) — language and architecture recommendations
- [Claude Code 2.0 Experience - Sankalp](https://sankalp.bearblog.dev/my-experience-with-claude-code-20-and-how-to-get-better-at-using-coding-agents/) — real-world usage patterns
- [32+ Claude Code Tips - Agentic Coding Substack](https://agenticcoding.substack.com/p/32-claude-code-tips-from-basics-to) — community tips compilation
- [Claude Code Tips - GitHub (ykdojo)](https://github.com/ykdojo/claude-code-tips) — 45 curated tips

### Documentation
- [Claude Code Overview](https://code.claude.com/docs/en/overview) — official docs hub
- [Skills Documentation](https://code.claude.com/docs/en/skills) — complete SKILL.md reference
- [Sub-agents Documentation](https://code.claude.com/docs/en/sub-agents) — custom sub-agent creation and configuration
- [Hooks Reference](https://code.claude.com/docs/en/hooks) — all 16 hook events and handler types
- [MCP Documentation](https://code.claude.com/docs/en/mcp) — server setup, scopes, authentication
- [Memory Documentation](https://code.claude.com/docs/en/memory) — CLAUDE.md hierarchy and auto-memory
- [Claude Code GitHub Repository](https://github.com/anthropics/claude-code) — source and community
- [Context Management Guide - SFEIR](https://institute.sfeir.com/en/claude-code/claude-code-context-management/) — detailed context strategies

### Tools & Products
- [Best MCP Servers for Claude Code - MCPcat](https://mcpcat.io/guides/best-mcp-servers-for-claude-code/) — curated MCP directory
- [50+ Best MCP Servers - ClaudeFast](https://claudefa.st/blog/tools/mcp-extensions/best-addons) — comprehensive MCP list
- [Claude Code Pricing Guide - TheCaio](https://www.thecaio.ai/blog/claude-code-pricing-guide) — pricing breakdown
- [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — official token pricing
- [Claude Code vs Copilot vs Cursor - PinkLime](https://pinklime.io/blog/claude-code-vs-copilot-vs-cursor) — competitive comparison
- [Cursor vs Claude Code 2026 - Builder.io](https://www.builder.io/blog/cursor-vs-claude-code) — detailed head-to-head
- [Awesome Claude Code Subagents - GitHub](https://github.com/VoltAgent/awesome-claude-code-subagents) — 100+ sub-agent configs
- [Awesome Claude Skills - GitHub](https://github.com/travisvn/awesome-claude-skills) — community skill collection
- [Claude Code Skill Factory - GitHub](https://github.com/alirezarezvani/claude-code-skill-factory) — skill authoring toolkit
- [n8n MCP for Claude Code - GitHub](https://github.com/czlonkowski/n8n-mcp) — n8n integration
