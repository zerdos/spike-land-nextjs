#!/bin/bash
# Run cucumber with shard parameters
# Called by start-server-and-test after server is started
# Uses SHARD_INDEX and SHARD_TOTAL env vars set by parent process

SHARD_INDEX=${SHARD_INDEX:-1}
SHARD_TOTAL=${SHARD_TOTAL:-8}

echo "Running E2E shard $SHARD_INDEX/$SHARD_TOTAL"

# Run cucumber directly (server is already started by start-server-and-test)
BASE_URL=${BASE_URL:-http://localhost:3000} CI=true cucumber-js --profile ci --shard "$SHARD_INDEX/$SHARD_TOTAL"
