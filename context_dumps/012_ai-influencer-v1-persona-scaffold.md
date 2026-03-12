# Context Dump — 2026-03-12
## Session: AI Influencer V1 — Persona, Research & Scaffold

### What We Did
1. Added permanent spending rule to `workflow.md` — always ask before any paid API call, show estimated cost, wait for explicit approval
2. Scaffolded full `projects/ai-influencer/` directory structure (content, infrastructure, pipeline, dashboard, runpod, products, accounts)
3. Locked the complete persona through conversation: Kate Mercer, 52–53, white woman, black hair going gray, warm/soft but competent, Pacific Northwest
4. Locked product: "Everything I Wish I'd Known: Surviving Menopause Without Losing Your Mind" — $27 → $37 → $47 on Gumroad (no domain for V1)
5. Decided niche language: "menopause" everywhere, not "perimenopause"
6. Ran deep research: 3x Perplexity sonar-deep-research calls + Firecrawl Reddit scrapes (r/Menopause, r/Perimenopause)
7. Updated content pillars from 5 → 6 based on research, with full subtopics per pillar
8. Built all infrastructure code: `gen_face.py`, `gen_scripts.py`, `generate_video.py`, Node.js approval dashboard
9. Created RunPod setup guides for MuseTalk and Chatterbox
10. Created `YOUR_TODO.md` — 22 sequenced action items, reordered by time-sensitivity
11. Fixed and documented Firecrawl: must be manually started/stopped, startup command, shutdown command
12. Created `references/openrouter_pricing.md` with real pricing (sonar-deep-research is $0.40–$1.50/query, not $0.10 as originally estimated)
13. Fixed `gen_face.py` — wrong model ID (gemini-2.0-flash-exp:free is text-only, not image gen). Updated to correct Gemini image model
14. Updated cost estimates across all scripts to err high

### What Went Right
- Persona decisions were fast and decisive — name check, look, tone, product title all locked in one session
- Reddit research via Firecrawl returned genuinely useful data: real language, ranked topics, emerging angles (creatine, testosterone, FDA black box removal)
- Perplexity research confirmed Kate's positioning: "peer with lived experience" slot is wide open and highest-trust
- Content pillars are now grounded in real demand data, not guesswork
- FDA's November 2025 HRT black box warning removal is a sustained timely hook nobody's using yet
- Approval dashboard UI is clean and functional (keyboard shortcuts, auto-poll)

### What Went Wrong / Needs Improvement
- **Firecrawl was not running** — background agent tried to use it via curl, failed. Manually started it mid-session. Now documented correctly in memory.
- **Cost estimates for sonar-deep-research were badly wrong** — quoted $0.10–0.30/query, actual is $0.40–$1.50. Each of the 3 Perplexity calls likely cost $0.40–$1.30. Total spend probably $1.20–$3.90, not $0.25–$0.50.
- **WebFetch blocks reddit.com** — Claude Code sandbox restriction. Firecrawl is the only Reddit scraping path.
- **gemini-2.0-flash-exp:free is text-only** — incorrectly used as image gen model in gen_face.py. Fixed, but highlights need to verify model capabilities at openrouter.ai before hardcoding.
- Background agent couldn't shut down Firecrawl itself — had to handle manually after notification. Future agents need explicit shutdown step.

### Pending / Next Session
- **Nate completes external signups** (see YOUR_TODO.md items 1–9): Kate Mercer Gmail, GeeLark, proxies, 5sim numbers, create platform accounts (starts 14-day warmup clock), RunPod, Gumroad
- **Face generation Stage 1** — run cheap ideation pass, Nate picks direction, then Stage 2 quality lock-in
- **Product outline + chapters** — generate full outline based on research, write chapters one at a time with Nate steering
- **RunPod deployment** — MuseTalk + Chatterbox setup (we do together live)
- **Script generation** — run gen_scripts.py for 60 scripts once face + product are done
- **n8n posting workflow** — build after accounts are warmed and videos approved
- The Perplexity research file has copy-paste ready script hooks and verbatim Reddit language — read it before generating scripts

### Git State
- Branch: `main`
- Latest commits (newest first):
  - `50db215` chore: update todo — mark decisions done, fix numbering, reflect current state
  - `8aeaee3` research: menopause niche deep research — reddit + perplexity
  - `0c520f4` feat: update content pillars to 6 based on Reddit research, add subtopics
  - `01cb9ce` fix: correct cost estimates + Gemini image model ID, add OpenRouter pricing reference
  - `1b0fc22` research: append Reddit menopause community findings via Firecrawl
  - `5359175` chore: lock persona details + simplify funnel to Gumroad, no domain for V1
  - `863d2fe` chore: reorder todo list by time-sensitivity then unblocking priority
  - `30fcf52` feat: scaffold AI influencer V1 — full pipeline + persona + todo list
- Uncommitted: `projects/ai-influencer/docs/vision.png` (untracked image file — intentionally leaving untracked)

### Files Modified This Session
| File | Action |
|------|--------|
| `.claude/rules/workflow.md` | Modified — added spending rule |
| `projects/ai-influencer/YOUR_TODO.md` | Created — 22 sequenced action items |
| `projects/ai-influencer/accounts/.gitignore` | Created |
| `projects/ai-influencer/accounts/README.md` | Created |
| `projects/ai-influencer/content/persona/persona.md` | Created — full locked persona |
| `projects/ai-influencer/content/templates/captions.md` | Created — per-platform caption templates |
| `projects/ai-influencer/infrastructure/dashboard/package.json` | Created |
| `projects/ai-influencer/infrastructure/dashboard/public/index.html` | Created — approval dashboard UI |
| `projects/ai-influencer/infrastructure/dashboard/server.js` | Created — Express server |
| `projects/ai-influencer/infrastructure/gen_face.py` | Created — two-stage face generation |
| `projects/ai-influencer/infrastructure/pipeline/generate_video.py` | Created — full video pipeline |
| `projects/ai-influencer/infrastructure/runpod/chatterbox_setup.md` | Created |
| `projects/ai-influencer/infrastructure/runpod/museTalk_setup.md` | Created |
| `projects/ai-influencer/infrastructure/scripts/gen_scripts.py` | Created — batch script generator |
| `projects/ai-influencer/research/07_menopause_deep_research.md` | Created — Perplexity + Reddit research |
| `references/openrouter_pricing.md` | Created — real pricing reference |

### Key Decisions / Preferences Learned
- **Persona locked**: Kate Mercer, 52–53, white woman, black hair going gray, warm/soft but competent, Pacific Northwest
- **Product locked**: "Everything I Wish I'd Known: Surviving Menopause Without Losing Your Mind" — $27 launch
- **Funnel**: Gumroad only, no domain or landing page for V1. Bio link → Gumroad product page.
- **Language**: Always say "menopause" not "perimenopause" across all content
- **6 content pillars** (ranked by demand): Testosterone, Brain Fog & Focus, Sleep, Weight & Metabolism, HRT & Real Talk, The Emotional Side
- **Firecrawl**: Does NOT auto-start. Must run `cd /root/projects/Agent/tools/firecrawl && docker compose up -d`, wait 20 sec, then shut down with `docker compose down` when done
- **OpenRouter pricing**: sonar-deep-research is $0.40–$1.50/query worst case. Always use `references/openrouter_pricing.md` and err HIGH on estimates
- **gemini-2.0-flash-exp:free**: Text model only — cannot generate images. Use Gemini image preview models for image gen
- **Nate's todo**: `projects/ai-influencer/YOUR_TODO.md` — 22 items, items 1–9 are external signups Nate does solo before next build session
- **Key research finding**: FDA removed HRT black box warnings Nov 2025 — most women don't know. Sustained content hook for Kate.
- **Key positioning**: "Peer with lived experience" slot is wide open in menopause creator space. Kate's angle is "I'm not a doctor — I'm you, five years later"
