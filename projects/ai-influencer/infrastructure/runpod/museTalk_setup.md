# MuseTalk 1.5 — RunPod Setup Guide (Bulk Fallback)

## What It Does
MuseTalk 1.5 generates a talking head video from:
- Input: reference face image + audio file
- Output: video of the face speaking the audio with realistic lip sync

**Role in the pipeline:** Bulk/cheap fallback. Use InfiniteTalk (`infiniteTalk_setup.md`) as the primary model for quality output. Use MuseTalk when generating large volumes at lowest cost (e.g. 100+ videos overnight) where per-video savings outweigh the quality gap.

## Deployment: RunPod Pod (bulk fallback only)

MuseTalk is the cheap bulk fallback — use InfiniteTalk serverless for all normal runs. Only spin up a MuseTalk pod when generating very large batches (100+ videos) where per-video cost savings justify it over InfiniteTalk.

## RunPod Setup

### 1. Create RunPod Account
- Go to runpod.io → Sign up
- Add billing (credit card or crypto)
- Recommended: start with $10 credit

### 2. Select GPU
- **Recommended**: RTX 4090 (Community Cloud) at ~$0.40/hr
- **Minimum**: RTX 3090 (24GB VRAM)
- Use **spot instances** to save cost (preemptible, fine for batch jobs)
- Template: search "MuseTalk" in RunPod templates, or use custom Docker image

### 3. Deploy MuseTalk Pod

**Option A: RunPod Template (easiest)**
1. Go to Templates → Search "MuseTalk"
2. Select the community MuseTalk 1.5 template
3. Deploy with RTX 4090
4. Note your pod ID and endpoint URL

**Option B: Custom Docker**
```bash
# In RunPod pod terminal:
git clone https://github.com/TMElyralab/MuseTalk.git
cd MuseTalk
pip install -r requirements.txt

# Download model weights
python download_weights.py

# Start API server
python api_server.py --port 8081
```

### 4. Get Your Endpoint URL
- Format: `https://[POD_ID]-8081.proxy.runpod.net`
- Add to `.env`: `RUNPOD_MUSSETALK_URL=https://[POD_ID]-8081.proxy.runpod.net`

## API Reference

**POST /generate**
```
Content-Type: multipart/form-data

face: [image file, .png or .jpg, min 512x512]
audio: [audio file, .wav or .mp3]

Returns: video/mp4 binary
```

## Cost Management

| Action | Cost |
|--------|------|
| Start pod | ~$0.40/hr (RTX 4090 spot) |
| Per video (2–5 min render) | ~$0.013–0.033 |
| 30-video batch | ~$0.40–1.00 |

**Always shut down the pod after batch jobs.** RunPod charges while the pod is running.

## Shutdown Pod After Use
```bash
# Via RunPod dashboard: click Stop on your pod
# Or via CLI:
runpodctl stop pod [POD_ID]
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Out of VRAM | Reduce batch size, use RTX 4090 (24GB) |
| Poor lip sync | Ensure audio is clean (no background noise), face is front-facing |
| Slow render | Expected 2–5 min/video; use spot 4090 for best speed/cost |
| API timeout | Increase timeout to 300s in generate_video.py |
