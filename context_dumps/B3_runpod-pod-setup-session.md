# Context Dump — 2026-03-16
## Session: runpod-pod-setup-session

### What We Did
1. Implemented pod lifecycle automation (`pod_manager.py`, `run_batch.py`, `requirements.txt`) — handles start/stop of RunPod pods, injects live URLs as env vars into `generate_video.py` subprocess
2. Updated `YOUR_TODO.md` step 4 to reflect pod template approach (not serverless)
3. Updated `chatterbox_setup.md` and `infiniteTalk_setup.md` with pod template creation steps
4. Built file upload server (`tools/upload-server/server.js`) on port 9999 — Nate drags files to `http://100.114.8.49:9999`, they land in `/tmp/uploads/`, I read them with the Read tool
5. Installed upload server as a systemd service (auto-starts on reboot)
6. Attempted to deploy `runpodinc/chatterbox-turbo` as a pod — failed because it's a serverless worker, not a REST API
7. Researched correct Docker images — found `travisvn/chatterbox-tts-api:latest` and `ghcr.io/remsky/kokoro-fastapi-gpu:latest` as pod-deployable REST APIs; confirmed InfiniteTalk is also serverless-only
8. Decided on **Kokoro + MuseTalk** stack (Kokoro has built-in voice IDs, no cloning needed; MuseTalk is the only pod-deployable lipsync option)
9. Added RunPod API key to `.env` — I can now manage pods programmatically
10. Set up Python venv at `projects/ai-influencer/infrastructure/pipeline/.venv` with runpod + python-dotenv installed

### What Went Right
- Pod lifecycle automation code is solid and correct
- Upload server works great via Tailscale — major friction reducer for future sessions
- Research correctly identified the serverless vs REST API distinction before wasting more credits
- Discovered I can SSH into pods directly from VPS once API key is in .env

### What Went Wrong / Needs Improvement
- Deployed wrong Docker image (`runpodinc/chatterbox-turbo`) without verifying it was a REST API first — wasted ~$0.50 in credits and 45 min
- Should have verified image type before recommending pod-based deployment
- Didn't identify Tailscale network earlier — wasted time on public IP / SSH tunnel confusion
- `generate_video.py` API calls are wrong for the actual images (uses `/synthesize`, `text` field — needs to be updated for Kokoro and MuseTalk APIs)
- InfiniteTalk is also serverless-only — another assumption that was wrong

### Pending / Next Session
- **Deploy Kokoro pod** — `ghcr.io/remsky/kokoro-fastapi-gpu:latest`, port 8880, I drive this via RunPod API + SSH
- **Deploy MuseTalk pod** — `ruxir-ig/MuseTalk-API`, port 8000, requires one-time Docker build step (no pre-built image)
- **Update `generate_video.py`** — fix API calls for Kokoro (`POST /v1/audio/speech`, OpenAI-compatible) and MuseTalk (`POST /generate`, multipart)
- **Update `pod_manager.py`** — change ports (Kokoro: 8880, MuseTalk: 8000) and GPU requirements
- **Save pod templates** — Nate clicks "Save as Template" once per pod after I verify they work; I note template IDs and add to `.env`
- **Run first test video** — `python run_batch.py --script-text "Hello, I'm Kate." --face test.png`
- **Rotate RunPod API key** — Nate typed it in chat (still valid but worth rotating)

### Git State
- Branch: `main`
- Latest commits:
  - `df86d8f` research: RunPod pod REST API Docker images for TTS and lip-sync
  - `cdb4d92` feat: add file upload server on port 9999
  - `cc5f3bf` feat: add pod lifecycle automation (pod_manager + run_batch)
  - `c94810d` feat: add Kokoro as fast preview TTS
  - `9d16145` research: RunPod serverless worker GitHub repos
- Uncommitted changes: none

### Files Modified This Session
| File | Action |
|------|--------|
| `projects/ai-influencer/infrastructure/pipeline/pod_manager.py` | Created |
| `projects/ai-influencer/infrastructure/pipeline/run_batch.py` | Created |
| `projects/ai-influencer/infrastructure/pipeline/requirements.txt` | Created |
| `projects/ai-influencer/YOUR_TODO.md` | Modified |
| `projects/ai-influencer/infrastructure/runpod/chatterbox_setup.md` | Modified |
| `projects/ai-influencer/infrastructure/runpod/infiniteTalk_setup.md` | Modified |
| `projects/ai-influencer/infrastructure/runpod/kokoro_setup.md` | Created |
| `research/2026-03-16_runpod-pod-rest-api-tts-lipsync-docker-images.md` | Created |
| `tools/upload-server/server.js` | Created |

### Key Decisions / Preferences Learned
- **Tailscale is the network** — VPS is not publicly accessible. All browser access uses `http://100.114.8.49:[port]`. Never give Nate the public IP.
- **Upload server** — `http://100.114.8.49:9999`, files land in `/tmp/uploads/`. Always check `/tmp/uploads/` when Nate might have uploaded a screenshot.
- **Final model stack: Kokoro (TTS) + MuseTalk (lipsync)** — Kokoro for consistent voice via voice ID, MuseTalk as the only pod-deployable lipsync REST API
- **I drive RunPod setup** — API key in `.env`, I create pods via SDK, SSH in from VPS, run commands, terminate when done. Nate only clicks "Save as Template" once per pod.
- **Verify Docker images are REST APIs before deploying** — check GitHub source for `handler.py` / `runpod.serverless.start` pattern which means serverless-only
- **generate_video.py needs updating** — current API calls are wrong for Kokoro and MuseTalk
- **MuseTalk requires a Docker build step** — no pre-built image on Docker Hub, need to build from `ruxir-ig/MuseTalk-API` repo and push to a registry first
