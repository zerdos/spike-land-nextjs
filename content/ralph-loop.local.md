---
active: true
iteration: 174
max_iterations: 2000
completion_promise: "WORKFORCE_IDLE"
started_at: "2026-01-10T00:00:00Z"
daily_sessions_used: 42
daily_session_limit: 100
---

# Ralph Wiggum - Jules Workforce Manager

> "Me fail English? That's unpossible!" - Ralph, probably debugging CI

## Configuration

| Setting      | Value                    | Notes                                         |
| ------------ | ------------------------ | --------------------------------------------- |
| WIP_LIMIT    | **15**                   | Max parallel Jules tasks                      |
| AUTO_APPROVE | **MCP**                  | Use MCP tools to approve plans automatically  |
| AUTO_MERGE   | true                     | Squash merge when all checks pass             |
| AUTO_PUBLISH | **true**                 | Auto-publish PR when CI passes + no conflicts |
| MAX_RETRIES  | 2                        | Retry failed tasks before escalating          |
| REPO         | zerdos/spike-land-nextjs | Target repository                             |
| CLI_MODE     | **true**                 | Use Jules CLI + MCP tools                     |

### Work Stream Distribution

| Stream      | Limit  | Focus                              |
| ----------- | ------ | ---------------------------------- |
| Features    | 5      | Orbit platform features (#514-570) |
| Testing     | 4      | Add tests, increase coverage       |
| Bug Fixes   | 3      | Issues labeled `bug`               |
| Tech Debt   | 2      | Refactoring, cleanup               |
| Experiments | 1      | Novel ideas, improvements          |
| **TOTAL**   | **15** | Match actual Jules parallel limit  |

---

## How Ralph Works

### Each Iteration

```bash
yarn jules:process
```

The script handles everything:

1. Lists all Jules sessions (live from API)
2. Auto-approves pending plans (via MCP)
3. Handles PR lifecycle (CI, reviews, merges)
4. Fills pipeline with new issues
5. Responds to feedback requests
6. Handles failed sessions
7. Outputs current status (no state stored here)

### Available Commands

| Command                        | Description                        |
| ------------------------------ | ---------------------------------- |
| `yarn jules:process`           | Run single iteration               |
| `yarn jules:process --watch`   | Continuous mode (10 min intervals) |
| `yarn jules:process --dry-run` | Test without making changes        |

### When to Modify the Script

Review and update `scripts/ralph/process.ts` when:

- Output shows validation warnings consistently
- New patterns emerge that aren't handled
- Self-improvement suggestions appear
- Error rate increases

The script files are in `scripts/ralph/`:

- `process.ts` - Main entry point
- `iteration.ts` - 8-step workflow
- `mcp-client.ts` - Jules API interface
- `registry.ts` - Config parser (this file)
- `validator.ts` - Quality checks
- `improver.ts` - Self-learning rules

---

## Notes

- All session status is fetched live from Jules API each iteration
- No state is stored in this file - config only
- The script outputs status to console/logs
