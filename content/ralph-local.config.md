---
active: true
pool_planning: 10
pool_developer: 4
pool_tester: 2
pool_fixer: 1
sync_interval_min: 2
stale_threshold_min: 30
max_retries: 2
auto_merge: true
main_branch_priority: true
worktree_pool_size: 4
worktree_pool_dir: "../ralph-worktrees/.pool"
approval_keywords:
  - "lgtm"
  - "LGTM"
  - "looks good"
  - "Looks good"
  - "ship it"
  - "Ship it"
  - "approved"
  - "Approved"
  - "ready to merge"
  - "Ready to merge"
repo: zerdos/spike-land-nextjs
---

# Ralph Local Orchestrator Configuration

> "I'm learnding!" - Ralph, implementing features

## Agent Pool Configuration

This file configures the Ralph Local multi-agent orchestrator.

| Pool      | Size | Role                                        |
| --------- | ---- | ------------------------------------------- |
| Planning  | 10   | Analyze issues, create implementation plans |
| Developer | 4    | Implement code based on plans               |
| Tester    | 2    | Review code, find bugs, create PRs          |
| Fixer     | 1    | Fix PRs with failing CI or change requests  |
| **Total** | 17   | Parallel local Claude Code agents           |

## Workflow

```
GH Issues → Planning Agents → Plans → Developer Agents → Code → Tester Agents → PRs
                                                                    ↓
                                        Fixer Agents ← PRs with failing CI/changes requested
                                                                    ↓
                                                            Auto-merge (if approved)
```

### Enhanced Flow

```
Step 0:    Cleanup stale agents
           Check & replenish worktree pool
Step 0.5:  Check main branch CI (if failing, spawn fixer immediately)
Step 0.75: Detect PRs needing fixes (CHANGES_REQUESTED or CI_FAILING)
Step 1:    Check PR status (detect approval signals, auto-merge)
Step 2:    Collect agent outputs
Step 3:    Route plans to developers
Step 3.5:  Route PR fixes to fixers
Step 4:    Route code to testers
Step 5:    Fill planning pool
Step 6:    Handle blocked agents
Step 7:    Sync branches
```

## Worktree Pool

The worktree pool pre-creates "warm" worktrees with dependencies already installed,
eliminating the ~5 minute `yarn install` delay when assigning work to developer agents.

### How It Works

1. **On startup** (watch mode), the pool initializes up to `worktree_pool_size` warm worktrees
2. **When a developer needs a worktree**, it's acquired instantly from the pool
3. **After acquisition**, the pool automatically replenishes in the background
4. **If the pool is empty**, falls back to fresh worktree creation (slow)

### Pool Structure

```
../ralph-worktrees/
├── .pool/                    # Pool directory
│   ├── warm-1/               # Pre-warmed worktree (ready to use)
│   ├── warm-2/               # Pre-warmed worktree (ready to use)
│   └── ...
├── 520/                      # Active ticket worktree (claimed from pool)
└── 521/                      # Active ticket worktree
```

### Acquisition Flow

1. Pick first available warm worktree (e.g., `warm-1`)
2. Rename branch: `ralph/pool-1` → `ralph/520`
3. Move directory: `.pool/warm-1` → `520`
4. Copy `.env.local` from main repo
5. Trigger background replenishment
6. Return path instantly (no yarn install!)

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

### Tester Agents (2)

- Review implemented code
- Run tests, check types
- Create PR if passing
- Output: `<PR_CREATED ticket="#123" pr_url="https://..." />`

### Fixer Agents (1)

- Fix PRs with failing CI or change requests
- Work on main branch failures as highest priority
- Output: `<PR_FIXED pr_number="456" ticket="#123" />`
- Output: `<MAIN_BUILD_FIX run_id="123456" fixed="true" />`

## Settings

| Setting                | Value                      | Description                                            |
| ---------------------- | -------------------------- | ------------------------------------------------------ |
| `sync_interval_min`    | 2                          | How often to run orchestration loop (minutes)          |
| `stale_threshold_min`  | 30                         | Mark agents as stale after this time without heartbeat |
| `max_retries`          | 2                          | Retry failed tickets before marking as failed          |
| `auto_merge`           | true                       | Automatically merge approved PRs with passing CI       |
| `main_branch_priority` | true                       | Stop other work when main branch CI is failing         |
| `worktree_pool_size`   | 4                          | Number of pre-warmed worktrees to maintain             |
| `worktree_pool_dir`    | "../ralph-worktrees/.pool" | Directory for warm worktree pool                       |
| `approval_keywords`    | ["lgtm", "ship it", ...]   | Keywords that signal PR approval for auto-merge        |

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
| `../ralph-worktrees/.pool/`      | Pre-warmed worktree pool |

## Markers

Agents communicate completion via XML markers in their output:

```xml
<PLAN_READY ticket="#123" path="/tmp/ralph-plans/123.md" />
<CODE_READY ticket="#123" branch="ralph/123" />
<PR_CREATED ticket="#123" pr_url="https://github.com/zerdos/spike-land-nextjs/pull/456" />
<PR_FIXED pr_number="456" ticket="#123" />
<MAIN_BUILD_FIX run_id="123456" fixed="true" />
<BLOCKED ticket="#123" reason="Missing API documentation" />
<ERROR ticket="#123" error="Build failed: ..." />
```
