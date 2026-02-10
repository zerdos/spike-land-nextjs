---
name: bolt
description: Orchestrate development work through MCP. Manages BridgeMind board, GitHub sync, Jules sessions, and PR lifecycle. Use /bolt to start orchestration, check status, or manage work items.
---

# Bolt: MCP-Native Agent Orchestrator

Bolt orchestrates development work through MCP, replacing the legacy Ralph system.

## Commands

### /bolt status
Show current orchestrator status:
- Active tasks and their states
- BridgeMind connection health
- GitHub Projects sync status
- Jules session status

Use the `bolt_status` MCP tool from spike-land gateway.

### /bolt sync
Sync BridgeMind board → GitHub Projects V2 (one-way):
1. Call `bridgemind_list_tasks` to get board items
2. Call `sync_bridgemind_to_github` to push to GitHub
3. Report sync results

### /bolt plan
Pick highest-priority "Ready" items and create Jules sessions:
1. Call `bridgemind_list_tasks` with status "Ready for Dev"
2. For each item (up to WIP limit):
   - Call `jules_create_session` with task details
   - Call `bridgemind_update_task` to set status "In Progress"
3. Track sessions in state

### /bolt check
Monitor active Jules sessions:
1. For each active task in state:
   - Call `jules_get_session` to check status
   - If COMPLETED: check for PR, update BridgeMind
   - If FAILED: log failure, update BridgeMind
   - If AWAITING_PLAN_APPROVAL: auto-approve via `jules_approve_plan`
2. Update state file

### /bolt merge
Process approved PRs:
1. For each task with PR_CREATED status:
   - Call `github_get_pr_status` to check CI and reviews
   - If CI green + approved: merge and close
   - Update BridgeMind task status

### /bolt loop
Run all steps in sequence: sync → plan → check → merge
Repeat every 5 minutes (configurable).

## State File

State is stored in `.claude/bolt-state.json` (git-tracked).

## Error Handling

- If BridgeMind is down: fall back to direct GitHub issues
- If Jules is unavailable: skip plan step, continue check/merge
- If sync fails: log error, continue with stale data
- Always update state after each step

## Human Override

Just type in the conversation to override any Bolt decision.
Bolt will respect manual changes and not revert them.

## Configuration

Configured via `.claude/bolt-state.json`:
- `wipLimit`: Max concurrent Jules sessions (default: 3)
- `iterationInterval`: Minutes between loop iterations (default: 5)
- `autoMerge`: Auto-merge when CI green + approved (default: false)
- `autoApprove`: Auto-approve Jules plans (default: true)
