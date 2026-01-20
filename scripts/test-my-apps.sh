#!/bin/bash

# Test script for /my-apps functionality
# Creates test apps and sends messages to verify agent responses

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:3000}"
E2E_AUTH_BYPASS="kfewLnKg5R93PKj9L+SUqBjnUk29nwLi4Wx9tXiQ8gY="

echo -e "${BLUE}Testing /my-apps functionality${NC}"
echo -e "${BLUE}API URL: $API_URL${NC}"
echo ""

# Array to store app IDs
declare -a APP_IDS

# Function to create an app using prompt-based API
create_app() {
    local prompt="$1"
    local codespace_id="$2"

    echo -e "${BLUE}Creating app with prompt${NC}"
    echo -e "  Codespace: $codespace_id"

    local response=$(curl -s -X POST "$API_URL/api/apps" \
        -H "Content-Type: application/json" \
        -H "x-e2e-auth-bypass: $E2E_AUTH_BYPASS" \
        -d "{\"prompt\": \"$prompt\", \"codespaceId\": \"$codespace_id\"}")

    local app_id=$(echo "$response" | jq -r '.id // empty')

    if [ -z "$app_id" ] || [ "$app_id" = "null" ]; then
        echo -e "${RED}Failed to create app${NC}"
        echo "$response" | jq '.'
        return 1
    fi

    echo -e "${GREEN}Created app: $app_id${NC}"
    echo -e "${GREEN}Codespace URL: https://testing.spike.land/live/$codespace_id/${NC}"
    APP_IDS+=("$app_id")
    echo "$app_id"
}

# Function to send a message to an app
send_message() {
    local app_id="$1"
    local message="$2"

    echo -e "${BLUE}Sending message to $app_id${NC}"
    echo -e "  Message: $message"

    local response=$(curl -s -X POST "$API_URL/api/apps/$app_id/agent/chat" \
        -H "Content-Type: application/json" \
        -H "x-e2e-auth-bypass: $E2E_AUTH_BYPASS" \
        -d "{\"content\": \"$message\"}")

    local message_id=$(echo "$response" | jq -r '.id // empty')

    if [ -z "$message_id" ] || [ "$message_id" = "null" ]; then
        echo -e "${RED}Failed to send message${NC}"
        echo "$response" | jq '.'
        return 1
    fi

    echo -e "${GREEN}Message sent: $message_id${NC}"
}

# Test 1: Counter App
APP1=$(create_app "Create a vibrant counter app with a large number display in the center, a green + button and a red - button. Use bright, playful colors." "rainbow-counter-test")
sleep 1

# Test 2: Todo List
APP2=$(create_app "Build a clean todo list with: an input field at the top, add button, and a list of todo items below. Each item should have a checkbox and delete button." "simple-todo-test")
sleep 1

# Test 3: Weather Card
APP3=$(create_app "Create a modern weather card showing: temperature (72°F), condition (Sunny), and a simple icon. Use gradients and make it look beautiful." "weather-card-test")
sleep 1

# Test 4: Profile Card
APP4=$(create_app "Design an elegant profile card with: avatar placeholder, name (John Doe), title (Software Engineer), and social links. Make it modern and professional." "profile-card-test")
sleep 1

# Test 5: Color Palette Generator
APP5=$(create_app "Build a color palette generator that shows 5 color boxes in a row. Each box should display the hex code. Add a 'Generate New' button that changes all colors." "color-palette-test")

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Created 5 test apps:${NC}"
for i in "${!APP_IDS[@]}"; do
    echo -e "${GREEN}  App $((i+1)): ${APP_IDS[$i]}${NC}"
done
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Visit $API_URL/my-apps to see your apps"
echo "2. Run 'yarn agent:poll:once' to process pending messages"
echo "3. Verify agent responses appear with mini previews"
echo ""
echo -e "${BLUE}App URLs:${NC}"
for app_id in "${APP_IDS[@]}"; do
    echo "  $API_URL/my-apps/$app_id"
done
