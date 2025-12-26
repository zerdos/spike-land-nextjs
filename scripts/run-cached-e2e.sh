#!/bin/bash
# run-cached-e2e.sh
#
# Runs Cucumber E2E tests with coverage-based caching in Docker CI.
# Uses the E2E cache to skip feature files whose dependencies haven't changed.
#
# Environment variables:
#   E2E_CACHE_DIR    - Cache directory (default: /app/.e2e-cache)
#   SHARD_INDEX      - Current shard number (default: 1)
#   SHARD_TOTAL      - Total number of shards (default: 8)
#   E2E_COVERAGE     - Set to "true" to collect coverage
#   GITHUB_REF       - Git ref for main branch detection
#   DEBUG            - Set to "true" for verbose output

set -e

CACHE_DIR="${E2E_CACHE_DIR:-/app/.e2e-cache}"
SHARD_INDEX="${SHARD_INDEX:-1}"
SHARD_TOTAL="${SHARD_TOTAL:-8}"

echo "::group::E2E Cache Check"
echo "Cache directory: $CACHE_DIR"
echo "Shard: $SHARD_INDEX/$SHARD_TOTAL"

# Ensure cache directory exists
mkdir -p "$CACHE_DIR"
mkdir -p e2e/reports

# Check if we can skip all tests (main branch with no changes)
if [ "${GITHUB_REF:-}" = "refs/heads/main" ]; then
  echo "On main branch, checking cache..."

  if npx tsx scripts/e2e-cache-manager.ts should-skip-all 2>/dev/null; then
    echo "::endgroup::"
    echo "::notice::All E2E features cached and unchanged, skipping shard $SHARD_INDEX"
    echo "SKIP_REASON=all-cached" >> "${GITHUB_OUTPUT:-/dev/null}"
    exit 0
  fi
fi

# Get features that need to run
echo "Determining which features need to run..."
FEATURES_TO_RUN=$(npx tsx scripts/e2e-cache-manager.ts get-feature-filter 2>/dev/null || echo "")

if [ "$FEATURES_TO_RUN" = "--skip-all" ]; then
  echo "::endgroup::"
  echo "::notice::No E2E features need to run for shard $SHARD_INDEX (all cached)"
  exit 0
fi

echo "::endgroup::"

# Show cache stats in CI
if [ -n "${CI:-}" ]; then
  npx tsx scripts/e2e-cache-manager.ts stats 2>/dev/null || true
fi

echo "::group::Running E2E Tests (Shard $SHARD_INDEX/$SHARD_TOTAL)"

# Enable coverage collection
export E2E_COVERAGE=true

# Build cucumber command
CUCUMBER_CMD="cucumber-js --profile ci"
CUCUMBER_CMD="$CUCUMBER_CMD --shard $SHARD_INDEX/$SHARD_TOTAL"

# Add feature files if specific ones need to run
if [ -n "$FEATURES_TO_RUN" ]; then
  echo "Running specific features:"
  echo "$FEATURES_TO_RUN" | tr ' ' '\n' | head -10
  FEATURE_COUNT=$(echo "$FEATURES_TO_RUN" | wc -w | tr -d ' ')
  if [ "$FEATURE_COUNT" -gt 10 ]; then
    echo "... and $((FEATURE_COUNT - 10)) more"
  fi

  # shellcheck disable=SC2086
  $CUCUMBER_CMD $FEATURES_TO_RUN
else
  echo "Running all features..."
  $CUCUMBER_CMD
fi

echo "::endgroup::"

# Update cache with coverage data
echo "::group::Updating E2E Cache"
npx tsx scripts/e2e-cache-manager.ts update-cache 2>/dev/null || echo "Cache update skipped (no coverage data)"
echo "::endgroup::"

echo "::notice::E2E Shard $SHARD_INDEX completed"
