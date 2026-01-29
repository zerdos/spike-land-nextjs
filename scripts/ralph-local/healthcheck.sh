#!/bin/bash
# Ralph Local Health Check & Auto-Recovery
# Monitors orchestrator health and automatically fixes issues

LOG_FILE="/tmp/ralph-orchestrator.log"
STATE_FILE=".claude/ralph-local-state.json"
PID_FILE="/tmp/ralph-orchestrator.pid"
MAX_STALE_TIME=3600  # 1 hour in seconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a /tmp/ralph-healthcheck.log
}

check_orchestrator_running() {
    local pid=$(pgrep -f "ralph:local:watch" | head -1)
    if [ -n "$pid" ]; then
        echo "$pid" > "$PID_FILE"
        return 0
    fi
    return 1
}

check_for_errors() {
    if [ -f "$LOG_FILE" ]; then
        local recent_errors=$(tail -100 "$LOG_FILE" | grep -i "error\|fatal\|exception" | wc -l)
        if [ "$recent_errors" -gt 10 ]; then
            log "${RED}⚠️  High error rate detected: $recent_errors errors in last 100 lines${NC}"
            return 1
        fi
    fi
    return 0
}

check_stale_agents() {
    if [ ! -f "$STATE_FILE" ]; then
        return 0
    fi

    local now=$(date +%s)
    local stale_count=0

    # Check each running agent's start time
    jq -r '.pools[] | .[] | select(.status == "running") | .startedAt' "$STATE_FILE" 2>/dev/null | while read -r started_at; do
        if [ -n "$started_at" ]; then
            local started_ts=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${started_at:0:19}" +%s 2>/dev/null || echo 0)
            local age=$((now - started_ts))
            if [ "$age" -gt "$MAX_STALE_TIME" ]; then
                ((stale_count++))
            fi
        fi
    done

    if [ "$stale_count" -gt 0 ]; then
        log "${YELLOW}⚠️  Found $stale_count potentially stale agents${NC}"
        return 1
    fi
    return 0
}

restart_orchestrator() {
    log "${YELLOW}🔄 Restarting orchestrator...${NC}"

    # Kill existing process
    local pid=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$pid" ]; then
        kill "$pid" 2>/dev/null
        sleep 2
        kill -9 "$pid" 2>/dev/null
    fi

    # Archive old log
    if [ -f "$LOG_FILE" ]; then
        mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d-%H%M%S)"
    fi

    # Start new instance
    cd /Users/z/Developer/spike-land-nextjs || exit 1
    nohup yarn ralph:local:watch > "$LOG_FILE" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "$PID_FILE"

    log "${GREEN}✅ Orchestrator restarted with PID: $new_pid${NC}"
}

get_status_summary() {
    if [ ! -f "$STATE_FILE" ]; then
        echo "No state file found"
        return
    fi

    local iteration=$(jq -r '.iteration' "$STATE_FILE")
    local running=$(jq '[.pools[] | .[] | select(.status == "running")] | length' "$STATE_FILE")
    local idle=$(jq '[.pools[] | .[] | select(.status == "idle")] | length' "$STATE_FILE")
    local completed=$(jq '.completedTickets | length' "$STATE_FILE")
    local failed=$(jq '.failedTickets | length' "$STATE_FILE")

    echo "Iteration: $iteration | Running: $running | Idle: $idle | Completed: $completed | Failed: $failed"
}

# Main health check
main() {
    log "${GREEN}🏥 Running health check...${NC}"

    local needs_restart=0

    # Check if orchestrator is running
    if ! check_orchestrator_running; then
        log "${RED}❌ Orchestrator not running${NC}"
        needs_restart=1
    else
        log "${GREEN}✅ Orchestrator running${NC}"
    fi

    # Check for errors
    if ! check_for_errors; then
        needs_restart=1
    else
        log "${GREEN}✅ Error rate normal${NC}"
    fi

    # Check for stale agents
    if ! check_stale_agents; then
        log "${YELLOW}⚠️  Stale agents detected (will be cleaned by orchestrator)${NC}"
    else
        log "${GREEN}✅ No stale agents${NC}"
    fi

    # Status summary
    log "📊 $(get_status_summary)"

    # Restart if needed
    if [ "$needs_restart" -eq 1 ]; then
        restart_orchestrator
    fi

    log "${GREEN}✅ Health check complete${NC}"
}

# Run health check
main
