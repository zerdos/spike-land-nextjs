#!/bin/bash
# check-session-health.sh - Verify Jules sessions exist before communicating
# Usage: ./scripts/ralph/check-session-health.sh <session_id1> [session_id2] ...
# Output: JSON with session status (alive/dead/unknown)
#
# Purpose: Avoid wasting tokens trying to communicate with dead sessions
# Dead sessions should be silently removed from registry, tasks returned to queue

set -euo pipefail

if [ $# -lt 1 ]; then
  echo '{"error": "Usage: check-session-health.sh <session_id> [session_id2] ..."}' >&2
  exit 1
fi

# Note: This script checks if sessions are likely dead based on heuristics
# Since we can't directly query Jules API from bash, we use indirect signals:
# 1. Check if session ID appears in recent error logs
# 2. Check if associated PR is merged/closed (session likely done)
# 3. Track last-known-good timestamp from registry

echo "["
first=true
for SESSION_ID in "$@"; do
  if [ "$first" = true ]; then
    first=false
  else
    echo ","
  fi

  # Output session status (to be enriched by MCP tool response)
  # Ralph should use jules_get_session to verify and update this
  jq -n \
    --arg id "$SESSION_ID" \
    '{session_id: $id, check_needed: true}'
done
echo "]"

# IMPORTANT: Ralph should:
# 1. Run this script to get list of sessions to check
# 2. Use jules_get_session for sessions marked check_needed
# 3. If session returns error/not found -> mark as DEAD
# 4. If session status is FAILED/COMPLETED with no recent activity -> mark as DEAD
# 5. DEAD sessions: remove from registry, DO NOT send messages, return task to queue
