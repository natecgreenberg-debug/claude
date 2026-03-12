# OpenRouter Capabilities Reference

**Last updated:** 2026-03-12
**Account:** sk-or-v1-d9a84f59...
**Total models available:** 344
**Base URL:** `https://openrouter.ai/api/v1` (OpenAI-compatible)

---

## Top Free Models

28 free models available. All support tool use and structured outputs unless noted.

| Model ID | Context | Input Modalities | Best For |
|---|---|---|---|
| `openrouter/hunter-alpha` | 1,048,576 | text | Agentic tasks, long-horizon planning (1T params, OpenRouter's own model) |
| `openrouter/healer-alpha` | 262,144 | text, image, audio, video | Omni-modal — vision + audio + reasoning (OpenRouter's own model) |
| `openrouter/free` | 200,000 | text, image | Random rotation of free models, smart feature filtering |
| `nvidia/nemotron-3-super-120b-a12b:free` | 262,144 | text | Large general-purpose model |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 262,144 | text | General use, tool calling |
| `qwen/qwen3-coder:free` | 262,000 | text | Coding |
| `stepfun/step-3.5-flash:free` | 256,000 | text | General use |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 256,000 | text | General use, tool calling |
| `nvidia/nemotron-nano-12b-v2-vl:free` | 128,000 | image, text, video | Vision + video input |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 128,000 | text, image | Vision + general use |
| `meta-llama/llama-3.3-70b-instruct:free` | 128,000 | text | General use, tool calling |
| `google/gemma-3-27b-it:free` | 131,072 | text, image | Vision, general use |
| `nousresearch/hermes-3-llama-3.1-405b:free` | 131,072 | text | Large general model, function calling |
| `openai/gpt-oss-120b:free` | 131,072 | text | OpenAI open-source 120B, tool use |
| `openai/gpt-oss-20b:free` | 131,072 | text | OpenAI open-source 20B, tool use |
| `z-ai/glm-4.5-air:free` | 131,072 | text | Tool calling, reasoning |
| `qwen/qwen3-4b:free` | 40,960 | text | Lightweight, reasoning |
| `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` | 32,768 | text | Uncensored, creative |
| `liquid/lfm-2.5-1.2b-thinking:free` | 32,768 | text | Tiny model with thinking capability |
| `google/gemma-3-4b-it:free` | 32,768 | text, image | Small vision model |
| `google/gemma-3-12b-it:free` | 32,768 | text, image | Medium vision model |
| `arcee-ai/trinity-mini:free` | 131,072 | text | Tool use |
| `arcee-ai/trinity-large-preview:free` | 131,000 | text | Tool use |
| `nvidia/nemotron-nano-9b-v2:free` | 128,000 | text | Tool calling |

**Note on OpenRouter's own free models:** `hunter-alpha` and `healer-alpha` are OpenRouter's own frontier models (alpha stage, logs prompts). `openrouter/free` randomly routes to free models matching your feature needs.

---

## Top Paid Models Worth Knowing

### Flagship / Best-in-Class

| Model ID | Prompt | Completion | Context | Notes |
|---|---|---|---|---|
| `anthropic/claude-opus-4.6` | $5/M | $25/M | 1,000,000 | Latest Opus, tool use, web search |
| `anthropic/claude-sonnet-4.6` | $3/M | $15/M | 1,000,000 | Latest Sonnet, tool use, web search, structured outputs |
| `anthropic/claude-haiku-4.5` | $1/M | $5/M | 200,000 | Fast/cheap Claude, web search support |
| `anthropic/claude-opus-4.1` | $15/M | $75/M | 200,000 | Top-tier reasoning |
| `openai/gpt-5.4` | $2.5/M | $10/M | 1,050,000 | Latest GPT-5 series, web search, structured outputs |
| `openai/gpt-5.4-pro` | $30/M | $120/M | 1,050,000 | Pro tier |
| `openai/o3` | $2/M | $8/M | 200,000 | OpenAI reasoning model, web search |
| `openai/o3-pro` | $20/M | $80/M | 200,000 | o3 Pro tier |
| `openai/o3-deep-research` | $10/M | $40/M | 200,000 | Deep research with web search |
| `openai/o4-mini` | $1.1/M | $4.4/M | 200,000 | Fast reasoning, web search |
| `openai/o1-pro` | $150/M | $600/M | 200,000 | Most expensive on platform |
| `google/gemini-2.5-pro` | $1.25/M | $10/M | 1,048,576 | 1M context, audio+video+file input |
| `google/gemini-2.5-flash` | $0.30/M | $2.5/M | 1,048,576 | Fast, 1M context, multimodal |
| `google/gemini-2.5-flash-lite` | $0.10/M | $0.40/M | 1,048,576 | Very cheap 1M context |
| `x-ai/grok-4` | $3/M | $15/M | 256,000 | Web search native |
| `x-ai/grok-4-fast` | $0.20/M | $0.50/M | 2,000,000 | 2M context, fast, web search |
| `x-ai/grok-4.20-beta` | $2/M | $6/M | 2,000,000 | Latest Grok, lowest hallucination claim |
| `x-ai/grok-4.20-multi-agent-beta` | $2/M | $6/M | 2,000,000 | Multi-agent parallel (4-16 agents) |

### Best Coding Models

| Model ID | Prompt | Completion | Context | Notes |
|---|---|---|---|---|
| `qwen/qwen3-coder` | $0.22/M | $1/M | 262,000 | Dedicated coder |
| `qwen/qwen3-coder:free` | FREE | FREE | 262,000 | Free coding model |
| `qwen/qwen3-coder-flash` | $0.195/M | $0.975/M | 1,000,000 | Fast coder, 1M context |
| `qwen/qwen3-coder-plus` | $0.65/M | $3.25/M | 1,000,000 | Top coding, 1M context |
| `mistralai/devstral-small` | $0.10/M | $0.30/M | 131,072 | Mistral's coding model |
| `mistralai/devstral-medium` | $0.40/M | $2/M | 131,072 | Larger Devstral |
| `mistralai/codestral-2508` | $0.30/M | $0.90/M | 256,000 | Dedicated code model |
| `x-ai/grok-code-fast-1` | $0.20/M | $1.50/M | 256,000 | Grok coding, web search |
| `openai/gpt-5.3-codex` | $1.75/M | $7/M | ~128K | OpenAI codex variant |
| `deepseek/deepseek-v3.2` | $0.26/M | $0.38/M | 163,840 | Excellent value coder |

### Best Reasoning Models

| Model ID | Prompt | Completion | Context | Notes |
|---|---|---|---|---|
| `deepseek/deepseek-r1-0528` | $0.45/M | $2.15/M | 163,840 | Strong reasoning, visible thinking |
| `qwen/qwen3-235b-a22b-thinking-2507` | $0.11/M | $0.60/M | 262,144 | Cheap reasoning, 235B MoE |
| `qwen/qwen3-max-thinking` | $0.78/M | $3.9/M | 262,144 | Max Qwen with thinking |
| `openai/o4-mini` | $1.1/M | $4.4/M | 200,000 | Fast reasoning, web search |
| `x-ai/grok-3-mini` | $0.30/M | $0.50/M | 131,072 | Fast reasoning, web search |
| `qwen/qwq-32b` | $0.15/M | $0.40/M | 32,768 | Budget reasoning |

### Best Value for Bulk Tasks (< $0.10/M prompt)

| Model ID | Prompt | Completion | Context | Notes |
|---|---|---|---|---|
| `liquid/lfm2-8b-a1b` | $0.01/M | $0.02/M | 32,768 | Cheapest available |
| `liquid/lfm-2.2-6b` | $0.01/M | $0.02/M | 32,768 | Cheapest available |
| `google/gemma-3n-e4b-it` | $0.02/M | $0.04/M | 32,768 | Very cheap, vision |
| `meta-llama/llama-3.1-8b-instruct` | $0.02/M | $0.05/M | 16,384 | Reliable workhorse |
| `mistralai/mistral-nemo` | $0.02/M | $0.04/M | 131,072 | Cheap + 131K context |
| `openai/gpt-oss-20b` | $0.03/M | $0.14/M | 131,072 | OpenAI open-source, structured outputs |
| `qwen/qwen-turbo` | $0.033/M | $0.13/M | 131,072 | Qwen cheap, tool use |
| `amazon/nova-micro-v1` | $0.035/M | $0.14/M | 128,000 | AWS, tool use |
| `openai/gpt-oss-120b` | $0.039/M | $0.19/M | 131,072 | 120B for $0.039/M, tool use |
| `google/gemini-2.0-flash-lite-001` | $0.075/M | $0.30/M | 1,048,576 | **1M context for $0.075/M** |
| `google/gemini-2.0-flash-001` | $0.10/M | $0.40/M | 1,048,576 | 1M context, multimodal |
| `google/gemini-2.5-flash-lite` | $0.10/M | $0.40/M | 1,048,576 | Best cheap 1M context |
| `openai/gpt-5-nano` | $0.05/M | $0.20/M | 1,047,576 | GPT-5 nano tier |

---

## Image Generation Models

All use `/api/v1/chat/completions` with `modalities: ["image", "text"]` or `["image"]`.

| Model ID | Prompt | Notes |
|---|---|---|
| `google/gemini-2.5-flash-image` | $0.30/M | Image gen + text output |
| `google/gemini-3.1-flash-image-preview` | $0.50/M | Extended aspect ratios (up to 1:8), 0.5K-4K resolution |
| `google/gemini-3-pro-image-preview` | $2/M | Pro tier image gen |
| `openai/gpt-5-image-mini` | $2.5/M | GPT-5 image mini |
| `openai/gpt-5-image` | $10/M | GPT-5 image full |

**Available resolutions:** 0.5K, 1K (default), 2K, 4K
**Aspect ratios:** 1:1, 2:3, 3:2, 4:3, 16:9, 9:16, and more
**Discovery:** `GET /api/v1/models?output_modality=image`
**Output format:** Base64-encoded PNG in `images` field of assistant message

---

## Audio and Video Models

### Models with Audio Output (Text-to-Speech / Voice)

| Model ID | Prompt | Completion | Context | Modalities |
|---|---|---|---|---|
| `openai/gpt-audio` | $2.5/M | varies | 128,000 | text+audio → text+audio |
| `openai/gpt-audio-mini` | $0.60/M | varies | 128,000 | text+audio → text+audio |
| `openai/gpt-4o-audio-preview` | $2.5/M | $10/M | 128,000 | text+audio → text+audio |

### Models Accepting Audio Input

| Model ID | Prompt | Context | Notes |
|---|---|---|---|
| `mistralai/voxtral-small-24b-2507` | $0.10/M | 32,000 | Audio understanding |
| `google/gemini-2.5-pro` | $1.25/M | 1,048,576 | Full multimodal: text+image+file+audio+video |
| `google/gemini-2.5-flash` | $0.30/M | 1,048,576 | Full multimodal |
| `openrouter/healer-alpha` | FREE | 262,144 | text+image+audio+video (OpenRouter's own) |

### Models Accepting Video Input

| Model ID | Prompt | Context | Notes |
|---|---|---|---|
| `google/gemini-2.5-pro` | $1.25/M | 1,048,576 | Best video understanding |
| `google/gemini-2.5-flash` | $0.30/M | 1,048,576 | Fast video |
| `google/gemini-2.0-flash-001` | $0.10/M | 1,048,576 | Cheap video input |
| `nvidia/nemotron-nano-12b-v2-vl:free` | FREE | 128,000 | Free video input |
| `bytedance-seed/seed-2.0-lite` | $0.25/M | 262,144 | Video + image + text |
| `qwen/qwen3.5-9b` | $0.10/M | 262,144 | Video + image + text |

---

## Web Search / Grounding Models

### Enable with `:online` suffix or `plugins: [{"id": "web"}]`

**Pricing:** $0.005–$0.01 per search call (Exa fallback: ~$0.02 per request)

#### Models with Native Web Search (built-in, lowest cost)

| Model ID | Prompt | Web Search Cost | Notes |
|---|---|---|---|
| `perplexity/sonar` | $1/M | $0.005/call | Search-native, affordable |
| `perplexity/sonar-pro` | $3/M | $0.005/call | Search-native pro |
| `perplexity/sonar-pro-search` | $3/M | $0.018/call | Search-optimized |
| `perplexity/sonar-reasoning-pro` | $2/M | $0.005/call | Search + reasoning |
| `perplexity/sonar-deep-research` | $2/M | $0.005/call | Deep research mode |
| `x-ai/grok-4-fast` | $0.20/M | $0.005/call | 2M context + web search |
| `x-ai/grok-4.20-beta` | $2/M | $0.005/call | Latest Grok |
| `x-ai/grok-3-mini` | $0.30/M | $0.005/call | Budget Grok |
| `openai/gpt-5-nano` | $0.05/M | $0.01/call | Cheapest GPT-5 with search |
| `openai/gpt-5-mini` | $0.25/M | $0.01/call | GPT-5 mini |
| `openai/gpt-4.1-nano` | $0.10/M | $0.01/call | Cheapest reliable OpenAI |
| `anthropic/claude-haiku-4.5` | $1/M | $0.01/call | Cheapest Claude with search |
| `anthropic/claude-sonnet-4.6` | $3/M | $0.01/call | Latest Claude |

**Any model supports web search** via `:online` suffix — non-native models fall back to Exa search API.

**Search engine options:** `native`, `exa`, `firecrawl` (BYOK), `parallel`
**Customization:** `max_results` (default 5), `search_prompt`, `include_domains`, `exclude_domains`

---

## Cool Features to Know About

### 1. Provider Routing & Fallbacks

Control which providers handle your request in the `providers` field:

```json
{
  "model": "anthropic/claude-sonnet-4.6",
  "providers": {
    "order": ["Anthropic", "AWS Bedrock"],
    "allow_fallbacks": true,
    "require_parameters": true,
    "data_collection": "deny"
  }
}
```

- **`:nitro` suffix** — routes to highest-throughput provider (e.g., `openai/gpt-4.1:nitro`)
- **`:floor` suffix** — routes to cheapest provider
- **`max_price`** — hard cap on price per token
- **`zdr: true`** — Zero Data Retention providers only
- **`preferred_min_throughput`** / **`preferred_max_latency`** — SLA percentile targeting (p50, p75, p90, p99)
- Default routing weights cheaper providers by inverse-square of price

### 2. Structured Outputs / JSON Mode

Pass a `response_format` with `type: json_schema` — works across OpenAI, Gemini, Anthropic, and most open-source models. Streaming is supported and the partial response still conforms to schema.

**Response Healing plugin** automatically repairs malformed JSON (non-streaming only).

### 3. Prompt Caching

Automatic caching for: OpenAI, DeepSeek, Grok, Moonshot AI, Groq, Gemini 2.5
Manual `cache_control` required for: Anthropic Claude

Cache read pricing (examples):
- `google/gemini-2.5-flash-lite`: $0.01/M reads (vs $0.10/M input) — **90% savings**
- `deepseek/deepseek-v3.2`: $0.13/M reads (vs $0.26/M input) — **50% savings**
- `anthropic/claude-sonnet-4.6`: $0.30/M reads (vs $3/M input) — **90% savings**
- `openai/gpt-4.1-nano`: $0.025/M reads (vs $0.10/M input) — **75% savings**

OpenRouter uses sticky provider routing to maximize cache hit rates.

### 4. The `openrouter/auto` Model

A meta-router that uses a meta-model to pick the best model for your prompt from dozens of options. Handles: text, image, audio, file, video input. Outputs: text + image. Context: 2M tokens. Cost: whatever the routed model charges.

### 5. `openrouter/bodybuilder`

Pass natural language describing what API call you want — it returns a structured OpenRouter API request object. Meta-utility for generating request configs.

### 6. Tool Use / Function Calling

Supported on 100+ models. Use standard OpenAI `tools` + `tool_choice` parameters. Free models with tool support: `openrouter/hunter-alpha`, `openrouter/free`, `nvidia/nemotron-3-super-120b-a12b:free`, `meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen3-coder:free`, and many others.

### 7. Streaming

Standard SSE streaming supported across all models. Structured outputs work with streaming (partial JSON conforms to schema).

### 8. OAuth PKCE / Programmatic API Keys

Can generate sub-user API keys programmatically with spending limits and model access restrictions. Useful for multi-account or multi-agent deployments.

### 9. Observability

Connects to 15+ monitoring platforms via **Broadcast** feature: Langfuse, Datadog, Sentry, etc. Full activity logging with cost breakdown by model, API key, and team member.

---

## 5 Coolest Things You Can Do

### 1. Mass-Scale Bulk Processing for Almost Free
Use `google/gemini-2.0-flash-lite-001` — 1M context window, $0.075/M prompt, $0.30/M completion. With caching, reads drop to $0.025/M. Process 10 million tokens for ~$0.75. Perfect for bulk classification, extraction, summarization.

**Estimated cost:** 1M token job = ~$0.075 uncached, ~$0.025 with cache hits

### 2. Zero-Cost Research Agent with Web Search + Tool Use
Use `openrouter/hunter-alpha` (FREE, 1M context, tool use + structured outputs) combined with the `:online` web search plugin. 1T parameter model. Logs are retained by OpenRouter, but cost is $0.

**Model:** `openrouter/hunter-alpha` with `plugins: [{"id": "web"}]`
**Cost:** $0 base + ~$0.02/search call (Exa fallback)

### 3. Omni-Modal Reasoning: Video + Audio + Image Input
Feed video files, audio clips, and images into a single 1M context window. `google/gemini-2.5-pro` handles all of it.

**Model:** `google/gemini-2.5-pro`
**Cost:** $1.25/M prompt + $10/M completion
**Estimated cost per page-scale video analysis:** ~$0.01–$0.05

### 4. Image Generation with Text in One Call
Use `google/gemini-3.1-flash-image-preview` — send a text prompt, get back both a written response AND a generated image in the same API call. Set `modalities: ["image", "text"]`. Supports aspect ratios from 1:1 to 21:9 at up to 4K.

**Model:** `google/gemini-3.1-flash-image-preview`
**Cost:** $0.50/M prompt + $3/M completion + image output cost
**Estimated cost per generation:** ~$0.002–$0.01

### 5. Deep Research on a Budget
Use `perplexity/sonar-deep-research` for automatic web search + deep research synthesis. $2/M tokens, $0.005/search call. Or use `x-ai/grok-4-fast` (2M context, web search, $0.20/M prompt) for long-document research grounded in live web data.

**Model:** `perplexity/sonar-deep-research` or `x-ai/grok-4-fast:online`
**Cost (grok-4-fast):** ~$0.20/M prompt + $0.005/search = ~$0.01 per average research query

---

## API Quick Reference

```bash
# Basic call
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "anthropic/claude-sonnet-4.6", "messages": [{"role": "user", "content": "Hello"}]}'

# Web search (any model)
# Option 1: append :online
{"model": "openai/gpt-4.1-nano:online", ...}

# Option 2: plugins array
{"model": "openai/gpt-4.1-nano", "plugins": [{"id": "web", "max_results": 5}], ...}

# Structured output
{"model": "google/gemini-2.5-flash", "response_format": {"type": "json_schema", "json_schema": {...}}, ...}

# Image generation
{"model": "google/gemini-3.1-flash-image-preview", "modalities": ["image", "text"], "messages": [...]}

# Provider routing
{"model": "anthropic/claude-sonnet-4.6", "providers": {"order": ["Anthropic"], "allow_fallbacks": false}, ...}

# List all models
GET https://openrouter.ai/api/v1/models
GET https://openrouter.ai/api/v1/models?output_modality=image
```

---

## Account Notes

- This account has access to all standard models in the catalog
- Models requiring special access (marked beta/preview) are accessible: `grok-4.20-beta`, `gemini-3.1-flash-image-preview`, `hunter-alpha`, `healer-alpha` were all visible in the API response
- Free models (`openrouter/hunter-alpha`, `openrouter/healer-alpha`) log prompts to OpenRouter for model improvement — use paid models for sensitive data
- Crypto payment and zero data retention options available for compliance use cases
