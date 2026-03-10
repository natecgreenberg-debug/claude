#!/usr/bin/env bash
# watchdog.sh — Check health of the most recent autonomous run via heartbeat file.
# Output: alive / dead / no-run with timestamp details.
# Exit codes: 0 = alive, 1 = dead, 2 = no run found

set -euo pipefail

RUNS_DIR="$HOME/projects/Agent/autonomous_runs"
MAX_AGE_SECONDS=300  # 5 minutes

# Find the most recent heartbeat file across all run directories
latest_heartbeat=""
latest_mtime=0

for hb in "$RUNS_DIR"/*/heartbeat; do
  [ -f "$hb" ] || continue
  mtime=$(stat -c %Y "$hb" 2>/dev/null || echo 0)
  if [ "$mtime" -gt "$latest_mtime" ]; then
    latest_mtime=$mtime
    latest_heartbeat=$hb
  fi
done

now=$(date +%s)
timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

if [ -z "$latest_heartbeat" ]; then
  echo "[$timestamp] STATUS: no-run — no heartbeat file found in $RUNS_DIR/*/heartbeat"
  exit 2
fi

age=$(( now - latest_mtime ))
run_dir=$(dirname "$latest_heartbeat")
run_name=$(basename "$run_dir")
heartbeat_time=$(date -u -d @"$latest_mtime" '+%Y-%m-%d %H:%M:%S UTC')

if [ "$age" -le "$MAX_AGE_SECONDS" ]; then
  echo "[$timestamp] STATUS: alive — run '$run_name' last heartbeat ${age}s ago ($heartbeat_time)"
  exit 0
else
  echo "[$timestamp] STATUS: dead — run '$run_name' last heartbeat ${age}s ago ($heartbeat_time), exceeds ${MAX_AGE_SECONDS}s threshold"
  exit 1
fi
