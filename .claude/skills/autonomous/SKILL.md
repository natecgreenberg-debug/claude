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
3. Ask all your clarifying questions in a single round — cover everything you need to be 99% confident on:
   - Scope (what's in, what's out)
   - Requirements (specific behaviors, formats, constraints)
   - Success criteria (how to know each task is done)
4. After Nate answers, produce the plan (Phase 2). Nate iterates on the *plan*, not the questions. He controls how many revision rounds happen by approving or requesting changes.
5. Do NOT proceed to planning until you're confident

## Phase 2: Plan (interactive)

1. Write a detailed execution plan covering:
   - **Numbered task list** with clear deliverables per task
   - **Files to create/modify** for each task
   - **Dependencies** between tasks (what must happen in order)
   - **Known blockers** that will need human action (flagged early so Nate can unblock before leaving)
   - **Success criteria** for each task
2. Use `AskUserQuestion` to present the plan with these explicit options:
   - **"Approve — start execution"**
   - **"Revise — let's do another round"**
3. Iterate on the plan if Nate chooses "Revise" — no limit on revision rounds
4. Do NOT begin execution until Nate explicitly approves

## Phase 3: Prepare (automatic — after approval)

### 3a: Determine Run Number and Create Subfolder

Scan `~/projects/Agent/autonomous_runs/` for existing numbered subfolders. Subfolders follow the pattern `{NNN}_{slug}/` (e.g., `001_research-skill/`, `002_auth-module/`).

- Find the highest `NNN` prefix across all subfolders
- Increment by 1 for the new run
- Pad to 3 digits (e.g., `003`)
- Create a subfolder: `{NNN}_{slugified-description}/` (e.g., `003_deploy-pipeline/`)

If no subfolders exist, start at `001`.

### 3b: Save the Plan

Write the approved plan to `~/projects/Agent/autonomous_runs/{NNN}_{slug}/plan.md` with this format:

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
2. If `/compact` does not execute or context remains high afterward, write the progress checkpoint and continue working. Do not retry or loop on compaction.
3. After compacting, read back `~/projects/Agent/autonomous_runs/{NNN}_{slug}/plan.md` to reload the execution plan
4. Enter autonomous execution mode

## Phase 4: Execute (autonomous — Nate is AFK)

### Work Rules

- Execute tasks from the plan in order, respecting dependency chains
- Commit after each meaningful chunk of work
- Push after every commit — push approval is implicitly granted by the approved plan
- Follow all existing project rules (workflow.md, code-style.md)
- The Phase 2 plan approval serves as blanket approval for all tasks in the plan. Do not pause for per-task approval — the approval rule in workflow.md is satisfied by Phase 2.
- Use sub-agents for expensive operations (research, code review)
- When spawning sub-agents, include the autonomy guardrails in their brief so they also avoid `~/.claude/`, `apt`, `rm -rf`, and external services

### Autonomy Guardrails

These rules prevent triggering permission prompts that would block unattended execution:

**Never access `~/.claude/` directly:**
- Do NOT read, edit, grep, or glob inside `~/.claude/`
- Unsafe examples: `grep -r ... /root/`, `find /root/ ...`, reading or globbing inside `~/.claude/`
- Safe examples: searching within `/root/projects/Agent/`, using Grep/Glob tools scoped to the project directory
- If you need config info, check project memory files instead

**Never run hook-triggering commands:**
- No `apt` or `apt-get` (any subcommand)
- Never use `rm -rf` during autonomous runs. Use targeted `rm` on specific files when needed.
- If a package install is needed, log it as a human action item and skip

**Plan decisions override sub-skill prompts:**
- When executing an approved plan, decisions already specified in the plan take precedence over interactive prompts in sub-skills (e.g., if the plan says "overwrite", do not ask the user whether to overwrite or append)
- Only pause for genuinely unexpected situations not covered by the plan

**Never do things that need human judgment:**
- Do NOT create or comment on GitHub issues/PRs
- Do NOT send messages to external services (Slack, email, webhooks)
- Do NOT delete files outside the project directory
- Do NOT modify system configuration files (`/etc/`, systemd units, cron)

**When stuck:**
- Do NOT retry the same failing action in a loop
- Do NOT brute-force past permission prompts
- Log what you were trying to do and why it failed
- Skip to the next task and note the issue for the completion report

### Context Management

- Monitor context usage throughout execution
- Write a checkpoint when you receive system warnings about context limits OR notice message compression happening. As a safety net, also checkpoint at least every 3 tasks. Always leave enough room to write a useful checkpoint.
- Steps when checkpointing:
  1. Write a progress checkpoint to `~/projects/Agent/autonomous_runs/{NNN}_{slug}/progress.md`
  2. Use `/compact` to clear context
  3. If `/compact` does not execute or context remains high afterward, write the progress checkpoint and continue working. Do not retry or loop on compaction.
  4. After compacting, read back both `plan.md` and `progress.md` from the run subfolder to reload state
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

1. Write a completion report to `~/projects/Agent/autonomous_runs/{NNN}_{slug}/completion.md`:

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
Saved to: `autonomous_runs/{NNN}_{slug}/completion.md`

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

## Changelog
- **2026-03-05**: Initial version
- **2026-03-05**: Review fixes — compact fallback, checkpoint heuristic, guardrail tightening, subfolder structure, AskUserQuestion for approval
- **2026-03-05**: Added "plan decisions override sub-skill prompts" guardrail to prevent unnecessary user prompts during autonomous execution
