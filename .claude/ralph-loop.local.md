---
active: true
iteration: 58
max_iterations: 200
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

## Active Task Registry

<!-- Ralph: UPDATE THIS EVERY ITERATION! This is your memory. -->

| Issue #        | Session ID           | Status      | PR #    | Retries | Last Updated     |
| -------------- | -------------------- | ----------- | ------- | ------- | ---------------- |
| CI-FIX         | 2812978267625884087  | IN_PROGRESS | -       | 0       | 2026-01-10T14:40 |
| #530 (ORB-022) | 1223874300114515623  | IN_PROGRESS | -       | 0       | 2026-01-10T14:40 |
| #546 (ORB-027) | 13204058962977056689 | IN_PROGRESS | -       | 1       | 2026-01-10T14:45 |
| #544 (ORB-026) | 8018068239388301596  | COMPLETED   | ⚠️ No PR | 0       | 2026-01-10T14:15 |
| #536 (ORB-036) | 12268363689474090994 | IN_PROGRESS | -       | 0       | 2026-01-10T14:45 |
| #538 (ORB-037) | 13964044312522937140 | IN_PROGRESS | -       | 0       | 2026-01-10T14:40 |
| #540 (ORB-039) | 16859514757019367340 | IN_PROGRESS | -       | 0       | 2026-01-10T14:40 |
| #532 (ORB-024) | 3272942138734267585  | COMPLETED   | #659    | 0       | 2026-01-10T14:15 |
| PR-659-FIX     | 12847152019524036796 | IN_PROGRESS | -       | 0       | 2026-01-10T15:20 |
| #531 (ORB-023) | 12664520598883814187 | COMPLETED   | ⚠️ No PR | 0       | 2026-01-10T12:10 |
| #529 (ORB-021) | 12716452045721348213 | COMPLETED   | ⚠️ No PR | 0       | 2026-01-10T12:10 |

**PRs Pending Review:**

- PR #659 (ORB-024): Scout competitor tracking - ⚠️ CONFLICTING, 29 review comments, follow-up task created

**Issues Flagged for Human Review:**

- ORB-021, ORB-023, ORB-026: Jules sessions COMPLETED but no PRs created

---

## Each Iteration Workflow

### Step 1: Batch Status Check (ALWAYS FIRST)

```
mcp__spike-land__jules_list_sessions
```

Parse response and categorize ALL sessions into:

| Category          | Statuses                            | Action         |
| ----------------- | ----------------------------------- | -------------- |
| 🟢 Needs Approval | `AWAITING_PLAN_APPROVAL`            | → Step 2       |
| 🟡 Needs Input    | `AWAITING_USER_FEEDBACK`            | → Step 6       |
| ✅ Done           | `COMPLETED`                         | → Step 3       |
| ❌ Failed         | `FAILED`                            | → Step 5       |
| ⏳ Working        | `IN_PROGRESS`, `PLANNING`, `QUEUED` | Log & continue |

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

### Step 3: Handle Completed Tasks

For each `COMPLETED` session:

#### 3.1 Check for PR

Get session details to find PR number. If no PR exists, log warning and skip.

#### 3.2 Publish Draft PR (if needed)

```bash
gh pr view [PR#] --json isDraft -q '.isDraft'
```

If draft:

```bash
gh pr ready [PR#]
```

This triggers `@claude-code-review`. Move to "PRs Pending Review" list and continue.

#### 3.3 Check Review Status

```bash
gh pr checks [PR#] --json name,state,conclusion
gh pr view [PR#] --json reviews -q '.reviews[-1]'
```

| Condition                         | Action                                              |
| --------------------------------- | --------------------------------------------------- |
| Review requested changes          | → Create new Jules task with feedback (Step 3.4)    |
| Review approved + all checks pass | → Auto-merge (Step 3.5)                             |
| Checks still running              | → Add to "PRs Pending Review", check next iteration |
| Checks failed                     | → Create Jules task to fix (Step 3.4)               |

#### 3.4 Create Follow-up Task

```
mcp__spike-land__jules_create_session {
  title: "Fix review feedback for PR #[n]",
  task: "Address the following review comments:\n[paste review comments]\n\nOriginal issue: #[issue]",
  source_repo: "zerdos/spike-land-nextjs"
}
```

#### 3.5 Auto-Merge

```bash
gh pr merge [PR#] --squash --delete-branch
gh issue close [ISSUE#] --comment "✅ Fixed by PR #[n]"
```

Remove from Active Task Registry. 🎉

---

### Step 4: Fill the Queue

#### 4.1 Count Active Tasks

Active = sessions with status: `QUEUED`, `PLANNING`, `AWAITING_PLAN_APPROVAL`, `AWAITING_USER_FEEDBACK`, `IN_PROGRESS`

```
available_slots = WIP_LIMIT (6) - active_count
```

If `available_slots <= 0`: Skip to Step 7.

#### 4.2 Get Open Issues

```bash
gh issue list --state open --json number,title,body,labels,createdAt --limit 50
```

#### 4.3 Filter Issues

Exclude issues that:

- Already have a Jules session (check Active Task Registry)
- Have labels: `wontfix`, `duplicate`, `needs-discussion`, `blocked`
- Are already linked to an open PR

#### 4.4 Prioritize

Select issues in this order:

1. 🔴 **Critical**: `priority:critical` or `bug` + `priority:high`
2. 🟠 **Blocking**: Referenced in "blocked by" of other issues
3. 🟡 **Build fixes**: Related to current CI failures
4. 🟢 **Quick wins**: `good-first-issue` label
5. ⚪ **FIFO**: Oldest by `createdAt`

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

#### 5.1 Check CI Status

```bash
gh run list --branch main --status failure --limit 5 --json databaseId,name,conclusion
```

If failures exist:

#### 5.2 Get Failure Details

```bash
gh run view [run_id] --log-failed 2>&1 | head -100
```

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
   │     COMPLETED       │───► PR Created ───► Review ───► Merge
   └─────────────────────┘

   Any State ───► FAILED ───► Retry (max 2) ───► Escalate
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

_Last updated: Iteration 39 at 2026-01-10T14:30:00Z_
