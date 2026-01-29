---
active: true
pool_planning: 10
pool_developer: 4
pool_reviewer: 2
pool_tester: 2
pool_fixer: 1
sync_interval_min: 2
stale_threshold_min: 30
max_retries: 2
max_review_iterations: 3
auto_merge: true
main_branch_priority: true
issue_sync_enabled: true
commit_plans: true
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
| Reviewer  | 2    | Local code review before PR creation        |
| Tester    | 2    | Create PRs for reviewed code                |
| Fixer     | 1    | Fix PRs with failing CI or change requests  |
| **Total** | 19   | Parallel local Claude Code agents           |

## Workflow

```
                         ENHANCED RALPH LOCAL FLOW
┌─────────────────────────────────────────────────────────────────────────┐
│ Step -1: Sync GitHub issues → .github/issues/{id}.md                    │
│          (commit new issues, remove closed ones)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Planning Agent                                                         │
│    Input:  @.github/issues/867.md                                       │
│    Output: docs/plans/867.md (committed)                                │
│    Marker: <PLAN_READY ticket="#867" path="docs/plans/867.md" />        │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Developer Agent                                                        │
│    Worktree: ../ralph-worktrees/867                                     │
│    Input:  @docs/plans/867.md                                           │
│    Output: Code changes pushed to ralph/867 branch                      │
│    Marker: <CODE_READY ticket="#867" branch="ralph/867" />              │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Reviewer Agent (LOCAL - up to 3 iterations)                            │
│    Worktree: ../ralph-worktrees/867                                     │
│    Task: Run tests, lint, typecheck locally                             │
│    If issues → request changes from developer                           │
│    If passes → <REVIEW_PASSED ticket="#867" iterations="1" />           │
│    After 3 iterations → <REVIEW_PASSED ... force="true" />              │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tester Agent → Creates PR                                              │
│    Only runs AFTER local review passes                                  │
│    Marker: <PR_CREATED ticket="#867" pr_url="..." />                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CI Review (claude-code-review bot)                                     │
│    If approved + CI passing → Auto-merge                                │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Post-Merge Cleanup                                                     │
│    - Delete worktree: ../ralph-worktrees/867                            │
│    - Delete issue file: .github/issues/867.md                           │
│    - Delete local branch                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Enhanced Flow Steps

```
Step -1:   Sync GitHub issues to .github/issues/
Step 0:    Cleanup stale agents
Step 0.5:  Check main branch CI (if failing, spawn fixer immediately)
Step 0.75: Detect PRs needing fixes (CHANGES_REQUESTED or CI_FAILING)
Step 1:    Check PR status (detect approval signals, auto-merge)
Step 2:    Collect agent outputs
Step 3:    Route plans to developers
Step 3.5:  Route PR fixes to fixers
Step 3.75: Route code to reviewers (local review)
Step 3.8:  Process review results
Step 4:    Route reviewed code to testers
Step 5:    Fill planning pool
Step 6:    Handle blocked agents
Step 7:    Sync all worktrees with main
```

### Planning Agents (10)

- Pick open GitHub issues (synced to `.github/issues/`)
- Analyze requirements
- Create implementation plan (committed to `docs/plans/`)
- Output: `<PLAN_READY ticket="#123" path="docs/plans/123.md" />`

### Developer Agents (4)

- Receive plans from planning queue
- Work in isolated git worktrees
- Implement the plan
- Output: `<CODE_READY ticket="#123" branch="ralph/123" />`

### Reviewer Agents (2) - NEW

- Local code review before PR creation
- Run tests, lint, typecheck locally
- Up to 3 iterations to fix issues
- Output: `<REVIEW_PASSED ticket="#123" iterations="1" force="false" />`
- Or: `<REVIEW_CHANGES_REQUESTED ticket="#123" feedback="..." iteration="1" />`

### Tester Agents (2)

- Only runs after local review passes
- Create PR for reviewed code
- Output: `<PR_CREATED ticket="#123" pr_url="https://..." />`

### Fixer Agents (1)

- Fix PRs with failing CI or change requests
- Work on main branch failures as highest priority
- Output: `<PR_FIXED pr_number="456" ticket="#123" />`
- Output: `<MAIN_BUILD_FIX run_id="123456" fixed="true" />`

## Settings

| Setting                 | Value                    | Description                                            |
| ----------------------- | ------------------------ | ------------------------------------------------------ |
| `sync_interval_min`     | 2                        | How often to run orchestration loop (minutes)          |
| `stale_threshold_min`   | 30                       | Mark agents as stale after this time without heartbeat |
| `max_retries`           | 2                        | Retry failed tickets before marking as failed          |
| `max_review_iterations` | 3                        | Max local review cycles before forcing PR creation     |
| `auto_merge`            | true                     | Automatically merge approved PRs with passing CI       |
| `main_branch_priority`  | true                     | Stop other work when main branch CI is failing         |
| `issue_sync_enabled`    | true                     | Sync GitHub issues to local `.github/issues/`          |
| `commit_plans`          | true                     | Commit plans to `docs/plans/` (not temp dir)           |
| `approval_keywords`     | ["lgtm", "ship it", ...] | Keywords that signal PR approval for auto-merge        |
| `repo`                  | zerdos/spike-land-nextjs | GitHub repository to sync issues from (owner/repo)     |

> **Note**: When using Ralph Local on a different repository, update the `repo` setting in the frontmatter at the top of this file to match your target repository (e.g., `repo: your-org/your-repo`).

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

| Path                             | Contents                         |
| -------------------------------- | -------------------------------- |
| `.claude/ralph-local-state.json` | Orchestrator state               |
| `.github/issues/`                | Synced GitHub issues (committed) |
| `docs/plans/`                    | Implementation plans (committed) |
| `/tmp/ralph-output/`             | Agent output files (ephemeral)   |
| `/tmp/ralph-pids/`               | Agent PID files (ephemeral)      |
| `../ralph-worktrees/`            | Git worktrees per ticket         |

## Markers

Agents communicate completion via XML markers in their output:

```xml
<!-- Planning agent -->
<PLAN_READY ticket="#123" path="docs/plans/123.md" />

<!-- Developer agent -->
<CODE_READY ticket="#123" branch="ralph/123" />

<!-- Reviewer agent (NEW) -->
<REVIEW_PASSED ticket="#123" iterations="1" force="false" />
<REVIEW_CHANGES_REQUESTED ticket="#123" feedback="Fix the type error in line 42" iteration="1" />

<!-- Tester agent -->
<PR_CREATED ticket="#123" pr_url="https://github.com/zerdos/spike-land-nextjs/pull/456" />

<!-- Fixer agent -->
<PR_FIXED pr_number="456" ticket="#123" />
<MAIN_BUILD_FIX run_id="123456" fixed="true" />

<!-- Error states -->
<BLOCKED ticket="#123" reason="Missing API documentation" />
<ERROR ticket="#123" error="Build failed: ..." />
```
