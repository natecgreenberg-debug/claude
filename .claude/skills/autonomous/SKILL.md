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
   - **Decision points**: Think through every step of execution and identify moments where a sub-skill, tool, or workflow would normally ask the user for input (e.g., overwrite vs append, which option to pick, how to handle an edge case). Also review any sub-skills the plan will invoke (e.g., `/research`) and identify their interactive prompts — pre-resolve each one. Ask about ALL of these upfront so every decision is pre-resolved before Nate leaves.
4. After Nate answers, produce the plan (Phase 2). Nate iterates on the *plan*, not the questions. He controls how many revision rounds happen by approving or requesting changes.
5. Do NOT proceed to planning until you're confident — especially that all decision points are resolved

## Phase 2: Plan (interactive)

1. Write a detailed execution plan covering:
   - **Numbered task list** with clear deliverables per task
   - **Files to create/modify** for each task
   - **Dependencies** between tasks (what must happen in order). Explicitly mark independent tasks with `Depends on: none` — these will be executed in parallel during Phase 4.
   - **Pre-resolved decisions**: Every decision point identified in Phase 1 must have an explicit answer in the plan (e.g., "If append mode triggers, overwrite." / "If tests fail, skip and log." / "Use option X, not Y."). These are binding during execution.
   - **Known blockers** that will need human action (flagged early so Nate can unblock before leaving)
   - **Success criteria** for each task
2. Use `AskUserQuestion` to present the plan with these explicit options (if `AskUserQuestion` is unavailable, present the plan in chat and ask Nate to reply with his choice):
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
- Create a subfolder: `{NNN}_{slug}/` (e.g., `003_deploy-pipeline/`)
- Slug format: lowercase, hyphens only (no spaces or special chars), max 30 characters

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

## Pre-resolved Decisions
- {decision point}: {resolution} (e.g., "If append mode triggers → overwrite")
- {decision point}: {resolution}

## Known Blockers
- {things that need human action, or "None identified"}

## Autonomy Rules
This run follows the embedded guardrails in the /autonomous skill.
```

### 3c: Prepare and Hand Off

1. Verify `plan.md` is saved and complete (including Pre-resolved Decisions section)
2. Write an initial entry to `progress.md`: "Phase 4 starting. Plan saved. Execution beginning with Task 1."
3. Print this exact message to Nate:
   ```
   Plan saved to: autonomous_runs/{NNN}_{slug}/plan.md

   Ready for autonomous execution. Say "go" to start.
   ```
4. **WAIT for Nate to respond.** Do not proceed until he confirms.
5. Enter autonomous execution mode — Nate is now AFK

## Phase 4: Execute (autonomous — Nate is AFK)

### Work Rules

- First action: read plan.md and progress.md from disk to ensure full context loaded
- Second action: record current commit hash (`git rev-parse HEAD`) in progress.md as starting point
- **HARD REQUIREMENT — progress.md before any agent launch**: Before spawning ANY sub-agents, the orchestrator MUST write a progress.md entry logging: (a) which agents are being launched, (b) their task IDs, (c) expected output files/deliverables. This entry acts as a manifest — if the orchestrator dies, Nate can see exactly what was in flight. Skipping this step is a bug, not an optimization.
- Execute tasks from the plan in order, respecting dependency chains
- Commit after each meaningful chunk of work
- Push after every commit — push approval is implicitly granted by the approved plan
- Follow all existing project rules (workflow.md, code-style.md)
- The Phase 2 plan approval serves as blanket approval for all tasks in the plan. Do not pause for per-task approval — the approval rule in workflow.md is satisfied by Phase 2.
- **Background orchestration**: When the user asks for work to run in the background, the entire execution pipeline (not just leaf-node agents) must run as a single background agent. The main thread stays free for conversation.
- Use sub-agents for expensive operations (research, code review)
- When a task relies on sub-agent output quality, run a single test agent first and evaluate output before launching the full batch. If quality is insufficient, improve the agent brief before proceeding.
- **Agent timeout protocol** (hard 10-minute max): Every background agent gets a 10-minute hard timeout. Poll with `TaskOutput` every 60 seconds. If an agent hasn't returned after 10 minutes, log it as `TIMED OUT` in progress.md and move on — do NOT retry. Early exit: if N-1 of N parallel agents are done and the straggler has run >5 minutes, move on without it. See `references/agent-timeout-protocol.md` for the full polling procedure.
- **Parallel task execution (process-as-they-arrive)**: When plan.md marks tasks as independent (`Depends on: none`), launch them in parallel via background sub-agents — don't run them sequentially. Each parallel agent gets its own progress.md entry and the same 10-minute timeout. **Do NOT passively wait for all agents to complete.** Instead, use active polling (`TaskOutput` every 60 seconds) and process results as they arrive:
  - As each agent returns: (a) immediately commit and push its output, (b) update progress.md with its completion status (PASS/FAIL/PARTIAL), (c) move on to processing the next returned agent
  - The orchestrator should be DOING work between agent completions (committing, updating progress, staging next steps) — never sitting idle
  - If N-1 of N agents are done and the straggler exceeds its 10-minute timeout, mark it `TIMED OUT` in progress.md with a structured error entry and proceed to the next phase
  - Only move to dependent tasks after all parallel agents have returned or timed out
- When spawning sub-agents, include these guardrails in their brief:
  - Do NOT search, read, or write inside `~/.claude/`
  - Always scope file searches to the project directory (`~/projects/Agent/`)
  - Do NOT run `apt`, `apt-get`, or `rm -rf`
  - Do NOT ask the user questions — follow the brief and return results
  - Do NOT access external services (GitHub API, Slack, etc.)
  - Note: Brief guardrails are advisory. For hard enforcement, define agents with restricted `tools` field in `.claude/agents/` (see code-reviewer.md). For autonomous workers, consider `permissionMode: dontAsk`.

### Autonomy Guardrails

These rules prevent triggering permission prompts that would block unattended execution:

**Never access `~/.claude/` — scope all searches to the project directory:**
- Do NOT read, edit, grep, or glob inside `~/.claude/`
- Never use `/root/` or `~/` as a search root — this scans into `~/.claude/` and triggers permission prompts
- ALWAYS scope searches to `~/projects/Agent/` or more specific subdirectories
- Unsafe: `grep -r "foo" /root/`, `find /root/ ...`, `Glob("**/*.md", path="/root/")`
- Safe: `grep -r "foo" ~/projects/Agent/`, `Glob("**/*.md", path="/root/projects/Agent/")`
- If you need config info, check project memory files in `~/projects/Agent/` instead
- Exception: `~/.claude/projects/-root-projects-Agent/memory/MEMORY.md` may be read/written during Phase 5 for durable learnings.

**Never run hook-triggering commands:**
- No `apt` or `apt-get` (any subcommand)
- Never use `rm -rf` during autonomous runs. Use targeted `rm` on specific files when needed.
- If a package install is needed, log it as a human action item and skip

**The approved plan is law — NEVER ask the user during execution:**
- When a sub-skill, tool, or workflow says "ask the user" or "prompt for input", DO NOT. The plan has already decided. Follow the pre-resolved decision from the plan.
- Examples: if the plan says "overwrite", overwrite without asking. If the plan says "use option X", use it. If the plan says "skip tests", skip them.
- If you hit a decision point that genuinely was NOT covered by the plan and cannot be reasonably inferred, log it in progress.md, follow this priority: skip > create new file > modify existing > never delete. Prefer no-ops over actions, and keep going. Do not stop execution.
- The entire point of Phases 1-2 is to front-load every decision. If you're tempted to ask during Phase 4, something went wrong in planning — but the answer is still to keep going, not to block.

**File and scope constraints:**
- ONLY create/modify files within `~/projects/Agent/`. Exception: MEMORY.md path above. System paths never modified.
- Never delete files in `.claude/` — modify in place, never delete and recreate.
- Do NOT create or comment on GitHub issues/PRs
- Do NOT send messages to external services (Slack, email, webhooks)

**Graceful degradation — when a sub-task or sub-agent fails:**
- Do NOT retry the same failing action in a loop — one attempt is enough
- Do NOT brute-force past permission prompts
- Do NOT stop to ask the user — push through as much as possible
- **Document the gap**: Log a structured error entry in progress.md (see Error Logging below), then continue
- Make the safest/most reversible choice and keep going
- Skip to the next task if truly blocked, and note the issue for the completion report
- Unresolved items are surfaced in the completion report under "Human Action Required" — not mid-run

**Error logging** — when a task fails, write this structured entry to progress.md:
```markdown
## Task {N}: {title} — FAIL
- **Completed**: {YYYY-MM-DD HH:MM EST}
- **Attempted**: {what you were trying to do}
- **Failed**: {what went wrong — error message, permission denied, timeout, etc.}
- **Impact**: {what output is missing because of this failure}
- **Manual retry**: {enough context for Nate to retry manually — command, file, API, etc.}
```
The completion report must include a **"Failed Tasks"** section with this same detail so nothing is lost.

### Context Management

- **Context conservation**: Never read entire large documents. Read the first 50 lines for structure, then use `offset`/`limit` to target specific sections. When delegating to sub-agents, give them specific questions — don't pass raw documents.
- Monitor context usage throughout execution.
- Write checkpoint BEFORE starting each task. Also checkpoint on compression warnings. Always leave enough room to write a useful checkpoint.
- Steps when checkpointing:
  1. Write a progress checkpoint to `~/projects/Agent/autonomous_runs/{NNN}_{slug}/progress.md`
  2. The system will automatically compress earlier messages as context gets high. Continue working after writing the checkpoint.
  3. After compression, read back both `plan.md` and `progress.md` from the run subfolder to reload state
- **Auto-compact triggers**: Proactively monitor for signs of high context usage — large tool outputs, many files read, multiple sub-agent results accumulated. When context feels heavy (responses slow, many large outputs in history), write a checkpoint to progress.md immediately, then continue working. The system will automatically compress earlier messages. After compression, re-read `plan.md` and `progress.md` to restore state before continuing. Don't wait for the system to force compression — be proactive.
- The progress file is append-only — add new sections on each checkpoint, don't overwrite

Progress checkpoint format:

```markdown
# Autonomous Run {NNN} — Progress

## Checkpoint {YYYY-MM-DD HH:MM}
- **Tasks completed**: {list task numbers and brief status}
- **Current task**: {task number and what's been done so far}
- **Tasks remaining**: {list task numbers}
- **Issues encountered**: {any problems and how they were handled}
- **Files modified since last checkpoint**: {list}
```

**Task completion entry** (mandatory after every task — separate from checkpoints):

```markdown
## Task {N}: {title} — {PASS|FAIL|PARTIAL}
- **Completed**: {YYYY-MM-DD HH:MM EST}
- **Files**: {list of files created/modified}
- **Commit**: {short hash from `git rev-parse --short HEAD`}
- **Issues**: {any problems encountered, or "None"}
```

### Git Strategy

- **Commit after EVERY completed task** — not batched at the end. Each task's output should be committed and pushed before starting the next task.
- **Immediate commit on sub-agent return**: When running parallel sub-agents, do NOT wait for all agents to finish before committing. As EACH sub-agent returns, immediately commit and push its output. This prevents work from being lost if the orchestrator dies mid-batch. The orchestrator should be actively processing results between agent completions, not sitting idle waiting for the batch to complete.
- Stage specific files only (`git add <file1> <file2>`) — never use `git add -A` or `git add .`, which can accidentally include secrets or junk files.
- **Secret scan before commit**: After staging, check `git diff --staged` for credentials, API keys, tokens, or secrets (patterns: `API_KEY=`, `sk-`, `token=`, `password=`, `secret=`). If found, unstage the file, move the secret to `.env`, and log a warning in progress.md.
- Push after every commit — never leave unpushed commits.
- Use `type: description` format (e.g., `feat: add user auth module`, `fix: handle empty response`, `wip: partial task 3`).

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

## Failed Tasks
| # | Task | What Failed | Manual Retry |
|---|------|-------------|--------------|
| {N} | {title} | {error/reason} | {command or steps to retry} |
{or "None — all tasks passed."}

## Human Action Required
- [ ] {thing Nate needs to do manually — package installs, config reviews, external service setup, etc.}
- [ ] {or "None — everything was handled autonomously"}

## Issues Encountered
- {problem}: {how it was resolved, or why it couldn't be}

## Git Log
{output of `git log --oneline {starting_commit_hash}..HEAD` covering this run's commits}
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
- ALWAYS save plan.md and initial progress.md entry before execution begins
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
- **2026-03-05**: Strengthened autonomous execution — Phase 1 now identifies all decision points upfront, Phase 2 plan includes pre-resolved decisions, Phase 4 guardrail makes plan decisions binding (never ask user during execution)
- **2026-03-05**: Fixed compaction — assistant cannot invoke /compact, so it's now a user step at the Phase 2→4 handoff. Context Management during execution relies on automatic compression + checkpoints.
- **2026-03-07**: Post-run-001 improvements — removed /compact dependency (disk-persist approach), added Pre-resolved Decisions to plan template, clarified ~/.claude/ guardrail (scope to project dir), sub-skill prompt review in Phase 1, test-then-batch for sub-agents, inline sub-agent guardrails, slug format spec, checkpoint timestamp format, push-through-when-stuck policy
- **2026-03-09**: Post-run-002 fixes (8 total) — agent timeout protocol (10-min hard max + polling), incremental commits after every task (not batched), secret scan before commit, real-time progress.md with structured task entries, context conservation (targeted reads, never full large docs), graceful degradation (document gap + continue), structured error logging with manual retry guidance, parallel task execution for independent tasks, auto-compact triggers (proactive context management), Failed Tasks section in completion report
- **2026-03-10**: Reliability fixes (3) — immediate commit on sub-agent return (don't wait for batch), progress.md manifest required before any agent launch, process-as-they-arrive pattern replaces wait-for-all (active polling + commit between completions)
