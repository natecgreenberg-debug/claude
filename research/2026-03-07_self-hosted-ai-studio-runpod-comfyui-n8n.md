# Self-Hosted AI Content Generation with RunPod, ComfyUI, and n8n Pipeline (2025-2026)

## Practical Feasibility Assessment for Solo Operators

---

## Key Findings

1. **RunPod GPU costs are genuinely low** -- an RTX 3090 (24GB) runs $0.22/hr, an A40 (48GB) runs $0.35/hr, and an H100 (80GB) runs $1.99-$2.69/hr on-demand. These are the lowest prices among "reliable" providers; only Vast.ai's decentralized marketplace is cheaper (with significant reliability trade-offs).

2. **ComfyUI on RunPod is a well-supported path** -- RunPod provides official templates, a Docker-based serverless worker (`runpod-workers/worker-comfyui`), and extensive documentation. Setup takes 10-15 minutes for first launch.

3. **Cold starts are the critical gotcha** -- Serverless cold starts range from 10-30 seconds (minimal images) to 60-120 seconds (large models on network volumes). This makes intermittent "wake/sleep" usage painful unless you pay for always-on warm workers.

4. **API pricing has collapsed** -- Flux Schnell costs $0.003/image via fal.ai or Replicate. At that price, you'd need to generate ~73 images per hour on an RTX 3090 ($0.22/hr) just to break even on compute alone, not counting storage, setup time, or maintenance.

5. **Video generation is where self-hosting starts to make economic sense** -- Wan 2.1 video via Replicate costs $0.09-$0.25 per second of output. A 5-second 480p clip costs ~$0.45 per generation. At volume, self-hosting on an A40 or A100 becomes meaningfully cheaper.

6. **n8n integration works but is hand-rolled** -- There's no native n8n node for RunPod. You use HTTP Request nodes with RunPod's REST API in a submit-then-poll pattern. It works, but you're building the plumbing yourself.

7. **For a solo operator doing < 100 generations/day, APIs are almost certainly the better choice.** The complexity tax of self-hosting (cold starts, storage management, model updates, debugging) outweighs the cost savings at low volume.

---

## 1. RunPod GPU Pricing (Current)

| GPU | VRAM | On-Demand/hr | 1-Year Commit/hr | Best For |
|-----|------|-------------|-------------------|----------|
| RTX A5000 | 24 GB | $0.16 | $0.20 | Budget image gen |
| RTX 3090 | 24 GB | $0.22 | $0.34 | Image gen (Flux, SDXL) |
| RTX 4090 | 24 GB | $0.34 | $0.50 | Fast image gen |
| A40 | 48 GB | $0.35 | $0.20 | Video gen (Wan 2.1, LTX) |
| RTX A6000 | 48 GB | $0.33 | $0.40 | Video gen alternative |
| L40S | 48 GB | $0.79 | $0.71 | High-throughput video |
| A100 PCIe | 80 GB | $1.19 | $1.14 | HunyuanVideo, large models |
| A100 SXM | 80 GB | $1.39 | $1.22 | Training + inference |
| H100 PCIe | 80 GB | $1.99 | $2.03 | Maximum performance |
| H100 SXM | 80 GB | $2.69 | -- | Maximum performance |
| H200 | 141 GB | $3.59 | $3.05 | Largest models |

**Storage costs:**
- Network Volume: $0.07/GB/month (< 1TB), $0.05/GB/month (> 1TB)
- Container Disk: $0.10/GB/month
- Volume disk while idle: $0.20/GB/month

Source: [RunPod Pricing](https://www.runpod.io/pricing), [RunPod GPU Pricing](https://www.runpod.io/gpu-pricing)

### Alternatives Comparison

| Provider | RTX 3090/hr | A100 80GB/hr | H100/hr | Key Trade-off |
|----------|-------------|--------------|---------|---------------|
| **RunPod** | $0.22 | $1.19-1.39 | $1.99-2.69 | Best balance of price + reliability |
| **Vast.ai** | ~$0.16 | ~$0.80-1.20 | ~$3.69 | 20-50% cheaper but decentralized/unreliable |
| **Lambda Labs** | N/A | $1.10 | $2.49 | No data transfer fees, limited availability |
| **Replicate** (GPU) | N/A | $5.04/hr | $5.49/hr | 3-4x more expensive raw GPU, but per-model pricing offsets this |

Sources: [ComputePrices RunPod vs Vast](https://computeprices.com/compare/runpod-vs-vast), [ComputePrices Lambda vs RunPod](https://computeprices.com/compare/lambda-vs-runpod), [Replicate Pricing](https://replicate.com/pricing)

---

## 2. ComfyUI on RunPod: Setup and Reliability

### Setup Process

1. **Pod-based (interactive)**: Select the "ComfyUI" template when creating a pod. First launch takes ~10-15 minutes for model downloads; subsequent starts are faster with a network volume attached.

2. **Serverless (API-based)**: Use the official [`runpod-workers/worker-comfyui`](https://github.com/runpod-workers/worker-comfyui) Docker image. Submit ComfyUI workflow JSON via API and receive generated images as base64 output. This is the production deployment path.

3. **Network Volume**: Attach persistent storage so models survive pod restarts. Minimum 20-50GB needed for ComfyUI + one large model. Multiple video models can push storage to 100-200GB.

Sources: [RunPod ComfyUI Tutorial](https://docs.runpod.io/tutorials/pods/comfyui), [RunPod ComfyUI + Flux Guide](https://www.runpod.io/articles/guides/comfy-ui-flux), [Deploy ComfyUI Serverless](https://www.runpod.io/blog/deploy-comfyui-as-a-serverless-api-endpoint)

### Wake/Sleep Reliability

- **Pod-based**: Start/stop manually. Boots in 1-3 minutes from network volume. Works but requires scripting.
- **Serverless flex workers**: Scale to zero. Cold starts: **10-30 seconds** (small models) to **60-120 seconds** (large models on network volumes).
- **Serverless active workers**: No cold starts but you pay continuously. Defeats intermittent purpose.
- **FlashBoot**: Probabilistic caching optimization. Not reliable for truly intermittent usage.

**Bottom line**: For intermittent usage, expect 30-120 second startup delays.

---

## 3. Best Open-Source Models by Task

### Image Generation

| Model | VRAM Needed | Quality | Speed | Notes |
|-------|-------------|---------|-------|-------|
| **FLUX.2 [dev]** | ~16-24GB (FP8) | Excellent | Moderate | Best open-weight image model. NVIDIA FP8 cuts VRAM 40% |
| **FLUX.2 [klein]** | ~8-12GB | Good | Fast | Distilled version for real-time generation |
| **FLUX.1 [schnell]** | ~12-16GB | Good | Fast | Previous-gen speed model, still widely used |
| **Stable Diffusion XL** | ~8-12GB | Good | Fast | Mature ecosystem, many fine-tunes |

### Video Generation

| Model | VRAM Needed | Resolution | Speed | Quality |
|-------|-------------|------------|-------|---------|
| **Wan 2.1** | ~24-48GB | Up to 1080p | Moderate | Best overall quality; smooth motion, detailed textures |
| **HunyuanVideo** | **45-80GB** | Up to 1080p | Slow | Excellent multi-person scenes. Requires A100/H100 |
| **LTX-Video 2** | **~8-24GB** | 1216x704 @ 30fps | **Fastest** | Good but below Wan 2.1. Best for rapid iteration |

**Recommendation**: Wan 2.1 on an A40 (48GB, $0.35/hr) is best quality-per-dollar for video.

### Lip-Sync

**InfiniteTalk** (MeiGen-AI) is the current standout:
- Open-source (Apache 2.0), audio-driven lip-sync
- Image-to-video and video-to-video
- Synchronizes lips, head movements, body posture, and expressions
- Unlimited-length video generation
- [GitHub](https://github.com/MeiGen-AI/InfiniteTalk) / [Hugging Face](https://huggingface.co/MeiGen-AI/InfiniteTalk)

Sources: [Pixazo Best Open Source Lip-Sync Models](https://www.pixazo.ai/blog/best-open-source-lip-sync-models)

---

## 4. Cost Comparison: Self-Hosted vs API

### Image Generation (Flux)

| Approach | Cost Per Image | Cost for 1,000 Images | Notes |
|----------|---------------|----------------------|-------|
| **fal.ai Flux Schnell** | $0.003 | $3.00 | Fastest option, no setup |
| **Replicate Flux Schnell** | $0.003 | $3.00 | Similar to fal.ai |
| **fal.ai Flux 2 Dev** | $0.008 | $8.40 | Higher quality |
| **fal.ai Flux 2 Pro** | $0.073 | $73.00 | Top quality |
| **Self-hosted RTX 3090** | ~$0.003-0.006 | ~$3-6 + storage | Assumes ~40-70 images/hr throughput |
| **Self-hosted RTX 4090** | ~$0.002-0.005 | ~$2-5 + storage | Faster throughput |

**Verdict on images**: APIs and self-hosting are roughly equivalent. APIs win on convenience.

### Video Generation (Wan 2.1)

| Approach | Cost Per 5s Clip | Cost for 100 Clips | Notes |
|----------|-----------------|---------------------|-------|
| **Replicate Wan 2.1 (480p)** | $0.45 | $45.00 | Simple API call |
| **Replicate Wan 2.1 (720p)** | $1.25 | $125.00 | Higher resolution |
| **fal.ai Wan 2.5** | $0.25 | $25.00 | Per-second pricing |
| **Self-hosted A40 (48GB)** | ~$0.06-0.12 | ~$6-12 + storage | Assumes 3-6 clips/hr |
| **Self-hosted A100 (80GB)** | ~$0.12-0.23 | ~$12-23 + storage | Faster but pricier GPU |

**Verdict on video**: Self-hosting is **3-10x cheaper** for video generation. This is where the economics work.

Sources: [fal.ai Pricing](https://fal.ai/pricing), [Replicate Pricing](https://replicate.com/pricing), [PricePerToken Image Comparison](https://pricepertoken.com/image)

---

## 5. n8n + RunPod Integration

No native n8n node for RunPod. Integration via **HTTP Request nodes** using RunPod's REST API.

### Architecture (7-9 Nodes)

```
Webhook (trigger)
  -> Set Node (normalize params)
    -> HTTP POST to RunPod /run (submit ComfyUI workflow JSON)
      -> Wait 60-90 seconds
        -> HTTP GET RunPod /status/{job_id} (poll)
          -> IF completed? (loop back if not)
            -> Process output (base64 -> image)
              -> Respond to webhook
```

### Key API Endpoints

- **Submit job**: `POST https://api.runpod.ai/v2/{ENDPOINT_ID}/run`
- **Check status**: `GET https://api.runpod.ai/v2/{ENDPOINT_ID}/status/{JOB_ID}`
- **Auth**: Bearer token (RunPod API key) in Authorization header

Sources: [GrowthHub n8n + RunPod Guide](https://growthhub.io/hubspot-ai-first-blog/build-an-enterprise-grade-ai-image-bot-for-employees-with-runpod.io-serverless-n8n), [Pipedream RunPod + n8n](https://pipedream.com/apps/runpod/integrations/n8n-io)

---

## 6. Gotchas and Pain Points

### Cold Starts
The #1 complaint. Serverless flex workers with models on network volumes regularly hit 60-120 second cold starts. Baking models into Docker reduces to 10-30 seconds but makes images 20-50GB+.

### Network Volume Pitfalls
- Billed continuously, even when idle
- **If your account runs out of funds, your network volume is terminated and data is permanently lost**
- Volume size can be increased but **never decreased**
- Volumes are region-locked

### Model Download Sizes
- Flux 2 Dev: ~20GB
- Wan 2.1 14B: ~28GB
- HunyuanVideo: ~34GB
- Multiple models + ComfyUI: easily 100-200GB

### IP Changes
Pod IPs change on every restart. For serverless, this doesn't matter (use RunPod API endpoints). For pod-based, reconnect via dashboard.

### Hidden Costs
- Storage accruing 24/7
- Billing rounding (partial seconds rounded up)
- Time spent debugging, updating models, maintaining workflows

Sources: [RunPod Network Volumes Docs](https://docs.runpod.io/storage/network-volumes), [NerdyNav RunPod Review](https://nerdynav.com/runpod-review/)

---

## 7. Realistic Assessment

### When Self-Hosting Makes Sense
- High-volume video generation (100+ clips/day)
- Custom model pipelines (LoRAs, ControlNet, multi-step workflows)
- You already know ComfyUI
- Privacy/IP concerns

### When APIs Are Better
- < 100 image generations/day (at $0.003/image, 100 images = $0.30/day)
- Solo operator who values time
- Multiple model types needed
- Intermittent usage patterns

### The Hybrid Path (Probably the Right Answer)

1. **Start with APIs** (fal.ai for cost, Replicate for variety). Build n8n workflows against API endpoints.
2. **Identify your bottleneck** after real usage. Usually video generation.
3. **Self-host only the expensive task**. Deploy Wan 2.1 on RunPod A40. Keep everything else on APIs.
4. **Don't self-host image generation** unless doing 1,000+ images/day.

### Monthly Cost Comparison (Solo Operator, Moderate Usage)

| Scenario | Images (50/day) | Videos (10/day) | Storage | Total/month |
|----------|-----------------|-----------------|---------|-------------|
| **All-API (fal.ai)** | ~$4.50 | ~$37.50 | $0 | **~$42/mo** |
| **All-API (Replicate)** | ~$4.50 | ~$135 | $0 | **~$140/mo** |
| **Hybrid (API images + RunPod video)** | ~$4.50 | ~$10-15 | ~$7 | **~$22-27/mo** |
| **All self-hosted RunPod** | ~$5-8 | ~$10-15 | ~$14 | **~$29-37/mo** |

### Final Verdict

**For a solo operator in 2026: start with APIs, self-host video generation once you hit volume.** Image generation APIs are so cheap that self-hosting only makes sense at serious scale. Video generation is where the economics flip. The n8n integration layer is the same either way (HTTP Request nodes), so you can migrate individual tasks without rebuilding automation.

---

*Research conducted March 2026. Pricing and model availability change frequently.*
