# InfiniteTalk — RunPod Setup Guide

## What It Does
InfiniteTalk (MeiGen-AI, August 2025) generates unlimited-length talking head video from:
- Input: reference face image + audio file
- Output: video of the face speaking the audio with pixel-perfect lip sync
- Key advantage: no clip-length cap, 1.8mm avg lip-sync error (34% better than alternatives)

**This is the primary lip-sync model.** Use MuseTalk 1.5 only for large cheap batch jobs where cost matters more than quality.

## Deployment: RunPod Pods with Template (not serverless)

We use **pods** instead of serverless — 3× cheaper ($0.34/hr RTX 4090 vs $1.12/hr serverless).
The `run_batch.py` script starts and stops pods automatically via the RunPod API.

**Docker image**: `wlsdml1114/Infinitetalk_Runpod_hub`

## One-Time Pod Template Setup (you do this once in RunPod console)

### Step 1: Create Network Volume (if not already done)
- RunPod console → Storage → New Volume
- Name: `ai-influencer-weights`, Size: 50 GB
- Note the **Volume ID** — add to `.env` as `RUNPOD_NETWORK_VOLUME_ID`

### Step 2: Launch a setup pod
- RunPod console → Pods → Deploy Pod
- **GPU**: RTX 4090 (required — 24GB VRAM)
- **Docker image**: `wlsdml1114/Infinitetalk_Runpod_hub`
- **Volume**: Mount `ai-influencer-weights` at `/workspace`
- **Ports**: Expose TCP port `8081`
- Use **on-demand** (not spot) for setup — spot can be interrupted mid-download

### Step 3: Download weights and start API
Open the pod terminal (RunPod console → Connect → Start Terminal):

```bash
# Download model weights to the persistent volume
mkdir -p /workspace/infinitetalk/weights
cd /workspace/infinitetalk
python download_weights.py --output /workspace/infinitetalk/weights

# Verify API starts cleanly
python api_server.py --port 8081 --host 0.0.0.0
# Hit Ctrl+C once you see it's running — weights are now cached on the volume
```

**Low-VRAM option (int8 quantization, runs on 6GB):**
```bash
python api_server.py --port 8081 --host 0.0.0.0 --quantize int8
```

### Step 4: Save as a template
- RunPod console → Pods → three-dot menu on this pod → **Save as Template**
- Template name: `infinitetalk-v1`
- Note the **Template ID** — add to `.env` as `RUNPOD_LIPSYNC_TEMPLATE_ID`
- Stop (don't terminate) the setup pod — or terminate it to stop billing

### Step 5: Add to .env
```
RUNPOD_API_KEY=rpa_...
RUNPOD_LIPSYNC_TEMPLATE_ID=<template-id-from-step-4>
RUNPOD_NETWORK_VOLUME_ID=<volume-id-from-step-1>
```

### How the URL is set at runtime
- Format: `https://[POD_ID]-8081.proxy.runpod.net`
- `pod_manager.py` constructs this URL automatically and passes it to `generate_video.py` via env
- You do NOT manually set `RUNPOD_INFINITETALK_URL` in `.env` — it's injected at runtime

## API Reference

**POST /generate**
```
Content-Type: multipart/form-data

face:  [image file, .png or .jpg, min 512x512, front-facing]
audio: [audio file, .wav or .mp3]
mode:  "image2video" (default) or "video2video"

Returns: video/mp4 binary
```

## Cost Management

| Action | Cost |
|--------|------|
| Start pod (RTX 4090 on-demand) | $0.34/hr |
| Start pod (RTX 4090 spot) | $0.20/hr |
| Per video (2–5 min render) | ~$0.011–0.028 |
| 30-video batch | ~$0.33–0.85 |

**Always shut down the pod after batch jobs.**
```bash
runpodctl stop pod [POD_ID]
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Out of VRAM | Add `--quantize int8` flag (runs on 6GB+) |
| Poor lip sync | Ensure audio is clean, face is front-facing, min 512x512 |
| Slow render | Expected 2–5 min/video on 4090; use spot for batch |
| API timeout | Increase timeout to 300s in generate_video.py |
