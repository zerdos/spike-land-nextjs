#!/bin/bash
# Ralph Local Monitor - Live status dashboard
# Shows real-time agent status and recent activity

REFRESH_INTERVAL=${1:-5}  # Default 5 seconds
LOG_FILE="/tmp/ralph-orchestrator.log"
STATE_FILE=".claude/ralph-local-state.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear_screen() {
    printf '\033[2J\033[H'
}

get_agent_status() {
    if [ -f "$STATE_FILE" ]; then
        jq -r '.pools | to_entries[] | .key as $pool | .value[] |
            "\($pool)|\(.id)|\(.status)|\(.ticketId // "none")|\(.pid // 0)"' "$STATE_FILE"
    fi
}

get_queue_stats() {
    if [ -f "$STATE_FILE" ]; then
        local pending_plans=$(jq -r '.pendingPlans | length' "$STATE_FILE")
        local pending_code=$(jq -r '.pendingCode | length' "$STATE_FILE")
        local completed=$(jq -r '.completedTickets | length' "$STATE_FILE")
        local failed=$(jq -r '.failedTickets | length' "$STATE_FILE")
        local blocked=$(jq -r '.blockedTickets | length' "$STATE_FILE")
        local iteration=$(jq -r '.iteration' "$STATE_FILE")

        echo "$iteration|$pending_plans|$pending_code|$completed|$failed|$blocked"
    fi
}

get_recent_activity() {
    if [ -f "$LOG_FILE" ]; then
        tail -20 "$LOG_FILE" | grep -E "(Plan ready|Code ready|PR created|Merging|Blocked|Error)" || echo "No recent activity"
    fi
}

show_dashboard() {
    clear_screen

    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║         RALPH LOCAL ORCHESTRATOR - LIVE MONITOR                ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # System Status
    local pid=$(pgrep -f "ralph:local:watch" | head -1)
    if [ -n "$pid" ]; then
        echo -e "${GREEN}● Orchestrator Status: ${BOLD}RUNNING${NC} (PID: $pid)"
    else
        echo -e "${RED}● Orchestrator Status: ${BOLD}STOPPED${NC}"
        return
    fi

    echo -e "$(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # Queue Stats
    read iteration pending_plans pending_code completed failed blocked < <(get_queue_stats | tr '|' ' ')
    echo -e "${BOLD}${MAGENTA}📊 Status${NC}"
    echo -e "   Iteration: ${BOLD}$iteration${NC}"
    echo -e "   Pending Plans: ${YELLOW}$pending_plans${NC}"
    echo -e "   Pending Code:  ${YELLOW}$pending_code${NC}"
    echo -e "   Completed:     ${GREEN}$completed${NC}"
    echo -e "   Failed:        ${RED}$failed${NC}"
    echo -e "   Blocked:       ${RED}$blocked${NC}"
    echo ""

    # Agent Pools
    echo -e "${BOLD}${BLUE}🤖 Agent Pools${NC}"
    echo ""

    # Planning Pool
    echo -e "${BOLD}Planning Agents (8):${NC}"
    get_agent_status | grep "^planning" | while IFS='|' read -r pool id status ticket pid; do
        local status_icon="⚪"
        local status_color="$NC"
        case "$status" in
            running) status_icon="🟢"; status_color="$GREEN" ;;
            idle) status_icon="⚪"; status_color="$NC" ;;
            stale) status_icon="🔴"; status_color="$RED" ;;
        esac
        printf "   %s %-15s %s%-10s%s %s\n" "$status_icon" "$id" "$status_color" "$status" "$NC" "$ticket"
    done
    echo ""

    # Developer Pool
    echo -e "${BOLD}Developer Agents (4):${NC}"
    get_agent_status | grep "^developer" | while IFS='|' read -r pool id status ticket pid; do
        local status_icon="⚪"
        local status_color="$NC"
        case "$status" in
            running) status_icon="🟢"; status_color="$GREEN" ;;
            idle) status_icon="⚪"; status_color="$NC" ;;
            stale) status_icon="🔴"; status_color="$RED" ;;
        esac
        printf "   %s %-15s %s%-10s%s %s\n" "$status_icon" "$id" "$status_color" "$status" "$NC" "$ticket"
    done
    echo ""

    # Tester Pool
    echo -e "${BOLD}Tester Agents (4):${NC}"
    get_agent_status | grep "^tester" | while IFS='|' read -r pool id status ticket pid; do
        local status_icon="⚪"
        local status_color="$NC"
        case "$status" in
            running) status_icon="🟢"; status_color="$GREEN" ;;
            idle) status_icon="⚪"; status_color="$NC" ;;
            stale) status_icon="🔴"; status_color="$RED" ;;
        esac
        printf "   %s %-15s %s%-10s%s %s\n" "$status_icon" "$id" "$status_color" "$status" "$NC" "$ticket"
    done
    echo ""

    # Recent Activity
    echo -e "${BOLD}${YELLOW}📝 Recent Activity${NC}"
    echo "─────────────────────────────────────────────────────────────────"
    get_recent_activity
    echo ""

    echo -e "${CYAN}Refreshing every ${REFRESH_INTERVAL}s... Press Ctrl+C to exit${NC}"
}

# Main loop
while true; do
    show_dashboard
    sleep "$REFRESH_INTERVAL"
done
