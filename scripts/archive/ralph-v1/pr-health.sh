#!/bin/bash
# pr-health.sh - Check all health metrics for a single PR in one call
# Usage: ./scripts/ralph/pr-health.sh <PR_NUMBER>
# Output: JSON with ci_passing, is_draft, merge_state, mergeable, review
#
# Token efficiency: Replaces 4-5 separate gh commands with 1 call (~80% savings)

set -euo pipefail

if [ $# -lt 1 ]; then
  echo '{"error": "Usage: pr-health.sh <PR_NUMBER>"}' >&2
  exit 1
fi

PR=$1

gh pr view "$PR" --json \
  statusCheckRollup,mergeStateStatus,isDraft,reviewDecision,mergeable,headRefName,updatedAt \
  --jq '{
    pr: '"$PR"',
    ci_passing: (if .statusCheckRollup then ([.statusCheckRollup[]? | select(.conclusion != "SUCCESS" and .conclusion != null)] | length == 0) else true end),
    ci_pending: (if .statusCheckRollup then ([.statusCheckRollup[]? | select(.conclusion == null)] | length > 0) else false end),
    is_draft: .isDraft,
    merge_state: .mergeStateStatus,
    mergeable: .mergeable,
    review: (.reviewDecision // "NONE"),
    branch: .headRefName,
    updated: .updatedAt
  }'
