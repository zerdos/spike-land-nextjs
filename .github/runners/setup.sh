#!/bin/bash
set -e

# Self-hosted GitHub Actions Runner Setup Script
# Usage: ./setup.sh

REPO="zerdos/spike-land-nextjs"
ENV_FILE=".env"

echo "=== GitHub Actions Self-Hosted Runner Setup ==="
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is required. Install with: brew install gh"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "Please login to GitHub CLI first: gh auth login"
    exit 1
fi

# Generate a runner registration token
echo "Generating runner registration token..."
RUNNER_TOKEN=$(gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/actions/runners/registration-token" \
  --jq '.token')

if [ -z "$RUNNER_TOKEN" ]; then
    echo "Error: Failed to generate runner token"
    exit 1
fi

# Create .env file
cat > "$ENV_FILE" << EOF
# GitHub Actions Runner Configuration
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Token expires in 1 hour - regenerate if needed with: ./setup.sh

RUNNER_TOKEN=${RUNNER_TOKEN}
EOF

echo ""
echo "Setup complete!"
echo ""
echo "Runner token saved to $ENV_FILE"
echo "Note: Token expires in 1 hour. Re-run this script if needed."
echo ""
echo "To start the runner:"
echo "  docker compose up -d"
echo ""
echo "To view logs:"
echo "  docker compose logs -f"
echo ""
echo "To stop:"
echo "  docker compose down"
echo ""
