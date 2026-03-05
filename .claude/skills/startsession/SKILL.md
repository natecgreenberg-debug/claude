---
name: startsession
description: Session initialization — reads handoff from previous session, runs sanity checks, orients on project state, and asks clarifying questions.
argument-hint: ""
---

# Start Session Skill

You have been invoked as `/startsession`. Your job is to get oriented on the current project state, process any handoff from the previous session, and ask smart questions so the user can hit the ground running.

## Step 1: Check for Handoff

- If `~/projects/Agent/handoff.md` exists, read it and note its contents
- If it does not exist, note "No handoff file found" and proceed — this just means the previous session didn't use `/winddown` or this is a fresh start

## Step 2: Read Latest Context Dump

- Find the highest-numbered file in `~/projects/Agent/context_dumps/` (files follow `{NNN}_{slug}.md` pattern)
- Read it to understand: what happened last session, what's pending, key decisions made
- If no context dumps exist, skip this step

## Step 3: Quick Sanity Check

Run these commands and note anything unexpected:

1. `git status --short` — flag any unexpected uncommitted changes
2. `git log --oneline -5` — confirm recent history looks right
3. Quick glance at `/var/log/auth.log` for failed login attempts — skip silently if not readable (don't error out)

## Step 4: Orient

Quick-scan these project files to refresh on conventions and current state:

- `.claude/claude.md` — project brain
- `.claude/rules/workflow.md` — workflow conventions
- `.claude/rules/code-style.md` — code standards
- Check MEMORY.md for any recent updates

Do NOT dump the contents of these files into chat. Just internalize them.

## Step 5: Process Restart-Dependent Items

If the handoff file listed restart-dependent items, verify each one:

- **New skills**: Verify the SKILL.md file exists and has valid frontmatter. Tell Nate to try invoking it to confirm discovery.
- **Modified hooks**: Verify the file exists and is executable (`ls -la`). Suggest a safe test command.
- **Config changes**: Confirm the file is readable and note what changed.
- If no restart-dependent items (or no handoff), skip this step.

## Step 6: Delete Handoff File

If `~/projects/Agent/handoff.md` existed:

1. `rm ~/projects/Agent/handoff.md`
2. `git add handoff.md` (stages the deletion)
3. Commit: `chore: consume session handoff`
4. `git push`

If no handoff file existed, skip this step entirely.

## Step 7: Print Summary & Ask Questions

Print a structured summary:

```
## Session Start
- **Last session**: {brief description from context dump, or "Unknown"}
- **Restart items**: {status of each, or "None"}
- **Git state**: {branch, clean/dirty, last commit}
- **Pending work**: {bullets from context dump / handoff, or "None identified"}
```

Then ask at least one clarifying question about what Nate wants to focus on this session. If the handoff or context dump had open questions, reference them.

## Rules

- Be fast — this is a startup routine, not a deep dive. Don't spend time on lengthy analysis.
- Don't dump walls of text. Keep the summary tight.
- If anything looks wrong (unexpected files, failed push, suspicious auth logs), flag it clearly.
- The handoff file is ephemeral — always delete it after processing so it doesn't get stale.
- If git push fails during handoff deletion, report the error but continue with the session.
