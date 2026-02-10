#!/bin/bash
# Ralph Guardian - Continuous monitoring and auto-recovery

END_TIME=$(($(date +%s) + 43200))  # 12 hours
HEALTHCHECK="/Users/z/Developer/spike-land-nextjs/scripts/ralph-local/healthcheck.sh"
LOG="/tmp/ralph-guardian.log"

echo "🛡️  Ralph Guardian started at $(date)" | tee -a "$LOG"
echo "Will monitor until $(date -r $END_TIME)" | tee -a "$LOG"

while [ $(date +%s) -lt $END_TIME ]; do
    # Run healthcheck every 5 minutes
    if [ $(($(date +%s) % 300)) -lt 60 ]; then
        echo "" | tee -a "$LOG"
        echo "🔍 Running healthcheck at $(date)" | tee -a "$LOG"
        "$HEALTHCHECK" 2>&1 | tee -a "$LOG"
    fi
    
    # Check for errors in orchestrator output
    if tail -n 50 /private/tmp/claude-501/-Users-z-Developer-spike-land-nextjs/tasks/be4fffc.output 2>/dev/null | grep -qi "error\|failed\|exception"; then
        echo "⚠️  Errors detected in orchestrator output" | tee -a "$LOG"
    fi
    
    sleep 60
done

echo "🛡️  Guardian completed 12-hour watch at $(date)" | tee -a "$LOG"
