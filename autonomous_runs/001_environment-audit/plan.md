# Autonomous Run 001 — Plan
**Date**: 2026-03-05
**Description**: Code review all skill/agent/config files + live VPS security sweep → single prioritized findings report. Improve code-reviewer agent if needed.

## Tasks

### Task 1: Inventory & read all auditable files
- **Deliverable**: All 10 files read into context
- **Files**: Read-only
- **Depends on**: none
- **Success criteria**: All 10 files confirmed readable

### Task 2: Test code-reviewer agent on 1 skill file
- **Deliverable**: Raw findings from code-reviewer agent on `autonomous/SKILL.md` (stress test)
- **Depends on**: Task 1
- **Success criteria**: Agent returns structured, actionable findings covering logic/correctness and clarity

### Task 3: Evaluate code-reviewer quality & improve if needed
- **Deliverable**: Either "agent is good enough, proceed" or improved `code-reviewer.md`
- **Files**: `.claude/agents/code-reviewer.md` (modify only if needed)
- **Depends on**: Task 2
- **Success criteria**: If improved, re-run on autonomous/SKILL.md and confirm better output
- **Quality bar**: Specific, actionable, correctly prioritized. Catches logic errors, contradictions, missing edge cases, AND unclear instructions.

### Task 4: Code review — All skills (parallel agents)
- **Deliverable**: Raw findings from 4 parallel code-reviewer agents (research, autonomous, startsession, winddown)
- **Depends on**: Task 3
- **Success criteria**: All 4 agents return findings

### Task 5: Code review — Agent, hook, and config files (parallel agents)
- **Deliverable**: Raw findings covering: code-reviewer.md, deny-commands.sh, claude.md, rules/workflow.md, rules/code-style.md, settings.local.json
- **Depends on**: Task 3
- **Success criteria**: All agents return findings

### Task 6: VPS security sweep
- **Deliverable**: Raw security findings from live commands
- **Depends on**: none (parallel with Tasks 4-5)
- **Success criteria**: All commands execute

### Task 7: Compile consolidated findings report
- **Deliverable**: Single markdown report organized by severity (Critical > High > Medium > Low > Info)
- **Files**: autonomous_runs/001_environment-audit/findings.md
- **Depends on**: Tasks 4, 5, 6
- **Success criteria**: All findings captured, deduplicated, prioritized

### Task 8: Write completion report
- **Deliverable**: Standard completion report
- **Files**: autonomous_runs/001_environment-audit/completion.md
- **Depends on**: Task 7
- **Success criteria**: Committed and pushed

## Pre-Resolved Decisions
- If code-reviewer agent is weak (Task 2): improve it, commit, re-test, then proceed
- If code-reviewer agent is adequate (Task 2): skip Task 3 improvements, proceed directly
- If a code-reviewer agent errors or returns empty: log it, proceed with others, note gap
- If a security command requires sudo or gets permission denied: log output as-is
- Do NOT apply any fixes — capture findings only
- settings.local.json contents: include in report verbatim
- Checkpoint after Task 5
- Report goes in autonomous_runs/001_environment-audit/
- If code-reviewer improvement is committed, push immediately

## Known Blockers
- None identified

## Autonomy Rules
This run follows the embedded guardrails in the /autonomous skill.
