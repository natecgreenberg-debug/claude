# Research Report: RunPod Pod REST API Docker Images — TTS & Lip-Sync
**Date**: 2026-03-16
**Agents dispatched**: 4
- Agent A: Chatterbox TTS REST API images — Docker Hub, GitHub, endpoints
- Agent B: Kokoro TTS REST API images — Docker Hub, GitHub, endpoints
- Agent C: InfiniteTalk & MuseTalk talking head — REST API vs. serverless verification
- Agent D: RunPod GPU pod pricing + alternative talking-head REST API options

---

## Executive Summary

**For TTS pods**: Three solid REST API Docker images exist for Chatterbox, two of which are on Docker Hub and drop-in deployable on a RunPod pod. The best pick is `travisvn/chatterbox-tts-api` (OpenAI-compatible, port 4123) or `bhimrazy/chatterbox-tts:v0.1.0` (LitServe, port 8000). Kokoro-FastAPI (`ghcr.io/remsky/kokoro-fastapi-gpu:latest`, port 8880) is the strongest turnkey option — actively maintained, OpenAI-compatible, and runs on smaller GPUs. [Verified: Docker Hub + GitHub, 2025–2026]

**For lip-sync pods**: InfiniteTalk (`wlsdml1114/Infinitetalk_Runpod_hub`) is confirmed **serverless-only** — it uses `handler.py` / `runpod.serverless.start` and cannot be used as a pod REST API. The best REST API pod option is `ruxir-ig/MuseTalk-API` (must be built from source, port 8000), which supports MuseTalk 1.5. No pre-built Docker Hub image exists for any talking-head model with a clean REST API — all require self-build or alternative approaches. [Verified: GitHub repos + search, 2025–2026]

---

## TTS: Chatterbox REST API Images

### Option 1 — `travisvn/chatterbox-tts-api` (Recommended)
**Architecture**: REST API server (FastAPI, OpenAI-compatible). NOT a serverless worker.
**Docker image**: `travisvn/chatterbox-tts-api:latest`
**Docker Hub**: https://hub.docker.com/r/travisvn/chatterbox-tts-api
**GitHub**: https://github.com/travisvn/chatterbox-tts-api
**Port**: 4123

**Endpoints**:
| Endpoint | Method | Description |
|---|---|---|
| `/v1/audio/speech` | POST | Core TTS — JSON body, returns WAV |
| `/v1/audio/speech/stream` | POST | Streaming audio via SSE, base64 chunks |
| `/v1/audio/speech/upload` | POST | TTS with custom voice file upload |
| `/voices` | POST | Upload and store a custom voice |
| `/voices` | GET | List available voices with metadata |
| `/languages` | GET | List 22 supported languages |

**Request format** (`POST /v1/audio/speech`):
```json
{
  "input": "Hello, I'm Kate Mercer...",
  "voice": "default",
  "exaggeration": 0.5,
  "cfg_weight": 0.5,
  "temperature": 0.8
}
```
**Response**: WAV audio file

**GPU requirements**: NVIDIA CUDA. Exact VRAM not specified in docs; Chatterbox requires ~6–8GB VRAM minimum (RTX 3090/4090 more than sufficient). Also supports AMD ROCm and CPU fallback. [Blog: travisvn/GitHub, 2025]

**Also available as**: `hanseware/chatterbox-tts-api:uv-20260215` (community build, updated Feb 2026) [Official Docs: Docker Hub, 2026]

---

### Option 2 — `bhimrazy/chatterbox-tts:v0.1.0`
**Architecture**: REST API server (LitServe). NOT a serverless worker.
**Docker image**: `bhimrazy/chatterbox-tts:v0.1.0`
**Docker Hub**: https://hub.docker.com/r/bhimrazy/chatterbox-tts
**Port**: 8000

**Endpoints**:
| Endpoint | Method | Description |
|---|---|---|
| `/speech` | POST | TTS with voice cloning support |

**Request format** (`POST /speech`):
```json
{
  "text": "Hello, I'm Kate...",
  "exaggeration": 0.5,
  "cfg": 0.5,
  "temperature": 0.8,
  "audio_prompt": "<base64-encoded WAV or file path>"
}
```
**Response**: Audio file

**GPU requirements**: NVIDIA (uses `--gpus all`). LitServe is designed for production scalability. [Blog: bhimrazy/Lightning.ai, 2025]

**Note**: Less feature-rich than travisvn (no voice library management, no streaming), but simpler to call. LitServe overhead may add latency vs. raw FastAPI.

---

### Option 3 — `babanovac1980/chatterbox-tts-server` / `devnen/Chatterbox-TTS-Server`
**Architecture**: REST API server (FastAPI). NOT a serverless worker.
**Docker Hub**: https://hub.docker.com/r/babanovac1980/chatterbox-tts-server
**GitHub**: https://github.com/devnen/Chatterbox-TTS-Server
**Port**: 8004

**Endpoints**:
- `POST /tts` — main synthesis endpoint
- `GET /docs` — Swagger UI
- `GET /api/ui/initial-data` — health/status

**GPU requirements**: NVIDIA CUDA 12.1 (RTX 20/30/40), CUDA 12.8 (RTX 5090), AMD ROCm 6.4+, or CPU fallback. [Official Docs: devnen/GitHub, 2025]

**Note**: Most feature-rich (Web UI, audiobook-scale text chunking, predefined voices), but the Docker Hub image (`babanovac1980/`) is a community mirror — verify it stays in sync with the upstream `devnen/` repo.

---

## TTS: Kokoro-FastAPI (Strong Alternative / Recommended for Speed)

**Architecture**: REST API server (FastAPI, OpenAI-compatible). NOT a serverless worker.
**Docker image**: `ghcr.io/remsky/kokoro-fastapi-gpu:latest`
**Also available**: `ghcr.io/remsky/kokoro-fastapi-gpu:v0.2.0post4` (pinned release)
**GitHub**: https://github.com/remsky/Kokoro-FastAPI
**Port**: 8880

**Endpoints**:
| Endpoint | Method | Description |
|---|---|---|
| `/v1/audio/speech` | POST | OpenAI-compatible TTS |
| `/v1/audio/voices` | GET | List available voices |
| `/v1/audio/voices/combine` | POST | Mix/blend voices |
| `/dev/phonemize` | POST | Text → phonemes |
| `/dev/generate_from_phonemes` | POST | Audio from phonemes |
| `/dev/captioned_speech` | POST | Audio + word-level timestamps |
| `/debug/threads`, `/debug/storage`, `/debug/system` | GET | System monitoring |

**Request format** (`POST /v1/audio/speech`):
```json
{
  "model": "kokoro",
  "input": "Hello, I'm Kate...",
  "voice": "af_sarah",
  "response_format": "mp3"
}
```
Supported formats: `mp3`, `wav`, `opus`, `flac`

**GPU requirements**: NVIDIA CUDA 12.8+. Benchmarked on RTX 4060Ti (16GB VRAM). Minimum is likely 6–8GB. CPU variant also available: `ghcr.io/remsky/kokoro-fastapi-cpu:latest`. [Official Docs: remsky/GitHub, 2025]

**Performance**: 35x–100x real-time speed on GPU. Very fast cold start (<5 seconds with model cached). [Official Docs: remsky/GitHub, 2025]

**Why prefer for fast preview**: Kokoro 82M is much lighter than Chatterbox. Same voice every time (no stochastic variation), OpenAI-compatible so it works as a drop-in. Excellent for iteration.

---

## Lip-Sync / Talking Head: InfiniteTalk — SERVERLESS WORKER, NOT POD REST API

**Verdict**: InfiniteTalk (`wlsdml1114/Infinitetalk_Runpod_hub`) is **confirmed as a RunPod serverless worker only**. It uses `handler.py` implementing the `runpod.serverless.start` pattern. It does NOT expose an HTTP port or REST API. [Verified: GitHub repo inspection, 2025]

**Architecture**: ComfyUI-based workflow system. Requests are submitted as JSON payloads to RunPod's serverless job queue — not via direct HTTP to a pod.

**Request format** (serverless job input — NOT a pod REST API):
```json
{
  "input": {
    "input_type": "image",
    "person_count": "single",
    "source": "<base64 or URL>",
    "audio": "<base64 or URL>",
    "force_offload": true
  }
}
```

**GPU requirements**: 24GB+ VRAM with `force_offload: false`. With `force_offload: true`, smaller GPUs are supported. [Official Docs: wlsdml1114/GitHub, 2025]

**Conclusion**: Cannot be deployed as a pod with a REST API. Must use as serverless or find alternative.

---

## Lip-Sync / Talking Head: MuseTalk 1.5 REST API (Best Pod Option)

**Architecture**: REST API server (FastAPI). NOT a serverless worker. Deployable on a RunPod pod.
**GitHub**: https://github.com/ruxir-ig/MuseTalk-API
**Docker Hub image**: **None published** — must `docker build` from source
**Port**: 8000

**Endpoints**:
| Endpoint | Method | Description |
|---|---|---|
| `GET /` | GET | Service info |
| `GET /health` | GET | Health check + GPU info |
| `POST /generate` | POST | Lip-sync via file upload (multipart) |
| `POST /generate/json` | POST | Lip-sync via file paths (JSON) |
| `GET /download/{filename}` | GET | Download generated video |

**Request format** (`POST /generate`, multipart form):
```
source: <image or video file>
audio: <audio file>
enhance: true/false
gfpgan_weight: 0.5
bbox_shift: 0
output_name: result.mp4
fps: 25
batch_size: 8
```

**Request format** (`POST /generate/json`, JSON):
```json
{
  "source": "/path/to/image.jpg",
  "audio": "/path/to/audio.wav",
  "enhance": true,
  "fps": 25
}
```

**MuseTalk version**: Supports both MuseTalk 1.5 (recommended) and 1.0. [Official Docs: ruxir-ig/GitHub, 2025]

**GPU requirements**: Minimum ~8–12GB VRAM based on benchmarks. Tested on NVIDIA L4 (24GB) and RTX 4060 Laptop. MuseTalk 1.5 models stored in `musetalkV15/` directory. [Official Docs: ruxir-ig/GitHub, 2025]

**Deployment on RunPod pod**:
1. Build the image using a RunPod pod with Docker (or pre-build and push to your own Docker Hub)
2. Start pod with `docker run --gpus all -p 8000:8000 -v models:/app/models musetalk-api`
3. Hit `GET /health` to confirm GPU detected
4. Submit jobs via `POST /generate`

**Limitation**: No pre-built public image. You must build and push to a private registry or Docker Hub before deploying on RunPod. This is a one-time step.

---

## Alternative Talking Head: faster-SadTalker-API

**Architecture**: REST API server. Deployable as a pod. NOT a serverless worker.
**GitHub**: https://github.com/kenwaytis/faster-SadTalker-API
**Docker Hub image**: None published — must build from source
**Port**: 10364 (main API), 9566 (bundled TTS server)
**Docs**: `localhost:10364/docs` (Swagger UI)

**Performance**: Claims 10x faster than original SadTalker via optimized operator fusion.

**Caveats**:
- Last release August 2023 — not maintained for newer GPU architectures
- No Docker Hub image
- SadTalker quality has been surpassed by MuseTalk 1.5 and InfiniteTalk
- **Not recommended** unless MuseTalk fails — use as last resort only. [Community: GitHub issues, 2023]

---

## RunPod GPU Pod Pricing (On-Demand, 2026)

| GPU | VRAM | On-Demand $/hr | Best For |
|---|---|---|---|
| RTX 3090 | 24GB | $0.22/hr | TTS (Kokoro, Chatterbox) — cheap, enough VRAM |
| RTX 4090 | 24GB | $0.34/hr | TTS + MuseTalk 1.5 — best bang/buck |
| A40 | 48GB | $0.35/hr | MuseTalk with headroom |
| L40S | 48GB | $0.79/hr | Heavy workloads, not needed for TTS |
| A100 80GB | 80GB | $1.19/hr | Overkill for these use cases |

[Official Docs: runpod.io/gpu-pricing, 2026]

**Recommended GPU for TTS pod**: RTX 3090 at $0.22/hr — more than enough VRAM for Kokoro or Chatterbox.
**Recommended GPU for MuseTalk 1.5 pod**: RTX 4090 at $0.34/hr — 24GB VRAM, tested on similar hardware.

---

## Contradictions & Gaps

**InfiniteTalk ambiguity**: Prior research notes described InfiniteTalk as having a "Dockerfile + handler.py" and called it a "serverless worker." This research confirms that is accurate — it IS serverless only. The phrase "REST API usage" in RunPod's docs refers to their serverless job-submission API, not a pod HTTP API. These are architecturally incompatible with pod deployment.

**No pre-built talking-head pod images**: Despite extensive search, no pre-built Docker Hub image exists for any high-quality talking-head model (MuseTalk 1.5, LatentSync, EchoMimic) with a clean REST API. All require self-build. This is a gap that requires a one-time image build + push step before RunPod pod deployment.

**Chatterbox VRAM**: Exact minimum VRAM requirements for Chatterbox TTS are not documented in any source. Community reports suggest 6–8GB works; 24GB (RTX 3090) is safe.

**MuseTalk 1.5 model download**: The `ruxir-ig/MuseTalk-API` repo requires downloading MuseTalk 1.5 weights at build time. This will increase image build time significantly (~10–20 GB of model weights). Consider using a RunPod network volume for model storage rather than baking weights into the image.

**LatentSync / EchoMimic pod REST APIs**: Search found these models exist (ByteDance LatentSync 1.6, EchoMimicV3) but no production-ready REST API Docker image was found. They would require custom wrapping. Not covered further here as MuseTalk 1.5 is the designated fallback.

---

## Key Takeaways

- **InfiniteTalk is serverless-only** — confirmed. Cannot be used as a pod REST API without a complete rewrite. [Verified: GitHub, 2025]
- **Best TTS pod (OpenAI-compatible, easiest)**: `ghcr.io/remsky/kokoro-fastapi-gpu:latest` — port 8880, `POST /v1/audio/speech`, pre-built image, works on RTX 3090 ($0.22/hr). [Official Docs: remsky/GitHub, 2025]
- **Best TTS pod (Chatterbox, voice cloning)**: `travisvn/chatterbox-tts-api:latest` — port 4123, `POST /v1/audio/speech`, OpenAI-compatible, pre-built image. [Official Docs: travisvn/GitHub + Docker Hub, 2025]
- **Best talking-head pod (MuseTalk 1.5)**: `ruxir-ig/MuseTalk-API` — port 8000, `POST /generate`, requires self-build + push to registry first. Runs on RTX 4090 ($0.34/hr). [Official Docs: ruxir-ig/GitHub, 2025]
- **No turnkey talking-head pod image exists** — a one-time Docker build + push step is required before RunPod pod deployment for MuseTalk.
- **RTX 4090 at $0.34/hr** is the recommended GPU for MuseTalk. RTX 3090 at $0.22/hr is sufficient for TTS. [Official Docs: runpod.io, 2026]

---

## Recommended Next Steps

1. **Deploy TTS pod immediately**: Use `ghcr.io/remsky/kokoro-fastapi-gpu:latest` on a RunPod RTX 3090 pod. Test `POST /v1/audio/speech` — zero build time required.
2. **If Chatterbox voice cloning needed**: Pull `travisvn/chatterbox-tts-api:latest` — also zero build time, same OpenAI-compatible interface.
3. **Build MuseTalk pod image once**: Clone `ruxir-ig/MuseTalk-API`, build on a RunPod RTX 4090 pod (or locally if VRAM allows), push to Docker Hub under a private repo. Then deploy as a standard pod — `POST /generate` with image + audio.
4. **Do NOT deploy InfiniteTalk as a pod** — it requires rewriting `handler.py` into a FastAPI server to work as a pod REST API. Use MuseTalk 1.5 instead.
5. **Consider network volume for model weights**: MuseTalk models are large. Mount a RunPod network volume at `/app/models` to avoid re-downloading on each pod restart.

---

## Sources

### Official / Verified
- https://github.com/remsky/Kokoro-FastAPI — Kokoro-FastAPI official repo, GPU image tags, endpoints
- https://github.com/travisvn/chatterbox-tts-api — travisvn Chatterbox REST API, OpenAI-compatible
- https://github.com/wlsdml1114/Infinitetalk_Runpod_hub — InfiniteTalk serverless worker (confirms handler.py architecture)
- https://github.com/ruxir-ig/MuseTalk-API — MuseTalk 1.5 REST API, port 8000, endpoints
- https://www.runpod.io/gpu-pricing — RunPod on-demand pod pricing table

### Blogs & Articles
- https://hub.docker.com/r/travisvn/chatterbox-tts-api — Docker Hub image listing
- https://hub.docker.com/r/bhimrazy/chatterbox-tts — Docker Hub image (bhimrazy/LitServe)
- https://hub.docker.com/r/babanovac1980/chatterbox-tts-server — Community Chatterbox mirror
- https://github.com/devnen/Chatterbox-TTS-Server — Upstream Chatterbox TTS Server (port 8004, OpenAI-compatible)
- https://hub.docker.com/r/hanseware/chatterbox-tts-api — Active community fork, Feb 2026 tag
- https://hub.docker.com/layers/bhimrazy/chatterbox-tts/v0.1.0/images/sha256-d7bf04585ab6f338d4cb0483ef4fe7171307d3c62a22c65aff04a7f37271a878 — Image layer details

### Community
- https://www.answeroverflow.com/m/1378966817946468352 — RunPod serverless Chatterbox TTS deployment issues (jobs stuck in queue)
- https://medium.com/@geronimo7/building-a-voice-cloning-app-9a146f3357db — Geronimo's Chatterbox + RunPod article
- https://github.com/kenwaytis/faster-SadTalker-API — faster-SadTalker (2023, not recommended)
- https://github.com/bytedance/LatentSync — LatentSync 1.6 (ByteDance, 2025 — no ready pod image)
