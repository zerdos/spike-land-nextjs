#!/bin/bash
# Ralph Status Dashboard

clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              🤖 RALPH LOCAL STATUS DASHBOARD 🤖               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if orchestrator is running
if ps -p $(cat /tmp/ralph-orchestrator.pid 2>/dev/null) > /dev/null 2>&1; then
    PID=$(cat /tmp/ralph-orchestrator.pid)
    echo "✅ Orchestrator: RUNNING (PID: $PID)"
else
    echo "❌ Orchestrator: STOPPED"
fi

# Check monitor daemon
if ps -p $(cat /tmp/ralph-monitor.pid 2>/dev/null) > /dev/null 2>&1; then
    echo "✅ Monitor Daemon: RUNNING"
else
    echo "⚠️  Monitor Daemon: STOPPED"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 LATEST ITERATION"
echo "════════════════════════════════════════════════════════════════"
tail -n 50 /private/tmp/claude-501/-Users-z-Developer-spike-land-nextjs/tasks/be4fffc.output 2>/dev/null | grep -A 15 "Iteration [0-9]" | tail -n 20

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📋 ACTIVE AGENTS"
echo "════════════════════════════════════════════════════════════════"
ls -la /tmp/ralph-pids/*.pid 2>/dev/null | wc -l | xargs echo "Active PIDs:"
ls /tmp/ralph-pids/*.pid 2>/dev/null | sed 's|.*/||' | sed 's|\.pid||' | head -10

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🎯 RECENT ACTIVITY"
echo "════════════════════════════════════════════════════════════════"
tail -n 10 /tmp/ralph-monitor.log 2>/dev/null || echo "No monitor logs yet"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Commands:"
echo "  watch -n 30 ./scripts/ralph-local/status-dashboard.sh"
echo "  tail -f /tmp/ralph-monitor.log"
echo "  yarn ralph:local:status"
echo "════════════════════════════════════════════════════════════════"
