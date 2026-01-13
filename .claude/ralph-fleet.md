# Jules Fleet Status

> Real-time tracking of Jules workforce across all work streams.

**Last Updated**: 2026-01-14T00:15:00Z

---

## Daily Capacity

| Metric             | Value |
| ------------------ | ----- |
| Available (daily)  | 100   |
| Used Today         | 19    |
| Remaining          | 81    |
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
| #543    | 16700969269248228994 | Cross-platform attribution  | AWAITING_PLAN_APPROVAL | -    |
| #545    | 14061592581795539866 | Workflow data model         | AWAITING_PLAN_APPROVAL | -    |
| #523    | 6459174606168775495  | TikTok integration          | AWAITING_PLAN_APPROVAL | -    |
| #524    | 15307375469365040653 | Pinterest integration       | AWAITING_PLAN_APPROVAL | -    |
| #525    | 1231231942038418903  | YouTube full integration    | AWAITING_PLAN_APPROVAL | -    |
| #550    | 9029505413509658765  | Workflow triggers           | AWAITING_PLAN_APPROVAL | -    |

### Testing (2/8)

| Issue # | Session ID           | Title                         | Status                 | PR |
| ------- | -------------------- | ----------------------------- | ---------------------- | -- |
| TEST-01 | 1396081266021328535  | Unit tests for Orbit services | PLANNING               | -  |
| TEST-02 | 14385720697892655834 | E2E tests for auth flows      | AWAITING_PLAN_APPROVAL | -  |

### Bug Fixes (2/6)

| Issue #  | Session ID          | Title                        | Status    | PR   |
| -------- | ------------------- | ---------------------------- | --------- | ---- |
| TS-Build | 743965185831409437  | TypeScript Build Performance | COMPLETED | #695 |
| #681     | 6931936060370703380 | Database Backups             | COMPLETED | #697 |

### Tech Debt (1/5)

| Issue # | Session ID          | Title                               | Status                 | PR |
| ------- | ------------------- | ----------------------------------- | ---------------------- | -- |
| TD-01   | 4593656897822469129 | TypeScript strictness in API routes | AWAITING_PLAN_APPROVAL | -  |

### Experiments (1/3)

| Issue # | Session ID          | Title                       | Status                 | PR |
| ------- | ------------------- | --------------------------- | ---------------------- | -- |
| EXP-01  | 7518177175950263084 | Batch platform integrations | AWAITING_PLAN_APPROVAL | -  |

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

| Type                      | Count | Details                                                          |
| ------------------------- | ----- | ---------------------------------------------------------------- |
| AWAITING_PLAN_APPROVAL    | 10    | #536, #543, #545, #523, #524, #525, #550, TEST-02, TD-01, EXP-01 |
| AWAITING_USER_FEEDBACK    | 2     | #557, #559 - needs manual TUI/web response                       |
| COMPLETED (need PR check) | 2     | #695, #697 - sessions done, check PRs for merge readiness        |

---

## Daily Metrics

### 2026-01-13

| Metric             | Value       |
| ------------------ | ----------- |
| Sessions Created   | 10          |
| Sessions Completed | 5           |
| PRs Merged         | 0           |
| Experiments Tried  | 1           |
| Queue Fill Rate    | 16/30 (53%) |

---

## Actions Needed

1. **APPROVE PLANS** (10 pending): Visit Jules TUI/web to approve plans:
   - https://jules.google.com/session/3283041034249796510 (#536 Allocator)
   - https://jules.google.com/session/16700969269248228994 (#543 Attribution)
   - https://jules.google.com/session/14061592581795539866 (#545 Workflow)
   - https://jules.google.com/session/6459174606168775495 (#523 TikTok)
   - https://jules.google.com/session/15307375469365040653 (#524 Pinterest)
   - https://jules.google.com/session/1231231942038418903 (#525 YouTube)
   - https://jules.google.com/session/9029505413509658765 (#550 Triggers)
   - https://jules.google.com/session/14385720697892655834 (E2E tests)
   - https://jules.google.com/session/4593656897822469129 (Tech Debt)
   - https://jules.google.com/session/7518177175950263084 (Batch experiment)
2. **RESPOND TO FEEDBACK**: Sessions for #557, #559 via TUI/web
3. **CHECK PRs**: #695, #697 - sessions completed, verify PR status
4. **NEXT BATCH**: Once approvals done, create 10 more sessions

---

## Related Files

- `.claude/ralph-loop.local.md` - Main Ralph workflow
- `.claude/jules-ideas.md` - Ideas and experiments tracking
- `scripts/ralph/` - Helper scripts
