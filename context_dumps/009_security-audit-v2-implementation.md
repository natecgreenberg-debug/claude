# Context Dump — 2026-03-07
## Session: Security audit v2 implementation

### What We Did
1. Implemented 18 fixes from a 3-agent security audit (25 findings, 7 cut)
2. Added `tools: Read, Grep, Glob, Bash` restriction to code-reviewer agent (H4)
3. Removed 4 overlapping deny rules from `~/.claude/settings.json` (hook handles it now)
4. Restructured `deny-commands.sh` with tiered deny/ask logic (C1, C2, H1, M2, M4):
   - DENY (hard block) for dangerous rm targeting /, ~, ., ..
   - ASK (prompt) for mutating apt, subshell/eval, command substitution, long rm flags
   - Narrowed apt to mutating commands only — read-only apt (list, show, search) now allowed
5. Created test harness (`tools/test-hook-patterns.sh` + `tools/test-hook-cases.txt`) — 30 cases, all passing
6. Applied 9 fixes to autonomous skill (H4-H7, M5-M9, L6): proactive checkpoints, disk-read on start, starting commit hash, MEMORY.md exception, file scope constraints, skip>create>modify>never-delete priority
7. Applied 2 fixes to research skill (C3, H6): --no-prompt flag, reordered Step 5 for existing file check
8. Applied 1 fix to winddown skill (M1): staging safety check for sensitive file patterns
9. Fixed claude.md to suggest /compact instead of auto-compacting (L3)
10. Updated MEMORY.md with audit v2 status

### What Went Right
- Clean implementation — all 18 fixes applied in 4 git commits + 1 settings edit
- Hook regex needed two iterations (false positive on `/root/...` paths, trailing slash on `~/`) but caught and fixed immediately via test harness
- Test harness proved its value — caught both regex bugs before committing
- All verification steps passed: 30/30 hook tests, read-only apt allowed, all files clean

### What Went Wrong / Needs Improvement
- Initial regex for dangerous rm matched `/root/projects/Agent/tmp` as a false positive — the `/` alternative in the target group was too greedy. Fixed by requiring terminal token `([\s;|&]|$)` after target path.
- Second regex issue: `~/` (with trailing slash) wasn't caught because `~` required exact match. Fixed by adding `~/?` (optional trailing slash).
- Both bugs would have been caught by the test harness if the harness had existed before the first commit — reinforces the value of test-first approach.

### Pending / Next Session
- Nate plans to start an autonomous run (run 002) — topic not yet decided
- `/research` skill: WebSearch/WebFetch permission prompts for sub-agents still unverified
- MCP servers: researched but no install decision made
- Untracked `business context/` directory exists — may need attention

### Git State
- Branch: `main`
- Latest commits (newest first):
  - `5c69a38` docs: fix claude.md — suggest /compact instead of auto-compacting (L3)
  - `98042e6` fix: apply 12 audit fixes to skills (H4-H7,M1,M5-M9,L6,C3,H6)
  - `37b3dcd` fix: harden deny-commands.sh — tiered deny/ask, new bypass rules (C1,C2,H1,M2,M4)
  - `99d80db` fix: restrict code-reviewer agent to read-only tools (H4)
- Uncommitted changes: yes — untracked `business context/` directory

### Files Modified This Session
| File | Action |
|------|--------|
| `.claude/agents/code-reviewer.md` | Modified — added tools restriction |
| `~/.claude/settings.json` | Modified — removed 4 deny rules (not in git) |
| `.claude/hooks/deny-commands.sh` | Modified — tiered deny/ask + new rules |
| `tools/test-hook-patterns.sh` | Created — hook test harness |
| `tools/test-hook-cases.txt` | Created — 30 test cases |
| `.claude/skills/autonomous/SKILL.md` | Modified — 9 audit fixes |
| `.claude/skills/research/SKILL.md` | Modified — 2 audit fixes |
| `.claude/skills/winddown/SKILL.md` | Modified — 1 audit fix |
| `.claude/claude.md` | Modified — /compact suggestion |

### Key Decisions / Preferences Learned
- Nate confirmed tmux is the right approach for overnight autonomous runs (SSH session protection on VPS)
- `/startsession` is not needed before `/autonomous` — autonomous has its own Phase 1
- `/winddown` and `/startsession` are for general work sessions, not autonomous runs
- Nate prefers not adding operational notes (like "use tmux") to claude.md — that's his side, not the agent's
