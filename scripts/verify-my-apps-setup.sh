#!/bin/bash
# My-Apps Setup Verification Script
# Checks that all prerequisites are in place for testing /my-apps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  My-Apps Setup Verification Script${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to check a prerequisite
check() {
  local name="$1"
  local command="$2"
  local required="${3:-true}"

  echo -n "Checking $name... "
  if eval "$command" &>/dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
    return 0
  else
    if [ "$required" = "true" ]; then
      echo -e "${RED}✗ FAILED${NC}"
      ((ERRORS++))
      return 1
    else
      echo -e "${YELLOW}⚠ WARNING${NC}"
      ((WARNINGS++))
      return 0
    fi
  fi
}

echo -e "${BLUE}1. Environment Variables${NC}"
echo "----------------------------------------"

# Check .env.local exists
if [ ! -f ".env.local" ]; then
  echo -e "${RED}✗ .env.local file not found${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✓ .env.local exists${NC}"

  # Check required env vars
  check "DATABASE_URL" "grep -q '^DATABASE_URL=' .env.local"
  check "UPSTASH_REDIS_REST_URL or KV_REST_API_URL" "grep -qE '^(UPSTASH_REDIS_REST_URL|KV_REST_API_URL)=' .env.local"
  check "UPSTASH_REDIS_REST_TOKEN or KV_REST_API_TOKEN" "grep -qE '^(UPSTASH_REDIS_REST_TOKEN|KV_REST_API_TOKEN)=' .env.local"
  check "SPIKE_LAND_API_KEY" "grep -q '^SPIKE_LAND_API_KEY=' .env.local"
  check "AGENT_API_KEY" "grep -q '^AGENT_API_KEY=' .env.local"
  check "ANTHROPIC_API_KEY" "grep -q '^ANTHROPIC_API_KEY=' .env.local" false
fi

echo ""
echo -e "${BLUE}2. Running Processes${NC}"
echo "----------------------------------------"

# Check dev server
if pgrep -f "next dev" >/dev/null; then
  echo -e "${GREEN}✓ Dev server is running${NC}"

  # Try to hit the health endpoint
  if curl -s -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Dev server responds to requests${NC}"
  else
    echo -e "${YELLOW}⚠ Dev server not responding at localhost:3000${NC}"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}✗ Dev server is NOT running${NC}"
  echo "  Run: yarn dev"
  ((ERRORS++))
fi

# Check agent poll
if pgrep -f "agent:poll" >/dev/null; then
  echo -e "${GREEN}✓ Agent poll is running${NC}"
else
  echo -e "${RED}✗ Agent poll is NOT running${NC}"
  echo "  Run: yarn agent:poll"
  ((ERRORS++))
fi

echo ""
echo -e "${BLUE}3. Dependencies${NC}"
echo "----------------------------------------"

# Check Node.js version
check "Node.js (v20+)" "node -v | grep -qE 'v(2[0-9]|[3-9][0-9])'"

# Check Yarn
check "Yarn package manager" "command -v yarn"

# Check Claude CLI
if command -v claude >/dev/null; then
  echo -e "${GREEN}✓ Claude CLI is installed${NC}"
  CLAUDE_VERSION=$(claude --version 2>&1 || echo "unknown")
  echo "  Version: $CLAUDE_VERSION"
else
  echo -e "${RED}✗ Claude CLI is NOT installed${NC}"
  echo "  Install: brew install claude-ai/tap/claude-cli"
  echo "  Or see: https://github.com/anthropics/claude-cli"
  ((ERRORS++))
fi

# Check PostgreSQL connectivity
check "PostgreSQL database" "yarn prisma db execute --stdin <<< 'SELECT 1' 2>&1 | grep -q '1'" false

echo ""
echo -e "${BLUE}4. Network Connectivity${NC}"
echo "----------------------------------------"

# Check local API
check "Local API (localhost:3000)" "curl -s -f http://localhost:3000/api/health >/dev/null"

# Check backend worker
check "Backend worker (testing.spike.land)" "curl -s -f https://testing.spike.land/health >/dev/null" false

# Check production (if testing prod)
if [ "$1" = "--prod" ]; then
  check "Production (spike.land)" "curl -s -f https://spike.land >/dev/null" false
fi

echo ""
echo -e "${BLUE}5. Database Schema${NC}"
echo "----------------------------------------"

# Check Prisma schema is in sync
if yarn prisma validate >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Prisma schema is valid${NC}"
else
  echo -e "${RED}✗ Prisma schema validation failed${NC}"
  echo "  Run: yarn db:generate"
  ((ERRORS++))
fi

echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}         Verification Summary        ${NC}"
echo -e "${BLUE}=====================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo -e "${GREEN}You're ready to test /my-apps${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Open browser: http://localhost:3000/my-apps"
  echo "  2. Create a new app with a prompt"
  echo "  3. Observe agent processing and preview rendering"
  echo ""
  echo "For detailed test scenarios, see:"
  echo "  - docs/MY_APPS_TESTING_GUIDE.md"
  echo "  - scripts/test-my-apps-manual.md"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
  echo ""
  echo "You can proceed with testing, but some features may not work."
  exit 0
else
  echo -e "${RED}✗ ${ERRORS} error(s) found${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
  fi
  echo ""
  echo "Please fix the errors above before testing /my-apps"
  exit 1
fi
