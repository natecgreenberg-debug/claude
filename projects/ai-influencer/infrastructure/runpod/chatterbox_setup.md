# Chatterbox TTS — RunPod Setup Guide

## What It Does
Chatterbox is a self-hosted TTS (text-to-speech) model that converts script text to natural-sounding audio.
- Input: text string
- Output: .wav audio file
- Key feature: zero-shot voice cloning (can match a reference voice)

## Deployment: RunPod Serverless (pre-built template)

We're using **RunPod Serverless** via a pre-built community template — no SSH, no manual model installation.

**Template repo**: [github.com/geronimi73/runpod_chatterbox](https://github.com/geronimi73/runpod_chatterbox)

Deploy by pointing RunPod Serverless → New Endpoint at this GitHub repo. RunPod builds the Docker image automatically (~3–4 min init). Scales to zero at idle — you only pay per generation. Fits cleanly into the automated n8n pipeline in Wave 2 with no changes.

## RunPod Setup

### 1. Select GPU
- **Recommended**: RTX 3080 or T4 (Chatterbox is lighter than MuseTalk)
- Cost: ~$0.20–0.30/hr
- Can share a pod with MuseTalk if VRAM permits (not recommended for quality)

### 2. Deploy Chatterbox Pod

```bash
# In RunPod pod terminal:
git clone https://github.com/resemble-ai/chatterbox.git
cd chatterbox
pip install -r requirements.txt

# Download model weights
python download_models.py

# Start API server
python api_server.py --port 8080 --host 0.0.0.0
```

### 3. Get Your Endpoint URL
- Format: `https://[POD_ID]-8080.proxy.runpod.net`
- Add to `.env`: `RUNPOD_CHATTERBOX_URL=https://[POD_ID]-8080.proxy.runpod.net`

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
