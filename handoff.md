# Session Handoff
**Generated**: 2026-03-16 22:45 EST
**Previous session**: B3_runpod-pod-setup-session.md

## Restart-Dependent Items
None

## What Was In Progress
- **Deploy Kokoro TTS pod** — `ghcr.io/remsky/kokoro-fastapi-gpu:latest`, port 8880. I drive this via RunPod API + SSH from VPS. RunPod API key is in `.env`.
- **Deploy MuseTalk lipsync pod** — requires one-time Docker build from `ruxir-ig/MuseTalk-API`, then push to registry, then deploy as pod. Port 8000.
- **Update `generate_video.py`** — API calls need to be rewritten for Kokoro and MuseTalk (current code calls `/synthesize` with `text` field — wrong for both)

## Open Questions
- MuseTalk Docker build: push to Docker Hub (needs Nate's account) or use a RunPod-hosted build? Decide before starting.
- RunPod API key was typed in chat — Nate said it's fine but worth mentioning rotation option again

## Quick Orientation
- `projects/ai-influencer/infrastructure/pipeline/pod_manager.py` — pod lifecycle automation, needs ports updated (Kokoro: 8880, MuseTalk: 8000)
- `projects/ai-influencer/infrastructure/pipeline/run_batch.py` — top-level entry point, calls pod_manager then generate_video.py
- `projects/ai-influencer/infrastructure/pipeline/generate_video.py` — needs API calls updated for Kokoro + MuseTalk
- `research/2026-03-16_runpod-pod-rest-api-tts-lipsync-docker-images.md` — confirmed Docker images and API formats
- `tools/upload-server/server.js` — file upload server, Nate uses `http://100.114.8.49:9999` to share screenshots
- `.env` — has RUNPOD_API_KEY, Python venv at `projects/ai-influencer/infrastructure/pipeline/.venv`
