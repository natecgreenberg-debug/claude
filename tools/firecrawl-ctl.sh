#!/usr/bin/env bash
# firecrawl-ctl.sh — Control script for self-hosted Firecrawl containers
# Provides auto start/stop with idle timeout (15 min default)

set -euo pipefail

COMPOSE_DIR="/root/projects/Agent/tools/firecrawl"
TIMESTAMP_FILE="/tmp/firecrawl-last-active"
IDLE_TIMEOUT_SECONDS=900  # 15 minutes
COMPOSE_PROJECT="firecrawl"

# Touch the timestamp file to reset idle timer
_ping() {
    date +%s > "$TIMESTAMP_FILE"
}

# Check if containers are running (any container in the compose project)
_is_running() {
    local count
    count=$(docker compose -f "$COMPOSE_DIR/docker-compose.yaml" -p "$COMPOSE_PROJECT" ps -q 2>&1 | grep -v "level=warning" | wc -l)
    [[ "$count" -gt 0 ]]
}

# Get seconds since last activity
_idle_seconds() {
    if [[ ! -f "$TIMESTAMP_FILE" ]]; then
        echo "0"
        return
    fi
    local last_active now
    last_active=$(cat "$TIMESTAMP_FILE")
    now=$(date +%s)
    echo $(( now - last_active ))
}

cmd_up() {
    if _is_running; then
        echo "Firecrawl containers already running."
    else
        echo "Starting Firecrawl containers..."
        docker compose -f "$COMPOSE_DIR/docker-compose.yaml" -p "$COMPOSE_PROJECT" up -d 2>&1 | grep -v "level=warning"
        echo "Firecrawl containers started."
    fi
    _ping
}

cmd_down() {
    echo "Stopping Firecrawl containers..."
    docker compose -f "$COMPOSE_DIR/docker-compose.yaml" -p "$COMPOSE_PROJECT" down 2>&1 | grep -v "level=warning"
    rm -f "$TIMESTAMP_FILE"
    echo "Firecrawl containers stopped."
}

cmd_status() {
    if _is_running; then
        local idle
        idle=$(_idle_seconds)
        local mins=$(( idle / 60 ))
        local secs=$(( idle % 60 ))
        echo "Firecrawl: RUNNING"
        echo "Idle time: ${mins}m ${secs}s (auto-stop at 15m)"
        echo ""
        docker compose -f "$COMPOSE_DIR/docker-compose.yaml" -p "$COMPOSE_PROJECT" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
    else
        echo "Firecrawl: STOPPED"
    fi
}

cmd_ping() {
    _ping
    echo "Idle timer reset."
}

cmd_auto_stop() {
    if ! _is_running; then
        return 0
    fi

    if [[ ! -f "$TIMESTAMP_FILE" ]]; then
        # No timestamp file but containers running — set one now, don't stop yet
        _ping
        return 0
    fi

    local idle
    idle=$(_idle_seconds)

    if [[ "$idle" -ge "$IDLE_TIMEOUT_SECONDS" ]]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') — Firecrawl idle for $(( idle / 60 ))m, stopping containers."
        cmd_down
    fi
}

# --- Main ---
case "${1:-help}" in
    up)        cmd_up ;;
    down)      cmd_down ;;
    status)    cmd_status ;;
    ping)      cmd_ping ;;
    auto-stop) cmd_auto_stop ;;
    help|*)
        echo "Usage: firecrawl-ctl.sh {up|down|status|ping|auto-stop}"
        echo ""
        echo "  up         Start containers if not running, reset idle timer"
        echo "  down       Stop containers immediately"
        echo "  status     Show running status and idle time"
        echo "  ping       Reset idle timer (call before each scrape)"
        echo "  auto-stop  Stop containers if idle > 15 minutes"
        ;;
esac
