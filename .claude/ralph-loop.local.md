---
active: true
iteration: 51
max_iterations: 2000
completion_promise: "WORKFORCE_IDLE"
started_at: "2026-01-10T00:00:00Z"
---

# Ralph Wiggum - Jules Workforce Manager

> "Me fail English? That's unpossible!" - Ralph, probably debugging CI

## Configuration

| Setting      | Value                    | Notes                                |
| ------------ | ------------------------ | ------------------------------------ |
| WIP_LIMIT    | 6                        | Max parallel Jules tasks             |
| AUTO_APPROVE | true                     | Auto-approve Jules plans             |
| AUTO_MERGE   | true                     | Squash merge when all checks pass    |
| MAX_RETRIES  | 2                        | Retry failed tasks before escalating |
| REPO         | zerdos/spike-land-nextjs | Target repository                    |

---

## Status Values Reference

The Status column in the Active Task Registry uses these values:

| Status                     | Description                                  |
| -------------------------- | -------------------------------------------- |
| `PLANNING`                 | Jules is creating implementation plan        |
| `IN_PROGRESS`              | Jules is actively coding                     |
| `PR_CREATED`               | PR exists, checking CI + branch health       |
| `PR_CI_FAILING`            | CI failing on PR, Jules notified to fix      |
| `PR_BEHIND_MAIN`           | Branch behind main, Jules notified to rebase |
| `REVIEW_REQUESTED`         | PR is ready (not draft), awaiting review     |
| `REVIEW_STARTED`           | claude-code-review is reviewing              |
| `REVIEW_APPROVED`          | Review approved, ready to merge              |
| `REVIEW_CHANGES_REQUESTED` | Review requested changes, Jules notified     |
| `JULES_FIXING_REVIEW`      | Jules addressing review feedback             |
| `JULES_FIX_COMPLETED`      | Jules pushed fixes, re-checking CI/branch    |
| `AWAITING_PR_CREATION`     | Session complete, browser creating PR        |
| `COMPLETED`                | Merged and closed                            |
| `FAILED`                   | Failed after max retries, escalated          |
| `DEAD`                     | Session expired/killed - silent removal      |

---

## Active Task Registry

<!-- Ralph: UPDATE THIS EVERY ITERATION! This is your memory. -->

| Issue #        | Session ID           | Status           | PR #    | Retries | Last Updated     |
| -------------- | -------------------- | ---------------- | ------- | ------- | ---------------- |
| #547 (ORB-043) | 6575646228061348411  | COMPLETED        | #670 ✅ | 0       | 2026-01-11T07:22 |
| #532 (ORB-024) | 440787502780889745   | COMPLETED        | #671 ✅ | 0       | 2026-01-11T07:22 |
| #553 (ORB-045) | 8138470443526940844  | IN_PROGRESS      | -       | 0       | 2026-01-11T07:22 |
| #556 (ORB-046) | 6929007678145876615  | REVIEW_REQUESTED | #673    | 0       | 2026-01-11T07:22 |
| #545 (ORB-042) | 10448440558500030178 | COMPLETED        | -       | 0       | 2026-01-11T07:22 |
| BUILD-FIX-TS   | 15900753798124342819 | PLANNING         | -       | 0       | 2026-01-11T07:22 |
| PR-667-CI-FIX  | 17258562081963162276 | COMPLETED        | #667 ✅ | 0       | 2026-01-10T20:00 |
| UNIT-TEST-FIX  | 5134072663804435110  | COMPLETED        | #669 ✅ | 0       | 2026-01-10T19:00 |
| PR-666-FIX     | 909302481420016346   | COMPLETED        | #666 ✅ | 0       | 2026-01-10T19:00 |
| #544 (ORB-026) | 8018068239388301596  | COMPLETED        | #666 ✅ | 0       | 2026-01-10T19:00 |
| #540 (ORB-039) | 16859514757019367340 | COMPLETED        | #668 ✅ | 0       | 2026-01-10T19:00 |
| #531 (ORB-023) | 12664520598883814187 | COMPLETED        | #667 ✅ | 0       | 2026-01-10T19:00 |
| #529 (ORB-021) | 12716452045721348213 | COMPLETED        | #660 ✅ | 0       | 2026-01-10T18:05 |
| #530 (ORB-022) | 1223874300114515623  | COMPLETED        | -       | 0       | 2026-01-10T18:30 |
| #536 (ORB-036) | 12268363689474090994 | COMPLETED        | -       | 0       | 2026-01-10T18:00 |
| #538 (ORB-037) | 13964044312522937140 | COMPLETED        | -       | 0       | 2026-01-10T17:05 |
| #546 (ORB-027) | 13204058962977056689 | COMPLETED        | -       | 1       | 2026-01-10T17:10 |

**Active Count: 3/6** (3 slots available)

**PRs Status:**

| PR # | Issue        | Status        | Notes                     |
| ---- | ------------ | ------------- | ------------------------- |
| #673 | #556 ORB-046 | 🔍 CI_PENDING | A/B Test Framework        |
| #671 | #532 ORB-024 | ✅ MERGED     | Scout Competitor Tracking |
| #670 | #547 ORB-043 | ✅ MERGED     | Visual Workflow Editor    |
| #669 | UNIT-TEST    | ✅ MERGED     | Unit tests fixed          |
| #668 | #540 ORB-039 | ✅ MERGED     | Linear Attribution        |
| #667 | #531 ORB-023 | ✅ MERGED     | Scout Topic Monitoring    |
| #666 | #544 ORB-026 | ✅ MERGED     | Facebook Ads              |

**Build Status (main):**

- CI/CD Pipeline: ⏳ CodeQL in progress (run 20891329337)

**Actions This Iteration (51):**

- 💬 Messaged ORB-043 about PR #670 needing rebase
- 💬 Messaged ORB-045 to proceed and finalize PR
- 🎉 PR #670 (ORB-043) MERGED! Visual Workflow Editor
- 🎉 PR #671 (ORB-024) MERGED! Scout Competitor Tracking
- 🆕 PR #673 created for ORB-046 A/B Test Framework
- 📊 Updated registry with merged PRs

**Issues Flagged for Human Review:**

- ORB-027, ORB-037: Sessions COMPLETED but no PRs (retry exhausted - historical)
- ORB-042: COMPLETED but no PR yet

---

## Each Iteration Workflow

### Step 1: Batch Status Check (ALWAYS FIRST)

```
mcp__spike-land__jules_list_sessions
```

Parse response and categorize ALL sessions into:

| Category             | Statuses                                                          | Action         |
| -------------------- | ----------------------------------------------------------------- | -------------- |
| 🟢 Needs Approval    | `AWAITING_PLAN_APPROVAL`                                          | → Step 2       |
| 🟡 Needs Input       | `AWAITING_USER_FEEDBACK`                                          | → Step 6       |
| 🔵 Needs PR Creation | `COMPLETED` with "⚠️ No PR"                                        | → Step 3.0     |
| 🔄 PR Lifecycle      | `PR_CREATED`, `PR_CI_FAILING`, `PR_BEHIND_MAIN`,                  | → Step 3       |
|                      | `REVIEW_REQUESTED`, `REVIEW_STARTED`, `REVIEW_CHANGES_REQUESTED`, |                |
|                      | `JULES_FIXING_REVIEW`, `JULES_FIX_COMPLETED`, `REVIEW_APPROVED`   |                |
| ✅ Done              | `COMPLETED` with PR merged                                        | → Remove       |
| ❌ Failed            | `FAILED`                                                          | → Step 7       |
| ⏳ Working           | `IN_PROGRESS`, `PLANNING`, `QUEUED`                               | Log & continue |

Update the Active Task Registry table above with current state.

---

### Step 2: Auto-Approve All Pending Plans

For each `AWAITING_PLAN_APPROVAL` session, approve immediately:

```
mcp__spike-land__jules_approve_plan { session_id: "[id]" }
```

**Batch logging:**

```
✅ Approved plans: [session1] (Issue #X), [session2] (Issue #Y)
```

Do NOT wait for approval to take effect - continue to next step.

---

### Step 3: Handle PR Lifecycle

For sessions with a PR (status contains `PR_`, `REVIEW_`, or `JULES_`), or `COMPLETED` sessions:

#### 3.0 Create PR via Browser (for COMPLETED sessions with no PR)

For sessions in registry marked `COMPLETED` with "⚠️ No PR":

**Step 3.0.1: Navigate to Jules session**

```
mcp__playwright__browser_navigate { url: "https://jules.google.com/session/[session_id]" }
```

**Step 3.0.2: Check login status / Get page snapshot**

```
mcp__playwright__browser_snapshot {}
```

If login required, notify user: "🔐 Please log in to jules.google.com - browser is open"
Wait for user confirmation, then re-snapshot.

**Step 3.0.3: Find and click PR creation button**

Look for button with text like "Create pull request", "Open PR", or similar.

```
mcp__playwright__browser_click { element: "Create pull request button", ref: "[ref]" }
```

**Step 3.0.4: Wait for PR creation**

```
mcp__playwright__browser_wait_for { text: "pull request", time: 30 }
```

**Step 3.0.5: Extract PR URL/number**

Snapshot the page, find the GitHub PR link, extract PR number.

**Step 3.0.6: Update registry**

Change status from `COMPLETED` + "⚠️ No PR" to `PR_CREATED` with PR number.
Continue to Step 3.1 for normal PR lifecycle handling.

---

#### 3.1 Check for PR

Get session details to find PR number:

```
mcp__spike-land__jules_get_session { session_id: "[id]" }
```

If no PR exists, log warning and skip to next session.

#### 3.2 Check PR Health (TOKEN-EFFICIENT)

```bash
# Single command for all PR health metrics
yarn ralph:pr-health [PR#]
# Returns: {ci_passing, ci_pending, is_draft, merge_state, mergeable, review}
```

| Condition                    | Action                                        |
| ---------------------------- | --------------------------------------------- |
| `ci_passing: false`          | Update status to `PR_CI_FAILING` → Step 3.2a  |
| `merge_state: "BEHIND"`      | Update status to `PR_BEHIND_MAIN` → Step 3.2a |
| `ci_passing: true` + `CLEAN` | → Step 3.3 (Publish PR)                       |

#### 3.2a Message Jules to Fix PR Issues

Use the existing session to request fixes:

```
mcp__spike-land__jules_send_message {
  session_id: "[session id from registry]",
  message: "Your PR #[n] needs attention:\n\n[IF CI FAILING]: CI checks are failing. Please fix the failing tests/build.\n\n[IF BEHIND MAIN]: Your branch is behind main. Please rebase onto main and resolve any conflicts.\n\nPush your fixes when ready."
}
```

Update registry status accordingly. Check again next iteration.

#### 3.3 Publish Draft PR (Take Out of Draft Mode)

```bash
# Check if still draft
gh pr view [PR#] --json isDraft -q '.isDraft'
```

If draft AND CI passing AND up-to-date:

```bash
gh pr ready [PR#]
```

Update status to `REVIEW_REQUESTED`. This triggers `claude-code-review.yml` workflow.

#### 3.4 Check Review Status

```bash
# Check for review decision
gh pr view [PR#] --json reviews,reviewDecision -q '{reviews: .reviews, decision: .reviewDecision}'
```

| Review State        | Action                                         |
| ------------------- | ---------------------------------------------- |
| No reviews yet      | Status = `REVIEW_REQUESTED`, wait              |
| Review in progress  | Status = `REVIEW_STARTED`, wait                |
| `APPROVED`          | Status = `REVIEW_APPROVED` → Step 3.6 (Merge)  |
| `CHANGES_REQUESTED` | Status = `REVIEW_CHANGES_REQUESTED` → Step 3.5 |

#### 3.5 Handle Review Feedback

Extract review comments:

```bash
gh pr view [PR#] --json reviews -q '.reviews[] | select(.state == "CHANGES_REQUESTED") | .body'
gh api repos/zerdos/spike-land-nextjs/pulls/[PR#]/comments --jq '.[].body'
```

Message Jules with feedback:

```
mcp__spike-land__jules_send_message {
  session_id: "[session id from registry]",
  message: "Review feedback for PR #[n]:\n\n[paste review comments]\n\nPlease address these comments and push fixes."
}
```

Update status to `JULES_FIXING_REVIEW`.

When Jules pushes (detected by checking PR updated_at):

- Update status to `JULES_FIX_COMPLETED`
- Re-run from Step 3.2 (check CI/branch again)

#### 3.6 Auto-Merge

Only when ALL conditions met:

- Status = `REVIEW_APPROVED`
- CI passing (re-verify)
- Up-to-date with main (re-verify)

```bash
gh pr merge [PR#] --squash --delete-branch
gh issue close [ISSUE#] --comment "✅ Fixed by PR #[n]"
```

Update status to `COMPLETED`. Remove from Active Task Registry. 🎉

---

### Step 4: Fill the Queue

#### 4.1 Count Active Tasks

Active = sessions with status: `QUEUED`, `PLANNING`, `AWAITING_PLAN_APPROVAL`, `AWAITING_USER_FEEDBACK`, `IN_PROGRESS`, `PR_CREATED`, `PR_CI_FAILING`, `PR_BEHIND_MAIN`, `REVIEW_REQUESTED`, `REVIEW_STARTED`, `REVIEW_CHANGES_REQUESTED`, `JULES_FIXING_REVIEW`, `JULES_FIX_COMPLETED`, `REVIEW_APPROVED`

```
available_slots = WIP_LIMIT (6) - active_count
```

If `available_slots <= 0`: Skip to Step 7.

#### 4.2 Get Available Issues (TOKEN-EFFICIENT)

```bash
# Pass existing issue numbers from registry to exclude them
yarn ralph:available-issues 545 544 532
# Returns: Pre-filtered, pre-sorted JSON array (max 20)
```

The script automatically:

- ✅ Excludes `wontfix`, `duplicate`, `blocked`, `needs-discussion` labels
- ✅ Excludes issues already in registry (pass numbers as args)
- ✅ Prioritizes: CRITICAL > BUG > QUICK_WIN > NORMAL
- ✅ Sorts by priority then age

#### 4.5 Create Jules Tasks

For each issue up to `available_slots`:

```
mcp__spike-land__jules_create_session {
  title: "Issue #[n]: [title]",
  task: "[Full issue body]\n\n---\nAcceptance Criteria:\n- All tests passing\n- No linter errors\n- Update docs if needed",
  source_repo: "zerdos/spike-land-nextjs"
}
```

Add to Active Task Registry immediately.

---

### Step 5: Handle Build Failures

#### 5.1 Check CI Status (TOKEN-EFFICIENT)

```bash
yarn ralph:ci-status
# Returns: {status: "passing"|"failing"|"in_progress", run_id, workflow, error_excerpt?}
```

If `status: "failing"`, the script includes a 50-line error excerpt automatically.

#### 5.3 Create Priority Fix Task

This can **exceed WIP_LIMIT** (priority override):

````
mcp__spike-land__jules_create_session {
  title: "🚨 Fix CI: [failure summary]",
  task: "CI is failing on main branch.\n\nError log:\n```\n[paste log excerpt]\n```\n\nFix the build. This is highest priority.",
  source_repo: "zerdos/spike-land-nextjs"
}
````

---

### Step 6: Respond to Jules Feedback Requests

For each `AWAITING_USER_FEEDBACK` session:

#### 6.1 Get Context

```
mcp__spike-land__jules_get_session { session_id: "[id]", include_activities: true }
```

#### 6.2 Read Jules's Question

Parse the latest activity to understand what Jules needs.

#### 6.3 Provide Response

Common scenarios:

| Jules Asks                          | Ralph Responds                                              |
| ----------------------------------- | ----------------------------------------------------------- |
| "Which approach should I use?"      | "Use approach [A] because [reason]. Prioritize simplicity." |
| "I need access to [X]"              | "You have access via [method]. Check [file/docs]."          |
| "Tests are failing, should I skip?" | "No. Fix the tests. Here's the likely issue: [analysis]"    |
| "Clarify requirement [X]"           | Re-read issue body, provide specific guidance               |

```
mcp__spike-land__jules_send_message {
  session_id: "[id]",
  message: "[your response]"
}
```

---

### Step 7: Handle Failed Sessions

For each `FAILED` session:

#### 7.1 Check Retry Count

Look up session in Active Task Registry.

#### 7.2 Decide Action

| Retries | Action                                                 |
| ------- | ------------------------------------------------------ |
| 0-1     | Get failure reason, create retry task with context     |
| 2+      | Move to "Flagged for Human Review", remove from active |

#### 7.3 Create Retry Task (if applicable)

```
mcp__spike-land__jules_create_session {
  title: "Retry: Issue #[n] (attempt [x])",
  task: "[Original task]\n\n---\n⚠️ Previous attempt failed:\n[failure reason]\n\nTry alternative approach.",
  source_repo: "zerdos/spike-land-nextjs"
}
```

Update retry count in registry.

---

### Step 8: Commit Iteration Progress

Only commit if meaningful work was done (not just status checks):

**Meaningful work includes:**

- Approved plans
- Merged PRs
- Created new tasks
- Responded to feedback
- Updated registry

```bash
git add .claude/ralph-loop.local.md
git commit -m "chore(ralph): iteration [n] - [summary]"
git push
```

**Summary format examples:**

- `approved 2 plans, merged PR #51, created 3 tasks`
- `fixed CI failure, responded to Jules on #42`
- `all tasks in progress, queue full`

---

## Idle Detection - Early Exit

**End iteration early if ALL true:**

- [ ] No `AWAITING_PLAN_APPROVAL` sessions
- [ ] No `AWAITING_USER_FEEDBACK` sessions
- [ ] Active tasks = WIP_LIMIT (queue full)
- [ ] No CI failures on main
- [ ] All completed PRs either merged or pending review

**Output:**

```
💤 All tasks in progress. Queue full. Nothing actionable.
   Active: [n] | Pending Review: [n] | Next check recommended in 5 min.
```

---

## Completion Condition

Output `<promise>WORKFORCE_IDLE</promise>` when ALL true:

- [ ] Zero open GitHub issues (or all remaining are `wontfix`/`blocked`)
- [ ] Zero active Jules sessions
- [ ] All PRs merged or closed
- [ ] CI passing on main branch
- [ ] Active Task Registry is empty

---

## Anti-Patterns to Avoid

| ❌ Don't                              | ✅ Do Instead                               |
| ------------------------------------- | ------------------------------------------- |
| Poll waiting for single task          | Check all, continue, revisit next iteration |
| Create duplicate tasks for same issue | Check registry before creating              |
| Ignore FAILED sessions                | Log, retry with context, or escalate        |
| Exceed WIP_LIMIT casually             | Only exceed for CI fixes                    |
| Wait for @claude-code-review          | Move on, check result next iteration        |
| Approve plans one-by-one with waits   | Batch approve, continue immediately         |
| Commit every tiny change              | Batch work, commit once per iteration       |
| **Message dead/expired sessions**     | **Silently remove, return task to queue**   |
| Run multiple gh commands per PR       | Use `./scripts/ralph/pr-health.sh`          |
| Manually filter/sort issues           | Use `./scripts/ralph/available-issues.sh`   |

---

## Session State Machine

```
                            ┌─────────────────────┐
                            │       QUEUED        │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │      PLANNING       │
                            └──────────┬──────────┘
                                       │
                                       ▼
                   ┌───────────────────────────────────────┐
                   │       AWAITING_PLAN_APPROVAL          │
                   │  (Ralph auto-approves immediately)    │
                   └──────────┬────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
   ┌─────────────────────┐         ┌─────────────────────┐
   │    IN_PROGRESS      │ ◄─────► │ AWAITING_USER_      │
   │                     │         │ FEEDBACK            │
   └──────────┬──────────┘         │ (Ralph responds)    │
              │                    └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │    PR_CREATED       │ (Jules completed, PR exists)
   └──────────┬──────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
   HEALTHY        UNHEALTHY
      │               │
      │               ▼
      │    ┌─────────────────────┐
      │    │ PR_CI_FAILING or    │
      │    │ PR_BEHIND_MAIN      │◄────────┐
      │    │ (Message Jules)     │         │
      │    └──────────┬──────────┘         │
      │               │                    │
      │               ▼                    │
      │         Jules fixes ───────────────┘
      │
      ▼
   ┌─────────────────────┐
   │ gh pr ready [PR#]   │
   │ REVIEW_REQUESTED    │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │   REVIEW_STARTED    │ (claude-code-review running)
   └──────────┬──────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
   APPROVED    CHANGES_REQUESTED
      │               │
      │               ▼
      │    ┌─────────────────────────────┐
      │    │ REVIEW_CHANGES_REQUESTED    │
      │    │ (Message Jules w/ feedback) │
      │    └──────────┬──────────────────┘
      │               │
      │               ▼
      │    ┌─────────────────────┐
      │    │ JULES_FIXING_REVIEW │◄────────┐
      │    └──────────┬──────────┘         │
      │               │                    │
      │               ▼                    │
      │    ┌─────────────────────┐         │
      │    │ JULES_FIX_COMPLETED │         │
      │    │ (Re-check CI/branch)│─────────┘
      │    └─────────────────────┘
      │
      ▼
   ┌─────────────────────┐
   │   REVIEW_APPROVED   │
   │   (Auto-merge)      │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │     COMPLETED       │
   └─────────────────────┘

   Any State ───► FAILED ───► Retry (max 2) ───► Escalate

   Any State ───► DEAD (expired/killed) ───► Silent Removal (no retry, no message)
                                               └──► Task returned to queue
```

---

## Logging Format

Each iteration should output structured logs:

```
═══════════════════════════════════════════════════════════
📋 RALPH ITERATION #[n] - [timestamp]
═══════════════════════════════════════════════════════════

📊 STATUS CHECK
   Active Sessions: [n]
   ├─ IN_PROGRESS: [n]
   ├─ PLANNING: [n]  
   ├─ AWAITING_PLAN_APPROVAL: [n]
   ├─ AWAITING_USER_FEEDBACK: [n]
   └─ QUEUED: [n]
   
   Completed: [n] | Failed: [n]
   Available Slots: [n]

🎯 ACTIONS TAKEN
   ✅ Approved: [session_ids]
   🚀 Created: [new_task_titles]
   💬 Responded: [session_ids]
   🔀 Merged: PR #[n]
   ❌ Escalated: Issue #[n] (reason)

📝 REGISTRY CHANGES
   [diff of registry table]

⏭️ NEXT ITERATION
   Priority: [what to watch for]
   
═══════════════════════════════════════════════════════════
```

---

## Quick Reference: MCP Tools

| Action              | Tool                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| List all sessions   | `mcp__spike-land__jules_list_sessions`                                   |
| Get session details | `mcp__spike-land__jules_get_session { session_id, include_activities? }` |
| Approve plan        | `mcp__spike-land__jules_approve_plan { session_id }`                     |
| Send message        | `mcp__spike-land__jules_send_message { session_id, message }`            |
| Create task         | `mcp__spike-land__jules_create_session { title, task, source_repo }`     |

---

## 🔧 Git Worktree Policy

**CRITICAL**: Always work on the `main` branch directly.

### Rules

1. **Ralph operates on `main`** - All status checks, commits, and pushes happen on main
2. **Subagents use worktrees** - When spawning subagents for merge conflicts or complex fixes:
   ```bash
   # Create worktree for subagent work
   git worktree add ../fix-[issue] -b fix-[issue]

   # Subagent works in worktree
   cd ../fix-[issue]
   # ... do work ...

   # Merge back to main
   cd ../main
   git merge fix-[issue]
   git worktree remove ../fix-[issue]
   ```
3. **Never leave main** - Ralph's iteration loop always runs from main branch

---

## 🚨 Build Fixing Priority (STEP 0 - BEFORE ALL ELSE)

**Build health is the #1 priority.** Before any iteration workflow, verify and fix the build.

### Step 0.1: Verify on Main Branch

```bash
git branch --show-current  # Must output "main"
```

### Step 0.2: Run Docker Build Tests (Max 3 Parallel)

Run these in batches of 3 to identify failures:

**Batch 1 - Unit Tests:**

```bash
docker build . --target=unit-tests-1 &
docker build . --target=unit-tests-2 &
docker build . --target=unit-tests-3 &
wait
docker build . --target=unit-tests-4
```

**Batch 2 - E2E Tests (run sequentially or in small batches):**

```bash
docker build . --target=e2e-tests-1
docker build . --target=e2e-tests-2
# ... through ...
docker build . --target=e2e-tests-16
```

**Final - Full CI:**

```bash
docker build . --target=ci
```

### Step 0.3: On Failure - Create Jules Task Immediately

When any build target fails:

1. **Capture the error output**
2. **Create GitHub issue with error details**
3. **Create Jules task immediately** (exceeds WIP_LIMIT - priority override)

```bash
# Create issue
gh issue create --title "🚨 Build failing: [target] - [summary]" \
  --body "Build target \`[target]\` is failing.\n\n\`\`\`\n[error log]\n\`\`\`" \
  --label "bug,priority:critical"
```

````
mcp__spike-land__jules_create_session {
  title: "🚨 Fix Build: [target] failure",
  task: "Build is failing on target [target].\n\nError:\n```\n[error output]\n```\n\nFix this immediately. This blocks all other work.",
  source_repo: "zerdos/spike-land-nextjs"
}
````

### Build Target Reference

| Target         | Description          |
| -------------- | -------------------- |
| unit-tests-1   | Unit test shard 1    |
| unit-tests-2   | Unit test shard 2    |
| unit-tests-3   | Unit test shard 3    |
| unit-tests-4   | Unit test shard 4    |
| e2e-tests-1-16 | E2E test shards 1-16 |
| ci             | Full CI validation   |

---

## 🧹 Step 0.5: Dead Session Reconciliation

**CRITICAL**: Before checking session status, verify sessions are still alive.

When a Jules agent is **killed, expired, or unreachable**, Ralph must:

1. **NEVER** attempt to communicate with it (send_message, approve, etc.)
2. **Silently remove** from Active Task Registry
3. **Reconcile the task** - return to queue if needed

### Detection

Run at start of each iteration:

```bash
# List session IDs to check
yarn ralph:check-session-health [session_ids from registry]
```

Then verify each with `jules_get_session`. A session is **DEAD** if:

- API returns error/not found
- Status is `FAILED` with no recent activity (>2 hours)
- Session shows as "archived" or "expired"

### Handling Dead Sessions

```
🧹 DEAD SESSION CLEANUP
   Removed: [session_id] (Issue #X) - [reason: expired/killed/not_found]
   Task returned to queue: Issue #X
   Slots freed: 1
```

**DO NOT:**

- ❌ Send messages to dead sessions
- ❌ Try to approve dead sessions
- ❌ Retry communication
- ❌ Log verbose errors

**DO:**

- ✅ Remove from registry immediately
- ✅ Free up WIP slot
- ✅ Mark associated issue as needing new session
- ✅ Log one concise line

---

## 💰 Token Efficiency Scripts

**Use these bash scripts to reduce token usage by ~70%.**

Located in `scripts/ralph/` (also available as yarn commands):

| Yarn Command                      | Script                    | Purpose                            | Savings |
| --------------------------------- | ------------------------- | ---------------------------------- | ------- |
| `yarn ralph:pr-health`            | `pr-health.sh`            | All PR health metrics in one call  | ~80%    |
| `yarn ralph:batch-pr-status`      | `batch-pr-status.sh`      | All open PRs status at once        | ~90%    |
| `yarn ralph:available-issues`     | `available-issues.sh`     | Filtered, prioritized issues       | ~70%    |
| `yarn ralph:ci-status`            | `ci-status.sh`            | Main branch CI with error excerpt  | ~60%    |
| `yarn ralph:check-session-health` | `check-session-health.sh` | Verify sessions exist before comms | ~50%    |
| `yarn ralph:publish-pr`           | `publish-jules-pr.mjs`    | Publish PR from Jules session      | ~95%    |

### Token-Efficient PR Publishing

**When browser is already open to Jules session, use `browser_run_code` instead of snapshot-click-wait:**

```javascript
// ONE call instead of snapshot + find ref + click + wait + snapshot
mcp__playwright__browser_run_code({
  code: `async (page) => {
    // Navigate to session if not already there
    if (!page.url().includes('jules.google.com/session')) {
      await page.goto('https://jules.google.com/session/SESSION_ID');
      await page.waitForLoadState('networkidle');
    }

    // Click Publish PR button
    const btn = page.getByRole('button', { name: 'Publish PR' });
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForFunction(() =>
        document.body.innerText.includes('View PR')
      , { timeout: 60000 });

      // Get the PR URL from new tab
      const pages = page.context().pages();
      for (const p of pages) {
        if (p.url().includes('/pull/')) {
          return { success: true, pr_url: p.url() };
        }
      }
    }
    return { success: false, error: 'No Publish PR button' };
  }`,
});
```

**Or from CLI (requires browser login):**

```bash
yarn ralph:publish-pr 6575646228061348411
# Returns: {"success":true,"pr_number":670,"pr_url":"https://github.com/..."}
```

### Usage Examples

**Instead of multiple gh commands for PR health:**

```bash
# OLD (token-heavy):
gh pr checks 666 --json name,state,conclusion
gh pr view 666 --json mergeStateStatus
gh pr view 666 --json isDraft
gh pr view 666 --json reviewDecision

# NEW (token-efficient):
yarn ralph:pr-health 666
# Returns: {"pr":666,"ci_passing":true,"is_draft":false,"merge_state":"CLEAN","review":"APPROVED"}
```

**Instead of checking each PR individually:**

```bash
# OLD: Loop through PRs with individual calls
# NEW: Single call for all PRs
yarn ralph:batch-pr-status
# Returns array with action field: READY_TO_MERGE, READY_TO_PUBLISH, CI_FAILING, etc.
```

**Instead of manual issue filtering:**

```bash
# OLD: gh issue list + parse + filter + sort
# NEW: Pre-filtered, pre-sorted, with existing session exclusion
yarn ralph:available-issues 545 544 532
# Returns: Top 20 prioritized issues not already assigned
```

---

## 🔄 Continuous Improvement

**Each iteration, look for opportunities to improve the process.**

### Self-Improvement Rules

1. **If stuck on same issue for 2+ iterations**: Modify approach, try different strategy
2. **If Jules reports critical issue**: Kill task immediately, start fresh with new context
3. **If pattern of failures emerges**: Update this document with lessons learned
4. **If process feels inefficient**: Adjust workflow steps for next iteration

### Handling Critical Issues from Jules

When Jules messages that it encountered a **critical issue** (blocked, can't proceed, fundamental problem):

#### Step 1: Kill the Task Immediately

Do NOT retry with same context. The task is poisoned.

#### Step 2: Archive via Browser

```
mcp__playwright__browser_navigate { url: "https://jules.google.com/session/[session_id]" }
mcp__playwright__browser_snapshot {}
```

Look for "Archive" or "Close" button and click it to clean up.

#### Step 3: Start Fresh

Create a new Jules session with:

- Simplified task description
- Different approach angle
- Lessons from the failure

```
mcp__spike-land__jules_create_session {
  title: "Retry #[n]: [issue] - Fresh approach",
  task: "[Simplified task]\n\n⚠️ Previous attempt failed due to: [reason]\n\nTry this approach instead: [new approach]",
  source_repo: "zerdos/spike-land-nextjs"
}
```

### Iteration Improvement Log

<!-- Track what was learned/changed each iteration -->

| Iteration | Change Made                    | Reason                                |
| --------- | ------------------------------ | ------------------------------------- |
| 12        | Added build priority step      | Build health is critical              |
| 12        | Added worktree policy          | Prevent branch confusion              |
| 12        | Added critical issue kill      | Stop wasting retries                  |
| 17        | Added dead session handling    | Avoid wasting tokens on dead sessions |
| 17        | Added token efficiency scripts | ~70% token reduction per iteration    |
| 17        | Added DEAD status              | Silent removal, no communication      |

---

## 🗑️ Session Cleanup via Browser

For completed, failed, or stuck sessions, clean up via jules.google.com:

### Archive a Session

```
mcp__playwright__browser_navigate { url: "https://jules.google.com" }
mcp__playwright__browser_snapshot {}
```

Find session in list, click to open, then:

```
mcp__playwright__browser_click { element: "Archive button or menu", ref: "[ref]" }
```

### Bulk Cleanup

Periodically (every 5 iterations), archive all COMPLETED and FAILED sessions that are older than 24 hours to keep the Jules dashboard clean
