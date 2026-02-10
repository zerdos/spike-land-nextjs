#!/bin/bash
# available-issues.sh - Get filtered, prioritized issues ready for assignment
# Usage: ./scripts/ralph/available-issues.sh [EXISTING_ISSUE_NUMBERS...]
# Output: Prioritized list of issues NOT already assigned
#
# Token efficiency: ~70% reduction (pre-filtered, pre-sorted)
# Excludes: wontfix, duplicate, blocked, needs-discussion labels

set -euo pipefail

# Collect existing issue numbers as space-separated string
EXISTING="${*:-}"

gh issue list --state open --limit 100 --json number,title,labels,createdAt | jq --arg existing "$EXISTING" '
  # Filter out excluded labels and already-assigned issues
  [.[] | select(
    (.labels | map(.name) | any(. == "wontfix" or . == "duplicate" or . == "blocked" or . == "needs-discussion")) | not
  ) | select(
    if ($existing | length > 0) then
      (.number | tostring) as $num | ($existing | split(" ") | index($num)) == null
    else true end
  )] |
  # Sort by priority
  sort_by(
    if (.labels | map(.name) | any(. == "priority:critical")) then 0
    elif (.labels | map(.name) | any(. == "bug")) then 1
    elif (.labels | map(.name) | any(. == "good-first-issue")) then 2
    else 3 end,
    .createdAt
  ) |
  # Format output
  [.[] | {
    number,
    title: (.title | .[0:60]),
    priority: (
      if (.labels | map(.name) | any(. == "priority:critical")) then "CRITICAL"
      elif (.labels | map(.name) | any(. == "bug")) then "BUG"
      elif (.labels | map(.name) | any(. == "good-first-issue")) then "QUICK_WIN"
      else "NORMAL" end
    ),
    labels: ([.labels[].name] | join(",")),
    age_days: (((now - (.createdAt | fromdateiso8601)) / 86400) | floor)
  }] |
  .[0:20]
'
