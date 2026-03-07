---
name: research
description: Deep parallel research with dynamic agent design, inline source citations, and reliability tagging. Use for market research, competitive analysis, or technical research.
argument-hint: "[topic]" or "[topic1] | [topic2]" or "--quick [topic]"
---

# Deep Parallel Research Skill (v2)

You have been invoked as `/research`. Your job is to perform deep, parallel research on one or more topics and produce structured reports with inline source citations, saved to `~/projects/Agent/research/`.

## Step 1: Parse Arguments

Parse `$ARGUMENTS` to determine mode and topics:

- **Quick mode**: starts with `--quick` → spawn only 2 agents, faster scan
- **No-prompt mode**: starts with `--no-prompt` → skips interactive prompts, uses overwrite as default
- **Single topic**: e.g. `/research best ClickBank niches 2026`
- **Multi-topic batch**: e.g. `/research topic one | topic two` (pipe-delimited)
- **Append mode**: if a report for the same topic-slug already exists in `research/`, note this. After generating the new report, ask the user whether to overwrite or append new findings to the existing file (unless `--no-prompt` is set).

Split on `|` and trim whitespace. Each segment is one research topic. Strip `--quick` and `--no-prompt` flags before processing topic text.

If all segments after splitting are fewer than 3 words each, treat the entire input as a single topic.

## Step 2: Assess Complexity & Design Agents

For **each topic**, analyze it and design a custom research team. Do NOT use a fixed set of agents — design the right team for the specific topic.

### Complexity Guidelines

| Complexity | Agent Count | When to Use | Example |
|-----------|-------------|-------------|---------|
| Narrow | 2 agents | Specific factual question, single-product lookup | "Stripe webhook API limits" |
| Standard | 3 agents | Typical research, market analysis, tool comparison | "best affiliate niches 2026" |
| Broad | 4-5 agents | Multi-faceted topic, landscape analysis, deep dive | "AI content creation landscape 2026" |
| Quick mode | 2 agents | User passed `--quick` flag (always 2 regardless of complexity) |

### How to Design Agent Briefs

For each agent, decide:
1. **Focus area**: What specific angle this agent covers (custom per topic — NOT from a fixed menu)
2. **Search strategy**: What WebSearch queries to run, what domains to target
3. **Source priority**: What type of sources matter most for this agent's angle

Examples of custom agent designs (these are illustrations, not templates to copy):

- Topic "Stripe webhook API limits" → 2 agents:
  - Agent A: "Official Stripe docs & API reference" (target stripe.com, official docs)
  - Agent B: "Developer experiences & edge cases" (Stack Overflow, blog posts, HN)

- Topic "best affiliate niches 2026" → 3 agents:
  - Agent A: "Market trends & niche profitability data" (industry reports, trend analysis)
  - Agent B: "Practitioner experiences & real earnings" (forums, blogs, case studies)
  - Agent C: "Platforms, tools & commission structures" (affiliate network sites, comparison articles)

- Topic "AI content creation landscape" → 4 agents:
  - Agent A: "Major AI writing/image tools — features & pricing"
  - Agent B: "Content creator workflows & tool stacks"
  - Agent C: "Platform policies on AI content (Google, social media)"
  - Agent D: "Market size, funding, industry trajectory"

## Step 3: Spawn Parallel Research Agents

Launch ALL agents for ALL topics in a **single message** so they run concurrently. Use `subagent_type: "general-purpose"` for each agent.

### Agent Brief Template

Each agent gets a brief following this structure (customize the content per agent):

```
Research Brief: {Agent Focus Area}

Topic: {topic}
Focus: {what this agent specifically investigates}

Search Strategy:
- Use WebSearch("{query 1}") for {purpose}
- Use WebSearch("{query 2}") for {purpose}
- [2-4 targeted search queries]

SPEED RULES (mandatory):
- Maximum 2 WebFetch calls. Choose only the highest-value URLs.
- Prefer extracting info from WebSearch result snippets when they contain enough detail — skip fetching the full page.
- Do NOT fetch pages just to "be thorough" — only fetch when the snippet is insufficient.

REQUIRED OUTPUT FORMAT:

Return your findings using this exact structure:

### Key Findings
[Your synthesized findings. EVERY factual claim must have an inline citation tag.]

Citation format — tag every paragraph with one citation at the end:
- [Official Docs: site/page, YYYY] — vendor/official documentation
- [Verified: Source1 + Source2, YYYY] — 2+ independent sources confirm the same claim
- [Blog: author/site, YYYY] — single authoritative article
- [Community: platform, YYYY] — Reddit, HN, forums

Include the year in every citation tag. If no date is visible on the source, omit the year from that citation.

Do not cite your own inferences or analysis — only cite sourced claims. Unsourced analysis is fine but should not have citation tags.

### Source Quality
- Total sources found: {N}
- Sources fetched (WebFetch): {N}
- Sources used from snippets only: {N}
- Access issues: {any sites that blocked or returned errors}

### Facts vs. Opinions
- **Facts observed**: [list concrete, verifiable facts found]
- **Opinions/recommendations**: [list subjective takes, clearly marked as opinions]

**You MUST return your output using the exact structure above. Do not add extra sections, skip sections, or restructure.**

**Output quality**: If an agent's output is missing required sections, poorly sourced, or off-topic, extract what you can and note the gap in Contradictions & Gaps. What counts as "good enough" depends on the research topic — discuss quality expectations with the user before synthesizing if unsure.
```

## Step 4: Consolidate Into Report (Parent Does This)

After all agents return, the **parent agent synthesizes** the findings — do NOT spawn a consolidation agent.

Synthesis process:
1. **Deduplicate**: merge overlapping findings across agents
2. **Cross-reference**: when 2+ agents found the same fact, upgrade citation to `[Verified: Source1 + Source2]`. Only upgrade to [Verified] when the underlying sources are independent (different URLs/authors). Two agents citing the same single URL is not cross-verification.
3. **Flag contradictions**: note where agents found conflicting information
4. **Preserve citations**: keep all inline citation tags from agent outputs; upgrade/merge where appropriate
5. **Identify gaps**: note areas where data was thin or missing

### Dynamic Report Template

Generate a report with sections matching the agents you dispatched — NOT a fixed structure:

```markdown
# Research Report: {Topic}
**Date**: {YYYY-MM-DD}
**Agents dispatched**: {count} — {one-line description of each agent's focus}

## Executive Summary
[2-3 sentences. Lead with the most actionable insight. Include inline citations.]

## {Agent 1 Focus Area}
[Synthesized findings with inline citations from Agent 1's output.
Organize by sub-themes if the material is broad.]

## {Agent 2 Focus Area}
[Synthesized findings with inline citations from Agent 2's output.]

## {Agent N Focus Area}
[...one section per agent dispatched, no more, no less]

## Contradictions & Gaps
[Where sources disagreed — quote the conflicting claims with their citations.
Where data was thin or missing — be honest about what you couldn't find.
If no contradictions found, say so briefly.]

## Key Takeaways
- [Actionable bullets with inline citations]
- [Prioritize by impact and confidence level]

## Recommended Next Steps
- [Specific actions with source links where relevant]

## Sources
### Official / Verified
- [URLs confirmed from official docs or cross-verified by 2+ sources]

### Blogs & Articles
- [Single-source articles and blog posts]

### Community
- [Reddit, HN, forum threads, discussion posts]
```

**Section-level guidance:**
- Fact-heavy sections (config, pricing, specs): prefer [Official Docs] and [Verified] citations. Note when only a community source exists for a factual claim.
- Strategy/workflow sections: [Community] sources are primary and welcomed — real practitioner experience is the gold standard here.
- Always honest about source quality — thin sourcing is flagged, not hidden.

## Step 5: Save Reports

Save each report to: `~/projects/Agent/research/{YYYY-MM-DD}_{topic-slug}.md`

Slugify the topic: lowercase, replace spaces with hyphens, remove special characters, truncate to ~50 chars.

**Before writing**, check if a file with the same slug already exists:
1. If no existing file → write normally
2. If existing file found AND `--no-prompt` was set → overwrite automatically
3. If existing file found AND no `--no-prompt` → ask the user:
   - **Overwrite**: replace the old report entirely
   - **Append**: add a `---` separator and append the new findings below the old report with a dated header
   - **New file**: add `-2` (or `-3`, etc.) suffix to the slug and save as a new file

## Step 6: Print Summary

After saving, print a concise summary in chat:

```
## Research Complete: {Topic}
Saved to: `research/{filename}`
Agents dispatched: {count} ({brief focus list})

**Top findings:**
- [3-5 most important bullets with inline citations]

**Source quality:** {X} official/verified, {Y} blog, {Z} community

**Recommended next action:** [Single most valuable next step]
```

For multi-topic batches, print summaries for all topics.

## Rules

- Maximum 10 agents per invocation. If a multi-topic batch would exceed this, reduce per-topic agent count or process topics sequentially.
- ALWAYS launch all agents in parallel (single message with multiple Agent tool calls)
- Design agents fresh for each topic — no fixed agent menu
- Each agent: max 2 WebFetch calls, prefer snippet extraction
- Synthesize agent outputs — don't just concatenate them
- Every factual claim needs an inline citation tag — no unattributed claims
- Include real URLs in Sources — no made-up links
- Organize final Sources by reliability tier, not by agent
- If an agent returns thin results, note the gap honestly in Contradictions & Gaps
- Use today's actual date for the filename and report header
- If a topic is ambiguous, state your interpretation and proceed
- For `--quick` mode: always 2 agents, skip the complexity assessment
- If an agent returns an error or empty response, proceed with the agents that did return. Document the missing coverage in the "Contradictions & Gaps" section with: "Agent [{focus area}] did not return results — this area has no coverage."
- ALWAYS `git push` immediately after every commit — never leave unpushed commits
