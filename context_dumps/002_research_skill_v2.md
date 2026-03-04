# Context Dump — 2026-03-04
## Session: /research Skill v2 Upgrade + First Test Run

### What We Did
1. **Rewrote `/research` skill** (`.claude/skills/research/SKILL.md`) from v1 to v2
2. **Ran first v2 test**: "best free MCP servers and tools for Claude Code to access Reddit, community sites, and get fast web results"
3. **Fixed permissions**: Added `WebFetch` to `.claude/settings.local.json` allowed tools (file is gitignored)

### v2 Changes Implemented
- Dynamic agent design: parent assesses complexity, designs 2-5 custom agents per topic (no fixed menu)
- Inline source citations with reliability tiers: `[Official Docs]`, `[Verified]`, `[Blog]`, `[Community]`, `[Unverified]`
- Structured agent output format (Key Findings, Source Quality, Facts vs Opinions)
- Dynamic report template: sections match dispatched agents, not fixed 4-section layout
- New "Contradictions & Gaps" section
- Sources organized by reliability tier instead of by agent
- Speed: max 2 WebFetch per agent, prefer snippet extraction, use `model: "sonnet"`
- `--quick` flag for 2-agent fast scans
- Append mode: detects existing reports, offers overwrite vs append
- Freshness tags on claims noting source dates

### What Went Right (v2 Test)
1. **Dynamic agent design worked** — 3 agents with custom focuses (ecosystem, community, Reddit-specific tools) vs v1's rigid 4-agent structure. No wasted "Docs" or "Tools" agents with overlapping scope.
2. **Sonnet model for agents** — noticeably faster than Opus would have been. Quality was still high.
3. **Speed improvement** — agents mostly used snippet extraction. Agent A used 0 WebFetch calls, Agent B used 2, Agent C used 1. Total: 3 fetches vs v1's 12-20.
4. **Inline citations present** — agents returned tagged claims with `[Official Docs]`, `[Verified]`, `[Community]` etc.
5. **Source Quality sections** — each agent reported total sources, fetches, snippet-only usage, and access issues. Useful metadata.
6. **Facts vs Opinions separation** — agents distinguished between verifiable facts and subjective recommendations.
7. **Contradictions & Gaps section** — caught a real contradiction (adhikasp Reddit MCP "no API key" vs other agents saying all Reddit MCPs need credentials).
8. **Report sections were dynamic** — 3 sections matching the 3 agents, not 4 fixed sections.

### What Went Wrong / Needs Improvement
1. **Permission prompts on every WebSearch/WebFetch** — sub-agents asked for permission on each call. `WebSearch` was already in settings.local.json allow list but still prompted. Added `WebFetch` too. May need session restart to take effect. **This is the #1 UX problem.**
2. **Agent output format compliance was imperfect** — agents mostly followed the required format but took liberties (Agent A skipped Facts vs Opinions section, Agent B added extra subsections). Need stricter enforcement in the brief template or accept that agents will vary.
3. **Citation granularity inconsistent** — some agents cited per-sentence (as instructed for facts), others cited per-paragraph even for factual claims. The distinction between fact-level and opinion-level citation wasn't consistently applied.
4. **Parent synthesis was manual and slow** — consolidating 3 agent outputs into one report took significant parent context and effort. The deduplication and cross-referencing worked but was the most context-heavy step.
5. **No freshness tags in practice** — the skill instructs agents to note dates, and some did (e.g., "March 2025", "Sept 2025"), but it wasn't systematic. Most claims lack explicit dates.
6. **Append mode untested** — didn't hit the append case in this run.
7. **Quick mode untested** — didn't use `--quick` flag.
8. **Some "Unverified: inferred" citations** — agents marked their own logical inferences as "[Unverified: inferred from architecture]" which is honest but clutters the citation system. Need guidance on whether inferences should be cited differently from single-source claims.

### Pending / Next Session
- **Install MCP servers**: Brave Search, Reddit (PRAW), Stealth Browser — the research identified these as top picks
- **Test `--quick` mode** and **append mode**
- **Verify permission fix** works after session restart (WebFetch + WebSearch auto-allowed)
- **Consider**: Should the skill instruct agents more strictly on output format, or accept variation? Strictness vs agent autonomy tradeoff.
- Nate wants tools that access Reddit and restricted sites — MCP setup is the immediate next action

### Git State
- Branch: `main`
- Latest commits:
  - `04ada82` feat: first v2 research output — best free MCP servers for Claude Code
  - `5b4a3a9` feat: upgrade /research skill to v2 — dynamic agents, inline citations, speed improvements
  - `e631076` feat: first /research output — Claude Code agentic workflow best practices
- All pushed to GitHub

### Files Modified This Session
| File | Action |
|------|--------|
| `.claude/skills/research/SKILL.md` | Rewritten (v1 → v2) |
| `.claude/settings.local.json` | Added `WebFetch` to allowed tools (gitignored) |
| `research/2026-03-04_best-free-mcp-servers-claude-code-reddit-web.md` | Created (v2 test output) |

### Key Decisions / Preferences Learned
- Nate wants research agents to run without permission prompts — auto-allow WebSearch + WebFetch
- Nate evaluates tools on real output quality, not just spec compliance
- "What went wrong and what went right" is the review Nate wants after test runs — honest post-mortem, not cheerleading
