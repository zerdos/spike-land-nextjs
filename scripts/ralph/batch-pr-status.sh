#!/bin/bash
# batch-pr-status.sh - Check ALL open PRs in one command
# Usage: ./scripts/ralph/batch-pr-status.sh
# Output: JSON array of all open PR statuses
#
# Token efficiency: ~90% reduction (1 call vs N calls for N PRs)

set -euo pipefail

gh pr list --state open --json number,title,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup,headRefName,updatedAt \
  --jq '[.[] | {
    pr: .number,
    title: (.title | .[0:50]),
    draft: .isDraft,
    merge_state: .mergeStateStatus,
    review: (.reviewDecision // "NONE"),
    ci_passing: (if .statusCheckRollup then ([.statusCheckRollup[]? | select(.conclusion != "SUCCESS" and .conclusion != null)] | length == 0) else true end),
    ci_pending: (if .statusCheckRollup then ([.statusCheckRollup[]? | select(.conclusion == null)] | length > 0) else false end),
    branch: .headRefName,
    updated: .updatedAt,
    action: (
      if .isDraft then
        if (if .statusCheckRollup then ([.statusCheckRollup[]? | select(.conclusion != "SUCCESS" and .conclusion != null)] | length == 0) else true end) then "READY_TO_PUBLISH"
        else "CI_FAILING"
        end
      elif (.reviewDecision == "APPROVED") then "READY_TO_MERGE"
      elif (.reviewDecision == "CHANGES_REQUESTED") then "NEEDS_FIXES"
      elif .mergeStateStatus == "BEHIND" then "NEEDS_REBASE"
      else "AWAITING_REVIEW"
      end
    )
  }]'
