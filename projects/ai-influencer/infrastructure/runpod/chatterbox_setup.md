# Chatterbox TTS — RunPod Setup Guide

## What It Does
Chatterbox is a self-hosted TTS (text-to-speech) model that converts script text to natural-sounding audio.
- Input: text string
- Output: .wav audio file
- Key feature: zero-shot voice cloning (can match a reference voice)

## Deployment: RunPod Pods with Template (not serverless)

We use **pods** instead of serverless — 3× cheaper ($0.22/hr T4 vs ~$0.67/hr serverless).
The `run_batch.py` script starts and stops pods automatically via the RunPod API.

**Docker image**: `runpodinc/chatterbox-turbo`

**Role:** Production voice only. Chatterbox is used for Kate's cloned voice — the specific persona voice that requires a 5-second reference sample. Cold start is 3–4 min, which is acceptable for batch runs (only affects the first job in a session).

**For fast preview/iteration:** Use Kokoro instead (see `kokoro_setup.md`) — <5 sec cold start, no cloning, but good enough to hear whether a script works before committing to a full Chatterbox render.

## One-Time Pod Template Setup (you do this once in RunPod console)

### Step 1: Create Network Volume (if not already done)
- RunPod console → Storage → New Volume
- Name: `ai-influencer-weights`, Size: 50 GB
- Note the **Volume ID** — add to `.env` as `RUNPOD_NETWORK_VOLUME_ID`

### Step 2: Launch a setup pod
- RunPod console → Pods → Deploy Pod
- **GPU**: RTX 3080 or T4
- **Docker image**: `runpodinc/chatterbox-turbo`
- **Volume**: Mount `ai-influencer-weights` at `/workspace`
- **Ports**: Expose TCP port `8080`

### Step 3: Download weights and start API
Open the pod terminal (RunPod console → Connect → Start Terminal):

```bash
# Download model weights to the persistent volume
mkdir -p /workspace/chatterbox/weights
cd /workspace/chatterbox
python -c "from chatterbox.tts import ChatterboxTTS; ChatterboxTTS.from_pretrained(device='cuda')"

# Verify API starts cleanly
python api_server.py --port 8080 --host 0.0.0.0
# Hit Ctrl+C once you see it's running — weights are now cached on the volume
```

### Step 4: Save as a template
- RunPod console → Pods → three-dot menu on this pod → **Save as Template**
- Template name: `chatterbox-v1`
- Note the **Template ID** — add to `.env` as `RUNPOD_TTS_TEMPLATE_ID`
- Stop (don't terminate) the setup pod — or terminate it to stop billing

### Step 5: Add to .env
```
RUNPOD_API_KEY=rpa_...
RUNPOD_TTS_TEMPLATE_ID=<template-id-from-step-4>
RUNPOD_NETWORK_VOLUME_ID=<volume-id-from-step-1>
```

### 3. How the URL is set at runtime
- Format: `https://[POD_ID]-8080.proxy.runpod.net`
- `pod_manager.py` constructs this URL automatically and passes it to `generate_video.py` via env
- You do NOT manually set `RUNPOD_CHATTERBOX_URL` in `.env` — it's injected at runtime

## Voice Setup

### Option A: Default Voice (quickest to start)
Use Chatterbox's built-in default female voice. No configuration needed.

### Option B: Custom Voice Clone (recommended for consistency)
Record 10–30 seconds of clean reference audio for the persona voice.
```
POST /clone-voice
Content-Type: multipart/form-data

reference_audio: [.wav file, 10-30 sec, clean speech]
voice_id: "persona_v1"

Returns: { "voice_id": "persona_v1" }
```

Then use `voice_id: "persona_v1"` in all synthesis calls.

## API Reference

**POST /synthesize**
```json
{
  "text": "Your script text here",
  "voice": "default",          // or your voice_id
  "speed": 1.0,                // 0.8–1.2, default 1.0
  "pitch": 0,                  // -5 to 5 semitones
  "emotion": "warm"            // warm, neutral, energetic
}

Returns: audio/wav binary
```

## Voice Guidelines for Menopause Persona
- **Speed**: 0.95 (slightly slower — warm, not rushed)
- **Pitch**: 0 (natural)
- **Emotion**: warm
- **Tone target**: "knowledgeable friend" — confident but not clinical

## Cost Management

| Action | Cost |
|--------|------|
| Start pod (T4) | ~$0.20/hr |
| Per audio file (~60 sec script) | ~$0.003–0.005 |
| 30-script batch | ~$0.10–0.15 |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Robotic sound | Adjust speed (0.9–0.95) and use emotion="warm" |
| Mispronounced words | Add to custom pronunciation dict in config |
| Audio too quiet | Normalize in FFmpeg step (loudnorm) |
| Voice inconsistency | Use a cloned voice, not default |
