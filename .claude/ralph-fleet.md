# Jules Fleet Status

> Real-time tracking of Jules workforce across all work streams.

**Last Updated**: 2026-01-13T23:00:00Z

---

## Daily Capacity

| Metric             | Value |
| ------------------ | ----- |
| Available (daily)  | 100   |
| Used Today         | 16    |
| Remaining          | 84    |
| Target Utilization | 50+   |

---

## Work Stream Status

| Stream      | Active | Limit  | Blocked | Completed Today |
| ----------- | ------ | ------ | ------- | --------------- |
| Features    | 10     | 8      | 1       | 0               |
| Testing     | 2      | 8      | 0       | 0               |
| Bug Fixes   | 2      | 6      | 1       | 0               |
| Tech Debt   | 1      | 5      | 0       | 0               |
| Experiments | 1      | 3      | 0       | 0               |
| **TOTAL**   | **16** | **30** | **2**   | **0**           |

---

## Active Sessions by Stream

### Features (10/8) - Over capacity!

| Issue # | Session ID           | Title                       | Status                 | PR   |
| ------- | -------------------- | --------------------------- | ---------------------- | ---- |
| #536    | 3283041034249796510  | Allocator Autopilot         | AWAITING_PLAN_APPROVAL | -    |
| #557    | 6461916275207593573  | ORB-047 Content Experiments | AWAITING_USER_FEEDBACK | -    |
| #559    | 5418198425599883351  | ORB-049 Template Library    | AWAITING_USER_FEEDBACK | -    |
| #560    | 9990519144520915308  | ORB-050 Asset AI Analysis   | PR_CI_FAILING          | #696 |
| #543    | 16700969269248228994 | Cross-platform attribution  | PLANNING               | -    |
| #545    | 14061592581795539866 | Workflow data model         | PLANNING               | -    |
| #523    | 6459174606168775495  | TikTok integration          | PLANNING               | -    |
| #524    | 15307375469365040653 | Pinterest integration       | PLANNING               | -    |
| #525    | 1231231942038418903  | YouTube full integration    | PLANNING               | -    |
| #550    | 9029505413509658765  | Workflow triggers           | PLANNING               | -    |

### Testing (2/8)

| Issue # | Session ID           | Title                         | Status   | PR |
| ------- | -------------------- | ----------------------------- | -------- | -- |
| TEST-01 | 1396081266021328535  | Unit tests for Orbit services | PLANNING | -  |
| TEST-02 | 14385720697892655834 | E2E tests for auth flows      | PLANNING | -  |

### Bug Fixes (2/6)

| Issue #  | Session ID          | Title                        | Status           | PR   |
| -------- | ------------------- | ---------------------------- | ---------------- | ---- |
| TS-Build | 743965185831409437  | TypeScript Build Performance | PR_INFRA_BLOCKED | #695 |
| #681     | 6931936060370703380 | Database Backups             | PR_CI_FAILING    | #697 |

### Tech Debt (1/5)

| Issue # | Session ID          | Title                               | Status   | PR |
| ------- | ------------------- | ----------------------------------- | -------- | -- |
| TD-01   | 4593656897822469129 | TypeScript strictness in API routes | PLANNING | -  |

### Experiments (1/3)

| Issue # | Session ID          | Title                       | Status   | PR |
| ------- | ------------------- | --------------------------- | -------- | -- |
| EXP-01  | 7518177175950263084 | Batch platform integrations | PLANNING | -  |

---

## Issues Ready to Assign

### Phase 3: Autonomy (Months 7-9)

| Issue # | Title                      | Priority | Suggested Stream |
| ------- | -------------------------- | -------- | ---------------- |
| #543    | Cross-platform attribution | P1       | Features         |
| #545    | Workflow data model        | P2       | Features         |
| #550    | Workflow triggers          | P2       | Features         |
| #558    | Asset storage system       | P2       | Features         |

### Phase 4: Scale (Months 10-12)

| Issue #  | Title                          | Priority | Suggested Stream |
| -------- | ------------------------------ | -------- | ---------------- |
| #523     | TikTok integration             | P1       | Features         |
| #524     | Pinterest integration          | P1       | Features         |
| #525     | YouTube full integration       | P1       | Features         |
| #527     | Snapchat integration           | P2       | Features         |
| #533-537 | Agency features (5 issues)     | P1       | Features         |
| #549-554 | Creative factory (6 issues)    | P2       | Features         |
| #565-570 | Content-to-ads loop (6 issues) | P2       | Features         |

---

## Bottlenecks & Blockers

| Type                   | Count | Details                                    |
| ---------------------- | ----- | ------------------------------------------ |
| AWAITING_PLAN_APPROVAL | 1     | #536 - needs manual TUI/web approval       |
| AWAITING_USER_FEEDBACK | 2     | #557, #559 - needs manual TUI/web response |
| PR_CI_FAILING          | 2     | #696, #697 - code issues to fix            |
| PR_INFRA_BLOCKED       | 1     | #695 - blocked by flaky test, not code     |

---

## Daily Metrics

### 2026-01-13

| Metric             | Value      |
| ------------------ | ---------- |
| Sessions Created   | 0          |
| Sessions Completed | 0          |
| PRs Merged         | 0          |
| Experiments Tried  | 0          |
| Queue Fill Rate    | 6/30 (20%) |

---

## Actions Needed

1. **FILL THE QUEUE**: Create 10+ new sessions from ready issues
2. **APPROVE PLAN**: Session 3283041034249796510 (#536) via TUI/web
3. **RESPOND TO FEEDBACK**: Sessions for #557, #559 via TUI/web
4. **START TESTING STREAM**: Create test-focused Jules tasks
5. **START EXPERIMENTS**: Try first experiments from jules-ideas.md

---

## Related Files

- `.claude/ralph-loop.local.md` - Main Ralph workflow
- `.claude/jules-ideas.md` - Ideas and experiments tracking
- `scripts/ralph/` - Helper scripts
