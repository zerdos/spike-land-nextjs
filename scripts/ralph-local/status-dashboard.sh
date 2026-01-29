#!/bin/bash
# Ralph Status Dashboard - Complete system overview

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         RALPH LOCAL ORCHESTRATOR - SYSTEM STATUS               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check main orchestrator
echo "🤖 Main Orchestrator:"
ORCH_PID=$(pgrep -f "ralph:local:watch" | head -1)
if [ -n "$ORCH_PID" ]; then
    echo "   ✅ Running (PID: $ORCH_PID)"
    ORCH_START=$(ps -p "$ORCH_PID" -o lstart= 2>/dev/null)
    echo "   Started: $ORCH_START"
else
    echo "   ❌ Not running"
fi
echo ""

# Check guardian
echo "🛡️  Guardian Monitor:"
GUARD_PID=$(pgrep -f "guardian.sh" | head -1)
if [ -n "$GUARD_PID" ]; then
    echo "   ✅ Running (PID: $GUARD_PID)"
else
    echo "   ❌ Not running"
fi
echo ""

# Count Claude agents
echo "👥 Claude Agent Processes:"
AGENT_COUNT=$(ps aux | grep "claude.*--print" | grep -v grep | wc -l | tr -d ' ')
echo "   Active: $AGENT_COUNT agents"
echo ""

# State from JSON
if [ -f ".claude/ralph-local-state.json" ]; then
    echo "📊 Agent Pool Status:"

    PLAN_RUNNING=$(jq -r '.pools.planning | map(select(.status == "running")) | length' .claude/ralph-local-state.json)
    PLAN_IDLE=$(jq -r '.pools.planning | map(select(.status == "idle")) | length' .claude/ralph-local-state.json)
    DEV_RUNNING=$(jq -r '.pools.developer | map(select(.status == "running")) | length' .claude/ralph-local-state.json)
    DEV_IDLE=$(jq -r '.pools.developer | map(select(.status == "idle")) | length' .claude/ralph-local-state.json)
    TEST_RUNNING=$(jq -r '.pools.tester | map(select(.status == "running")) | length' .claude/ralph-local-state.json)
    TEST_IDLE=$(jq -r '.pools.tester | map(select(.status == "idle")) | length' .claude/ralph-local-state.json)

    echo "   Planning:  $PLAN_RUNNING running / $PLAN_IDLE idle (8 total)"
    echo "   Developer: $DEV_RUNNING running / $DEV_IDLE idle (4 total)"
    echo "   Tester:    $TEST_RUNNING running / $TEST_IDLE idle (4 total)"
    echo ""

    echo "📝 Current Tickets:"
    jq -r '.pools.planning[] | select(.status == "running" and .ticketId != null) | "   Planning: \(.ticketId) (agent: \(.id))"' .claude/ralph-local-state.json
    jq -r '.pools.developer[] | select(.status == "running" and .ticketId != null) | "   Developer: \(.ticketId) (agent: \(.id))"' .claude/ralph-local-state.json
    jq -r '.pools.tester[] | select(.status == "running" and .ticketId != null) | "   Tester: \(.ticketId) (agent: \(.id))"' .claude/ralph-local-state.json
    echo ""

    echo "📈 Progress:"
    COMPLETED=$(jq -r '.completedTickets | length' .claude/ralph-local-state.json)
    FAILED=$(jq -r '.failedTickets | length' .claude/ralph-local-state.json)
    BLOCKED=$(jq -r '.blockedTickets | length' .claude/ralph-local-state.json)
    ITERATION=$(jq -r '.iteration' .claude/ralph-local-state.json)

    echo "   Iteration: $ITERATION"
    echo "   Completed: $COMPLETED"
    echo "   Failed:    $FAILED"
    echo "   Blocked:   $BLOCKED"
fi
echo ""

# Check open PRs
echo "🔗 Open PRs:"
gh pr list --label "ralph" --json number,title,state,statusCheckRollup 2>/dev/null | \
    jq -r '.[] | "   #\(.number): \(.title) (\(.state))"' | head -5 || echo "   No Ralph PRs found"
echo ""

# Recent activity from log
echo "📝 Recent Activity (last 5 minutes):"
if [ -f "/tmp/ralph-orchestrator.log" ]; then
    tail -50 /tmp/ralph-orchestrator.log | grep -E "Plan ready|Code ready|PR created|Merging|spawned" | tail -5 || echo "   No recent activity"
else
    echo "   Log file not found"
fi
echo ""

# Check log file size
if [ -f "/tmp/ralph-orchestrator.log" ]; then
    LOG_SIZE=$(du -h /tmp/ralph-orchestrator.log | cut -f1)
    echo "📄 Log file: /tmp/ralph-orchestrator.log ($LOG_SIZE)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Commands:"
echo "  ./scripts/ralph-local/monitor.sh         # Live monitoring"
echo "  yarn ralph:local:status                  # Detailed status"
echo "  tail -f /tmp/ralph-orchestrator.log      # Watch logs"
echo "  ./scripts/ralph-local/healthcheck.sh     # Run health check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
