# Research Report: MuseTalk Lipsync Docker Images & RunPod Deployment Options
**Date**: 2026-03-16
**Agents dispatched**: 4 — (1) Docker Hub/GHCR image search, (2) GitHub repo deep-dive (ruxir-ig + TMElyralab), (3) RunPod community templates, (4) Alternative lipsync tools (Wav2Lip, SadTalker, LatentSync)

---

## Executive Summary

No publicly published, pre-baked Docker image for MuseTalk with model weights included currently exists on Docker Hub or ghcr.io. The best available option is **ruxir-ig/MuseTalk-API** — a production-quality FastAPI fork that must be built locally and downloads models on first run (same download problem as the current setup). The most practical path to fast startup on RunPod is a **RunPod Network Volume**: download MuseTalk models once to a persistent volume (~10–15 GB), then mount it on every pod restart — cold start drops from 30–60 min to under 2 minutes. Among alternatives, **LatentSync** (ByteDance) is the most capable diffusion-based option with Replicate API availability, but no pre-baked RunPod pod image exists for it either. [Verified: GitHub + RunPod Docs, 2025]

---

## Option 1: ruxir-ig/MuseTalk-API (Best MuseTalk REST API)

**Source**: https://github.com/ruxir-ig/MuseTalk-API
**Status**: Active fork of TMElyralab/MuseTalk, 67 commits on main branch.

### What it is
A production-ready FastAPI wrapper around MuseTalk with:
- `POST /generate` — multipart form upload (source video + audio file) → returns video
- `POST /generate/json` — path-based (files already on server)
- `GET /download/{filename}` — streaming download of results
- `GET /health` — GPU health check
- `GET /` — service info

Port: **8000**. Clean REST API, no Gradio, no handler.py — correct for RunPod pods. [Community: GitHub ruxir-ig/MuseTalk-API]

### Docker Image
- **No published image on Docker Hub or ghcr.io** — must build locally.
- Build command: `docker build -t musetalk-api .`
- Run command:
  ```bash
  docker run --gpus all -p 8000:8000 \
    -v ./models:/app/models \
    -v ./results:/app/results \
    musetalk-api
  ```
- Volume mounts: `/app/models`, `/app/results`, `/app/data`

### Model Download (THE PROBLEM)
Models download automatically on first run via `download_weights.sh`. Model directories:
- `musetalk` / `musetalkV15`
- `dwpose`
- `face-parse-bisent`
- `sd-vae`
- `syncnet`
- `whisper`

**No model size documented**, but based on comparable setups this is 8–15 GB total. Startup on a fresh pod = 30–60 min download (same issue as current setup). [Community: GitHub ruxir-ig/MuseTalk-API]

### Performance (when running)
- GFPGAN optimized ~1.8x faster vs baseline using `has_aligned=True`
- Processing: 15–21 minutes for 3-minute videos with enhancement enabled
- Benchmarked on RTX 4060 Laptop and L4 24GB
- **RTX 4090 support**: Yes (CUDA, `--gpus all`) [Community: GitHub ruxir-ig/MuseTalk-API]

### Known Issues
- No pre-built registry image → must maintain your own build pipeline
- Model download is not resumable if pod dies during startup
- No documented startup time
- Supports MuseTalk 1.0 and 1.5 (v1.5 released March 2025, improved clarity + sync)

---

## Option 2: TMElyralab/MuseTalk Official (No REST API)

**Source**: https://github.com/TMElyralab/MuseTalk
**Docker**: The HuggingFace Dockerfile for MuseTalk (`ameerazam08/MuseTalk`) uses base image `anchorxia/musev:latest`, clones repo at runtime, installs deps, and exposes **port 7860 (Gradio)** — not a REST API. [Verified: HuggingFace Dockerfile + GitHub, 2025]

**Not suitable**: Gradio UI only, not a programmatic REST API. Models not pre-baked.

### MuseTalk 1.5 (Latest)
- Released March 28, 2025 — significant improvement: Perceptual Loss, GAN Loss, Sync Loss
- Training code open-sourced April 5, 2025
- ruxir-ig/MuseTalk-API supports v1.5

---

## Option 3: RunPod Community Templates for MuseTalk

**Finding**: No official or community-maintained RunPod pod template for MuseTalk with a pre-configured Docker image was found. The only RunPod-adjacent community artifact is a **Jupyter notebook** by camenduru (camenduru/MuseTalk-colab) for interactive use on RunPod — not a REST API pod. [Community: Twitter/X @camenduru, 2024]

RunPod's own template library does not include MuseTalk as of this research.

---

## The Real Solution: RunPod Network Volume

The correct fix for the slow startup problem is **RunPod Network Volumes**, not a different Docker image. [Verified: RunPod Docs + dstack.ai blog, 2025]

**How it works**:
1. Create a Network Volume in RunPod (~20 GB, ~$0.07/GB/month)
2. Launch any pod once, download MuseTalk model weights to the volume
3. On every subsequent pod start, models are already present → pod ready in <2 minutes
4. Multiple pods can share the same volume simultaneously

**Pattern used by**: ComfyUI workers, Llama deployments, OobaBooga workers — well-established approach. [Verified: runpod-workers/worker-comfyui + dstack.ai blog, 2025]

**For ruxir-ig/MuseTalk-API**: Mount the network volume at `/app/models`. First run downloads, every subsequent run skips download entirely.

---

## Alternatives to MuseTalk

### LatentSync (ByteDance) — Best Quality, Most Modern

**Source**: https://github.com/bytedance/LatentSync
**Method**: Audio-conditioned latent diffusion model (Stable Diffusion-based)

- LatentSync 1.5 (March 2025): improved temporal consistency, reduced VRAM for training
- LatentSync 1.6 (June 2025): 512×512 resolution, reduced blurriness
- **Replicate API**: `bytedance/latentsync` — available NOW as hosted REST API, no self-hosting needed
- **fal.ai API**: also available as `fal-ai/latentsync` with queue-based submission
- **Docker/self-host**: No pre-baked RunPod image found. Replicate uses Cog wrapper (has `handler.py` pattern — serverless, not pod)
- **GPU**: RTX 4090 capable; VRAM requirement reduced in v1.5
- **Known issue**: Diffusion-based = slower inference than MuseTalk; frame jitter resolved in v1.5 [Verified: GitHub bytedance/LatentSync + ComfyUI Wiki, 2025]

**Practical path**: Use Replicate API at ~$0.02–0.05/video (pay-per-use) for prototyping. Self-host later if volume justifies it.

### Wav2Lip — Mature, Fast, Lower Quality

**Source**: https://github.com/Rudrabha/Wav2Lip
**Method**: GAN-based lip sync, modifies existing video footage

- Best for: dubbing real footage (not avatar generation)
- Docker: Community Dockerfile exists (GitHub Gist by xenogenesi) — not a maintained image
- No published Docker Hub image with pre-baked weights found
- **GPU**: "Moderate" — runs on smaller GPUs
- **REST API**: No ready-made FastAPI wrapper found; would need to build one
- **Assessment**: Wrong tool for avatar use case; designed for dubbing not generation [Community: GitHub Gist + pixazo.ai comparison, 2025]

### SadTalker — One-Image Avatar, Older

**Source**: https://github.com/OpenTalker/SadTalker
**Method**: 3D motion coefficients from audio → animate single photo

- Can be Dockerized with REST API (community-documented approach)
- Requires downloading checkpoints + gfpgan models at runtime
- No pre-baked image found
- **GPU**: Moderate
- **Assessment**: Older model (CVPR 2023), lower quality than MuseTalk 1.5 or LatentSync [Community: GitHub OpenTalker/SadTalker]

### SieveSync (MuseTalk + LivePortrait + CodeFormer pipeline)

**Source**: https://github.com/sieve-community/sievesync
**Method**: Quality zero-shot lipsync using MuseTalk + LivePortrait + CodeFormer
- Hosted API via Sieve platform (pay-per-use)
- No self-hosted Docker image
- May produce higher quality than bare MuseTalk [Community: GitHub sieve-community/sievesync]

---

## Contradictions & Gaps

- **Model download size**: Neither ruxir-ig/MuseTalk-API nor TMElyralab/MuseTalk document exact model sizes. The 5–10 GB estimate in your brief is consistent with what the model directories suggest (7 separate model families) but was not confirmed with a specific number.
- **RunPod community templates**: No MuseTalk-specific template was found on runpod.io community library. This may exist but is not indexed by web search.
- **ruxir-ig last commit date**: GitHub confirmed 67 commits but the exact last commit date was not extractable from the snippet — the repo appears active but age unknown.
- **Wav2Lip REST API**: No production-ready REST API wrapper with Docker was found — only raw inference scripts.

---

## Key Takeaways

- **No pre-baked MuseTalk Docker image exists** on any public registry (Docker Hub, ghcr.io). This is a gap in the ecosystem. [Verified: GitHub + Docker Hub search, 2025]
- **ruxir-ig/MuseTalk-API** is the only production-grade REST API for MuseTalk (`POST /generate`, port 8000, multipart upload). Must build it yourself. [Community: GitHub ruxir-ig/MuseTalk-API]
- **The startup problem is solved by RunPod Network Volumes**, not by finding a different image. Pre-load models once, reuse forever. [Verified: RunPod Docs + community examples, 2025]
- **LatentSync** is the best alternative quality-wise and is available immediately via Replicate/fal.ai as a hosted API — no infrastructure needed for testing.
- **MuseTalk 1.5** (March 2025) is the current best version — ruxir-ig/MuseTalk-API supports it.

---

## Recommended Next Steps

1. **Immediate fix (Network Volume)**: Create a RunPod Network Volume, download MuseTalk 1.5 models once, mount at `/app/models` on every pod → eliminates 30–60 min wait permanently.
2. **Build and push ruxir-ig/MuseTalk-API**: Build the image locally, push to `ghcr.io/natecgreenberg-debug/musetalk-api:v2` with volume-based model loading (not baked in). This is the correct architecture.
3. **Test LatentSync via Replicate**: `replicate.run("bytedance/latentsync", ...)` — no infra needed, compare quality against MuseTalk 1.5 before committing to self-hosting.

---

## Sources

### Official / Verified
- https://github.com/ruxir-ig/MuseTalk-API
- https://github.com/TMElyralab/MuseTalk
- https://github.com/bytedance/LatentSync
- https://docs.runpod.io/storage/network-volumes
- https://dstack.ai/blog/volumes-on-runpod/

### Blogs & Articles
- https://comfyui-wiki.com/en/news/2025-01-04-latentsync-bytedance-lipsync-tool
- https://www.pixazo.ai/blog/best-open-source-lip-sync-models
- https://huggingface.co/ameerazam08/MuseTalk/blob/main/Dockerfile

### Community
- https://replicate.com/bytedance/latentsync
- https://fal.ai/models/fal-ai/latentsync
- https://github.com/sieve-community/sievesync
- https://x.com/camenduru/status/1800259963987558780
- https://github.com/OpenTalker/SadTalker
