# Research Report: Best Free MCP Servers for Claude Code (Reddit & Web)
**Date**: 2026-03-05
**Agents dispatched**: 2 — (1) Free MCP servers catalog & setup requirements, (2) Community recommendations from Reddit/HN/forums

## Executive Summary
The MCP ecosystem has grown to 1,800+ servers, but community usage concentrates on 5-8 key servers [Verified: claudefa.st + mcpservers.org, 2026]. **Critical update**: Brave Search has dropped its free API tier — all developers are now on metered billing at $5/1,000 requests, making DuckDuckGo MCP the strongest free web search replacement [Verified: implicator.ai + brave/brave-search-mcp-server GitHub, 2026]. Start with 2-3 servers matching your actual friction points, not the trending list.

## Free MCP Servers — Features, Setup & API Key Requirements

### No API Key Required (Zero Friction)

1. **DuckDuckGo MCP Server** — Free web search with no API key. Multiple implementations exist (nickclyde, OEvortex, gianlucamazza, MattimaxForce). Provides web search, news search, image search, and content fetching/parsing. Install via `npx -y @smithery/cli install @nickclyde/duckduckgo-mcp-server --client claude` or configure STDIO directly. This is the strongest free replacement for Brave Search now that Brave's free tier is gone. [Verified: GitHub repos + glama.ai, 2025-2026]

2. **Sequential Thinking MCP Server** — Structured, reflective problem-solving for complex tasks. Official Anthropic-adjacent server. Config: `"command": "npx", "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]`. [Verified: apidog.com + mcpcat.io, 2026]

3. **Filesystem MCP Server** — Local file access and management with granular permission controls. Official MCP reference server. You specify which directories to expose via args. [Verified: modelcontextprotocol.io + mcpcat.io, 2026]

4. **Playwright MCP Server** — Browser automation using accessibility trees rather than screenshots. Good for web scraping and testing. [Verified: apidog.com + mcpcat.io + claudefa.st + deployhq.com, 2025-2026]

5. **Desktop Commander MCP** — Terminal commands, file management, and window control. Local-first. [Blog: desktopcommander.app, 2025]

6. **Web Search MCP Server** (williamvd4) — Free Google search results with no API key. Uses scraping rather than an official API. [Community: glama.ai, 2026]

### Free API Key / Account Required

7. **GitHub MCP Server** — Full GitHub REST API access (issues, PRs, CI/CD, commits). The single most-recommended MCP server across all sources surveyed. Requires a GitHub personal access token (free). [Verified: claudefa.st + apidog.com + DEV Community, 2026]

8. **Supabase MCP Server** — Database management via natural language. **Warning**: an HN user specifically cautioned "only run Supabase MCP with the --read-only, doing otherwise will lead to a bad time." Free with Supabase account. [Community: Hacker News, 2025]

9. **Perplexity MCP Server** — Web search with AI-powered results and citations. One author called it "the MCP I reach for most." Requires a Perplexity API key (has free tier). [Community: DEV Community, 2026]

10. **Reddit MCP (PRAW)** — Reddit API access. Requires free Reddit app registration at reddit.com/prefs/apps. [Community: previously researched]

11. **PostgreSQL MCP** — Natural language database queries. Free, open-source. [Verified: apidog.com + HN discussion, 2025]

### Brave Search — No Longer Free

Brave has dropped its free Search API tier. The previous 2,000 queries/month free plan no longer exists. All developers are now on metered billing at $5 per 1,000 requests. Each paid plan includes a $5 monthly credit (roughly 1,000 searches), but requires a payment method on file and public Brave attribution on your site to keep the credit. [Verified: implicator.ai + brave/brave-search-mcp-server GitHub, 2026]

## Community Recommendations (Reddit, HN, Forums)

### Tier 1 — Near-Universal Picks
GitHub MCP, Filesystem MCP, and Playwright MCP appear across virtually every recommendation list. These are safe bets for any developer. [Verified: claudefa.st + apidog.com + DEV Community, 2026]

### Memory MCP — The Underrated Category
Memory servers transform Claude from "a tool you explain things to every session" to "a collaborator who knows your projects, your voice, your decisions." Knowledge-graph-based persistent memory across sessions. [Community: DEV Community, 2026]

### Critical Community Complaints

**Tool invocation reliability**: HN user oc1 reported "In 9 out of 10 cases where an MCP would make sense to use — it doesn't know when to call the MCP." This is a real concern, though likely an outlier experience. [Community: Hacker News, 2025]

**Security concerns**: The explosion of 1,800+ servers from unknown origins raises trust questions. Anthropic donated MCP to an independent foundation so no single company controls the spec. [Community: Hacker News, 2025]

**Context window pollution**: Claude Code's MCP Tool Search (lazy loading) reduces context usage by up to 95%, mitigating the performance cost of many MCPs. This is critical when running many servers. [Verified: apidog.com + claudelog.com, 2026]

**Practical advice**: Start with 2-3 MCPs matching your actual friction, not the trending list. One practitioner reports running 15 servers without issues, but deliberate selection matters more than quantity. [Blog: dev.to/jennyouyang, 2026]

## Contradictions & Gaps

**Brave Search free tier**: Agent A found that Brave has dropped its free tier (sourced from implicator.ai and Brave's own GitHub repo, 2026). Agent B still referenced the old "2,000 queries/month free" figure from older sources (desktopcommander.app, 2025). The newer sourcing is more reliable — **Brave's free tier is gone**.

**Reddit-specific search was thin**: Agent B's Reddit-specific searches returned zero results due to indexing limitations. Community sentiment came primarily from HN and DEV Community instead.

**Tool invocation reliability**: The "9 out of 10" failure claim from a single HN user contrasts with the generally positive experience reported elsewhere. Likely depends heavily on the specific server and use case.

## Key Takeaways
- DuckDuckGo MCP is now the best free web search option — Brave's free tier is gone [Verified: implicator.ai + GitHub, 2026]
- GitHub MCP + Filesystem MCP + Playwright MCP form the community-endorsed starter trio [Verified: claudefa.st + apidog.com + DEV Community, 2026]
- Memory MCP is underrated and transforms multi-session workflows [Community: DEV Community, 2026]
- Use Supabase MCP with `--read-only` flag only [Community: Hacker News, 2025]
- Enable MCP Tool Search lazy loading when running 3+ servers [Verified: apidog.com + claudelog.com, 2026]

## Recommended Next Steps
- Replace Brave Search MCP recommendation with DuckDuckGo MCP (nickclyde implementation)
- Install GitHub MCP + DuckDuckGo MCP as the high-value free starter pair
- Update MEMORY.md to reflect Brave's pricing change

## Sources
### Official / Verified
- https://modelcontextprotocol.io — MCP protocol specification
- https://mcpservers.org — MCP server registry (1,800+ servers)
- https://github.com/brave/brave-search-mcp-server — Brave MCP (pricing change confirmed)
- https://glama.ai/mcp/servers — MCP server catalog with API key filtering

### Blogs & Articles
- https://claudefa.st/blog/tools/mcp-extensions/best-addons — 50+ best MCP servers (2026)
- https://apidog.com/blog/top-10-mcp-servers-for-claude-code/ — Top 10 essential MCPs (2026)
- https://mcpcat.io/guides/best-mcp-servers-for-claude-code/ — Best MCPs guide (2026)
- https://dev.to/jennyouyang — practical MCP recommendations (2026)
- https://desktopcommander.app/blog/2025/11/25/best-mcp-servers/ — 22 best MCPs (2025)
- https://www.implicator.ai/brave-drops-free-search-api-tier-puts-all-developers-on-metered-billing/ — Brave pricing change (2026)
- https://buildtolaunch.substack.com/p/best-mcp-servers-claude-code — MCP server picks (2026)

### Community
- https://news.ycombinator.com/item?id=44678426 — HN: What is so good about MCP servers?
- https://news.ycombinator.com/item?id=47193064 — HN: MCP context consumption reduction
- https://github.com/punkpeye/awesome-mcp-servers — Community curated list
