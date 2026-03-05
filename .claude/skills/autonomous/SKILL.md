---
name: autonomous
description: Kick off a long, unattended work session. Brain-dump what to build, get a plan approved, then walk away — execution runs fully autonomously.
argument-hint: "[brain dump of what to work on]"
---

# Autonomous Work Session

You have been invoked as `/autonomous`. Your job is to understand what Nate wants built, create a detailed plan, get approval, then execute the entire plan autonomously while Nate is AFK.

---

## Phase 1: Understand (interactive)

1. Parse `$ARGUMENTS` as the initial brain dump / task description
2. If files are referenced, read them for additional context
3. Ask clarifying questions until you are 99% confident on:
   - Scope (what's in, what's out)
   - Requirements (specific behaviors, formats, constraints)
   - Success criteria (how to know each task is done)
4. No limit on Q&A rounds — keep asking until clear
5. Do NOT proceed to planning until you're confident

## Phase 2: Plan (interactive)

1. Write a detailed execution plan covering:
   - **Numbered task list** with clear deliverables per task
   - **Files to create/modify** for each task
   - **Dependencies** between tasks (what must happen in order)
   - **Known blockers** that will need human action (flagged early so Nate can unblock before leaving)
   - **Success criteria** for each task
2. Present the plan to Nate for review
3. Iterate on the plan if Nate wants changes — no limit on revision rounds
4. Wait for explicit approval (e.g., "go", "approved", "do it", "ship it")
5. Do NOT begin execution until approval is given

## Phase 3: Prepare (automatic — after approval)

### 3a: Determine Run Number

Scan `~/projects/Agent/autonomous_runs/` for existing files. Files follow the pattern `{NNN}_*.md` (e.g., `001_plan.md`, `002_completion.md`).

- Find the highest `NNN` prefix across all files
- Increment by 1 for the new run
- Pad to 3 digits (e.g., `003`)

If no files exist, start at `001`.

### 3b: Save the Plan

Write the approved plan to `~/projects/Agent/autonomous_runs/{NNN}_plan.md` with this format:

```markdown
# Autonomous Run {NNN} — Plan
**Date**: {YYYY-MM-DD}
**Description**: {one-line summary from brain dump}

## Tasks

### Task 1: {title}
- **Deliverable**: {what this task produces}
- **Files**: {files to create/modify}
- **Depends on**: {task numbers, or "none"}
- **Success criteria**: {how to verify completion}

### Task 2: {title}
...

## Known Blockers
- {things that need human action, or "None identified"}

## Autonomy Rules
This run follows the embedded guardrails in the /autonomous skill.
```

### 3c: Compact and Reload

1. Use `/compact` to clear context
2. After compacting, read back `~/projects/Agent/autonomous_runs/{NNN}_plan.md` to reload the execution plan
3. Enter autonomous execution mode

## Phase 4: Execute (autonomous — Nate is AFK)

### Work Rules

- Execute tasks from the plan in order, respecting dependency chains
- Commit after each meaningful chunk of work
- Push after every commit
- Follow all existing project rules (workflow.md, code-style.md)
- Use sub-agents for expensive operations (research, code review)

### Autonomy Guardrails

These rules prevent triggering permission prompts that would block unattended execution:

**Never access `~/.claude/` directly:**
- Do NOT read, edit, grep, or glob inside `~/.claude/`
- Do NOT search `/root` recursively (it will hit `~/.claude/` files)
- If you need config info, check project memory files instead

**Never run hook-triggering commands:**
- No `apt` or `apt-get` (any subcommand)
- No `rm -rf /` or `rm -rf ~/` (any path starting with `/` or `~`)
- If a package or dangerous deletion is needed, log it as a human action item and skip

**Never do things that need human judgment:**
- Do NOT create or comment on GitHub issues/PRs
- Do NOT send messages to external services (Slack, email, webhooks)
- Do NOT delete files outside the project directory
- Do NOT modify system configuration files (`/etc/`, systemd units, cron)
- Push approval IS implicitly granted by the approved plan — committing and pushing your work is expected

**When stuck:**
- Do NOT retry the same failing action in a loop
- Do NOT brute-force past permission prompts
- Log what you were trying to do and why it failed
- Skip to the next task and note the issue for the completion report

### Context Management

- Monitor context usage throughout execution
- When context gets high (before it becomes critical):
  1. Write a progress checkpoint to `~/projects/Agent/autonomous_runs/{NNN}_progress.md`
  2. Use `/compact` to clear context
  3. After compacting, read back both `{NNN}_plan.md` and `{NNN}_progress.md` to reload state
- Always leave enough context to write a useful checkpoint before compacting
- The progress file is append-only — add new sections on each checkpoint, don't overwrite

Progress checkpoint format:

```markdown
# Autonomous Run {NNN} — Progress

## Checkpoint {timestamp}
- **Tasks completed**: {list task numbers and brief status}
- **Current task**: {task number and what's been done so far}
- **Tasks remaining**: {list task numbers}
- **Issues encountered**: {any problems and how they were handled}
- **Files modified since last checkpoint**: {list}
```

### Git Strategy

- Commit early and often with descriptive messages
- Push after every commit — never leave unpushed commits
- Use `type: description` format (e.g., `feat: add user auth module`, `fix: handle empty response`)

## Phase 5: Complete (autonomous — produces report)

When all tasks are done or no more progress can be made:

1. Write a completion report to `~/projects/Agent/autonomous_runs/{NNN}_completion.md`:

```markdown
# Autonomous Run {NNN} — Completion Report
**Date**: {YYYY-MM-DD}
**Description**: {one-line summary}

## Summary
{2-3 sentences on what was accomplished at a high level.}

## Task Results

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | {title} | Pass/Fail/Skipped | {brief note} |
| 2 | {title} | Pass/Fail/Skipped | {brief note} |

## What Was Built
| File | Action | Description |
|------|--------|-------------|
| `path/to/file` | Created/Modified/Deleted | {what it does} |

## Human Action Required
- [ ] {thing Nate needs to do manually — package installs, config reviews, external service setup, etc.}
- [ ] {or "None — everything was handled autonomously"}

## Issues Encountered
- {problem}: {how it was resolved, or why it couldn't be}

## Git Log
{output of `git log --oneline -N` covering this run's commits}
```

2. Commit and push the completion report
3. Print a summary in chat:

```
## Autonomous Run {NNN} Complete
**Status**: {all passed / N of M tasks completed}
Saved to: `autonomous_runs/{NNN}_completion.md`

**What was built:**
- {top 3-5 bullets}

**Human action needed:**
- {checklist items, or "None"}
```

## Rules

- ALWAYS complete Phase 1 and 2 interactively — never skip straight to execution
- ALWAYS wait for explicit approval before executing
- ALWAYS save the plan before starting execution
- ALWAYS compact and reload from saved files before executing (clean context = better execution)
- ALWAYS commit and push after each meaningful chunk
- ALWAYS produce a completion report, even if all tasks failed
- NEVER trigger permission prompts that would block unattended execution
- NEVER loop on failures — log and move on
- NEVER skip the progress checkpoint when context is getting high
- Use 3-digit zero-padded run numbers (001, 002, etc.)
- Use today's actual date in all files
