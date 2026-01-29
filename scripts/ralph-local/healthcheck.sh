#!/bin/bash
# Ralph Healthcheck - Auto-fix common issues

echo "🏥 Ralph Healthcheck"
echo ""

# 1. Check orchestrator
if ! ps -p $(cat /tmp/ralph-orchestrator.pid 2>/dev/null) > /dev/null 2>&1; then
    echo "⚠️  Orchestrator not running. Restarting..."
    cd /Users/z/Developer/spike-land-nextjs
    yarn ralph:local:watch &
    echo $! > /tmp/ralph-orchestrator.pid
    echo "✅ Restarted with PID $(cat /tmp/ralph-orchestrator.pid)"
else
    echo "✅ Orchestrator running"
fi

# 2. Check for zombie agents
echo ""
echo "🧟 Checking for zombie agents..."
ZOMBIE_COUNT=0
for pidfile in /tmp/ralph-pids/*.pid; do
    if [ -f "$pidfile" ]; then
        PID=$(cat "$pidfile")
        if ! ps -p "$PID" > /dev/null 2>&1; then
            echo "   Removing stale PID file: $pidfile"
            rm "$pidfile"
            ((ZOMBIE_COUNT++))
        fi
    fi
done
echo "   Cleaned up $ZOMBIE_COUNT zombie PIDs"

# 3. Check disk space
echo ""
echo "💾 Checking disk space..."
DISK_USAGE=$(df -h /tmp | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  /tmp is ${DISK_USAGE}% full. Cleaning old outputs..."
    find /tmp/ralph-output -type f -mtime +1 -delete
    find /tmp/ralph-plans -type f -mtime +1 -delete
    echo "✅ Cleaned old files"
else
    echo "✅ Disk space OK (${DISK_USAGE}% used)"
fi

# 4. Check state file
echo ""
echo "📁 Checking state file..."
if [ -f ".claude/ralph-local-state.json" ]; then
    SIZE=$(stat -f%z .claude/ralph-local-state.json 2>/dev/null || stat -c%s .claude/ralph-local-state.json 2>/dev/null)
    echo "✅ State file exists ($SIZE bytes)"
else
    echo "⚠️  State file missing"
fi

echo ""
echo "✅ Healthcheck complete"
