# ACE-Step 1.5 — RunPod Setup Guide

## What It Does
ACE-Step 1.5 (January 2026, Apache 2.0) generates full songs and background music from text prompts.
- Input: text prompt describing mood, style, genre, instruments
- Output: .mp3 or .wav audio file
- Replaces: Suno Premier ($30/month) at near-zero cost

**Key specs:**
- Runs on under 4GB VRAM — the cheapest GPU on RunPod is enough
- Full song in under 10 seconds on RTX 3090
- Outperforms Suno v5 on SongEval (8.09 vs 7.87)
- 50+ languages, 1000+ instruments/styles
- REST API + Gradio UI included

## Deployment Strategy: Pods Now → Serverless Later

We're using **RunPod Pods** during the validation phase. Pods let us SSH in, install models interactively, and debug freely — essential while we're proving the pipeline works.

Once the pipeline is validated and containerized, we'll likely migrate to **RunPod Serverless**. Serverless scales to zero at idle (no cost between batch runs), exposes a persistent API endpoint, and fits cleanly into automated n8n workflows. The trade-off is higher setup complexity upfront — so we're deferring it to Wave 2.

## RunPod Setup

### 1. Select GPU
- **Recommended**: RTX 3090 spot at ~$0.11/hr (overkill — even smaller works)
- **Minimum**: Any GPU with 4GB+ VRAM
- Run as short burst sessions only — generate all music in one session, shut down

### 2. Deploy ACE-Step Pod

```bash
# In RunPod pod terminal:
git clone https://github.com/ace-step/ACE-Step-1.5.git
cd ACE-Step-1.5
pip install -r requirements.txt

# Download model weights
python download_models.py

# Start API server
python api_server.py --port 8082 --host 0.0.0.0
```

### 3. Get Your Endpoint URL
- Format: `https://[POD_ID]-8082.proxy.runpod.net`
- Add to `.env`: `RUNPOD_ACE_STEP_URL=https://[POD_ID]-8082.proxy.runpod.net`

## API Reference

**POST /generate**
```json
{
  "prompt": "warm acoustic guitar, uplifting, female vocal hum, wellness, calm",
  "duration": 30,
  "format": "mp3",
  "seed": null
}

Returns: audio/mp3 binary
```

## Prompt Guide for Kate Mercer Content

| Video type | Prompt |
|------------|--------|
| Educational/calm | `"soft piano, warm, minimal, wellness podcast, no lyrics"` |
| Motivational | `"uplifting acoustic guitar, hopeful, female energy, no lyrics"` |
| Emotional story | `"gentle strings, tender, quiet, introspective, no lyrics"` |
| CTA/energetic | `"light pop, optimistic, bright, movement, no lyrics"` |

## Cost Management

| Action | Cost |
|--------|------|
| Start pod (RTX 3090 spot) | $0.11/hr |
| 60 background tracks (~10 min burst session) | ~$0.02 |
| Full month's music library | <$0.05 |

Generate all music in a single burst session — one hour of GPU time = ~360+ songs.

**Always shut down after use.**
```bash
runpodctl stop pod [POD_ID]
```
