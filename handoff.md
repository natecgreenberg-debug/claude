# Session Handoff
**Generated**: 2026-03-16 04:45 EST
**Previous session**: B4_musetalk-debug-image-gen-session.md

## STATUS: Lipsync test running RIGHT NOW
- MuseTalk pod `8vhe8nnwn52ews` is RUNNING, downloading models
- Background script `bcugl8wwy` polling health every 60s, will run `/generate` when ready
- Kokoro pod `kqkhvnccq5v0g0` is STOPPED
- **If lipsync succeeded**: `kate_lipsync.mp4` in `content/test-outputs/` and committed

## Overnight Agent Summary (a11a18164411556a2)
The overnight autonomous agent accomplished the following BEFORE being superseded:
1. Built + pushed `ghcr.io/natecgreenberg-debug/musetalk-api:ruxir` (ruxir-ig repo base)
2. Built + pushed new `latest` with `start.sh` — volume-aware: checks models exist, skips download if yes
3. Created network volume `wi6q9jkzx4` (US-IL-1, 20GB, $1.40/month)
4. Created pod `rqec04dssua20u` WITH volume mounted at `/app/models` — VERIFIED MuseTalk health passed (`models_loaded=true`, GPU 23.54GB)
5. Updated `.env` with verified pod IDs
6. But then kept creating MORE pods in a loop (deleted working pods, recreated without volume)

## What Went Wrong Overnight
- Overnight agent used `start_pods()` which starts BOTH Kokoro and MuseTalk — Kokoro kept getting created/running when not needed
- Agent cycled through many pod IDs: `bxdta5q8zm9i7o` → `t67kbooi0jzc6s` → `rqec04dssua20u` → `8vhe8nnwn52ews` (current)
- Current pod `8vhe8nnwn52ews` does NOT have the network volume mounted — downloading models to container disk
- This means next cold start will re-download unless container disk persists on same machine

## Critical Infrastructure State
| Resource | ID | Status | Cost |
|---|---|---|---|
| musetalk pod | `8vhe8nnwn52ews` | RUNNING (downloading models) | $0.59/hr |
| kokoro pod | `kqkhvnccq5v0g0` | STOPPED | $0.46/hr when running |
| network volume | `wi6q9jkzx4` | US-IL-1, 20GB | $1.40/month |
| OLD EUR-NO-1 volume | `imks7ndzmw` | DELETED | gone |

## Key Fix Needed (Next Session)
The network volume `wi6q9jkzx4` in US-IL-1 is the right long-term solution but needs:
- A pod specifically created in US-IL-1 with `networkVolumeId: wi6q9jkzx4` and `volumeMountPath: /app/models`
- Once created with volume, models download once and persist forever
- Current pod `8vhe8nnwn52ews` doesn't have the volume → models re-download every cold start

## Docker Images (all pushed to ghcr.io)
- `musetalk-api:latest` — best image, has `start.sh` (volume-aware: skip download if models exist)
- `musetalk-api:ruxir` — ruxir-ig base, starts uvicorn directly (models must be pre-present)

## Quick Orientation
- `content/test-outputs/` — kate_face.jpg, kate_car.png, kate_audio.wav, kate_preview.mp4, kate_car_preview.mp4
- `infrastructure/pipeline/musetalk_test.py` — test script that polls health + runs /generate + stops pod
- `.env` — has pod IDs and URLs (may be stale if overnight agent updated again)
- Network volume `wi6q9jkzx4` — 20GB US-IL-1, the correct long-term fix for cold-start problem
