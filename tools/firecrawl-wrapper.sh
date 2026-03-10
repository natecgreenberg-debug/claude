#!/usr/bin/env bash
# firecrawl-wrapper.sh — Auto-starts Firecrawl, waits for API, then proxies a curl request
#
# Usage:
#   firecrawl-wrapper.sh <curl-args...>
#
# Example:
#   firecrawl-wrapper.sh -X POST http://localhost:3002/v1/scrape \
#     -H 'Content-Type: application/json' \
#     -d '{"url": "https://example.com", "formats": ["markdown"]}'
#
# The wrapper:
#   1. Starts containers if not running (firecrawl-ctl.sh up)
#   2. Resets the idle timer (firecrawl-ctl.sh ping)
#   3. Waits for the API to respond on localhost:3002 (max 60s)
#   4. Runs curl with the provided arguments

set -euo pipefail

CTL="/root/projects/Agent/tools/firecrawl-ctl.sh"
API_URL="http://localhost:3002"
MAX_WAIT=60

# Step 1 & 2: Start containers and reset idle timer
"$CTL" up >/dev/null 2>&1
"$CTL" ping >/dev/null 2>&1

# Step 3: Wait for API to be ready
echo "Waiting for Firecrawl API..." >&2
elapsed=0
while ! curl -sf "$API_URL" -o /dev/null 2>/dev/null; do
    if [[ "$elapsed" -ge "$MAX_WAIT" ]]; then
        echo "ERROR: Firecrawl API not ready after ${MAX_WAIT}s" >&2
        exit 1
    fi
    sleep 2
    elapsed=$(( elapsed + 2 ))
done
echo "Firecrawl API ready. (waited ${elapsed}s)" >&2

# Step 4: Proxy the curl request
exec curl "$@"
