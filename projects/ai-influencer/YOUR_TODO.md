# Your Action Items — AI Influencer V1
*Last updated: 2026-03-15 — restructured into two waves: validate video quality first, build distribution second*

These are the things only YOU can do. Everything conversational is done — persona, product, research, pillars, all code scaffolded. This list is purely external actions.

---

## ✅ ALREADY DECIDED — No Action Needed

- **Persona name:** Kate Mercer
- **Age / look:** 52–53, white woman, black hair going gray, warm/soft energy
- **Product title:** "Everything I Wish I'd Known: Surviving Menopause Without Losing Your Mind"
- **Price ladder:** $27 → $37 → $47
- **Funnel:** Bio link → Gumroad product page (no website or domain for V1)
- **Content pillars:** 6 locked (Testosterone, Brain Fog, Sleep, Weight, HRT, Emotional Side)
- **Niche language:** "menopause" everywhere (not perimenopause)

---

# 🌊 WAVE 1 — Validate Video Quality First

**Goal:** Get the video pipeline running on RunPod and confirm we can produce quality AI influencer videos before building any distribution infrastructure. If the videos aren't good enough, nothing else matters.

## Your Wave 1 Signups (just 2 items)

### [ ] 1. Sign up for RunPod (your own account)
- runpod.io → add $20 credit to start
- Use your own identity (not Kate's — this is backend infrastructure)
- No ongoing cost — pay only when pods are running (~$0.34/hr on-demand for RTX 4090)
- **On-demand vs spot:** On-demand = spin up, use it, shut down, pay only for seconds used. Always available. That's what we want. Spot is cheaper but can be interrupted mid-run — fine for overnight batch jobs later, not for setup.
→ Let me know once you have an account and I'll walk you through deployment.

### [ ] 2. Confirm OpenRouter API key is in .env
30-second check. Unlocks face gen and script generation.
```bash
cat /root/projects/Agent/.env | grep OPENROUTER
```
→ If it's there, done. If not, add it from openrouter.ai/keys.

---

## We Do Together — Wave 1

These happen in order once you've completed the two items above.

### [ ] 3. Review model research + lock stack
- Research agent running now — comparing MuseTalk vs InfiniTalk vs others for talking head, TTS options, video upscaling, music gen, and sleeper picks
- We review findings together and decide the final model stack before deploying anything
→ Unblocks RunPod deployment.

### [ ] 4. Deploy video pipeline on RunPod (we do together, ~30–45 min)
- Requires: RunPod account (#1) + locked model stack (#3)
- I walk you through every command live
- GPU: RTX 4090 on-demand ($0.34/hr) — spin up for setup, shut down when done
→ We confirm the pod is running before moving on.

### [ ] 5. Add RunPod URLs to .env
After pods are running:
```
RUNPOD_TTS_URL=https://[pod-id]-8080.proxy.runpod.net
RUNPOD_LIPSYNC_URL=https://[pod-id]-8081.proxy.runpod.net
```
→ I run a test video immediately to verify pipeline end-to-end.

### [ ] 6. Run face generation — Stage 1 (cheap ideation)
- I run `gen_face.py --stage 1` — rough drafts, low cost
- You pick a direction
- Then I run Stage 2 (quality lock-in) — est. ~$0.40–0.90 for 4–9 images (I'll confirm cost first)
- You pick the final face → saved as persona reference image
→ Unblocks all video generation.

### [ ] 7. Generate and review test videos
- I generate 3–5 test videos using Kate's face + a sample script
- You review quality: lip sync, voice, lighting, feel
- **Go / No-go decision point** — does this meet the bar? If yes, Wave 2. If not, we iterate on the model stack.
→ This is the validation gate. Everything after this depends on passing it.

### [ ] 8. Review and approve product outline (can run parallel with #4–7)
- I generate full outline based on our research
- You review and steer chapter angles
- I write chapters one at a time, you approve each
→ Unblocks PDF and Gumroad listing in Wave 2.

---

# 🌊 WAVE 2 — Distribution Infrastructure

**Start only after Wave 1 validation passes (step 7 above).**

The 14-day platform warmup is the critical path in Wave 2. Every day you delay starting it = a day later you go live.

## Your Wave 2 Signups

### [ ] 9. Create a Kate Mercer email address
- Create `katemercer.health@gmail.com` (or closest available — don't use your personal email)
- Used for all platform signups, Gumroad, GeeLark
→ Do this before any other Wave 2 signup.

### [ ] 10. Sign up for GeeLark
- geelark.com → $29/mo plan
- Create 3 cloud Android phone instances (one per platform: TikTok, Instagram, YouTube)
- **Do NOT create social accounts yet** — proxies must be assigned first
→ Let me know once instances are created.

### [ ] 11. Buy residential proxies
- Provider: IPRoyal (recommended) or Smartproxy
- 3 residential sticky IPs — one per account
- Cost: ~$30–45/mo
- **Residential only — NOT datacenter** (platforms detect and ban datacenter)
→ Share proxy credentials and I'll document the per-account assignments.

### [ ] 12. Buy 3 phone numbers from 5sim
- 5sim.net — 3 US numbers for account verification (one per platform)
- Cost: ~$0.05–0.15 each, one-time
→ Have ready before sitting down to create accounts.

### [ ] 13. ⚡ CREATE PLATFORM ACCOUNTS IN GEELARK
**Starts the 14-day warmup clock.**
For each GeeLark instance:
- Assign proxy FIRST before opening any app
- Create accounts: TikTok @KateMercer, Instagram @KateMercer, YouTube Kate Mercer
- Use 5sim numbers for phone verification
- Bio: leave blank for now
→ Once accounts exist, warmup clock starts. Document credentials in `accounts/credentials.json` immediately after.

### [ ] 14. Sign up for Gumroad
- gumroad.com → free account, use Kate's email from #9
- No credit card needed (10% fee on sales)
→ Share your Gumroad store URL.

---

## We Do Together — Wave 2

### [ ] 15. Design PDF in Canva (~1–2 hrs, you do this)
- Requires: approved face + written content (#8)
- Health/wellness template, warm color palette (terracotta, sage, off-white)
- Export as PDF
→ I write all content; you handle the layout.

### [ ] 16. Set up Gumroad product listing
- Upload PDF → $27 → I draft product description
- Gumroad product page URL becomes Kate's bio link on all platforms
→ Funnel is live once this is done.

### [ ] 17. Build n8n posting workflow
- n8n running on VPS at port 5678
- I build the workflow; you connect account credentials in the n8n UI
→ I build it, you authenticate.

### [ ] 18. Run first video batch + approval pass
- Open approval dashboard: `http://localhost:3030`
- `A` to approve, `R` to reject (keyboard shortcuts)
- Target: approve 15–20 videos for first posting wave
→ Do this after overnight batch generation run.

---

## ✅ GO LIVE CHECKLIST — Day 15 of Wave 2
*(14 days after completing #13)*

- [ ] Verify warmup complete — no flags, no issues on any account
- [ ] Add bio links on all 3 profiles → Gumroad product page URL
- [ ] Run a test purchase on Gumroad end-to-end
- [ ] Post first 5 videos manually → confirm live on all 3 platforms
- [ ] Confirm n8n auto-posting is active and on schedule

---

## Ongoing — Monthly

- [ ] Switch to Stan Store when revenue hits $500/mo
- [ ] Price increase: $27 → $37 at month 2 → $47 at month 3
- [ ] Add lead magnet at month 2: free checklist → email opt-in → upsell

---

## Cost Summary

**Wave 1 only (validation phase):**
| Item | Cost |
|------|------|
| RunPod initial credit | $20 |
| OpenRouter (face gen Stage 1+2) | ~$1–2 |
| **Total** | **~$21–22** |

**Wave 2 ongoing (once validated):**
| Item | Cost |
|------|------|
| GeeLark (3 cloud phones) | $29/mo |
| Residential proxies (3 IPs) | ~$30–45/mo |
| RunPod (GPU, as used) | ~$5–15/mo |
| OpenRouter (scripts + misc) | ~$2–5/mo |
| **Total** | **~$66–94/mo** |

**One-time Wave 2 setup:**
| Item | Cost |
|------|------|
| 5sim phone numbers (3x) | ~$0.45 |
| **Total** | **~$0.45** |
