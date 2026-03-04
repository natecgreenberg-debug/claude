---
name: context
description: Automates session wind-down — gathers git state, conversation context, and writes a structured context dump. Commits and pushes automatically.
argument-hint: "[session description]"
---

# Context Dump Skill

You have been invoked as `/context`. Your job is to create a structured context dump capturing the current session's work, commit it, and push to GitHub so the next agent can pick up seamlessly.

## Step 1: Get Session Description

- If `$ARGUMENTS` is provided and non-empty, use it as the session description
- If no arguments, ask the user: "What should I call this session? (brief description)"

## Step 2: Determine File Number

Scan `~/projects/Agent/context_dumps/` for existing files. Files follow the pattern `{NNN}_{slug}.md` (e.g., `001_workspace_setup.md`, `002_research_skill_v2.md`).

- Find the highest `NNN` prefix
- Increment by 1 for the new file
- Pad to 3 digits (e.g., `003`)

Slugify the session description: lowercase, replace spaces with hyphens, remove special characters, truncate to ~50 chars.

New filename: `{NNN}_{slug}.md`

## Step 3: Gather Context

Collect the following automatically using shell commands:

1. **Git log**: Run `git log --oneline -20` to get recent commits
2. **Git diff stat**: Run `git diff --stat` for uncommitted changes
3. **Git status**: Run `git status --short` for untracked/modified files
4. **Current branch**: Run `git branch --show-current`
5. **Files modified**: Run `git diff --name-status HEAD~10` (or fewer if less than 10 commits exist) to identify files changed this session

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

## Step 5: Auto-Commit and Push

1. Stage the new context dump file: `git add context_dumps/{filename}`
2. Also stage any other uncommitted changes: review `git status` and stage relevant files (skip `.env` and secrets)
3. Commit with message: `docs: context dump {NNN} — {slug}`
4. Push to GitHub: `git push`

## Step 6: Print Confirmation

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
