#!/bin/bash
# auto-publish.sh - Auto-publish draft PR and trigger review workflow
# Usage: ./scripts/ralph/auto-publish.sh <PR_NUMBER>
#
# Actions:
# 1. Checks PR is ready (CI passing, no conflicts, still draft)
# 2. Marks PR as ready (removes draft)
# 3. Pushes empty commit to trigger claude-code-review workflow
#
# Token efficiency: Single command for entire publish+trigger flow

set -euo pipefail

if [ $# -lt 1 ]; then
  echo '{"error": "Usage: auto-publish.sh <PR_NUMBER>"}' >&2
  exit 1
fi

PR=$1
REPO_ROOT=$(git rev-parse --show-toplevel)

# Get PR health status
HEALTH=$(gh pr view "$PR" --json \
  statusCheckRollup,mergeStateStatus,isDraft,mergeable,headRefName \
  --jq '{
    ci_passing: (if .statusCheckRollup then ([.statusCheckRollup[]? | select(.conclusion != "SUCCESS" and .conclusion != null)] | length == 0) else true end),
    is_draft: .isDraft,
    merge_state: .mergeStateStatus,
    mergeable: .mergeable,
    branch: .headRefName
  }')

CI_PASSING=$(echo "$HEALTH" | jq -r '.ci_passing')
IS_DRAFT=$(echo "$HEALTH" | jq -r '.is_draft')
MERGE_STATE=$(echo "$HEALTH" | jq -r '.merge_state')
MERGEABLE=$(echo "$HEALTH" | jq -r '.mergeable')
BRANCH=$(echo "$HEALTH" | jq -r '.branch')

# Check prerequisites
if [ "$CI_PASSING" != "true" ]; then
  echo "{\"error\": \"CI not passing\", \"pr\": $PR, \"action\": \"wait\"}"
  exit 1
fi

if [ "$MERGEABLE" == "CONFLICTING" ]; then
  echo "{\"error\": \"Merge conflicts detected\", \"pr\": $PR, \"action\": \"resolve_conflicts\"}"
  exit 1
fi

if [ "$IS_DRAFT" != "true" ]; then
  echo "{\"info\": \"PR already published\", \"pr\": $PR, \"action\": \"check_review\"}"
  exit 0
fi

# All checks pass - publish and trigger review
echo "Publishing PR #$PR and triggering review..." >&2

# Step 1: Mark as ready
gh pr ready "$PR"

# Step 2: Push empty commit to trigger review
cd "$REPO_ROOT"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git commit --allow-empty -m "chore: request PR review

Triggered by Ralph auto-publish workflow.
Co-Authored-By: Ralph Wiggum <ralph@spike.land>"
git push

# Return to main
git checkout main

echo "{\"success\": true, \"pr\": $PR, \"action\": \"review_triggered\", \"branch\": \"$BRANCH\"}"
