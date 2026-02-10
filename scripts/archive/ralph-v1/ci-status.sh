#!/bin/bash
# ci-status.sh - Check main branch CI status with failure details
# Usage: ./scripts/ralph/ci-status.sh [branch]
# Output: JSON with status and error log excerpt if failing
#
# Token efficiency: ~60% reduction (combines status check + log fetch)

set -euo pipefail

BRANCH="${1:-main}"

# Get latest workflow run
LATEST=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId,conclusion,name,status,createdAt 2>/dev/null || echo '[]')

if [ "$LATEST" = "[]" ] || [ "$(echo "$LATEST" | jq 'length')" = "0" ]; then
  echo '{"status": "unknown", "message": "No CI runs found"}'
  exit 0
fi

RUN_ID=$(echo "$LATEST" | jq -r '.[0].databaseId')
CONCLUSION=$(echo "$LATEST" | jq -r '.[0].conclusion // "in_progress"')
STATUS=$(echo "$LATEST" | jq -r '.[0].status')
NAME=$(echo "$LATEST" | jq -r '.[0].name')

if [ "$CONCLUSION" = "failure" ]; then
  # Get failed log excerpt (limit to reduce tokens)
  ERROR_LOG=$(gh run view "$RUN_ID" --log-failed 2>&1 | tail -100 | head -50 || echo "Could not fetch logs")

  jq -n \
    --arg status "failing" \
    --arg run_id "$RUN_ID" \
    --arg name "$NAME" \
    --arg error "$ERROR_LOG" \
    '{status: $status, run_id: ($run_id | tonumber), workflow: $name, error_excerpt: $error}'
elif [ "$STATUS" = "in_progress" ] || [ "$CONCLUSION" = "null" ]; then
  jq -n \
    --arg status "in_progress" \
    --arg run_id "$RUN_ID" \
    --arg name "$NAME" \
    '{status: $status, run_id: ($run_id | tonumber), workflow: $name}'
else
  jq -n \
    --arg status "passing" \
    --arg run_id "$RUN_ID" \
    --arg name "$NAME" \
    '{status: $status, run_id: ($run_id | tonumber), workflow: $name}'
fi
