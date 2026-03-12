# OpenRouter Pricing Reference
*Last updated: 2026-03-12 — always verify at openrouter.ai before spending*

## Rule: Always err on the HIGH end of cost estimates when asking for approval.

---

## Model Pricing

| Model | Input $/M | Output $/M | Extra | Realistic per-query cost |
|-------|-----------|------------|-------|--------------------------|
| **perplexity/sonar-deep-research** | $2.00 | $8.00 | $5/1K searches + $3/M reasoning + $2/M citation tokens | **$0.40–$1.30 per query** |
| **perplexity/sonar-pro** | $3.00 | $15.00 | $5/1K searches + request fee | **$0.04–$0.05 per query** |
| **perplexity/sonar** | $1.00 | $1.00 | request fee | **$0.008–$0.015 per query** |
| **anthropic/claude-haiku-4-5** | $1.00 | $5.00 | $10/1K web searches if used | **$0.01–$0.02 per query** |
| **google/gemini-2.0-flash-exp:free** | FREE | FREE | rate limited | **$0 — TEXT ONLY, not image gen** |

---

## Image Generation (separate category)

| Model | Cost |
|-------|------|
| **google/gemini-2.5-flash-preview** (image gen) | Per image token — estimate ~$0.04–0.10/image |
| **stabilityai/sdxl** (stage 1 ideation) | Low cost — check current rate at openrouter.ai |

> **IMPORTANT**: `gemini-2.0-flash-exp:free` is a TEXT model. It cannot generate images.
> For image generation via Google on OpenRouter, use the Gemini image preview models.

---

## Cost Estimation Rules

### sonar-deep-research
Each query runs 15–30+ web searches internally + reasoning pass + citation ingestion.
Cost components that stack:
- Token cost (small)
- Reasoning tokens: 30K–100K per query × $3/M = $0.09–$0.30
- Citation tokens: varies × $2/M
- Search fees: ~18 searches avg × $0.005 = $0.09
- Per-request fee: $0.006–$0.014

**Budget estimate: $1.50/query to be safe. 3 queries = ~$4.50.**

### sonar-pro
Good middle ground — real-time web search, multi-step, much cheaper than deep-research.
**Budget estimate: $0.10/query. 3 queries = ~$0.30.**

### Claude Haiku (script generation)
Bulk text generation, no search. Very predictable.
**Budget estimate: $0.02/script. 60 scripts = ~$1.20.**

---

## What to Say When Asking for Spend Approval

Always show:
1. Number of API calls
2. Model name
3. HIGH-end cost estimate (not the average)
4. Total worst-case

Example: "3 calls to sonar-deep-research — worst case ~$4.50 total. Proceed?"

---

## Sources
- https://openrouter.ai/perplexity/sonar-deep-research
- https://docs.perplexity.ai/docs/getting-started/pricing
- https://openrouter.ai/collections/image-models
