---
name: research
description: Deep parallel research across web, Reddit, forums, docs, and tools. Use for market research, competitive analysis, or technical capability research.
argument-hint: "[topic]" or "[topic1] | [topic2] | [topic3]"
---

# Deep Parallel Research Skill

You have been invoked as `/research`. Your job is to perform deep, parallel research on one or more topics and produce structured reports saved to `~/projects/Agent/research/`.

## Step 1: Parse Arguments

Parse `$ARGUMENTS` to determine mode:

- **Single topic**: e.g. `/research best ClickBank niches 2026`
- **Multi-topic batch**: e.g. `/research topic one | topic two | topic three` (pipe-delimited)

Split on `|` and trim whitespace. Each segment is one research topic.

## Step 2: Spawn Parallel Research Agents

For **each topic**, spawn **4 parallel Agent calls in a single message** (subagent_type: `"Research Agent"`). Each agent targets a different source category. All 4 agents for a topic MUST be launched in the same message so they run concurrently.

For multi-topic batches, launch ALL agents for ALL topics in a single message (e.g. 3 topics = 12 agents, all parallel).

### Agent 1: General Web
```
Research Brief: General Web Research

Topic: {topic}

Search Strategy:
- Use WebSearch("{topic}") for broad coverage
- Use WebSearch("{topic} 2026 guide") for recent content
- Use WebSearch("{topic} trends analysis") for market context
- Use WebFetch on the most promising 3-5 URLs to get full content
- No domain filters — cast a wide net

Focus on: articles, blog posts, guides, news, industry analysis, statistics, market data.

Return your findings as a structured summary with Key Findings, Details, Recommendations, and Sources (with URLs).
```

### Agent 2: Community (Reddit/Forums)
```
Research Brief: Community & Discussion Research

Topic: {topic}

Search Strategy:
- Use WebSearch("site:reddit.com {topic}") for Reddit threads
- Use WebSearch("{topic} forum discussion experiences") for broader forums
- Use WebSearch("{topic} review honest opinion") for real user perspectives
- Use WebFetch on the most active/upvoted threads to get full discussions
- Focus on reddit.com, forums, discussion boards, Quora

Focus on: real user experiences, honest opinions, warnings, success stories, practical tips that only come from people who've actually done it.

Return your findings as a structured summary with Key Findings, Details, Recommendations, and Sources (with URLs).
```

### Agent 3: Documentation & Guides
```
Research Brief: Documentation & Tutorial Research

Topic: {topic}

Search Strategy:
- Use WebSearch("{topic} documentation") for official docs
- Use WebSearch("{topic} tutorial how to step by step") for guides
- Use WebSearch("{topic} getting started beginner guide 2026") for entry-level content
- Use WebFetch on official documentation pages and top tutorials
- Focus on official docs, technical references, how-to content

Focus on: official documentation, step-by-step tutorials, technical references, getting-started guides, best practices from authoritative sources.

Return your findings as a structured summary with Key Findings, Details, Recommendations, and Sources (with URLs).
```

### Agent 4: Tools & Products
```
Research Brief: Tools & Products Research

Topic: {topic}

Search Strategy:
- Use WebSearch("{topic} tools software platforms") for tool discovery
- Use WebSearch("{topic} API pricing comparison 2026") for cost analysis
- Use WebSearch("best {topic} tools review comparison") for head-to-head comparisons
- Use WebFetch on product pages and comparison articles for pricing and feature details
- Focus on product sites, SaaS platforms, API providers, marketplaces

Focus on: specific tools, software, APIs, platforms, pricing tiers, feature comparisons, free vs paid options, integration capabilities.

Return your findings as a structured summary with Key Findings, Details, Recommendations, and Sources (with URLs).
```

## Step 3: Consolidate Into Report

After all agents return, synthesize their findings into a single structured report per topic. Do NOT just paste raw agent outputs — synthesize, deduplicate, and organize.

Use this exact template for each report:

```markdown
# Research Report: {Topic}
**Date**: {YYYY-MM-DD}
**Mode**: Deep parallel research (4 source categories)

## Executive Summary
[2-3 sentence overview of the most important findings across all sources. Lead with the single most actionable insight.]

## General Web Findings
[Synthesized from General Web agent. Include key statistics, trends, and market context. Organize by sub-themes if the topic is broad.]

## Community Insights (Reddit/Forums)
[Synthesized from Community agent. Highlight consensus opinions, common warnings, success patterns, and contrarian takes. Quote notable comments where useful.]

## Documentation & Guides
[Synthesized from Docs agent. Summarize available learning resources, official processes, technical requirements, and best practices.]

## Tools & Products
[Synthesized from Tools agent. Include a comparison table if 3+ tools were found. Note pricing, free tiers, and standout features.]

## Key Takeaways
- [Actionable bullet points — things to DO based on this research]
- [Prioritize by impact and effort]

## Recommended Next Steps
- [Specific next actions with enough detail to act on them]
- [Include links to key resources]

## Sources
### General Web
- [URLs with brief descriptions]

### Community
- [URLs with brief descriptions]

### Documentation
- [URLs with brief descriptions]

### Tools & Products
- [URLs with brief descriptions]
```

## Step 4: Save Reports

Save each report to: `~/projects/Agent/research/{YYYY-MM-DD}_{topic-slug}.md`

Slugify the topic: lowercase, replace spaces with hyphens, remove special characters, truncate to ~50 chars.

Example: `/research best ClickBank niches 2026` -> `research/2026-03-04_best-clickbank-niches-2026.md`

## Step 5: Print Summary

After saving, print a concise summary in chat for each topic:

```
## Research Complete: {Topic}
Saved to: `research/{filename}`

**Top findings:**
- [3-5 most important bullets]

**Recommended next action:** [Single most valuable next step]
```

For multi-topic batches, print summaries for all topics.

## Rules
- ALWAYS launch all agents in parallel (single message with multiple Agent tool calls)
- NEVER skip a source category — all 4 agents per topic, every time
- Synthesize agent outputs — don't just concatenate them
- Include real URLs in the Sources section — no made-up links
- If an agent returns thin results, note the gap honestly rather than padding
- Use today's actual date for the filename and report header
- If a topic is ambiguous, state your interpretation and proceed
