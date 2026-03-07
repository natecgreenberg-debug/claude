---
name: winddown
description: Automates session wind-down — gathers git state, conversation context, writes a structured context dump and handoff file for the next session. Commits and pushes automatically.
argument-hint: "[session description]"
---

# Winddown Skill

You have been invoked as `/winddown`. Your job is to create a structured context dump and handoff file capturing the current session's work, commit them, and push to GitHub so the next agent can pick up seamlessly.

## Step 1: Get Session Description

- If `$ARGUMENTS` is provided and non-empty, use it as the session description
- If no arguments, ask the user: "What should I call this session? (brief description)"

## Step 2: Determine File Number

Scan `~/projects/Agent/context_dumps/` for existing files. Files follow the pattern `{NNN}_{slug}.md` (e.g., `001_workspace_setup.md`, `002_research_skill_v2.md`).

- Find the highest `NNN` prefix
- Increment by 1 for the new file
- Pad to 3 digits (e.g., `003`)

Slugify the session description: lowercase, replace spaces with hyphens, remove special characters, truncate to 50 characters, breaking at the last hyphen before the limit.

New filename: `{NNN}_{slug}.md`

## Step 3: Gather Context

Collect the following automatically using shell commands:

1. **Git log**: Run `git log --oneline -20` to get recent commits
2. **Git status**: Run `git status --short` for untracked/modified files
3. **Current branch**: Run `git branch --show-current`
4. **Files modified**: First run `git rev-list --count HEAD` to get total commit count, then run `git diff --name-status HEAD~N` where N is the minimum of (total commit count - 1) and 10. If only 1 commit exists, use `git diff --name-status --root HEAD` instead.

Then review the current conversation to extract:
- What was accomplished this session
- Key decisions made
- What went well
- What went wrong or needs improvement
- What's pending for next session
- Any user preferences or corrections learned

## Step 4: Write Context Dump

Write the file to `~/projects/Agent/context_dumps/{NNN}_{slug}.md` using this template:

```markdown
# Context Dump — {YYYY-MM-DD}
## Session: {session description}

### What We Did
[Numbered list of accomplishments from git history + conversation context]

### What Went Right
[Bullet points — what worked well this session]

### What Went Wrong / Needs Improvement
[Bullet points — honest assessment of issues, failures, friction points]

### Pending / Next Session
[Bullet points — what the next agent should pick up, open questions, next steps]

### Git State
- Branch: `{branch}`
- Latest commits (newest first):
  - `{hash}` {message}
  - ...
- Uncommitted changes: {yes/no + summary if yes}

### Files Modified This Session
| File | Action |
|------|--------|
| `path/to/file` | Created / Modified / Deleted |
| ... | ... |

### Key Decisions / Preferences Learned
[Bullet points — anything the next agent should know about user preferences, architectural decisions, or corrections made during this session]
```

## Step 5: Generate Handoff File

Create a handoff file for the next session's `/startsession` skill.

1. **Detect restart-dependent changes** by checking `git diff --name-only HEAD`, `git status --short`, AND `git diff --name-only HEAD~10` (to catch already-committed session changes; use fewer if <10 commits exist) for files in:
   - `.claude/skills/` (new or modified skills)
   - `.claude/hooks/` (new or modified hooks)
   - `.claude/claude.md`, `.claude/rules/`, `.claude/settings.local.json` (config changes)

2. **Gather from conversation**: what's in progress, open questions, most relevant files

3. **Write to `~/projects/Agent/handoff.md`** (overwrite if exists) using this template:

```markdown
# Session Handoff
**Generated**: {YYYY-MM-DD HH:MM}
**Previous session**: {context dump filename}

## Restart-Dependent Items
- [ ] **New skill**: `.claude/skills/foo/SKILL.md` — test with `/foo` to confirm discovery
- [ ] **Hook modified**: `.claude/hooks/deny-commands.sh` — verify with test command
(or "None" if nothing detected)

## What Was In Progress
- {1-3 bullets of pending work}

## Open Questions
- {Unresolved decisions, or "None"}

## Quick Orientation
- `path/to/file` — why it's relevant
```

## Step 6: Update MEMORY.md

Read `~/.claude/projects/-root-projects-Agent/memory/MEMORY.md` and check whether this session produced any durable learnings that should be persisted. Update the file if needed.

**What counts as a durable learning (save it):**
- New or changed user preferences / workflow corrections
- Tool or skill status changes (tested, broken, fixed, new capabilities)
- Architectural decisions or project structure changes
- Solutions to problems that will recur
- New backlogs, important file pointers, or project state the next session needs

**What does NOT belong in MEMORY.md (skip it):**
- Session-specific details already captured in the context dump
- Temporary task status or in-progress work
- Anything that duplicates what's already in MEMORY.md
- Speculative conclusions from a single observation

**How to update:**
- Read the current MEMORY.md first
- Update existing sections rather than adding new ones when possible
- Keep it concise — MEMORY.md is always loaded into context, so every line costs tokens
- If nothing new needs saving, skip this step entirely

## Step 7: Auto-Commit and Push

Two separate commits if there are uncommitted changes:

1. **First commit (if needed)**: Check `git status` for uncommitted changes. If any exist:
   - Stage with `cd ~/projects/Agent && git add -A` (`.gitignore` handles exclusions — verify `.env` is gitignored)
   - Commit with message: `wip: uncommitted changes before context dump {NNN}`
2. **Second commit**: Stage the new context dump file and handoff file:
   - `cd ~/projects/Agent && git add context_dumps/{filename} handoff.md`
   - `cd ~/projects/Agent && git commit -m "docs: context dump {NNN} — {slug}"`
3. **Push**: `cd ~/projects/Agent && git push`

## Step 8: Print Confirmation

Print a summary in chat:

```
## Context Dump Saved
- **File**: `context_dumps/{filename}`
- **Session**: {description}
- **Committed**: {commit hash}
- **Pushed**: Yes

**Quick summary**: {2-3 sentence recap of the session}
```

## Rules

- Always be honest in "What Went Wrong" — no cheerleading
- Include ALL files modified, not just the ones you remember
- Git log and diff are the source of truth for what happened
- If git push fails, report the error — don't silently skip it
- The context dump should be detailed enough that a fresh agent with zero prior context can understand what happened and what to do next
- Never commit `.env` or gitignored files
- Use today's actual date
- 3-digit zero-padded numbers (001, 002, etc.)
- Always push after committing — never leave unpushed commits at the end of the skill.

## Changelog

- **2026-03-04**: Updated commit strategy from single commit to two-commit approach — uncommitted work gets its own `wip:` commit before the `docs:` context dump commit. Rationale: keeps real work and session bookkeeping separate in git history.
- **2026-03-04**: Renamed from `/context` to `/winddown` — `/context` collides with a built-in Claude Code command that visualizes context usage. Hyphenated name `/wind-down` also failed ("unknown skill"), so went with no hyphen.
- **2026-03-05**: Added Step 5 (Generate Handoff File) — writes `handoff.md` for `/startsession` to consume. Flags restart-dependent changes (new skills, hooks, config). Old Steps 5-6 became Steps 6-7.
- **2026-03-05**: Added Step 6 (Update MEMORY.md) — persists durable learnings (preferences, skill status, architecture decisions) so they survive across sessions. Old Steps 6-7 became Steps 7-8.
