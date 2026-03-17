# Talking Head Video Generation Models: Comprehensive Comparison

**Date:** 2026-03-17
**Purpose:** Find the best self-hosted model for generating realistic talking-head videos from a still image + audio, with full face/head/body animation (not just lip-sync).

---

## RECOMMENDATION: Try These First

### 1st Pick: HunyuanVideo-Avatar (Tencent)
- **Why:** Full portrait/upper-body/full-body animation from still image + audio. Emotion control. Multi-character support. Docker images available. 10GB VRAM minimum with TeaCache (24GB comfortable). Active development (last commit May 2025). 2.1k GitHub stars. Apache-compatible. Outperforms existing methods in dynamism, subject consistency, lip-sync accuracy, and audio-emotion alignment per their benchmarks.
- **Risk:** 24GB VRAM is "very slow" per docs; 96GB recommended for optimal quality. May need 48GB+ GPU for acceptable speed. Quality during large head movements may degrade (facial distortion noted in one academic comparison).
- **Try on:** RunPod A40 (48GB, ~$0.39/hr) or A100 (80GB, ~$1.89/hr). Start with A40.

### 2nd Pick: InfiniteTalk (MeiGen-AI)
- **Why:** Explicitly syncs head, body, expressions AND lips. Unlimited-length generation. Works with still image + audio. Tested up to 45 min on single RTX 4090. 3x real-time on 24GB GPU. Int8 quantization available. ComfyUI support. Apache 2.0 license.
- **Risk:** Released Aug 2025 -- relatively new. Color shifts on clips >1 min for image-to-video. Community still small.
- **Try on:** RunPod RTX 4090 (24GB, ~$0.59/hr) with int8 quantization.

### 3rd Pick: FantasyTalking (Alibaba/AMAP)
- **Why:** Built on Wan2.1 video diffusion transformer. Best scores across FID, FVD, identity preservation, expression similarity, and aesthetics vs AniPortrait, EchoMimic, Sonic, and Hallo3 in benchmarks. Animates face, lips, head, and hand gestures. ACM MM 2025. Apache 2.0.
- **Risk:** Requires 20-40GB VRAM on A100. Output is 512x512 at 81 frames (~3.3 sec). Would need upscaling + clip stitching. Inference is 15-42 sec per 3.3 sec clip depending on VRAM config.
- **Try on:** RunPod A40 (48GB) or A100 (80GB).

---

## FULL MODEL COMPARISON

### Tier 1: Full Head/Body Animation from Audio + Still Image

| Model | What It Animates | VRAM | Speed | Stars | License | Status |
|-------|-----------------|------|-------|-------|---------|--------|
| **HunyuanVideo-Avatar** | Full body + emotion control | 10GB min (TeaCache), 24GB slow, 96GB ideal | ~55s for 65 frames on 4090 (base HunyuanVideo) | 2.1k | Tencent Cloud (non-commercial open, commercial via Tencent) | Active (May 2025) |
| **InfiniteTalk** | Head + body + expressions + lips | 8-24GB (int8 quant available) | 3x real-time on 24GB GPU | ~1k+ | Apache 2.0 | Active (Aug 2025) |
| **FantasyTalking** | Face + lips + head + hands | 20-40GB (A100) | 15-42s per 81 frames | 1.6k | Apache 2.0 | Active (Jul 2025) |
| **Wan2.2-S2V** | Full body + face + lips | 80GB native, 24GB with quant | Fast (one of fastest 720p@24fps) | 14.7k | Open source | Active (Nov 2025) |
| **EchoMimicV2** | Semi-body + face | ~24GB | ~50s/120 frames (A100, accelerated) | 4.5k | Open source | Active (Nov 2024) |
| **EchoMimicV3** | Talking head + body (unified) | 12GB (Flash), 16-24GB (preview) | 8-step generation | 811 | Apache 2.0 | Active (Jan 2026) |

### Tier 2: Head/Face Animation (Less Body Motion)

| Model | What It Animates | VRAM | Speed | Stars | License | Status |
|-------|-----------------|------|-------|-------|---------|--------|
| **Hallo3** | Face + head + expressions | ~26GB+ (uses CogVideoX-5B) | ~90s on A100 for 6s clip | 1.4k | MIT | Stale (Feb 2025) |
| **Hallo2** | Face + head (long duration, 4K) | A100 tested (likely 40GB+) | Slow (long-duration focus) | 3.7k | MIT | Stale (Oct 2024) |
| **Sonic** | Face + head movement | 32GB tested | Slow (diffusion-based) | 3.2k | Non-commercial | Stale (Jan 2025) |
| **FLOAT** | Head + face + expressions | 12GB (RTX 3060 works) | ~20s for 14s audio | 462 | Non-commercial | Stale (Feb 2025) |
| **AniPortrait** | Face + head + expressions | CPU offload available | Moderate (with acceleration) | ~2k | Open source | Semi-active (Apr 2024) |
| **SadTalker** | Face + head (3DMM-based) | ~4-8GB | Fast | 14k+ | MIT | Mature/stale (2023) |

### Tier 3: Lip-Sync Only (Minimal Head/Body Motion)

| Model | What It Animates | VRAM | Speed | Stars | License | Status |
|-------|-----------------|------|-------|-------|---------|--------|
| **MuseTalk** | Lips only (face inpainting) | ~8-12GB | Real-time 30fps+ on V100 | High | Open source | Active (Mar 2025) |
| **LatentSync** | Lips only | ~12-16GB | ~3m43s for 20s on 4090 | - | Open source | - |
| **LivePortrait** | Face animation (NO audio input) | Low (~4-8GB) | 12.8ms/frame on 4090 | 18k | Open source | Active |

---

## DETAILED MODEL NOTES

### HunyuanVideo-Avatar (Tencent) -- RECOMMENDED #1
- **GitHub:** https://github.com/Tencent-Hunyuan/HunyuanVideo-Avatar
- **Paper:** CVPR-adjacent, May 2025
- **Input:** Still image + audio + optional text prompt for emotion
- **Output:** Video with portrait/upper-body/full-body framing options
- **What animates:** Lips, facial expressions, eye blinks, head movement, body movement, emotion-driven gestures
- **Docker:** YES -- CUDA 12.4 and 11.8 Docker images available
- **Multi-character:** YES -- can animate multiple characters in dialogue
- **Style:** Photorealistic, cartoon, 3D-rendered, anthropomorphic
- **Quality:** "Outperforms existing methods in video dynamism, subject consistency, lip-sync accuracy, audio-emotion-expression alignment"
- **Caveats:**
  - 24GB is "very slow" -- 96GB recommended
  - Float point exceptions on some GPU types (documented fix)
  - Facial distortion during large head movements (noted in one comparison)
  - Commercial use requires Tencent Cloud license

### InfiniteTalk (MeiGen-AI) -- RECOMMENDED #2
- **GitHub:** https://github.com/MeiGen-AI/InfiniteTalk
- **Paper:** Aug 2025
- **Input:** Still image + audio (image-to-video), or video + audio (video-to-video dubbing)
- **Output:** 480p or 720p video, unlimited length
- **What animates:** Lips, head movement, body posture, facial expressions -- "Synchronizes not only lips, but also head, body, and expressions"
- **Docker:** Not official, but ComfyUI branch + Gradio available
- **Multi-speaker:** YES
- **Quality:** 1.8mm lip error with minimal body drift. "Most up-to-date and best performing option available in the open-source space for portrait animation" (community consensus)
- **Speed:** 3x real-time on 24GB GPU, 0.7x real-time with int8 mode
- **Caveats:**
  - Color shifts beyond 1 minute for image-to-video
  - Camera movement mimicked but not identical in video-to-video
  - Relatively new (Aug 2025)
  - 1080p generation reportedly takes ~10,000 seconds for 10 seconds (stick to 480/720p)

### FantasyTalking (Alibaba/AMAP) -- RECOMMENDED #3
- **GitHub:** https://github.com/Fantasy-AMAP/fantasy-talking
- **Paper:** ACM MM 2025
- **Input:** Portrait image + audio (WAV) + text prompt
- **Output:** 512x512 at 81 frames per inference (~3.3 seconds at 24fps)
- **What animates:** Face, lips, head, hand gestures, body movement
- **Quality:** Best FID (27.695), FVD (301.173), identity preservation (0.9892), expression similarity (0.9612), aesthetics (0.5362) vs AniPortrait, EchoMimic, Sonic, Hallo3
- **Speed (A100):** 15.5s (40GB mode), 32.8s (20GB mode), 42.6s (5GB mode)
- **Caveats:**
  - Only 3.3 seconds per clip -- needs stitching for longer content
  - 512x512 output -- needs upscaling for TikTok/Reels
  - Built on Wan2.1-I2V-14B (large model)
  - Text prompt controls behavior (powerful but adds complexity)

### Wan2.2-S2V (Alibaba)
- **GitHub:** https://github.com/Wan-Video/Wan2.2
- **Paper:** Aug 2025
- **Input:** Still image + audio + optional text prompt + optional pose video
- **Output:** 480p or 720p
- **What animates:** Full body, face, lips, camera work
- **Quality:** Best or near-best FID, EFID, CSIM among similar models
- **VRAM:** 80GB native for S2V-14B. 24GB possible with FP8 quant via DiffSynth-Studio/Wan2GP
- **Speed:** "One of the fastest 720P@24fps models" -- ~7s/frame at 640x480 on RTX 4090, ~18s/frame at 720p
- **Caveats:**
  - 14B parameter model -- very heavy
  - Native 80GB requirement means quantization is mandatory for 24-48GB GPUs
  - Quality may degrade with heavy quantization
  - Multiple framing options (portrait, bust, full-body)

### Hallo3 (Fudan University)
- **GitHub:** https://github.com/fudan-generative-vision/hallo3
- **Paper:** CVPR 2025
- **Input:** Reference image (1:1 or 3:2) + audio (WAV, English only)
- **Output:** Video (resolution not specified, uses CogVideoX-5B backbone)
- **What animates:** Face, head movement, expressions
- **VRAM:** ~26GB+ (CogVideoX-5B requires ~26GB on A100). Tested on H100.
- **Speed:** ~90s on A100, ~45s on H100 for ~6 second clips
- **Quality:** Lowest FID/Sync-D in some benchmarks, but overfits to training distribution. English-only audio.
- **Caveats:**
  - English only
  - Overfits (poor cross-domain generalization)
  - Relatively stale (last commit Feb 2025)
  - No Docker support
  - Heavy model downloads (CogVideoX-5B + T5-v1.1-xxl + multiple auxiliary models)

### Hallo2 (Fudan University)
- **GitHub:** https://github.com/fudan-generative-vision/hallo2
- **Paper:** ICLR 2025
- **Input:** Square face image + audio (WAV, English)
- **Output:** Up to 4K resolution, 23+ minute duration
- **What animates:** Face, head movement, expressions, lip sync
- **VRAM:** A100 tested. Likely 40GB+.
- **Quality:** Demonstrated on Taylor Swift 23-min speech, Ted talks. Long-duration is the key differentiator.
- **Caveats:**
  - Stale (last commit Oct 2024, 13 total commits)
  - Designed for long-form -- may be overkill for 30-60s clips
  - No Docker
  - English only
  - Heavy computational requirements

### Sonic (Tencent/Zhejiang University)
- **GitHub:** https://github.com/jixiaozhong/Sonic
- **Paper:** CVPR 2025
- **Input:** Portrait image + audio
- **Output:** Portrait video
- **What animates:** Face, head movement, expressions, lip sync. Global audio perception reduces jitter.
- **VRAM:** Tested on 32GB GPU
- **Speed:** Slow (diffusion-based, tens to hundreds of seconds per 5s clip)
- **Quality:** Best Sync-C score (lip sync accuracy: 4.226) -- best lip sync among competitors
- **Caveats:**
  - NON-COMMERCIAL license (commercial requires Tencent Cloud)
  - No Docker
  - Head movement only -- no body animation
  - Stale (last commit Jan 2025)

### EchoMimicV2 (Ant Group)
- **GitHub:** https://github.com/antgroup/echomimic_v2
- **Paper:** CVPR 2025
- **Input:** Audio + reference image + optional driving video for pose
- **Output:** Semi-body animation video
- **What animates:** Face, expressions, upper body (semi-body)
- **Speed:** 9x speedup with acceleration: ~50s for 120 frames on A100
- **Caveats:**
  - Needs driving video for pose (not purely audio-driven for body)
  - Last commit Nov 2024
  - No Docker

### EchoMimicV3 (Ant Group)
- **GitHub:** https://github.com/antgroup/echomimic_v3
- **Paper:** AAAI 2026
- **Input:** Audio + image + optional text prompt
- **Output:** Up to 768x768
- **What animates:** Both talking head AND body (unified multi-task)
- **VRAM:** 12GB (Flash version), 16-24GB (preview)
- **Speed:** 5 steps for talking head, 15-25 steps for body
- **Tested GPUs:** A100 (80G), RTX4090D (24G), V100 (16G)
- **Caveats:**
  - Relatively new (Jan 2026 Flash pro update)
  - 811 stars -- smaller community
  - No Docker

### FLOAT (DeepBrain AI)
- **GitHub:** https://github.com/deepbrainai-research/float
- **Paper:** ICCV 2025
- **Input:** Portrait image + audio (WAV)
- **Output:** 512x512 video
- **What animates:** Head, face, expressions with emotion enhancement
- **VRAM:** Works on RTX 3060 (12GB)
- **Speed:** ~20s for 14s audio clip -- very fast
- **Quality:** "Outperforms state-of-the-art" per paper
- **Caveats:**
  - NON-COMMERCIAL license (CC BY-NC-ND 4.0)
  - Only frontal poses work well
  - 512x512 output -- needs upscaling
  - Small community (462 stars)
  - Head/face only, no body animation

### SadTalker
- **GitHub:** https://github.com/OpenTalker/SadTalker
- **Paper:** CVPR 2023
- **Input:** Single image + audio
- **Output:** Talking head video
- **What animates:** Head pose, facial expressions (3DMM-based)
- **VRAM:** Low (~4-8GB)
- **Speed:** Fast
- **Quality:** Good for 2023 but clearly outdated compared to 2025 models. Known for over-animation artifacts.
- **Caveats:**
  - Mature but stale (2023)
  - Quality noticeably below newer diffusion-based methods
  - Can over-animate or drift on challenging inputs

### AniPortrait (Tencent)
- **GitHub:** https://github.com/Zejun-Yang/AniPortrait
- **Input:** Audio + portrait image
- **Output:** Photorealistic portrait animation
- **What animates:** Face, head pose, expressions
- **VRAM:** CPU offload available
- **Speed:** Frame interpolation acceleration available
- **Caveats:**
  - Semi-active (last weights release Apr 2024)
  - Two-stage pipeline (audio to landmarks, then landmarks to video)
  - Outperformed by newer models in benchmarks

### LivePortrait (Kuaishou/Kwai)
- **GitHub:** https://github.com/KwaiVGI/LivePortrait
- **Stars:** 18k (most popular)
- **CRITICAL LIMITATION:** Requires a DRIVING VIDEO, not audio. Cannot directly generate from audio + still image. Needs separate audio-to-motion pipeline to produce driving video.
- **What it does:** Portrait reenactment from video to video -- extremely fast (12.8ms/frame on 4090)
- **Use case:** Could be combined with an audio-to-motion model as a two-stage pipeline, but not standalone for our use case

### MuseTalk (Tencent Lyra Lab)
- **GitHub:** https://github.com/TMElyralab/MuseTalk
- **Focus:** Real-time lip sync only (face region inpainting at 256x256)
- **Not suitable:** Same limitation as LatentSync -- only animates mouth region, rest of face/body stays frozen

### EMO (Alibaba)
- **GitHub:** https://github.com/HumanAIGC/EMO
- **Stars:** 7.6k (high interest)
- **CRITICAL:** Code and weights were NEVER fully released. Paper-only repository. 246 open issues. Cannot self-host.
- **Quality:** Demos look incredible (best in class for expressiveness) but not reproducible
- **Alternative:** The team may have folded this work into Wan2.2-S2V

---

## MODELS NOT YET RELEASED OR RESEARCH-ONLY

| Model | Status | Notes |
|-------|--------|-------|
| **EMO (Alibaba)** | Paper only | No inference code or weights released. 7.6k stars from demo hype alone. |
| **VASA-1 (Microsoft)** | Paper only | Real-time talking faces, incredible demos, never released |
| **Ditto (Ant Group)** | Released Jan 2025 | Real-time 30fps on 4090, upper-body 512x768. ACM MM 2025. Worth watching. |
| **OmniAvatar** | Research | Efficient audio-driven with adaptive body animation. Not widely available yet. |
| **SkyReels-V3 A2V** | Released | 19B model, audio-to-video for talking avatars. 720p. Very new, worth watching. |
| **RAP** | Research (Aug 2025) | Real-time audio-driven portrait with video diffusion transformer |

---

## ComfyUI INTEGRATION STATUS

Models with ComfyUI nodes (easier deployment):
- **InfiniteTalk** -- official ComfyUI branch
- **EchoMimic V1/V2** -- ComfyUI nodes available
- **Sonic** -- community ComfyUI node (ComfyUI_Sonic)
- **FLOAT** -- ComfyUI-FLOAT node
- **LivePortrait** -- ComfyUI node (but needs driving video)
- **SkyReels V3** -- ComfyUI workflow available
- **Wan2.2 S2V** -- ComfyUI workflow available

---

## KEY FINDINGS

### What Changed Since LatentSync
LatentSync (and MuseTalk, Wav2Lip) are **lip-sync models** -- they inpaint the mouth region only. Everything else (head, body, eyes, expressions) stays frozen. This is fundamentally different from **talking head generation** models, which generate the entire frame including natural head movement, body sway, eye blinks, and expressions.

### The Quality Gap
Commercial services (HeyGen, Synthesia, D-ID) still produce the most polished results because they use proprietary models, post-processing, and curated training data. However, the open-source gap has narrowed dramatically in 2025, particularly with:
- **HunyuanVideo-Avatar** (closest to commercial quality with emotion control)
- **InfiniteTalk** (best unlimited-length option)
- **FantasyTalking** (best benchmark scores on standard metrics)

### VRAM Reality Check
For our RunPod setup (targeting 24-48GB GPUs):
- **24GB (RTX 4090, A5000):** InfiniteTalk (int8), EchoMimicV3 (Flash), FLOAT, SadTalker
- **48GB (A40, L40S):** HunyuanVideo-Avatar (TeaCache), FantasyTalking (20GB mode), Wan2.2-S2V (quantized)
- **80GB (A100):** Everything at full quality

### Recommended Testing Order
1. **InfiniteTalk on RTX 4090** -- cheapest GPU, confirmed working, 3x real-time
2. **HunyuanVideo-Avatar on A40** -- Docker available, full-body + emotion control
3. **EchoMimicV3 Flash on RTX 4090** -- 12GB VRAM, unified head+body
4. **FantasyTalking on A40** -- best metrics but short clips + small resolution

### Speed Expectations
For a 30-second TikTok clip:
- **InfiniteTalk (24GB):** ~10 seconds (3x real-time)
- **EchoMimicV3 Flash:** ~minutes (depends on settings)
- **HunyuanVideo-Avatar (48GB):** ~minutes (diffusion-based)
- **FantasyTalking:** ~2-5 minutes (multiple 3.3s clip stitching + upscale)
- **Hallo3/Sonic:** ~5-15 minutes (heavy diffusion)

---

## LICENSING SUMMARY

**Commercial-friendly (Apache 2.0 or MIT):**
- InfiniteTalk (Apache 2.0)
- FantasyTalking (Apache 2.0)
- EchoMimicV3 (Apache 2.0)
- Hallo2/Hallo3 (MIT)
- SadTalker (MIT)

**Non-commercial only:**
- Sonic (Tencent -- commercial requires Tencent Cloud)
- FLOAT (CC BY-NC-ND 4.0)
- HunyuanVideo-Avatar (Tencent -- commercial requires Tencent Cloud)

**Not released:**
- EMO (paper only)
- VASA-1 (paper only)

---

## NEXT STEPS

1. Deploy InfiniteTalk on RunPod RTX 4090 -- test with Kate's face + audio
2. If quality insufficient, try HunyuanVideo-Avatar on A40/A100
3. Build Docker image with async REST API pattern (same as LatentSync)
4. Compare output quality side-by-side against LatentSync baseline
5. Evaluate whether upscaling (GFPGAN, Real-ESRGAN) improves results

---

## SOURCES

- [HunyuanVideo-Avatar GitHub](https://github.com/Tencent-Hunyuan/HunyuanVideo-Avatar)
- [InfiniteTalk GitHub](https://github.com/MeiGen-AI/InfiniteTalk)
- [FantasyTalking GitHub](https://github.com/Fantasy-AMAP/fantasy-talking)
- [Wan2.2 GitHub](https://github.com/Wan-Video/Wan2.2)
- [Hallo3 GitHub](https://github.com/fudan-generative-vision/hallo3)
- [Hallo2 GitHub](https://github.com/fudan-generative-vision/hallo2)
- [Sonic GitHub](https://github.com/jixiaozhong/Sonic)
- [EchoMimicV2 GitHub](https://github.com/antgroup/echomimic_v2)
- [EchoMimicV3 GitHub](https://github.com/antgroup/echomimic_v3)
- [FLOAT GitHub](https://github.com/deepbrainai-research/float)
- [LivePortrait GitHub](https://github.com/KwaiVGI/LivePortrait)
- [SadTalker GitHub](https://github.com/OpenTalker/SadTalker)
- [AniPortrait GitHub](https://github.com/Zejun-Yang/AniPortrait)
- [EMO GitHub](https://github.com/HumanAIGC/EMO)
- [MuseTalk GitHub](https://github.com/TMElyralab/MuseTalk)
- [Awesome Talking Head Generation](https://github.com/harlanhong/awesome-talking-head-generation)
- [FantasyTalking Paper](https://arxiv.org/html/2504.04842v1)
- [Hallo2 Paper](https://arxiv.org/html/2410.07718v1)
- [Sonic Paper](https://arxiv.org/html/2411.16331v1)
- [FLOAT Paper](https://arxiv.org/abs/2412.01064)
- [HunyuanVideo-Avatar Paper](https://arxiv.org/abs/2505.20156)
- [InfiniteTalk Project Page](https://meigen-ai.github.io/InfiniteTalk/)
- [Wan-S2V Project Page](https://humanaigc.github.io/wan-s2v-webpage/)
- [8 Best Open Source Lip-Sync Models (Pixazo)](https://www.pixazo.ai/blog/best-open-source-lip-sync-models)
- [Comparison: Hallo2 vs EchoMimic (Reddit)](https://daslikes.wordpress.com/2024/10/18/comparison-between-hallo-2-and-echo-mimic-via-r-stablediffusion/)
