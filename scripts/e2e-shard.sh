#!/bin/bash
# Run a specific E2E test shard locally
# Usage: ./scripts/e2e-shard.sh [shard_number]
# Example: ./scripts/e2e-shard.sh 3  # Runs shard 3/8

SHARD_INDEX=${1:-1}
SHARD_TOTAL=${2:-8}

echo "Running E2E shard $SHARD_INDEX/$SHARD_TOTAL"

export SHARD_INDEX
export SHARD_TOTAL
export BASE_URL=http://localhost:3000
export CI=true

yarn start:server:and:test
