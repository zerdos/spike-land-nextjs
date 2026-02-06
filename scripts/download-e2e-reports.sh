#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="ci-output"

# Clean and recreate output dir
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Find latest completed CI run with E2E artifacts
echo "Finding latest completed CI run with E2E artifacts..."
RUN_ID=$(gh run list --workflow ci-cd.yml --status completed --limit 10 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
  echo "Error: No CI runs found for ci-cd.yml workflow"
  exit 1
fi

echo "Downloading E2E reports from run $RUN_ID..."

# Download all e2e-reports-shard-* artifacts
gh run download "$RUN_ID" --dir "$OUTPUT_DIR" --pattern "e2e-reports-shard-*"

# Summary
echo ""
echo "Downloaded E2E reports from run $RUN_ID into $OUTPUT_DIR/"
echo ""

ls -d "$OUTPUT_DIR"/e2e-reports-shard-* 2>/dev/null | while read -r dir; do
  shard=$(basename "$dir")
  if [ -f "$dir/cucumber-report-ci.json" ]; then
    failed=$(jq '[.[].elements[]?.steps[]? | select(.result.status == "failed")] | length' "$dir/cucumber-report-ci.json" 2>/dev/null || echo "?")
    echo "  $shard: $failed failed step(s)"
  else
    echo "  $shard: no JSON report found"
  fi
done
