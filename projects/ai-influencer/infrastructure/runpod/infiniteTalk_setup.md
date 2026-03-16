# InfiniteTalk — RunPod Setup Guide

## What It Does
InfiniteTalk (MeiGen-AI, August 2025) generates unlimited-length talking head video from:
- Input: reference face image + audio file
- Output: video of the face speaking the audio with pixel-perfect lip sync
- Key advantage: no clip-length cap, 1.8mm avg lip-sync error (34% better than alternatives)

**This is the primary lip-sync model.** Use MuseTalk 1.5 only for large cheap batch jobs where cost matters more than quality.

## Deployment: RunPod Serverless (pre-built template)

We're using **RunPod Serverless** via a pre-built community template — no SSH, no manual model installation.

**Template repo**: [github.com/wlsdml1114/Infinitetalk_Runpod_hub](https://github.com/wlsdml1114/Infinitetalk_Runpod_hub)

Deploy by pointing RunPod Serverless → New Endpoint at this GitHub repo. RunPod builds the Docker image automatically. Scales to zero at idle — you only pay per generation. Fits cleanly into the automated n8n pipeline in Wave 2 with no changes.

## RunPod Setup

### 1. Select GPU
- **Recommended**: RTX 4090 (24GB) on-demand at ~$0.34/hr
- **Minimum**: Any GPU with 6GB+ VRAM (supports int8 quantization)
- Use **on-demand** for interactive setup and test runs
- Switch to **spot** ($0.20/hr) for large overnight batch jobs once the pipeline is proven

### 2. Deploy InfiniteTalk Pod

```bash
# In RunPod pod terminal:
git clone https://github.com/MeiGen-AI/InfiniteTalk.git
cd InfiniteTalk
pip install -r requirements.txt

# Download model weights
python download_weights.py

# Start API server
python api_server.py --port 8081 --host 0.0.0.0
```

**Low-VRAM option (int8 quantization, runs on 6GB):**
```bash
python api_server.py --port 8081 --host 0.0.0.0 --quantize int8
```

### 3. Get Your Endpoint URL
- Format: `https://[POD_ID]-8081.proxy.runpod.net`
- Add to `.env`: `RUNPOD_INFINITETALK_URL=https://[POD_ID]-8081.proxy.runpod.net`

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
