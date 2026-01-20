#!/bin/bash

# Manual Testing Guide for /my-apps on Production
# This script guides you through testing the /my-apps feature

set -e

echo "=========================================="
echo "  My-Apps Manual Testing Guide"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This guide will help you manually test the /my-apps feature on production.${NC}"
echo ""

# Check if agent poll is running
echo -e "${YELLOW}Step 1: Checking agent polling service...${NC}"
if pgrep -f "agent-poll.ts --prod" > /dev/null; then
  echo -e "${GREEN}✓ Agent polling is running (production mode)${NC}"
else
  echo -e "${RED}✗ Agent polling is NOT running${NC}"
  echo ""
  read -p "Would you like to start it? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting agent polling in production mode..."
    yarn agent:poll:prod &
    AGENT_POLL_PID=$!
    echo -e "${GREEN}✓ Started with PID: $AGENT_POLL_PID${NC}"
    sleep 3
  else
    echo -e "${RED}Warning: Tests may not work without agent polling${NC}"
  fi
fi
echo ""

# Open production site
echo -e "${YELLOW}Step 2: Opening production site...${NC}"
echo -e "${BLUE}Opening: https://spike.land/my-apps${NC}"
echo ""

if command -v open &> /dev/null; then
  open "https://spike.land/my-apps"
elif command -v xdg-open &> /dev/null; then
  xdg-open "https://spike.land/my-apps"
else
  echo "Please manually open: https://spike.land/my-apps"
fi

echo ""
echo -e "${YELLOW}Step 3: Test Scenarios${NC}"
echo ""
echo "Test the following 5 apps by creating them through the UI:"
echo ""

cat << 'EOF'
┌─────────────────────────────────────────────────────────────┐
│  Test 1: Todo List App                                      │
├─────────────────────────────────────────────────────────────┤
│  Prompt: "Create a simple todo list app with add, delete,  │
│           and mark complete functionality"                  │
│                                                              │
│  Expected:                                                   │
│  ✓ Agent responds within 60 seconds                        │
│  ✓ Preview iframe is visible in the chat                   │
│  ✓ Live URL is clickable                                    │
│  ✓ App shows input field and todo list                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Test 2: Counter App                                        │
├─────────────────────────────────────────────────────────────┤
│  Prompt: "Create a counter with increment, decrement, and  │
│           reset buttons. Make it colorful!"                 │
│                                                              │
│  Expected:                                                   │
│  ✓ Agent responds within 60 seconds                        │
│  ✓ Preview shows the counter                               │
│  ✓ Buttons are visible and styled                          │
│  ✓ Can interact with preview                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Test 3: Color Picker                                       │
├─────────────────────────────────────────────────────────────┤
│  Prompt: "Build a color picker that shows the selected     │
│           color in a large preview box with hex code"       │
│                                                              │
│  Expected:                                                   │
│  ✓ Agent responds within 60 seconds                        │
│  ✓ Preview shows color picker interface                    │
│  ✓ Preview box updates when color changes                  │
│  ✓ Hex code is displayed                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Test 4: Random Quote Generator                            │
├─────────────────────────────────────────────────────────────┤
│  Prompt: "Create a random inspirational quote generator    │
│           with a button to get new quotes"                  │
│                                                              │
│  Expected:                                                   │
│  ✓ Agent responds within 60 seconds                        │
│  ✓ Preview shows quote and button                          │
│  ✓ Clicking button changes the quote                       │
│  ✓ Quotes are inspirational                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Test 5: Simple Calculator                                  │
├─────────────────────────────────────────────────────────────┤
│  Prompt: "Make a simple calculator with +, -, *, / and a   │
│           clear button. Style it to look nice"              │
│                                                              │
│  Expected:                                                   │
│  ✓ Agent responds within 60 seconds                        │
│  ✓ Preview shows calculator interface                      │
│  ✓ All buttons are visible                                 │
│  ✓ Calculator works correctly                              │
└─────────────────────────────────────────────────────────────┘
EOF

echo ""
echo -e "${YELLOW}Testing Instructions:${NC}"
echo ""
echo "For each test:"
echo "  1. Click 'Create New App' or navigate to /my-apps/new"
echo "  2. You'll be redirected to /my-apps/[random-id]"
echo "  3. Type the prompt in the chat input"
echo "  4. Press Enter or click Send"
echo "  5. Wait for the agent to respond (check agent poll logs)"
echo "  6. Verify the preview appears in the chat message"
echo "  7. Click on the preview to open it in a modal"
echo "  8. Test the app functionality"
echo ""

echo -e "${YELLOW}Step 4: Monitor Agent Polling${NC}"
echo ""
echo "In another terminal, run:"
echo -e "${BLUE}  yarn agent:poll:debug --prod${NC}"
echo ""
echo "This will show you:"
echo "  • When messages are received"
echo "  • MCP tool calls being made"
echo "  • Agent responses being saved"
echo ""

echo -e "${YELLOW}Step 5: Verify Preview Rendering${NC}"
echo ""
echo "For each app created, verify:"
echo "  □ The mini preview iframe appears in the agent's message"
echo "  □ The preview shows the app (not a blank page)"
echo "  □ Clicking the preview opens a larger modal"
echo "  □ The codespace URL is visible and clickable"
echo "  □ The URL format is: https://testing.spike.land/live/[codespace-id]"
echo ""

echo -e "${YELLOW}Step 6: Check for Issues${NC}"
echo ""
echo "Common issues to watch for:"
echo "  □ Agent not responding (check agent poll is running)"
echo "  □ Preview not showing (check browser console for errors)"
echo "  □ Preview shows 404 (check codespace URL)"
echo "  □ Agent timeout (may need to increase timeout)"
echo "  □ Rate limiting (wait between tests)"
echo ""

echo -e "${GREEN}=========================================="
echo -e "  Ready to Test!"
echo -e "==========================================${NC}"
echo ""

read -p "Press Enter to check agent poll status, or Ctrl+C to exit..."

echo ""
echo -e "${YELLOW}Current agent poll processes:${NC}"
pgrep -f "agent-poll.ts" | while read pid; do
  echo -e "  PID: ${GREEN}$pid${NC}"
  ps -p $pid -o command= | sed 's/^/    /'
done

echo ""
echo -e "${BLUE}Tip: Keep this terminal open to monitor the testing session${NC}"
echo ""
