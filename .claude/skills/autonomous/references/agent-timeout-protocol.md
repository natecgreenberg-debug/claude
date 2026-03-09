# Agent Timeout Protocol

## Overview
Background agents can stall silently, wasting hours of execution time. This protocol enforces a hard 10-minute maximum for all background agents launched during Phase 4.

## Constants
- **POLL_INTERVAL**: 60 seconds
- **HARD_TIMEOUT**: 10 minutes (600 seconds)
- **EARLY_EXIT**: If N-1 of N agents are done and the straggler has been running >5 minutes, move on

## Polling Procedure

### Single Agent
```
1. Launch agent with `run_in_background: true`
2. Record agent ID and launch timestamp
3. Every 60 seconds, check with TaskOutput(agent_id)
4. If agent returns result → done, use output
5. If 10 minutes elapsed with no result:
   a. Log to progress.md: "TIMED OUT: {agent description} after 10 min"
   b. Do NOT retry — treat as a failed sub-task
   c. Continue to next task
```

### Parallel Agents (batch)
```
1. Launch N agents with `run_in_background: true`
2. Record all agent IDs and launch timestamps
3. Every 60 seconds, check ALL pending agents with TaskOutput
4. Track completed vs pending agents
5. If all agents complete → done, collect results
6. Early exit check (every poll cycle):
   - If (N-1) agents are done AND straggler has been running >5 min → move on
   - Log straggler as TIMED OUT
7. If any agent hits 10-minute hard timeout:
   - Log as TIMED OUT
   - Continue with results from completed agents
   - Do NOT wait for remaining agents once hard timeout fires on any
```

## Implementation Pattern

```python
# Pseudocode for the polling loop
agents = {id: {"launched": now(), "description": desc} for each launched agent}
completed = {}

while len(completed) < len(agents):
    sleep(60)

    for agent_id, info in agents.items():
        if agent_id in completed:
            continue

        result = TaskOutput(agent_id)
        elapsed = now() - info["launched"]

        if result is not None:
            completed[agent_id] = result
        elif elapsed >= 600:  # 10 min hard timeout
            log_timeout(agent_id, info["description"])
            completed[agent_id] = TIMED_OUT

    # Early exit: N-1 done, straggler > 5 min
    pending = [id for id in agents if id not in completed]
    if len(pending) == 1 and len(completed) >= 1:
        straggler = pending[0]
        elapsed = now() - agents[straggler]["launched"]
        if elapsed > 300:  # 5 min
            log_timeout(straggler, agents[straggler]["description"])
            completed[straggler] = TIMED_OUT
```

## Logging

When an agent times out, append to progress.md:
```markdown
### Timeout Event — {HH:MM EST}
- **Agent**: {description}
- **Elapsed**: {minutes} min
- **Impact**: {what output was expected but not received}
- **Mitigation**: {how execution proceeds without this output}
```

## Edge Cases

1. **Agent completes right at timeout**: Use the result — a late result is better than no result
2. **All agents timeout**: Log all as timed out, document the gap, continue to next task
3. **Agent returns error vs timeout**: Errors are different from timeouts — log error details, not just "timed out"
4. **Nested agents**: Sub-agents spawned by sub-agents inherit the same 10-minute max from their own launch time
