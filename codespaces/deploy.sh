#!/usr/bin/env bash
# Deploy vibe codespaces to testing.spike.land
#
# Usage:
#   ./codespaces/deploy.sh                    # Deploy all 4 in order
#   ./codespaces/deploy.sh vibe-pulse         # Deploy one specific codespace
#
# The script uses PUT /api-v1/{name}/code on testing.spike.land
# which auto-creates the codespace on first access and transpiles the code.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${SPIKE_LAND_URL:-https://testing.spike.land}"

# Build order matters: pulse -> timeline -> canvas -> nexus
CODESPACES=(vibe-pulse vibe-timeline vibe-canvas vibe-nexus)

deploy_one() {
  local name="$1"
  local file="${SCRIPT_DIR}/${name}.tsx"

  if [[ ! -f "$file" ]]; then
    echo "ERROR: Source file not found: $file"
    return 1
  fi

  local code
  code=$(cat "$file")

  echo "  Deploying ${name}..."

  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X PUT \
    "${BASE_URL}/api-v1/${name}/code" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg code "$code" '{code: $code, run: true}')")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" == "200" ]]; then
    echo "  OK: ${name} deployed successfully"
    echo "  View: ${BASE_URL}/live/${name}/"
  else
    echo "  FAILED (HTTP ${http_code}): ${body}"
    return 1
  fi
}

verify_one() {
  local name="$1"
  echo "  Verifying ${name}..."
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/live/${name}/session.json")
  if [[ "$status" == "200" ]]; then
    echo "  OK: ${name} is live at ${BASE_URL}/live/${name}/"
  else
    echo "  WARN: ${name} returned HTTP ${status}"
  fi
}

echo "=== Vibe Codespace Deployer ==="
echo "Target: ${BASE_URL}"
echo ""

if [[ $# -gt 0 ]]; then
  # Deploy specific codespace(s)
  for name in "$@"; do
    deploy_one "$name"
    echo ""
  done
else
  # Deploy all in order
  for name in "${CODESPACES[@]}"; do
    deploy_one "$name"
    echo ""
    # Brief pause between deployments for the worker to settle
    sleep 1
  done
fi

echo "=== Verification ==="
if [[ $# -gt 0 ]]; then
  for name in "$@"; do
    verify_one "$name"
  done
else
  for name in "${CODESPACES[@]}"; do
    verify_one "$name"
  done
fi

echo ""
echo "=== Done ==="
echo ""
echo "Quick links:"
if [[ $# -gt 0 ]]; then
  for name in "$@"; do
    echo "  ${BASE_URL}/live/${name}/"
  done
else
  for name in "${CODESPACES[@]}"; do
    echo "  ${BASE_URL}/live/${name}/"
  done
fi
echo ""
echo "Open vibe-nexus for the full dashboard:"
echo "  ${BASE_URL}/live/vibe-nexus/"
