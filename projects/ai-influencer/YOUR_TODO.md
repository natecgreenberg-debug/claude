# Your Action Items — AI Influencer V1

These are the things only YOU can do (signups, purchases, manual accounts, design decisions).
**Ordered by time-sensitivity first, then by what unblocks the most downstream work.**

---

## 🔴 MOST TIME-SENSITIVE — Do These Immediately

The 14-day account warm-up is the critical path. Every day you delay starting it is a day later you go live.

### [ ] 1. Decide the persona name
**Blocks everything** — account handles, domain, Payhip email, persona doc. Do this first, takes 5 minutes.
Think: believable for a 47-year-old woman in the Pacific Northwest. Not too generic, not too unique.
Suggestions: Dana, Claire, Lisa, Karen, Renee, Meredith.
→ Tell me the name and I'll update persona.md and all downstream files.

### [ ] 2. Sign up for GeeLark
- Go to geelark.com → $29/mo plan
- Create 3 cloud Android phone instances (one per platform)
- **Do not create any social accounts yet** — proxies must be assigned first (#4)
→ Let me know once you have instances ready.

### [ ] 3. Buy residential proxies
- Provider: IPRoyal (recommended) or Smartproxy
- Get 3 residential sticky IPs — one per platform account
- Cost: ~$30–45/mo
- **Residential only — NOT datacenter** (platforms detect and ban datacenter IPs)
- Must be assigned in GeeLark before accounts are created
→ Share proxy credentials once purchased; I'll document the assignments.

### [ ] 4. Buy 3 phone numbers from 5sim
- Go to 5sim.net
- Buy 3 US numbers for account verification (TikTok, Instagram, YouTube)
- Cost: ~$0.05–0.15 each, one-time disposable
→ Have these ready when you sit down to create accounts.

### [ ] 5. ⚡ CREATE PLATFORM ACCOUNTS IN GEELARK — starts the 14-day clock
**This is #1 by time-sensitivity. Every day this waits = a day later you go live.**
For each GeeLark phone instance:
- Assign proxy first (before touching any app)
- Create one account per platform:
  - TikTok: @[PersonaName]
  - Instagram: @[PersonaName]
  - YouTube: [PersonaName]
- Use 5sim numbers for phone verification
- Profile bio: leave blank or "Coming soon..." for now
- Open GeeLark support chat before starting — first-time setup can be tricky
→ Once accounts exist, warmup begins automatically (just from the phone being active).

### [ ] 6. Document credentials immediately after #5
- Fill in `projects/ai-influencer/accounts/credentials.json`
- Format is in `accounts/README.md`
- Include: login, proxy assigned, phone number used, date created
- **This file is gitignored — never committed**
→ Do this the same session as account creation so nothing gets lost.

---

## 🟡 HIGH PRIORITY — Unblocks the Most Work

### [ ] 7. Confirm OpenRouter API key is in .env
Quick check — takes 30 seconds. Unblocks face generation AND script generation.
```bash
cat /root/projects/Agent/.env | grep OPENROUTER
```
→ If it's there, we're good. If not, add it now.

### [ ] 8. Sign up for RunPod
- Go to runpod.io → Add $20 credit
- No ongoing cost — only pay when pods are running
- Unblocks the entire video pipeline (MuseTalk + Chatterbox)
→ Let me know once you have an account.

### [ ] 9. Approve the persona face (Stage 1 → Stage 2)
- I'll run Stage 1 first (cheap rough drafts, no cost confirmation needed)
- You pick a direction (hair color, face shape, vibe)
- Then I'll show you the Stage 2 cost (~$0.20–0.40) and wait for your go-ahead
- You pick the final face — this becomes the reference image for all videos
→ Unblocks video generation. We do this together in a session.

### [ ] 10. Review and approve the product outline
- I'll generate the full "Perimenopause Reset" outline
- You review and steer the chapter angles
- Then I write the chapters one at a time
→ Unblocks PDF creation, which unblocks the Payhip listing and the CTA on all videos.

### [ ] 11. Claim your domain
- Free or cheap (~$1 on Namecheap): `[firstnamelastname].com` or `perimomentor.com`
- You'll use subdomains per influencer: `perimenopause.[yourdomain].com`
→ Let me know the domain; I'll set up the landing page and DNS config.

### [ ] 12. Sign up for Payhip
- Go to payhip.com → free account
- Use a new email (create `[personaname]@gmail.com` or similar — not your personal email)
- No credit card needed (5% fee on sales)
→ Let me know your store URL once set up.

---

## 🟢 MEDIUM PRIORITY — Sequential Build Work

### [ ] 13. Design the PDF in Canva (~1–2 hrs)
- Requires: approved persona face (#9) + written content (I write this once outline is approved)
- Use a health/wellness PDF template
- Brand colors: warm tones (terracotta, sage green, off-white) — NOT clinical blue/white
- Add persona face on cover
- Export as PDF
→ I write all content; you handle the Canva layout.

### [ ] 14. Set up Payhip product listing (~30 min)
- Requires: PDF ready (#13) + Payhip account (#12) + domain (#11)
- Upload PDF → set price $27 → write description (I'll draft it) → point domain
→ This is the end of the funnel; everything points here.

### [ ] 15. Deploy MuseTalk on RunPod (we do together)
- Requires: RunPod account (#8) + approved face (#9)
- Reference: `infrastructure/runpod/museTalk_setup.md`
- ~20 min setup, RTX 4090 spot instance
→ I guide you through every command in a live session.

### [ ] 16. Deploy Chatterbox TTS on RunPod (same session as #15)
- Reference: `infrastructure/runpod/chatterbox_setup.md`
→ Back-to-back with MuseTalk deployment.

### [ ] 17. Add RunPod URLs to .env
After both pods are running:
```
RUNPOD_CHATTERBOX_URL=https://[pod-id]-8080.proxy.runpod.net
RUNPOD_MUSSETALK_URL=https://[pod-id]-8081.proxy.runpod.net
```
→ I'll run a test video immediately to verify the full pipeline.

### [ ] 18. Review and approve first video batch (~1–2 hrs)
- Open approval dashboard: `http://localhost:3030`
- Keyboard: `A` to approve, `R` to reject
- Target: approve 15–20 videos for the first posting wave
→ Do this once the batch pipeline has run overnight.

### [ ] 19. Connect platform accounts in n8n (~30 min)
- n8n already running on your VPS at port 5678
- I'll build the posting workflow; you connect your platform credentials inside the n8n UI
- (Blotato API or GeeLark RPA for actual posting)
→ I build the automation; you authenticate the accounts.

---

## ✅ GO LIVE CHECKLIST — Day 15 (14 days after #5)

### [ ] 20. Verify warmup is complete (no flags, no issues on any account)
### [ ] 21. Add bio links on all 3 profiles → point to Payhip product page
### [ ] 22. Run a test purchase on Payhip (verify checkout works end-to-end)
### [ ] 23. Post first 5 videos manually → confirm they appear on all 3 platforms
### [ ] 24. Confirm n8n auto-posting is active and scheduled

---

## Ongoing — Monthly

### [ ] Switch to Stan Store when revenue hits $500/mo (replaces Payhip)
### [ ] Price increase: $27 → $37 at month 2 → $47 at month 3
### [ ] Add lead magnet at month 2: free checklist → email opt-in → upsell to product

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
| Domain | $0–$12/yr |
| RunPod initial credit | $20 |

---

*Last updated: 2026-03-12*
