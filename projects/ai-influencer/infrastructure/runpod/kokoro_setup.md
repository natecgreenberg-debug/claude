# Kokoro TTS — RunPod Setup Guide (Fast Preview)

## What It Does
Kokoro-82M is a fast, high-quality English TTS model for script previews and iteration.
- Input: text string
- Output: .wav or .mp3 audio file
- Key advantage: <5 second cold start (vs. 3–4 min for Chatterbox)

**Role in the pipeline:** Fast preview only. Use this to quickly hear whether a script sounds right before committing to a full Chatterbox production render. Does NOT support voice cloning — uses pre-built English voices.

For Kate's actual production voice (cloned), use Chatterbox (`chatterbox_setup.md`).

## Deployment: RunPod Serverless (community template)

**Template repo**: [github.com/arkodeepsen/kokoro](https://github.com/arkodeepsen/kokoro)

Deploy via: RunPod console → Serverless → New Endpoint → Custom deployment → GitHub repo URL above.

Supports voice mixing, word timestamps, phonemes, MP3/WAV/PCM output.

## API Reference

**POST /run**
```json
{
  "input": {
    "text": "Your script text here",
    "voice": "af_heart",
    "speed": 0.95,
    "format": "wav"
  }
}

Returns: base64-encoded audio
```

## Available Voices
- `af_heart` — warm American female (closest to Kate's target tone)
- `af_bella` — expressive American female
- `bf_emma` — British female

## Cost Management

| Action | Cost |
|--------|------|
| Cold start | <5 seconds |
| Per preview (~60 sec audio) | ~$0.001–0.003 |
| 30 script previews | ~$0.03–0.09 |

## GPU
RTX 4090 or A4000 (16GB). Very lightweight — runs on the cheapest available GPU.
