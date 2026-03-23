# LatentSync Lipsync Quality Issues — Research Report

**Date**: 2026-03-17
**Context**: Investigating garbled/distorted mouth region in LatentSync 1.5 output
**Our setup**: LatentSync 1.5 weights + `stage2_512.yaml` config + 512x512 input + `--inference_steps 20 --guidance_scale 1.5 --enable_deepcache` + still image looped to video via ffmpeg

---

## CRITICAL FINDING: Resolution/Config Mismatch (Most Likely Root Cause)

**LatentSync 1.5 was trained on 256x256 resolution. Our Docker API uses `stage2_512.yaml`, which is a 512x512 config — designed for LatentSync 1.6 weights.**

This is almost certainly the primary cause of the garbled output. The config file defines the resolution the UNet expects, and feeding it a resolution that doesn't match the checkpoint's training data will produce garbage, especially in the masked/inpainted region (the face).

### Evidence:
- DeepWiki docs confirm: LatentSync 1.5 = 256x256, LatentSync 1.6 = 512x512
- Issue #271: "awful results if stage2_512.yaml is not set" — but this was about 1.6 needing stage2_512, not 1.5
- Issue #328: User tried switching to stage2_512.yaml with 1.5 and it didn't help — community suggested "try 1.5 version with 256 resolution"
- HuggingFace 1.6 page: "To switch between versions, you only need to load the corresponding checkpoint and modify the resolution parameter in the U-Net config file"
- The official `inference.sh` uses `stage2.yaml` (NOT stage2_512.yaml) with default weights

### Fix:
- **Option A**: Change config from `stage2_512.yaml` to `stage2.yaml` (256x256) and use LatentSync 1.5 weights
- **Option B**: Download LatentSync 1.6 weights (`ByteDance/LatentSync-1.6`) and keep `stage2_512.yaml`
- Option B is preferred for higher quality output, but be warned that 1.6 has its own issues (see below)

### What to change in our Docker API (`/tmp/latentsync-api/app.py`):
```
# Current (WRONG for 1.5 weights):
CONFIG_PATH = REPO_DIR / "configs" / "unet" / "stage2_512.yaml"

# Option A — match 1.5 weights:
CONFIG_PATH = REPO_DIR / "configs" / "unet" / "stage2.yaml"

# Option B — upgrade to 1.6 weights:
# Keep stage2_512.yaml, but change start.sh to download from ByteDance/LatentSync-1.6
```

Also change the ffmpeg scale in `image_to_video()`:
```
# Current (512x512 — wrong for 1.5):
"-vf", "scale=512:512:..."

# For Option A (1.5 with stage2.yaml):
"-vf", "scale=256:256:..."
```

---

## Finding 2: AI-Generated Face Images Are Problematic

Issue #220 explicitly documents this. A maintainer stated: **"Don't use an AI generated video for your source for BEST RESULTS."**

LatentSync was trained on VoxCeleb2 (real human videos). AI-generated faces have different texture patterns, pore structures, and skin characteristics that fall outside the training distribution. The model can't properly inpaint the face region because it doesn't understand the "visual language" of AI-generated skin.

### Mitigation:
- This is inherent to the model — no parameter change fixes it
- Post-processing with a face enhancer (GFPGAN, CodeFormer) may help
- Consider switching to a tool specifically designed for AI-generated faces

---

## Finding 3: Hands Near Face / Occlusion

Our input image has "hands clasped in front" — hands visible in the lower portion of the frame. This is a significant problem:

- LatentSync uses a **fixed mask covering the entire face region** (not just the mouth)
- The mask position is calculated via face landmark detection + affine transformation
- If hands are in the lower face area, they fall within the mask region
- The model then tries to regenerate the entire masked area including the hands, which it's not trained to do
- The paper explicitly states: "we can easily skip frames where the mouth is occluded" — meaning occlusion is a known problematic case

### Fix:
- **Use a face image with NO obstructions anywhere near the face/chin/jaw**
- Crop the image to show only face + neck, no hands
- The face should be clearly visible, frontal, with nothing below the chin

---

## Finding 4: The Fixed Mask Covers the ENTIRE Face

This is critical to understanding the output. LatentSync does NOT just mask the mouth — it masks the **entire face** from chin to forehead. This prevents the model from "cheating" by reading facial muscle cues.

The UNet receives 13 channels: 4 noise latents + 1 mask + 4 masked image + 4 reference frame. The entire face is regenerated, not just the lips. This means:
- Any issue with resolution, weights, or config will garble the **entire face**, not just the mouth
- The boundary artifacts you see are where the regenerated face meets the unmasked background
- Mismatched resolution (our bug) would produce especially bad results because the model is generating at the wrong scale

---

## Finding 5: DeepCache Quality Impact

`--enable_deepcache` was a buggy feature:
- Issue #279: `AttributeError: 'Namespace' object has no attribute 'enable_deepcache'` — fixed in commit f5040cf
- DeepCache uses `cache_interval=3` to speed up inference by reusing intermediate UNet features
- This DOES reduce quality, especially in fine details like teeth and lip edges
- It's a speed optimization, not a quality one

### Recommendation:
- Remove `--enable_deepcache` for quality testing
- Only re-enable once base quality is confirmed good
- The speed gain (~30% faster) is not worth it if quality is poor

---

## Finding 6: Inference Parameters

### Official defaults from `inference.sh`:
- `--inference_steps 20`
- `--guidance_scale 2.0` (NOT 1.5 as we're using)
- Config: `stage2.yaml` (NOT stage2_512.yaml)

### Recommended ranges:
- **inference_steps**: 20-50. Higher = better quality, slower. 20 is minimum viable.
- **guidance_scale**: 1.0-3.0. Higher = better lip sync but more video distortion/jitter. Default 2.0.

### Our settings vs recommended:
| Parameter | Ours | Official Default | Recommended |
|-----------|------|-----------------|-------------|
| inference_steps | 20 | 20 | 20-50 (try 30) |
| guidance_scale | 1.5 | 2.0 | 1.5-2.0 |
| enable_deepcache | Yes | No (not in inference.sh) | No |
| config | stage2_512.yaml | stage2.yaml | stage2.yaml for 1.5 |
| input resolution | 512x512 | 256x256 (face crop) | 256x256 for 1.5 |

---

## Finding 7: Still Image → Video Loop Approach

LatentSync officially takes **video** input, not still images. The face detection and affine transformation pipeline expects frame-by-frame face tracking. A static looped image:
- Produces identical frames, so the model gets no temporal variation cues
- The model may behave unexpectedly since it was trained on natural video with subtle head movements
- ComfyUI wrappers handle this by "duplicating frames to match audio length" — same approach we use

### This is probably a minor factor, not the primary cause. But:
- The model may produce slightly better results with a video that has subtle natural movement
- Consider using a short "talking head" video loop instead of a frozen still

---

## Finding 8: Face Preprocessing Pipeline

LatentSync's internal pipeline:
1. Detects face using MediaPipe (min confidence 0.5)
2. Detects landmarks using face-alignment library
3. Applies affine transformation for face frontalization
4. Crops face to the model's expected resolution (256x256 for 1.5, 512x512 for 1.6)
5. Applies fixed mask over entire face
6. Resamples video to 25 FPS, audio to 16kHz

**Input requirements**:
- Face must be minimum 256x256 pixels in the frame
- Face should be frontal (side profiles are handled via affine transform but quality degrades)
- Single face only — multiple faces cause issues
- Good lighting, no occlusion
- 25 FPS (auto-converted)

---

## Finding 9: LatentSync 1.6 Has Its Own Issues

If upgrading to 1.6:
- Issue #277: "not better than 1.5, even worse" — more flashes around mouth at 512 resolution
- Higher VRAM: 18GB for inference (vs 8GB for 1.5)
- Suggestion: decrease guidance_scale to minimize artifacts in 1.6

---

## Priority Fix Order

1. **FIX CONFIG MISMATCH** — Switch to `stage2.yaml` OR upgrade to 1.6 weights. This is 90% likely the root cause.
2. **Remove hands from image** — Use a clean face-only composition
3. **Disable DeepCache** — Remove `--enable_deepcache` for quality testing
4. **Bump guidance_scale to 2.0** — Match official default
5. **Consider increasing inference_steps to 30** — Better quality at the cost of ~50% more time
6. **Try with a real video** instead of looped still image
7. **If still bad, try 1.6 weights** with stage2_512.yaml (current config)

---

## Sources

- [Issue #220: Artifacts/glitches around lips](https://github.com/bytedance/LatentSync/issues/220)
- [Issue #328: Mask blurry in face](https://github.com/bytedance/LatentSync/issues/328)
- [Issue #297: Mask visible in output](https://github.com/bytedance/LatentSync/issues/297)
- [Issue #249: White noise/artifacts](https://github.com/bytedance/LatentSync/issues/249)
- [Issue #67: Output resolution/definition](https://github.com/bytedance/LatentSync/issues/67)
- [Issue #271: Awful results without stage2_512.yaml (1.6)](https://github.com/bytedance/LatentSync/issues/271)
- [Issue #277: 1.6 worse than 1.5](https://github.com/bytedance/LatentSync/issues/277)
- [Issue #279: DeepCache attribute error](https://github.com/bytedance/LatentSync/issues/279)
- [LatentSync paper (arXiv)](https://arxiv.org/html/2412.09262v1)
- [LatentSync GitHub](https://github.com/bytedance/LatentSync)
- [LatentSync 1.5 HuggingFace](https://huggingface.co/ByteDance/LatentSync-1.5)
- [LatentSync 1.6 HuggingFace](https://huggingface.co/ByteDance/LatentSync-1.6)
- [DeepWiki: LatentSync Installation](https://deepwiki.com/bytedance/LatentSync/3-installation-and-setup)
- [ThinkDiffusion LatentSync Guide](https://learn.thinkdiffusion.com/seamless-lip-sync-create-stunning-videos-with-latentsync/)
- [ComfyUI-LatentSyncWrapper](https://github.com/ShmuelRonen/ComfyUI-LatentSyncWrapper)
- [ComfyUI-Geeky-LatentSyncWrapper](https://github.com/GeekyGhost/ComfyUI-Geeky-LatentSyncWrapper)
- [fal.ai LatentSync](https://fal.ai/models/fal-ai/latentsync)
