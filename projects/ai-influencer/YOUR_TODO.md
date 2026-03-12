# Your Action Items — AI Influencer V1
*Last updated: 2026-03-12 — reflects all decisions made in session*

These are the things only YOU can do. Everything conversational is done — persona, product, research, pillars, all code scaffolded. This list is purely external actions.

**Ordered by time-sensitivity first, then by what unblocks the most downstream work.**

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

## 🔴 MOST TIME-SENSITIVE — Do These First

The 14-day account warm-up is the critical path. Every day you delay = a day later you go live.

### [ ] 1. Create a Kate Mercer email address
- Create `katemercer.health@gmail.com` (or closest available — don't use your personal email)
- This will be used for all platform signups, Gumroad, GeeLark, etc.
- Takes 5 minutes, unlocks everything else
→ Do this before any other signup.

### [ ] 2. Sign up for GeeLark
- Go to geelark.com → $29/mo plan
- Create 3 cloud Android phone instances (one per platform: TikTok, Instagram, YouTube)
- **Do NOT create social accounts yet** — proxies must be assigned first
→ Let me know once instances are created.

### [ ] 3. Buy residential proxies
- Provider: IPRoyal (recommended) or Smartproxy
- 3 residential sticky IPs — one per account
- Cost: ~$30–45/mo
- **Residential only — NOT datacenter** (platforms detect and ban datacenter)
- Must be assigned in GeeLark BEFORE creating any social accounts
→ Share proxy credentials and I'll document the per-account assignments.

### [ ] 4. Buy 3 phone numbers from 5sim
- Go to 5sim.net
- 3 US numbers for account verification (one per platform)
- Cost: ~$0.05–0.15 each, one-time
→ Have ready before sitting down to create accounts.

### [ ] 5. ⚡ CREATE PLATFORM ACCOUNTS IN GEELARK
**Most time-sensitive item. Starts the 14-day warmup clock.**
For each GeeLark instance:
- Assign proxy FIRST before opening any app
- Create accounts:
  - TikTok: @KateMercer
  - Instagram: @KateMercer
  - YouTube: Kate Mercer
- Use 5sim numbers for phone verification
- Bio: leave blank for now
- Keep GeeLark support chat open — first setup can be tricky
→ Once accounts exist, warmup clock starts.

### [ ] 6. Document credentials immediately after #5
- Fill in `projects/ai-influencer/accounts/credentials.json`
- Format: see `accounts/README.md`
- Include: login, proxy assigned, phone used, date created
- **Gitignored — never committed**
→ Do this same session as account creation.

---

## 🟡 HIGH PRIORITY — Unblocks the Most Build Work

### [ ] 7. Confirm OpenRouter API key is in .env
30-second check. Unlocks face gen and script generation.
```bash
cat /root/projects/Agent/.env | grep OPENROUTER
```
→ If it's there, done. If not, add it.

### [ ] 8. Sign up for RunPod
- runpod.io → add $20 credit to start
- No ongoing cost — only pay when pods are running
- Unlocks the full video pipeline (MuseTalk + Chatterbox)
→ Let me know once you have an account.

### [ ] 9. Sign up for Gumroad
- gumroad.com → free account
- Use the Kate Mercer email from #1
- No credit card needed (10% fee on sales)
- Gumroad hosts the product page — that URL becomes Kate's bio link
→ Share your Gumroad store URL.

---

## 🟢 WE DO THESE TOGETHER — Next Sessions

These happen in order once you've completed the red + yellow items above.

### [ ] 10. Run face generation — Stage 1 (cheap ideation)
- I run `gen_face.py --stage 1` — rough drafts, low cost
- You pick a direction
- Then I run Stage 2 (quality lock-in) — est. ~$0.40–0.90 for 4–9 images (I'll confirm cost first)
- You pick the final face → saved as persona reference image
→ Unblocks all video generation.

### [ ] 11. Review and approve product outline
- I generate the full outline based on our research
- You review and steer chapter angles
- I write chapters one at a time, you approve each
→ Unblocks PDF and Gumroad listing.

### [ ] 12. Design the PDF in Canva (~1–2 hrs, you do this)
- Requires: approved face (#10) + written content (#11)
- Health/wellness template, warm color palette (terracotta, sage, off-white)
- Add Kate's face on cover
- Export as PDF
→ I write all content; you handle the layout.

### [ ] 13. Set up Gumroad product listing (~20 min)
- Requires: PDF (#12) + Gumroad account (#9)
- Upload PDF → $27 → product description (I draft it)
- Gumroad product page URL = Kate's bio link on all platforms
→ Funnel is live once this is done.

### [ ] 14. Deploy MuseTalk + Chatterbox on RunPod (we do together)
- Requires: RunPod account (#8)
- Reference docs: `infrastructure/runpod/museTalk_setup.md` + `chatterbox_setup.md`
- ~30–45 min total setup
→ I walk you through every command live.

### [ ] 15. Add RunPod URLs to .env
After pods are running:
```
RUNPOD_CHATTERBOX_URL=https://[pod-id]-8080.proxy.runpod.net
RUNPOD_MUSSETALK_URL=https://[pod-id]-8081.proxy.runpod.net
```
→ I run a test video immediately to verify pipeline end-to-end.

### [ ] 16. Review and approve first video batch (~1–2 hrs)
- Open approval dashboard: `http://localhost:3030`
- `A` to approve, `R` to reject (keyboard shortcuts)
- Target: approve 15–20 videos for first posting wave
→ Do this after overnight batch generation run.

### [ ] 17. Connect platform accounts in n8n (~30 min)
- n8n running on VPS at port 5678
- I build the posting workflow; you connect account credentials in the n8n UI
→ I build it, you authenticate.

---

## ✅ GO LIVE CHECKLIST — Day 15
*(14 days after completing #5)*

- [ ] 18. Verify warmup complete — no flags, no issues on any account
- [ ] 19. Add bio links on all 3 profiles → Gumroad product page URL
- [ ] 20. Run a test purchase on Gumroad end-to-end
- [ ] 21. Post first 5 videos manually → confirm live on all 3 platforms
- [ ] 22. Confirm n8n auto-posting is active and on schedule

---

## Ongoing — Monthly

- [ ] Switch to Stan Store when revenue hits $500/mo
- [ ] Price increase: $27 → $37 at month 2 → $47 at month 3
- [ ] Add lead magnet at month 2: free checklist → email opt-in → upsell

---

## Cost Summary

**Monthly recurring:**
| Item | Cost |
|------|------|
| GeeLark (3 cloud phones) | $29/mo |
| Residential proxies (3 IPs) | ~$30–45/mo |
| RunPod (GPU, as used) | ~$5–15/mo |
| OpenRouter (scripts + misc) | ~$2–5/mo |
| **Total** | **~$66–94/mo** |

**One-time setup:**
| Item | Cost |
|------|------|
| 5sim phone numbers (3x) | ~$0.45 |
| RunPod initial credit | $20 |
| **Total** | **~$20.45** |
