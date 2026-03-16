# RunPod Worker Repos Research
*Date: 2026-03-16*
*Method: Web search, no paid APIs*

---

## Summary Table

| Repo URL | Model / Tech | Category | Stars | Last Updated | Notes |
|---|---|---|---|---|---|
| [runpod-workers/worker-comfyui](https://github.com/runpod-workers/worker-comfyui) | ComfyUI (FLUX.1, SDXL, SD3) | Image Gen | 670 | Mar 14, 2026 | Official. Most versatile image worker. Pre-built images for FLUX.1 schnell/dev, SDXL, SD3. |
| [runpod-workers/worker-vllm](https://github.com/runpod-workers/worker-vllm) | vLLM (any HF model) | LLM | 406 | Mar 10, 2026 | Official. OpenAI-compatible. Supports quantization, tool calling, multi-GPU. Best LLM worker. |
| [runpod-workers/worker-faster_whisper](https://github.com/runpod-workers/worker-faster_whisper) | Faster Whisper | Transcription | 132 | Nov 21, 2025 | Official. 10 model sizes, SRT/VTT output, word timestamps, VAD, language detection. 119 forks. |
| [wlsdml1114/Infinitetalk_Runpod_hub](https://github.com/wlsdml1114/Infinitetalk_Runpod_hub) | InfiniteTalk (lip-sync) | Talking Head | 15 | 2025 | Proper Dockerfile + handler.py. I2V and V2V modes, single/multi-person. ComfyUI-based. |
| [geronimi73/runpod_chatterbox](https://github.com/geronimi73/runpod_chatterbox) | Chatterbox TTS (Resemble AI) | Voice Clone / TTS | 0 | Jun 16, 2025 | Dockerfile + rp_handler.py. Takes YouTube URL + text, returns base64 WAV. 3-4 min cold start. |
| [arkodeepsen/kokoro](https://github.com/arkodeepsen/kokoro) | Kokoro TTS 82M | TTS | 6 | Nov 20, 2025 | Dockerfile + handler.py. Voice mixing, word timestamps, phonemes, MP3/WAV/PCM. Fast cold start. |
| [ashleykleynhans/runpod-worker-inswapper](https://github.com/ashleykleynhans/runpod-worker-inswapper) | InsightFace inswapper + CodeFormer + Real-ESRGAN | Face Swap / Restoration | 21 | Feb 14, 2026 | Dockerfile + handler.py. Multi-face swap, CodeFormer restoration, ESRGAN upscale. Actively maintained. |
| [ashleykleynhans/runpod-worker-real-esrgan](https://github.com/ashleykleynhans/runpod-worker-real-esrgan) | Real-ESRGAN | Image Upscale | 10 | Feb 13, 2026 | Dockerfile + handler.py. 4 model variants incl. anime. Face enhancement option. |
| [ashleykleynhans/runpod-worker-a1111](https://github.com/ashleykleynhans/runpod-worker-a1111) | Automatic1111 SD WebUI | Image Gen | 15 | Feb 16, 2026 | Dockerfile + handler.py. Full A1111 API. Flexible but heavier than ComfyUI worker. |
| [ashleykleynhans/runpod-worker-comfyui](https://github.com/ashleykleynhans/runpod-worker-comfyui) | ComfyUI | Image Gen | 21 | Feb 19, 2026 | ashleykleynhans fork — maintained separately from official. |
| [ashleykleynhans/runpod-worker-oobabooga](https://github.com/ashleykleynhans/runpod-worker-oobabooga) | Oobabooga / text-generation-webui | LLM | 3 | Dec 23, 2025 | Dockerfile + handler.py. Useful if you want Oobabooga's full feature set. vLLM worker is better for pure inference. |
| [ashleykleynhans/runpod-worker-exllamav2](https://github.com/ashleykleynhans/runpod-worker-exllamav2) | ExllamaV2 | LLM | ~10 | 2025 | ExllamaV2 quantized LLM inference. Memory-efficient alternative to vLLM. |
| [lucidprogrammer/wan-video](https://github.com/lucidprogrammer/wan-video) | Wan 2.1 I2V (14B) | Video Gen | 0 | Jun 26, 2025 | Dockerfile + handler.py. ~$0.40–0.50/video at 720p. Needs H100 or A100 80GB. Network volume required. |
| [AleefBilal/wan22-I2V-runpod](https://github.com/AleefBilal/wan22-I2V-runpod) | Wan 2.2 I2V | Video Gen | 1 | Jan 6, 2026 | Dockerized Wan 2.2, newer than wan-video. Lower star count but fresher model. |
| [chavinlo/rvc-runpod](https://github.com/chavinlo/rvc-runpod) | RVC (Retrieval-based Voice Conversion) | Voice Conversion | 8 | Jul 11, 2023 | Old but functional. Mangio-RVC-Fork + Gradio API. S3/transfer.sh outputs. Not actively maintained. |
| [drvpn/runpod_serverless_openvoice_worker](https://github.com/drvpn/runpod_serverless_openvoice_worker) | OpenVoice | Voice Clone | 5 | Jun 13, 2024 | Dockerfile present. Multi-language (EN, ES, FR, ZH, JP, KR). S3 output. Older but usable. |
| [drvpn/runpod_serverless_sadtalker_worker](https://github.com/drvpn/runpod_serverless_sadtalker_worker) | SadTalker | Talking Head | 4 | Jun 16, 2024 | Dockerfile present. GFPGAN/RestoreFormer face enhance. S3 output. Older but functional. |
| [drvpn/runpod_serverless_faceman_worker](https://github.com/drvpn/runpod_serverless_faceman_worker) | GFPGAN (video) | Face Restoration | 2 | Jun 14, 2024 | Dockerfile present. Enhances faces in video frames. S3 output. |
| [runpod-workers/worker-sdxl](https://github.com/runpod-workers/worker-sdxl) | Stable Diffusion XL | Image Gen | 43 | 2025 | Official lightweight SDXL worker. Simpler than ComfyUI worker. |
| [runpod-workers/worker-infinity-embedding](https://github.com/runpod-workers/worker-infinity-embedding) | Infinity Embeddings | Embeddings | 42 | 2025 | Official. Good for RAG pipelines. |
| [runpod-workers/worker-whisper](https://github.com/runpod-workers/worker-whisper) | Whisper (original) | Transcription | 7 | Jul 23, 2025 | Official but deprecated in favor of worker-faster_whisper. |
| [mehdi-elion/runpod_tts](https://github.com/mehdi-elion/runpod_tts) | xTTS-v2 (Coqui) | TTS / Voice Clone | ~5 | 2024 | Dockerfile + handler. xTTS-v2 with voice cloning. Coqui is abandoned upstream but model still works. |
| [bes-dev/tts-runpod-serverless-worker](https://github.com/bes-dev/tts-runpod-serverless-worker) | xTTS-v2 | TTS | ~10 | 2024 | Another xTTS implementation. Multiple voices. |
| [Permafacture/runpod-xtts](https://github.com/Permafacture/runpod-xtts) | xTTS (text→MP3) | TTS | ~3 | 2024 | Simple xTTS worker focused on document-to-audio conversion. |
| [camenduru/style-tts-muse-talk-tost](https://github.com/camenduru/style-tts-muse-talk-tost) | StyleTTS + MuseTalk | TTS + Lip Sync | 4 | Jun 10, 2024 | Combined TTS + talking head. Camenduru's RunPod experiments. |
| [bytegold/runpod-serverless-docker-examples](https://github.com/bytegold/runpod-serverless-docker-examples) | rembg (background removal) | Image Processing | ~5 | 2024 | Includes rembg example. Playground-level, not production-ready as-is. |
| [kodxana/Awesome-RunPod](https://github.com/kodxana/Awesome-RunPod) | Curated list | Reference | - | 2024 | Master list of RunPod projects. Good starting point for discovery. |
| [runpod-workers/worker-template](https://github.com/runpod-workers/worker-template) | Starter template | Template | - | 2025 | Official starting point for building custom workers. |

---

## Top Picks for This Project (AI Influencer Pipeline)

These are additions or alternatives beyond InfiniteTalk and Chatterbox that directly serve the Kate Mercer content pipeline.

### 1. `runpod-workers/worker-faster_whisper` — **High priority**
- **Use case**: Transcribe voice-over audio for captions, quality-check TTS outputs, generate SRT subtitles for video
- **Why it matters**: Captions are mandatory for short-form content. Self-hosting saves ~$0.006/min vs. Whisper API ($0.006/min OpenAI). At volume that's meaningful, and you control data.
- **GPU needed**: RTX 4090 works fine. Cost: ~$0.0003/sec = ~$0.01/minute of audio transcribed.

### 2. `arkodeepsen/kokoro` — **High priority**
- **Use case**: Backup TTS option or A/B test against Chatterbox. Kokoro 82M is extremely fast and very high quality for English.
- **Why it matters**: Chatterbox (3-4 min cold start) is slow. Kokoro cold starts in <5 sec with cached model. Good for rapid iteration.
- **GPU needed**: RTX 3090/4090 or A4000 (8GB VRAM). Cheap to run.
- **ElevenLabs comparison**: ElevenLabs charges ~$0.18/1K characters. A 60-second voiceover ≈ 750 chars. At scale (100 videos/month × 750 chars), that's ~$13.50/month from ElevenLabs vs. pennies on RunPod.

### 3. `ashleykleynhans/runpod-worker-inswapper` — **Medium priority**
- **Use case**: Face consistency — swap a consistent high-quality face onto generated video frames to maintain Kate's look across content.
- **Why it matters**: Persona consistency is critical for brand recognition. CodeFormer + ESRGAN are bundled for restoration.
- **Caveat**: Requires a good reference face image. Platform TOS considerations apply (don't represent this as real footage without disclosure).

### 4. `ashleykleynhans/runpod-worker-real-esrgan` — **Medium priority**
- **Use case**: Upscale AI-generated portrait images to 4K before overlaying on video. Enhance thumbnail images.
- **Why it matters**: Short-form thumbnails need to look polished. Real-ESRGAN 4x can take a 512px portrait to 2048px.
- **Cost**: Negligible. Sub-second per image on RTX 4090 ($0.00031/sec flex).

### 5. `runpod-workers/worker-comfyui` — **Already implicit, confirm usage**
- **Use case**: Generate Kate's portrait images (with FLUX.1 dev), thumbnail backgrounds, promotional graphics.
- **Why it matters**: FLUX.1 dev produces photorealistic portraits. Pre-built Docker images mean zero setup.
- **Cost**: ~$0.30–0.80 per image batch at FLUX.1 resolution on RTX 4090.

---

## Top Picks for Future Projects

### Voice Conversion
| Repo | Notes |
|---|---|
| [chavinlo/rvc-runpod](https://github.com/chavinlo/rvc-runpod) | RVC for voice conversion. Old (2023), but RVC is stable. Good baseline if you need voice-to-voice conversion. May need forking to update. |
| [drvpn/runpod_serverless_openvoice_worker](https://github.com/drvpn/runpod_serverless_openvoice_worker) | OpenVoice V2. Multi-language voice cloning. Better maintained than chavinlo/rvc for cloning use cases. |

### Video Generation
| Repo | Notes |
|---|---|
| [lucidprogrammer/wan-video](https://github.com/lucidprogrammer/wan-video) | Wan 2.1 I2V, production-ready. $0.40–0.50/video at 720p on H100. Full IaC setup. Start here for image-to-video. |
| [AleefBilal/wan22-I2V-runpod](https://github.com/AleefBilal/wan22-I2V-runpod) | Wan 2.2, newer model, less tested. Good to watch. |
| ComfyUI + Wan via community workflows | Medium article "Stop Babysitting GPUs" covers ComfyUI serverless for video — use worker-comfyui with a Wan workflow as an alternative path. |

### Image Generation (beyond portrait)
| Repo | Notes |
|---|---|
| [runpod-workers/worker-comfyui](https://github.com/runpod-workers/worker-comfyui) | Best all-around. FLUX.1 schnell for fast/cheap, FLUX.1 dev for quality. |
| [runpod-workers/worker-sdxl](https://github.com/runpod-workers/worker-sdxl) | Lighter-weight SDXL worker if ComfyUI is overkill. |

### Transcription / Captions
| Repo | Notes |
|---|---|
| [runpod-workers/worker-faster_whisper](https://github.com/runpod-workers/worker-faster_whisper) | Best option. SRT output, 10 model sizes, word timestamps. |
| [Dembrane/runpod-whisper](https://github.com/Dembrane/runpod-whisper) | WhisperX-based (speaker diarization). Better for multi-speaker or interview content. |

### Face Restoration / Enhancement
| Repo | Notes |
|---|---|
| [ashleykleynhans/runpod-worker-inswapper](https://github.com/ashleykleynhans/runpod-worker-inswapper) | CodeFormer + Real-ESRGAN bundled. Best face quality post-processing. |
| [drvpn/runpod_serverless_faceman_worker](https://github.com/drvpn/runpod_serverless_faceman_worker) | GFPGAN for video frame-by-frame enhancement. Simpler than inswapper if you don't need face swap. |

### Talking Head / Lip Sync
| Repo | Notes |
|---|---|
| [wlsdml1114/Infinitetalk_Runpod_hub](https://github.com/wlsdml1114/Infinitetalk_Runpod_hub) | InfiniteTalk — infinite duration, I2V + V2V, ComfyUI-based. Current pipeline choice. |
| [drvpn/runpod_serverless_sadtalker_worker](https://github.com/drvpn/runpod_serverless_sadtalker_worker) | SadTalker — older but battle-tested. GFPGAN/RestoreFormer face enhance included. |
| [camenduru/style-tts-muse-talk-tost](https://github.com/camenduru/style-tts-muse-talk-tost) | Combined StyleTTS + MuseTalk in one worker. Experimental but interesting for end-to-end. |

### Embeddings / RAG
| Repo | Notes |
|---|---|
| [runpod-workers/worker-infinity-embedding](https://github.com/runpod-workers/worker-infinity-embedding) | Official. Good for semantic search over content archives or building a RAG knowledge base. |

---

## Notable Maintainers

| GitHub Account | Specialization | Key Repos |
|---|---|---|
| [runpod-workers](https://github.com/orgs/runpod-workers/repositories) | Official RunPod org — 38 repos | worker-comfyui (670★), worker-vllm (406★), worker-faster_whisper (132★), worker-sdxl, worker-infinity-embedding |
| [ashleykleynhans](https://github.com/ashleykleynhans) | Most prolific community RunPod worker builder | runpod-worker-inswapper, runpod-worker-real-esrgan, runpod-worker-a1111, runpod-worker-comfyui, runpod-worker-oobabooga, runpod-worker-exllamav2, runpod-worker-instantid, runpod-worker-forge, runpod-worker-llava. **Check this account first** when looking for a worker — he likely has it. |
| [drvpn](https://github.com/drvpn) | Voice, face, and video workers | runpod_serverless_openvoice_worker, runpod_serverless_sadtalker_worker, runpod_serverless_faceman_worker, runpod_serverless_tooncrafter_worker |
| [kodxana](https://github.com/kodxana) | Awesome-RunPod curator + template builder | Awesome-RunPod (master list), worker-deoldify |
| [camenduru](https://github.com/camenduru) | Rapid prototype RunPod workers for new models | style-tts-muse-talk-tost and many others. Tends to build fast, may not be production-hardened. Good for early access to new model workers. |
| [arkodeepsen](https://github.com/arkodeepsen) | Kokoro TTS serverless | kokoro (production-ready Kokoro endpoint) |
| [lucidprogrammer](https://github.com/lucidprogrammer) | Video generation IaC | wan-video (Wan 2.1 I2V, full production setup) |

---

## Cost Reference

RunPod serverless pricing (pay-per-second, no idle charges when scaled to zero):

| GPU | VRAM | Flex rate/sec | Active rate/sec | Hourly equiv (flex) |
|---|---|---|---|---|
| RTX 4000/A4000/A4500 | 16GB | $0.00016 | $0.00011 | ~$0.58/hr |
| RTX 4090 PRO | 24GB | $0.00031 | $0.00021 | ~$1.12/hr |
| A100 SXM | 80GB | $0.00076 | $0.00060 | ~$2.74/hr |
| H100 PRO | 80GB | $0.00116 | $0.00093 | ~$4.18/hr |
| H200 PRO | 141GB | $0.00155 | $0.00124 | ~$5.58/hr |

**Commercial API comparison (approximate):**
- ElevenLabs TTS: ~$0.18/1K characters (Creator plan). A typical 60-second voiceover ≈ 750 chars = ~$0.135/video.
- OpenAI Whisper API: $0.006/minute of audio.
- OpenAI GPT-4o image gen: $0.04–0.08 per image.
- RunPod Kokoro (RTX 4090): ~$0.001–0.003/voiceover (sub-second inference × $0.00031/sec).
- RunPod Faster-Whisper (RTX 4090): ~$0.002–0.005/minute of audio.
- RunPod FLUX.1 (RTX 4090): ~$0.01–0.05 per image (3–15 sec inference).

Self-hosting on RunPod is roughly **10–100x cheaper** than commercial APIs at production volume, with the trade-off of setup and maintenance overhead.

---

## Key Findings

1. **runpod-workers** (official org) is the first place to check — 38 repos, actively maintained, Docker images pre-published. worker-comfyui (670★) is the crown jewel.

2. **ashleykleynhans** is the most reliable community builder. If you need a worker, check his account before building from scratch.

3. **No production-ready MuseTalk standalone worker found** — only `camenduru/style-tts-muse-talk-tost` (experimental, 2024) and the InfiniteTalk hub (which uses MuseTalk internally via ComfyUI). For MuseTalk specifically, the ComfyUI route through worker-comfyui is probably cleaner.

4. **No production-ready CogVideoX worker found** — RunPod has a guide for running CogVideoX manually on a pod, but no serverless handler.py repo was found. Wan 2.1/2.2 is better supported for video gen.

5. **RVC voice conversion workers are old (2023)** — chavinlo/rvc-runpod hasn't been updated in 2+ years. OpenVoice (drvpn) is a better-maintained alternative for voice cloning. For quality voice conversion in 2025/2026, consider building a custom worker from the current RVC project or using Chatterbox TTS instead.

6. **Background removal** — No dedicated maintained RunPod serverless worker exists for rembg/BiRefNet. The bytegold example is playground-level. This is a gap — could build one with rembg or BiRefNet in a single afternoon using the runpod-workers/worker-template as a base.

7. **Cold start problem is real** — Chatterbox noted as 3-4 min cold start. Kokoro is <5 sec with cached model (network volume). For production pipelines, always use network volumes for model caching.
