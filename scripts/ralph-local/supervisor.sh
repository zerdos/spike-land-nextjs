#!/usr/bin/env bash
# Ralph Local Supervisor
# Keeps the orchestrator running with automatic restart on failure
#
# Usage:
#   ./scripts/ralph-local/supervisor.sh        # Run with auto-restart
#   ./scripts/ralph-local/supervisor.sh stop   # Stop supervisor and orchestrator

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PIDFILE="/tmp/ralph-supervisor.pid"
ORCHESTRATOR_PIDFILE="/tmp/ralph-orchestrator.pid"
LOGFILE="/tmp/ralph-supervisor.log"

# Configuration
MAX_RESTART_ATTEMPTS=5
RESTART_WINDOW_SECONDS=300  # 5 minutes
MIN_RUNTIME_SECONDS=60      # Minimum runtime before counting as a "real" run
BACKOFF_MULTIPLIER=2
INITIAL_BACKOFF=5

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"
}

cleanup() {
    log "Supervisor shutting down..."
    if [[ -f "$ORCHESTRATOR_PIDFILE" ]]; then
        local pid
        pid=$(cat "$ORCHESTRATOR_PIDFILE" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            log "Stopping orchestrator (PID $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 2
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$ORCHESTRATOR_PIDFILE"
    fi
    rm -f "$PIDFILE"
    log "Supervisor stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

is_orchestrator_running() {
    if [[ -f "$ORCHESTRATOR_PIDFILE" ]]; then
        local pid
        pid=$(cat "$ORCHESTRATOR_PIDFILE" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

start_orchestrator() {
    log "Starting orchestrator..."
    cd "$PROJECT_DIR"

    # Run orchestrator in background, capture PID
    yarn ralph:local:watch > /tmp/ralph-orchestrator.log 2>&1 &
    local pid=$!
    echo "$pid" > "$ORCHESTRATOR_PIDFILE"

    # Give it a moment to fail fast if there's an immediate error
    sleep 2

    if kill -0 "$pid" 2>/dev/null; then
        log "Orchestrator started with PID $pid"
        return 0
    else
        log "Orchestrator failed to start"
        return 1
    fi
}

stop_command() {
    log "Stop command received"
    if [[ -f "$PIDFILE" ]]; then
        local supervisor_pid
        supervisor_pid=$(cat "$PIDFILE" 2>/dev/null || echo "")
        if [[ -n "$supervisor_pid" ]] && kill -0 "$supervisor_pid" 2>/dev/null; then
            log "Stopping supervisor (PID $supervisor_pid)..."
            kill "$supervisor_pid"
        fi
    fi
    if is_orchestrator_running; then
        local orch_pid
        orch_pid=$(cat "$ORCHESTRATOR_PIDFILE" 2>/dev/null || echo "")
        log "Stopping orchestrator (PID $orch_pid)..."
        kill "$orch_pid" 2>/dev/null || true
    fi
    rm -f "$PIDFILE" "$ORCHESTRATOR_PIDFILE"
    log "Stopped"
    exit 0
}

main() {
    # Handle stop command
    if [[ "${1:-}" == "stop" ]]; then
        stop_command
    fi

    # Check if supervisor is already running
    if [[ -f "$PIDFILE" ]]; then
        local existing_pid
        existing_pid=$(cat "$PIDFILE" 2>/dev/null || echo "")
        if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
            log "Supervisor already running with PID $existing_pid"
            exit 1
        fi
    fi

    # Write our PID
    echo $$ > "$PIDFILE"
    log "Supervisor started with PID $$"

    local restart_count=0
    local window_start
    window_start=$(date +%s)
    local backoff=$INITIAL_BACKOFF
    local last_start_time=0

    while true; do
        local now
        now=$(date +%s)

        # Reset restart counter if we're outside the window
        if (( now - window_start > RESTART_WINDOW_SECONDS )); then
            restart_count=0
            window_start=$now
            backoff=$INITIAL_BACKOFF
        fi

        # Check if too many restarts
        if (( restart_count >= MAX_RESTART_ATTEMPTS )); then
            log "ERROR: Too many restarts ($restart_count) in ${RESTART_WINDOW_SECONDS}s window"
            log "Waiting ${RESTART_WINDOW_SECONDS}s before retry..."
            sleep $RESTART_WINDOW_SECONDS
            restart_count=0
            window_start=$(date +%s)
            backoff=$INITIAL_BACKOFF
        fi

        # Start orchestrator if not running
        if ! is_orchestrator_running; then
            # Calculate if last run was too short (crash loop detection)
            local runtime=$((now - last_start_time))
            if (( last_start_time > 0 && runtime < MIN_RUNTIME_SECONDS )); then
                log "WARNING: Orchestrator ran for only ${runtime}s (crash loop detected)"
                log "Backing off for ${backoff}s..."
                sleep $backoff
                backoff=$((backoff * BACKOFF_MULTIPLIER))
                if (( backoff > 120 )); then
                    backoff=120  # Cap at 2 minutes
                fi
            fi

            last_start_time=$(date +%s)
            if start_orchestrator; then
                restart_count=$((restart_count + 1))
                log "Restart count: $restart_count / $MAX_RESTART_ATTEMPTS in window"
            else
                log "Failed to start orchestrator, will retry..."
            fi
        fi

        # Health check interval
        sleep 10
    done
}

main "$@"
