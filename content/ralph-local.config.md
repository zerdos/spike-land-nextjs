---
active: true
pool_planning: 8
pool_developer: 4
pool_tester: 4
sync_interval_min: 2
stale_threshold_min: 30
max_retries: 2
auto_merge: true
repo: zerdos/spike-land-nextjs
---

# Ralph Local Orchestrator Configuration

> "I'm learnding!" - Ralph, implementing features

## Agent Pool Configuration

This file configures the Ralph Local multi-agent orchestrator.

| Pool      | Size | Role                                        |
| --------- | ---- | ------------------------------------------- |
| Planning  | 8    | Analyze issues, create implementation plans |
| Developer | 4    | Implement code based on plans               |
| Tester    | 4    | Review code, find bugs, create PRs          |
| **Total** | 16   | Parallel local Claude Code agents           |

## Workflow

```
GH Issues → Planning Agents → Plans → Developer Agents → Code → Tester Agents → PRs
```

### Planning Agents (8)

- Pick open GitHub issues
- Analyze requirements
- Create implementation plan
- Output: `<PLAN_READY ticket="#123" path="/tmp/ralph-plans/123.md" />`

### Developer Agents (4)

- Receive plans from planning queue
- Work in isolated git worktrees
- Implement the plan
- Output: `<CODE_READY ticket="#123" branch="ralph/123" />`

### Tester Agents (4)

- Review implemented code
- Run tests, check types
- Create PR if passing
- Output: `<PR_CREATED ticket="#123" pr_url="https://..." />`

## Settings

| Setting               | Value | Description                                            |
| --------------------- | ----- | ------------------------------------------------------ |
| `sync_interval_min`   | 2     | How often to run orchestration loop (minutes)          |
| `stale_threshold_min` | 30    | Mark agents as stale after this time without heartbeat |
| `max_retries`         | 2     | Retry failed tickets before marking as failed          |
| `auto_merge`          | true  | Automatically merge approved PRs with passing CI       |

## Commands

```bash
# Single iteration
yarn ralph:local

# Watch mode (runs every 2 minutes)
yarn ralph:local:watch

# Dry run (no changes)
yarn ralph:local:dry-run

# Show status
yarn ralph:local:status
```

## File Locations

| Path                             | Contents                 |
| -------------------------------- | ------------------------ |
| `.claude/ralph-local-state.json` | Orchestrator state       |
| `/tmp/ralph-output/`             | Agent output files       |
| `/tmp/ralph-pids/`               | Agent PID files          |
| `/tmp/ralph-plans/`              | Generated plans          |
| `../ralph-worktrees/`            | Git worktrees per ticket |

## Markers

Agents communicate completion via XML markers in their output:

```xml
<PLAN_READY ticket="#123" path="/tmp/ralph-plans/123.md" />
<CODE_READY ticket="#123" branch="ralph/123" />
<PR_CREATED ticket="#123" pr_url="https://github.com/zerdos/spike-land-nextjs/pull/456" />
<BLOCKED ticket="#123" reason="Missing API documentation" />
<ERROR ticket="#123" error="Build failed: ..." />
```
