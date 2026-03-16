# Context Dump — 2026-03-16
## Session: MuseTalk debug + image gen session

### What We Did
1. Confirmed pod IDs from RunPod screenshot — Kokoro `6afne57q7iqqsh` (RTX 3090, $0.46/hr), MuseTalk `bxdta5q8zm9i7o` (RTX 4090, $0.59/hr)
2. Stopped MuseTalk pod after 20+ min of 404s — diagnosed root cause: `download_models.py` runs at container startup and downloads 5-10GB of model weights before uvicorn starts. This takes 30-60+ min on every cold start, making the pod unusable for start/stop workflow.
3. Discovered OpenRouter DOES support image generation via `google/gemini-3.1-flash-image-preview` model — response comes back in `choices[0].message.images[0].image_url.url` as base64 data URI (NOT in `content` field — that's null). Previous session got this wrong.
4. Generated `kate_car.png` — realistic portrait of 52yo woman with black hair going gray, sitting in car driver seat. 1.7MB PNG.
5. Generated `kate_car_preview.mp4` — static kate_car.png + kate_audio.wav combined via FFmpeg, 9:16 crop, 390KB.
6. Nate terminated the Kokoro TTS pod manually (it was left running from previous session — my fault).
7. Launched background research agent to find pre-built MuseTalk API Docker images or alternatives.

### What Went Right
- OpenRouter image gen works — `google/gemini-3.1-flash-image-preview` via chat completions, images in `message.images[]` key
- FFmpeg static preview pipeline solid
- Pod stop/start via REST API works correctly
- Both pods now stopped — no charges

### What Went Wrong / Needs Improvement
- **Kokoro pod left running overnight** — started for audio gen in previous session, never stopped. Nate had to manually terminate it. Rule: always stop pods immediately after use (saved to memory: feedback_stop_pods.md)
- **MuseTalk Docker image is broken for start/stop workflow** — downloads 5-10GB models at runtime instead of baking them in. Background agent is researching alternatives.
- **Two background poll tasks ran in parallel** (bctupku2w and bpdqqq7we) on the same pod — redundant, added confusion. Don't launch duplicate monitoring tasks.
- **MuseTalk pod ran ~20 min at $0.59/hr before we stopped it** — ~$0.20 wasted on a non-functional pod

### Pending / Next Session
- **MOST URGENT**: Act on research agent findings (agent ID: a52abbc49b6da869b) — find a working MuseTalk API image or alternative lipsync service. Read output from `/tmp/claude-0/-root-projects-Agent/a83be713-3cf3-450f-9aa1-a322d9137be2/tasks/a52abbc49b6da869b.output`
- Deploy the better lipsync solution as a RunPod pod
- Run the actual lipsync test: send `kate_car.png` + `kate_audio.wav` to /generate, save `kate_lipsync.mp4`
- Consider RunPod persistent volumes to avoid re-downloading models on every cold start
- Generate a proper Kate Mercer face image (current `kate_face.jpg` is random, `kate_car.png` is better but still not "Kate")
- Commit test-outputs to git (currently untracked)

### Git State
- Branch: `main`
- Latest commits (newest first):
  - `c1335d3` feat: update generate_video.py to use Kokoro TTS + MuseTalk API calls
  - `412d758` feat: update pod_manager to use REST API directly, remove template ID dependency
  - `09be059` chore: consume session handoff
  - `453c5ef` docs: context dump B3 — runpod-pod-setup-session
  - `df86d8f` research: RunPod pod REST API Docker images for TTS and lip-sync
- Uncommitted changes: YES — `projects/ai-influencer/content/test-outputs/` (new dir, 5 files)

### Files Modified This Session
| File | Action |
|------|--------|
| `projects/ai-influencer/content/test-outputs/kate_car.png` | Created — OpenRouter Gemini image gen |
| `projects/ai-influencer/content/test-outputs/kate_car_preview.mp4` | Created — FFmpeg static preview |
| `projects/ai-influencer/content/test-outputs/kate_face.jpg` | Created (prev session) — thispersondoesnotexist |
| `projects/ai-influencer/content/test-outputs/kate_audio.wav` | Created (prev session) — Kokoro TTS |
| `projects/ai-influencer/content/test-outputs/kate_preview.mp4` | Created (prev session) — FFmpeg static |
| `.claude/projects/-root-projects-Agent/memory/feedback_stop_pods.md` | Created — pod stop rule |
| `.claude/projects/-root-projects-Agent/memory/MEMORY.md` | Updated — pod management rules |

### Key Decisions / Preferences Learned
- **OpenRouter image gen response format**: images are in `choices[0].message.images[0].image_url.url` (base64 data URI), NOT in `content`. Model: `google/gemini-3.1-flash-image-preview`.
- **MuseTalk model-download-at-runtime is unworkable** — need either pre-baked image or RunPod volume mount for model persistence
- **Nate wants pods stopped immediately after every use** — zero tolerance for idle pods
- **GPU question answered**: MuseTalk needs RTX 4090 because it's a diffusion model (heavier). Kokoro only needs RTX 3090. The $0.13/hr difference is worth it for speed.
- **Both pod IDs confirmed**: Kokoro `6afne57q7iqqsh`, MuseTalk `bxdta5q8zm9i7o` — these match .env
