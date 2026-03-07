# Environment Feasibility Scorecard

## Current Environment Snapshot
| Component | Status | Notes |
|-----------|--------|-------|
| Python 3.12 | Available | No pip installed — can't install packages without manual intervention |
| n8n | Running (Docker, port 5678) | Healthy, accessible on localhost |
| Docker | Available (v29.2.1) | Running n8n container |
| curl | Available (v8.5.0) | For API testing |
| Claude Code | Available | Primary development tool |
| Node.js | NOT available | Not installed on host (only inside Docker containers) |
| pip/pip3 | NOT available | Python stdlib only unless pip is bootstrapped |
| Git | Available | Repo configured, GitHub remote set |
| Networking | Tailscale-only | No public-facing without proxy setup |
| GPU | None | CPU-only VPS — no local ML inference |

### API Keys Configured
| Key | Location | Status |
|-----|----------|--------|
| TAILSCALE_IP | ~/projects/Agent/.env | Configured |
| OpenRouter | n8n credentials (assumed) | Via n8n credential store, not in .env files |
| fal.ai | n8n credentials (assumed) | Same |
| WaveSpeed | n8n credentials (assumed) | Same |
| Stripe | Optic Stage account | External — not on VPS |
| ClickBank | Unknown | Referenced in docs but not confirmed |
| Amazon Associates | Unknown | Referenced in docs but not confirmed |
| Canva | Unknown | Referenced in docs but not confirmed |

**Note**: API keys appear to be stored in n8n's encrypted credential store, not in .env files on the host. This is normal for n8n setups.

---

## Idea-by-Idea Feasibility

### 1. Digital Asset Landlord (Etsy/Creative Fabrica)
| Dimension | Score | Notes |
|-----------|-------|-------|
| Available tools | 7/10 | Python for scripting, n8n for automation, Claude for text/metadata. Missing: image generation APIs need keys configured |
| Missing dependencies | 6/10 | No pip = can't install httpx, Pillow, etc. for image processing scripts. n8n can handle most via HTTP nodes. |
| API access | 6/10 | fal.ai key exists in n8n for image gen. Etsy API requires developer app approval (unknown status). Creative Fabrica has no public API — manual or browser automation needed. |
| Infrastructure fit | 5/10 | CPU-only = no local image generation. Must use external APIs (fal.ai, OpenRouter). Tailscale networking = can't serve webhooks without proxy. |
| What's possible TODAY | 6/10 | Can build n8n workflows for: prompt generation, API image generation, metadata creation, file organization. Cannot: auto-upload to Etsy/CF without browser automation or API access. |
| **Overall Feasibility** | **6/10** | Core automation pipeline is buildable. Biggest gaps: no pip for Python packages, platform upload automation requires browser tools (not available), and image gen is API-dependent. |

**Can build today**: n8n prompt generation workflows, metadata templates, product research scripts (Python stdlib), batch file organization
**Needs setup**: pip installation, Etsy API developer access, browser automation (Playwright/Puppeteer), image generation API keys in .env

---

### 2. Optic Stage (AI Visual Production Agency)
| Dimension | Score | Notes |
|-----------|-------|-------|
| Available tools | 7/10 | n8n for outreach automation, Claude for email copy, fal.ai/WaveSpeed in n8n for image upscaling |
| Missing dependencies | 5/10 | No pip limits Python scripting. Cold email needs Instantly.ai (external SaaS, not on VPS). |
| API access | 7/10 | fal.ai and WaveSpeed already in n8n = can upscale images NOW. Stripe account exists. |
| Infrastructure fit | 5/10 | Tailscale = n8n webhooks not publicly accessible. Need Cloudflare tunnel or similar for inbound triggers. |
| What's possible TODAY | 6/10 | Can generate sample upscaled images via n8n + fal.ai. Can draft outreach emails. Cannot send cold emails (needs Instantly.ai setup + domain warming). |
| **Overall Feasibility** | **6/10** | Image upscaling pipeline works via n8n. Outreach infrastructure (domains, Instantly, warming) is external and costs ~$300/month to start. |

**Can build today**: Sample generation workflows in n8n, email templates, lead sourcing scripts, pricing calculator
**Needs setup**: Instantly.ai subscription, warmed domains, public webhook access, client delivery system

---

### 3. Infinite AI Content Studio (Self-Hosted)
| Dimension | Score | Notes |
|-----------|-------|-------|
| Available tools | 6/10 | n8n is running and can orchestrate. Docker available for potential local services. |
| Missing dependencies | 4/10 | RunPod account + credits needed. No GPU locally. ComfyUI needs RunPod. |
| API access | 5/10 | RunPod API key not configured. Need to set up account and fund it. |
| Infrastructure fit | 4/10 | This idea IS the infrastructure — it's about building the content generation backbone. VPS serves as the "brain" (n8n), but the "muscle" (GPU) must be rented externally. |
| What's possible TODAY | 4/10 | Can design n8n sub-workflows and document the architecture. Cannot generate content without RunPod setup. |
| **Overall Feasibility** | **5/10** | This is an enabling infrastructure, not a revenue generator itself. Requires RunPod account setup ($12+ initial credits) and significant workflow development time. |

**Can build today**: n8n sub-workflow templates (pod manager, wake/sleep logic), architecture documentation, cost calculators
**Needs setup**: RunPod account + credits, ComfyUI deployment, model downloads to Network Volume, IP rotation logic

---

### 4. Personal Brand Monetization Partner
| Dimension | Score | Notes |
|-----------|-------|-------|
| Available tools | 8/10 | Claude Code can build affiliate sites, landing pages, product pages. n8n can automate content. Python for scripting. |
| Missing dependencies | 6/10 | No Node.js for frontend frameworks. No pip for Python web frameworks. But can generate static HTML/CSS/JS. |
| API access | 7/10 | Claude (via Claude Code) handles all content generation. OpenRouter in n8n for automated content. Affiliate program APIs vary by partner. |
| Infrastructure fit | 6/10 | Can build static sites. Tailscale limits hosting — need Netlify/Vercel/GitHub Pages for deployment (free). n8n can automate content updates. |
| What's possible TODAY | 7/10 | Can build complete affiliate site with Claude Code (HTML/CSS/JS), create content strategy, design n8n content pipelines, set up tracking. |
| **Overall Feasibility** | **7/10** | Highest buildability. Claude Code IS the competitive advantage — can rapidly prototype affiliate sites, landing pages, and content for partners. Main constraint: finding personal brand partners (sales/outreach, not tech). |

**Can build today**: Full static affiliate site (HTML/CSS/JS), content templates, n8n content automation workflows, pitch decks, partnership agreement templates
**Needs setup**: Hosting (free via Netlify/GitHub Pages), affiliate program signups, partner outreach, domain purchase for each project

---

### 5. High-Ticket/Recurring Affiliate Machine (Free Methods)
| Dimension | Score | Notes |
|-----------|-------|-------|
| Available tools | 8/10 | Claude Code for content creation, n8n for automation, Python for scripting |
| Missing dependencies | 5/10 | No pip limits some automation. No browser automation for posting. |
| API access | 7/10 | OpenRouter for content generation. Reddit/Medium/Quora are free platforms — no API needed for manual posting. n8n can automate some posting via APIs. |
| Infrastructure fit | 7/10 | Content creation is the core activity — this VPS handles it well. Free methods = no infrastructure costs. |
| What's possible TODAY | 8/10 | Can start generating SEO-optimized content with Claude immediately. Can research affiliate programs. Can build content calendar and templates. Can write and manually post to Reddit/Medium/Quora TODAY. |
| **Overall Feasibility** | **8/10** | Highest overall score. Zero upfront costs (free platforms). Claude Code generates high-quality content instantly. Main work is content strategy + consistent execution. Revenue timeline depends on organic traffic growth. |

**Can build today**: Content generation system, keyword research tools, affiliate program database, posting templates, content calendar, n8n scheduling workflows
**Needs setup**: Medium/Reddit/Quora accounts, affiliate program approvals, consistent posting schedule, tracking/analytics

---

## Summary Rankings

| Rank | Idea | Feasibility | Key Advantage | Key Blocker |
|------|------|-------------|---------------|-------------|
| 1 | High-Ticket/Recurring Affiliate Machine | **8/10** | Zero cost, start TODAY with Claude content | Slow organic traffic ramp (weeks-months) |
| 2 | Personal Brand Monetization Partner | **7/10** | Claude builds sites fast, high-value partnerships | Need to find partners (sales challenge) |
| 3 | Digital Asset Landlord | **6/10** | Proven marketplace model with data | No pip, no upload automation, API-dependent |
| 4 | Optic Stage | **6/10** | Image APIs already in n8n, real demand | Cold email infrastructure costs ~$300/mo |
| 5 | Infinite AI Content Studio | **5/10** | Enables everything else | It's infrastructure, not revenue. Needs RunPod. |
