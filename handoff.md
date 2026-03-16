# Session Handoff
**Generated**: 2026-03-16 04:20 EST
**Previous session**: B4_musetalk-debug-image-gen-session.md

## Restart-Dependent Items
None

## What Was In Progress
- **Background research agent** (ID: a52abbc49b6da869b) searching for working MuseTalk API Docker image or lipsync alternative — output at `/tmp/claude-0/-root-projects-Agent/a83be713-3cf3-450f-9aa1-a322d9137be2/tasks/a52abbc49b6da869b.output` (may or may not still exist after restart)
- **MuseTalk pod `bxdta5q8zm9i7o` is STOPPED** — no charges running
- **Kokoro pod `6afne57q7iqqsh` is STOPPED** — no charges running

## Open Questions
- What is the best pre-built MuseTalk API Docker image? (research agent was finding this)
- Should we use a RunPod persistent volume to avoid re-downloading models every cold start?
- Is there a simpler lipsync alternative (Wav2Lip, SadTalker) with faster startup?

## Quick Orientation
- `projects/ai-influencer/content/test-outputs/` — test assets: kate_face.jpg, kate_car.png, kate_audio.wav, kate_preview.mp4, kate_car_preview.mp4
- `infrastructure/pipeline/pod_manager.py` — start/stop RunPod pods via REST API
- `infrastructure/pipeline/generate_video.py` — full TTS→lipsync→FFmpeg pipeline
- `.env` — has RUNPOD_API_KEY, RUNPOD_KOKORO_POD_ID=6afne57q7iqqsh, RUNPOD_MUSETALK_POD_ID=bxdta5q8zm9i7o
- The goal for next session: get lipsync working. All other pieces (TTS, image gen, FFmpeg) are solid.
