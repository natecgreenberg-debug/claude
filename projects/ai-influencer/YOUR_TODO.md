# Your Action Items — AI Influencer V1

These are the things only YOU can do (signups, purchases, manual accounts, design decisions).
Work through these in order — they're sequenced so nothing blocks unnecessarily.

---

## Day 1 — Do These First (Unblocks Everything Else)

### [ ] 1. Decide the persona name
We need a name before creating accounts, domains, or any persona-linked content.
Think: believable for a 47-year-old woman in the Pacific Northwest. Not too generic ("Jennifer Smith"), not too unique.
Suggestions to consider: Dana, Claire, Lisa, Karen, Renee, Meredith.
→ Tell me the name and I'll update persona.md and all downstream files.

### [ ] 2. Claim your free domain
- Use a service that offers a free domain (e.g., Freenom, or grab a cheap one from Namecheap ~$1)
- Naming idea: `[firstnamelastname].com` or `perimomentor.com` or similar health-adjacent name
- You'll use subdomains per influencer: `perimenopause.[yourdomain].com`
→ Let me know what domain you grab and I'll set up the landing page DNS.

### [ ] 3. Sign up for Payhip
- Go to payhip.com → Create free account
- Use a new email (not your personal one — create `[personaname]@gmail.com` or similar)
- No credit card required to start (5% transaction fee on sales)
→ Let me know your Payhip store URL once set up.

### [ ] 4. Sign up for GeeLark
- Go to geelark.com → $29/mo plan (cloud Android phones)
- Create 3 cloud phone instances (one per platform)
- Note: This is your biggest recurring cost alongside proxies
→ Let me know your GeeLark account is set up; I'll write the warm-up protocol scripts.

---

## Day 1–2 — Get These Done in Parallel

### [ ] 5. Sign up for RunPod
- Go to runpod.io → Add $20 credit to start
- No ongoing cost — you only pay when pods are running
- You'll use this for MuseTalk (video gen) and Chatterbox (voice gen)
→ Let me know once you have an account; I'll help you deploy the pods step-by-step.

### [ ] 6. Add OpenRouter API key to .env
- You already have an OpenRouter API key (it's referenced in project .env)
- Confirm it's there: `cat /root/projects/Agent/.env | grep OPENROUTER`
- This is needed for face ideation (Stage 1) and script generation
→ No action if it's already set.

### [ ] 7. Buy residential proxies
- Provider options: IPRoyal (recommended) or Smartproxy
- Get 3 residential sticky IPs (one per platform account)
- Cost: ~$10–15/mo per IP, so ~$30–45/mo
- Important: residential only, NOT datacenter (platforms detect datacenter IPs)
→ Once purchased, share the proxy credentials and I'll assign them to accounts.

### [ ] 8. Buy 3 phone numbers from 5sim
- Go to 5sim.net
- Buy 3 US numbers for account verification
- Cost: ~$0.05–0.15 each (one-time, disposable)
- Platform: TikTok, Instagram, YouTube (one number per platform)
→ Have these ready when you create the platform accounts in GeeLark.

---

## Day 2–3 — Persona + Product Decisions

### [ ] 9. Approve the persona face (Stage 1 → Stage 2)
- I'll run Stage 1 face generation (cheap, rough drafts) first
- You review ~4–8 rough images and tell me the direction (hair color, face shape, vibe)
- Then I'll run Stage 2 (quality) — costs ~$0.20–0.40 for 4–9 variations
- You pick the final face
→ This is a conversation we do together — I'll initiate when ready.

### [ ] 10. Review and approve the product outline
- I'll generate a full outline for "The Perimenopause Reset: 30-Day Protocol"
- You review, adjust angle/chapters as you see fit
- Then I'll write the chapters (one at a time, you steer)
→ Scheduled for Day 2 work session.

### [ ] 11. Design the PDF in Canva
- Use a Canva health/wellness PDF template
- Brand colors: warm tones (terracotta, sage green, off-white) — NOT clinical blue/white
- Add the approved persona face on the cover
- Export as PDF
→ I can write all the content; you handle the Canva layout (~1–2 hrs).

### [ ] 12. Set up Payhip product listing
- Upload the PDF to Payhip
- Set price: $27
- Write product description (I'll draft this for you)
- Connect your domain → point to Payhip product page
→ Takes ~30 min once you have the PDF and domain.

---

## Day 3 — Account Creation (Time-Sensitive — Starts 14-Day Clock)

### [ ] 13. Create platform accounts in GeeLark
Do this ASAP — accounts need 14 days of warm-up before full posting.
For each GeeLark phone instance:
- Assign the proxy before creating any accounts
- Create one account per platform:
  - TikTok: @[PersonaName] (or closest available)
  - Instagram: @[PersonaName]
  - YouTube: [PersonaName]
- Use the 5sim numbers for phone verification
- Profile bio: keep it simple for now ("Coming soon..." or leave blank)
→ Do this with GeeLark support chat open if needed — first-time setup can be tricky.

### [ ] 14. Document credentials
- Fill in `projects/ai-influencer/accounts/credentials.json` (format in accounts/README.md)
- Store proxies and phone numbers there too
- This file is gitignored — never committed
→ Do this immediately after account creation so nothing gets lost.

---

## Day 3–5 — RunPod Deployment (We Do Together)

### [ ] 15. Deploy MuseTalk on RunPod
- Reference: `infrastructure/runpod/museTalk_setup.md`
- Requires: RunPod account with credit (step 5)
- Expected: ~20 min setup, RTX 4090 spot instance
→ We'll do this live in a session — I'll guide you through each command.

### [ ] 16. Deploy Chatterbox TTS on RunPod
- Reference: `infrastructure/runpod/chatterbox_setup.md`
- Can share a session with MuseTalk or use separate pod
→ Same session as MuseTalk setup.

### [ ] 17. Add RunPod URLs to .env
After pods are running, add to `.env`:
```
RUNPOD_CHATTERBOX_URL=https://[pod-id]-8080.proxy.runpod.net
RUNPOD_MUSSETALK_URL=https://[pod-id]-8081.proxy.runpod.net
```
→ I'll generate a test video as verification immediately after.

---

## Day 5–10 — Posting Setup

### [ ] 18. Set up n8n posting workflow
- n8n is already running on your VPS (port 5678)
- I'll build the workflow; you'll need to connect platform credentials inside n8n
- Blotato API (or GeeLark RPA) for actual post submission
→ I build this; you connect accounts in the n8n UI.

### [ ] 19. Review and approve first batch of videos
- After the pipeline runs, open the approval dashboard: `http://localhost:3030`
- Use A to approve, R to reject (keyboard shortcuts)
- Target: approve 15–20 videos for the first posting wave
→ Takes ~1–2 hrs to review 30 videos at 2–4 min each.

---

## Day 15 — Go Live Checklist

### [ ] 20. Verify warmup complete (14-day timer from step 13)
### [ ] 21. Bio links on all profiles → Payhip product page
### [ ] 22. Run test purchase on Payhip (verify checkout works end-to-end)
### [ ] 23. Post first 5 videos manually via dashboard → confirm they appear on all platforms
### [ ] 24. Confirm n8n auto-posting workflow is active

---

## Ongoing — Monthly

### [ ] Sign up for Stan Store when revenue hits $500/mo (replace Payhip)
### [ ] Price increase: $27 → $37 at month 2, $47 at month 3
### [ ] Add lead magnet: free checklist → email opt-in → upsell (month 2)

---

## Cost Summary (Monthly Recurring)

| Item | Cost |
|------|------|
| GeeLark (3 cloud phones) | $29/mo |
| Residential proxies (3 IPs) | ~$30–45/mo |
| RunPod (GPU, as used) | ~$5–15/mo |
| OpenRouter (scripts + misc) | ~$2–5/mo |
| **Total** | **~$66–94/mo** |

One-time setup costs:
- 5sim phone numbers: ~$0.45 total
- Domain: $0–$12/yr
- RunPod initial credit: $20

---

*Last updated: 2026-03-12*
