#!/bin/bash
# Ralph Guardian - Continuous health monitoring and auto-recovery
# Runs health checks every 5 minutes and restarts if needed

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTHCHECK="$SCRIPT_DIR/healthcheck.sh"
CHECK_INTERVAL=300  # 5 minutes
RUNTIME_HOURS=${1:-12}  # Default 12 hours

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a /tmp/ralph-guardian.log
}

main() {
    local start_time=$(date +%s)
    local end_time=$((start_time + RUNTIME_HOURS * 3600))

    log "🛡️  Ralph Guardian started (will run for $RUNTIME_HOURS hours)"

    while [ $(date +%s) -lt $end_time ]; do
        # Run health check
        bash "$HEALTHCHECK"

        # Calculate remaining time
        local now=$(date +%s)
        local remaining=$((end_time - now))
        local hours=$((remaining / 3600))
        local minutes=$(((remaining % 3600) / 60))

        log "⏰ Next check in 5 minutes (${hours}h ${minutes}m remaining)"
        sleep $CHECK_INTERVAL
    done

    log "🏁 Ralph Guardian completed $RUNTIME_HOURS hour run"
}

main
