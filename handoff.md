# Session Handoff
**Generated**: 2026-03-12 23:30
**Previous session**: `012_ai-influencer-v1-persona-scaffold.md`

## Restart-Dependent Items
None — no new skills, hooks, or config files changed this session.

## What Was In Progress
- Nate is completing external signups (GeeLark, RunPod, Gumroad, proxies, 5sim, platform accounts) — see `projects/ai-influencer/YOUR_TODO.md` items 1–9
- The 14-day account warmup clock starts when Nate creates the platform accounts (item #5)
- Next build work: face generation Stage 1, product outline + chapters, RunPod deployment

## Open Questions
- Which Gemini image generation model is the correct one on OpenRouter? Verify at `openrouter.ai/collections/image-models` before running `gen_face.py --stage 2`. Current placeholder: `google/gemini-2.5-flash-preview`
- Blotato vs. GeeLark RPA for posting automation — not decided yet, deferred to when n8n workflow is built

## Quick Orientation
- `projects/ai-influencer/YOUR_TODO.md` — Nate's sequenced action list, items 1–9 are his solo work
- `projects/ai-influencer/content/persona/persona.md` — fully locked persona (Kate Mercer)
- `projects/ai-influencer/research/07_menopause_deep_research.md` — Reddit + Perplexity research, copy-paste script hooks inside
- `references/openrouter_pricing.md` — real API costs, always check before quoting spend estimates
- `projects/ai-influencer/infrastructure/gen_face.py` — two-stage face gen (Stage 1 cheap, Stage 2 quality)
- `projects/ai-influencer/infrastructure/scripts/gen_scripts.py` — batch script generator (60 scripts, 6 pillars × 5 angles × 2)
- `projects/ai-influencer/infrastructure/pipeline/generate_video.py` — full pipeline: TTS → MuseTalk → FFmpeg
- `projects/ai-influencer/infrastructure/dashboard/server.js` — approval dashboard on port 3030
- **Firecrawl**: Start with `cd /root/projects/Agent/tools/firecrawl && docker compose up -d`, wait 20 sec. Shut down when done: `docker compose down`
