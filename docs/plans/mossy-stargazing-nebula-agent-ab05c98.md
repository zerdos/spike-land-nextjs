# BAZDMEG Testing Strategy: AI Cloud Swarm Platform Management Dashboard

## Executive Summary

This plan designs a comprehensive testing strategy for seven dashboard features using the BAZDMEG Hourglass Testing Model: 70% MCP tool tests, 20% E2E specs, 10% UI component tests. The strategy builds on the existing `createMockRegistry()` pattern, `vi.hoisted()` mock factories, and custom `mcpMatchers` already established in the codebase.

---

## 1. Test Architecture -- File Organization, Shared Fixtures, Mock Factories

### 1.1 Directory Structure

New test files follow the existing convention: `.test.ts` co-located alongside source files.

```
src/lib/mcp/server/
  __test-utils__/
    index.ts                          # existing barrel export
    mock-registry.ts                  # existing createMockRegistry()
    assertions.ts                     # existing getText(), isError()
    matchers.ts                       # existing mcpMatchers
    node-mocks.ts                     # existing createNodeFsMocks(), createChildProcessMocks()
    fixtures/                         # NEW: shared test data factories
      environment.ts                  # environment/deployment fixture factory
      agent.ts                        # agent/message fixture factory
      notification.ts                 # notification fixture factory
      schedule.ts                     # cron/scheduler fixture factory
      analytics.ts                    # analytics data fixture factory
      roadmap.ts                      # roadmap item fixture factory
    mocks/                            # NEW: external service mocks
      websocket.ts                    # WebSocket mock for agent chat
      github-projects.ts             # GitHub Projects API mock
      sentry.ts                      # Sentry API mock
      vercel.ts                      # Vercel deployment API mock
      redis-pubsub.ts               # Redis pub/sub mock for message routing
  tools/
    environment.ts                    # NEW: environment dashboard MCP tools
    environment.test.ts               # NEW: 70% layer tests
    deployment.ts                     # NEW: deployment control MCP tools
    deployment.test.ts                # NEW: 70% layer tests
    roadmap.ts                        # NEW: roadmap MCP tools
    roadmap.test.ts                   # NEW: 70% layer tests
    agent-command.ts                  # NEW: agent command center MCP tools
    agent-command.test.ts             # NEW: 70% layer tests
    analytics-hub.ts                  # NEW: analytics hub MCP tools
    analytics-hub.test.ts             # NEW: 70% layer tests
    scheduler.ts                      # NEW: task scheduler MCP tools
    scheduler.test.ts                 # NEW: 70% layer tests
    notification-inbox.ts             # NEW: notification inbox MCP tools
    notification-inbox.test.ts        # NEW: 70% layer tests

src/components/dashboard/
  environment-panel.tsx               # NEW: UI component
  environment-panel.test.tsx          # NEW: 10% layer test
  deployment-control.tsx              # NEW: UI component
  deployment-control.test.tsx         # NEW: 10% layer test
  agent-chat.tsx                      # NEW: UI component
  agent-chat.test.tsx                 # NEW: 10% layer test

e2e/                                  # NEW: E2E test directory
  environment-switching.spec.ts       # 20% layer
  deployment-flow.spec.ts             # 20% layer
  agent-chat-flow.spec.ts             # 20% layer
  notification-flow.spec.ts           # 20% layer
```

### 1.2 Shared Fixture Factories

Each fixture factory returns typed test data with sensible defaults and override support. Example pattern:

```typescript
// src/lib/mcp/server/__test-utils__/fixtures/environment.ts
interface EnvironmentFixture {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down";
  region: string;
  lastCheckedAt: Date;
  services: Array<{ name: string; healthy: boolean }>;
}

export function createEnvironment(
  overrides: Partial<EnvironmentFixture> = {}
): EnvironmentFixture {
  return {
    id: "env-test-001",
    name: "production",
    status: "healthy",
    region: "us-east-1",
    lastCheckedAt: new Date("2026-01-15T12:00:00Z"),
    services: [
      { name: "api", healthy: true },
      { name: "db", healthy: true },
      { name: "cache", healthy: true },
    ],
    ...overrides,
  };
}

export function createEnvironmentList(count: number = 3): EnvironmentFixture[] {
  const names = ["production", "staging", "development"];
  return Array.from({ length: count }, (_, i) =>
    createEnvironment({
      id: `env-${i + 1}`,
      name: names[i] ?? `env-${i + 1}`,
    })
  );
}
```

Same pattern applies for `createAgent()`, `createNotification()`, `createSchedule()`, `createRoadmapItem()`, `createAnalyticsData()`.

### 1.3 Mock Prisma Pattern

Following the established pattern (see `agent-management.test.ts`, `pipelines.test.ts`), each test file declares its own mock Prisma shape at the top, then `vi.mock("@/lib/prisma", ...)`:

```typescript
const mockPrisma = {
  environment: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  deployment: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  healthCheck: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
```

### 1.4 vi.hoisted() Requirement

Per MEMORY.md, all mock variables used inside `vi.mock()` factories in pool: "forks" must use `vi.hoisted()`:

```typescript
const mockPrisma = vi.hoisted(() => ({
  environment: { findMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
```

This is critical for the forks pool configured in `vitest.config.ts`.

---

## 2. MCP Tool Tests (70%) -- Business Logic, Validation, Contracts, State Transitions

### 2.1 Environment Dashboard Tools

**File:** `src/lib/mcp/server/tools/environment.test.ts`

**Tools to register:** `env_list`, `env_get`, `env_health_check`, `env_switch`

| Test Case | What It Asserts |
|-----------|----------------|
| registers 4 environment tools | `registry.register` called 4 times |
| `env_list` returns all environments with status badges | getText contains status indicators |
| `env_list` respects limit parameter | Prisma `take` matches limit |
| `env_list` handles empty environments | "No environments found" message |
| `env_get` returns environment details with service health | Contains service names, status |
| `env_get` returns NOT_FOUND for missing environment | isError true, contains "NOT_FOUND" |
| `env_get` returns PERMISSION_DENIED for other user's env | ownership check |
| `env_health_check` creates health check record | Prisma create called with correct shape |
| `env_health_check` detects degraded services | status: "degraded" when service down |
| `env_health_check` returns all-green for healthy env | status: "healthy" |
| `env_switch` changes active environment | Prisma update called |
| `env_switch` validates target environment exists | NOT_FOUND when missing |
| `env_switch` prevents switching to already-active env | CONFLICT error |
| `env_switch` records switch event in audit log | audit log creation verified |

### 2.2 Deployment Control Tools

**File:** `src/lib/mcp/server/tools/deployment.test.ts`

**Tools to register:** `deploy_list`, `deploy_promote`, `deploy_rollback`, `deploy_approve`, `deploy_status`

| Test Case | What It Asserts |
|-----------|----------------|
| registers 5 deployment tools | count check |
| `deploy_list` returns deployments sorted by date | order verification |
| `deploy_list` filters by environment | where clause includes env filter |
| `deploy_promote` creates promotion from staging to production | correct environment transition |
| `deploy_promote` requires approval gate for production | PENDING_APPROVAL status |
| `deploy_promote` rejects promotion of failed deployment | VALIDATION_ERROR |
| `deploy_rollback` reverts to previous version | creates rollback record |
| `deploy_rollback` prevents rollback when no previous exists | NOT_FOUND |
| `deploy_rollback` records rollback reason in audit | audit entry created |
| `deploy_approve` approves pending deployment | status changes to APPROVED |
| `deploy_approve` rejects already-approved deployment | CONFLICT |
| `deploy_approve` validates approver has permission | PERMISSION_DENIED |
| `deploy_status` returns real-time deployment progress | percentage, current step |
| `deploy_status` returns NOT_FOUND for missing deployment | error response |

### 2.3 Roadmap Tools

**File:** `src/lib/mcp/server/tools/roadmap.test.ts`

**Tools to register:** `roadmap_list`, `roadmap_sync_github`, `roadmap_reorder`, `roadmap_update_status`, `roadmap_bridgemind_suggest`

| Test Case | What It Asserts |
|-----------|----------------|
| registers 5 roadmap tools | count check |
| `roadmap_list` returns items with priority ordering | sorted by priority |
| `roadmap_list` filters by status (todo/in-progress/done) | where clause |
| `roadmap_sync_github` fetches GitHub project items | GitHub API call verified |
| `roadmap_sync_github` creates new items from GitHub | Prisma create for new items |
| `roadmap_sync_github` updates existing items from GitHub | Prisma update for existing |
| `roadmap_sync_github` handles GitHub API failure gracefully | error result, retryable: true |
| `roadmap_reorder` updates item positions | Prisma updateMany with new positions |
| `roadmap_reorder` validates all item IDs exist | NOT_FOUND for missing items |
| `roadmap_update_status` transitions item status | state machine validation |
| `roadmap_update_status` rejects invalid transitions | cannot go done->todo |
| `roadmap_bridgemind_suggest` returns AI priority suggestions | contains suggestion text |
| `roadmap_bridgemind_suggest` handles empty roadmap | "No items to analyze" |

### 2.4 Agent Command Center Tools

**File:** `src/lib/mcp/server/tools/agent-command.test.ts`

**Tools to register:** `agent_cmd_spawn`, `agent_cmd_send`, `agent_cmd_broadcast`, `agent_cmd_status`, `agent_cmd_terminate`

This extends the existing `agent-management` tools with WebSocket-based real-time communication.

| Test Case | What It Asserts |
|-----------|----------------|
| registers 5 agent command tools | count check |
| `agent_cmd_spawn` creates agent with capability token | token service called |
| `agent_cmd_spawn` rejects when agent limit reached | RESOURCE_EXHAUSTED |
| `agent_cmd_spawn` assigns correct workspace context | workspace ID propagated |
| `agent_cmd_send` routes message to specific agent | message routing verified |
| `agent_cmd_send` returns NOT_FOUND for disconnected agent | error handling |
| `agent_cmd_send` records message in history | Prisma create for agentMessage |
| `agent_cmd_broadcast` sends to all active agents | message fan-out verified |
| `agent_cmd_broadcast` skips terminated agents | only active agents receive |
| `agent_cmd_status` returns agent health metrics | tokens, tasks, uptime |
| `agent_cmd_status` detects stale agents (no heartbeat) | stale detection logic |
| `agent_cmd_terminate` gracefully shuts down agent | status changed to TERMINATED |
| `agent_cmd_terminate` cleans up agent resources | resource cleanup verified |
| `agent_cmd_terminate` rejects termination of other user's agent | PERMISSION_DENIED |

### 2.5 Analytics Hub Tools

**File:** `src/lib/mcp/server/tools/analytics-hub.test.ts`

**Tools to register:** `analytics_aggregate`, `analytics_chart_data`, `analytics_report`, `analytics_export`

| Test Case | What It Asserts |
|-----------|----------------|
| registers 4 analytics tools | count check |
| `analytics_aggregate` computes correct totals | sum, avg, count verified |
| `analytics_aggregate` handles empty dataset | zero values returned |
| `analytics_aggregate` respects date range filter | Prisma where clause |
| `analytics_aggregate` groups by dimension (day/week/month) | groupBy verified |
| `analytics_chart_data` returns time-series format | array of {timestamp, value} |
| `analytics_chart_data` fills gaps in sparse data | zero-fill for missing dates |
| `analytics_chart_data` respects max data points limit | truncation at limit |
| `analytics_report` generates markdown summary | contains headers, tables |
| `analytics_report` generates JSON when format=json | valid JSON output |
| `analytics_report` includes period metadata | start/end dates in output |
| `analytics_export` returns CSV format | comma-separated rows |
| `analytics_export` handles special characters in data | CSV escaping |

### 2.6 Task Scheduler Tools

**File:** `src/lib/mcp/server/tools/scheduler.test.ts`

**Tools to register:** `scheduler_create`, `scheduler_list`, `scheduler_update`, `scheduler_delete`, `scheduler_run_now`, `scheduler_check_conflicts`

| Test Case | What It Asserts |
|-----------|----------------|
| registers 6 scheduler tools | count check |
| `scheduler_create` creates cron job with valid expression | Prisma create with parsed cron |
| `scheduler_create` rejects invalid cron expression | VALIDATION_ERROR |
| `scheduler_create` rejects cron running more than once per minute | rate limit validation |
| `scheduler_create` detects schedule conflict | CONFLICT with existing schedule |
| `scheduler_list` returns schedules with next-run times | computed nextRunAt |
| `scheduler_list` filters by status (active/paused/failed) | where clause |
| `scheduler_update` updates cron expression | Prisma update verified |
| `scheduler_update` validates ownership | PERMISSION_DENIED |
| `scheduler_delete` removes schedule | Prisma delete called |
| `scheduler_delete` rejects deletion of running task | CONFLICT |
| `scheduler_run_now` triggers immediate execution | execution record created |
| `scheduler_run_now` rejects if task already running | CONFLICT |
| `scheduler_check_conflicts` returns overlapping schedules | conflict list returned |
| `scheduler_check_conflicts` returns empty for no conflicts | "No conflicts found" |

### 2.7 Notification Inbox Tools

**File:** `src/lib/mcp/server/tools/notification-inbox.test.ts`

**Tools to register:** `notif_list`, `notif_mark_read`, `notif_mark_all_read`, `notif_delete`, `notif_count_unread`, `notif_preferences`

This wraps the existing `NotificationService` (`src/lib/notifications/notification-service.ts`) as MCP tools.

| Test Case | What It Asserts |
|-----------|----------------|
| registers 6 notification tools | count check |
| `notif_list` returns paginated notifications | limit/offset in response |
| `notif_list` filters unread only | where clause includes read: false |
| `notif_list` sorts by priority then date | orderBy verified |
| `notif_list` returns empty message when none | "No notifications" |
| `notif_mark_read` marks single notification read | update with readAt timestamp |
| `notif_mark_read` returns NOT_FOUND for missing | error response |
| `notif_mark_all_read` marks all workspace notifications | updateMany verified |
| `notif_mark_all_read` returns count of updated | "Marked N as read" |
| `notif_delete` removes notification | Prisma delete called |
| `notif_delete` validates ownership | PERMISSION_DENIED for other workspace |
| `notif_count_unread` returns accurate count | count matches query |
| `notif_count_unread` returns 0 when all read | zero count |
| `notif_preferences` returns user notification settings | preferences object |
| `notif_preferences` updates preference values | Prisma update verified |

---

## 3. E2E Specs (20%) -- Key User Flows as Given/When/Then

### 3.1 Environment Switching Flow

**File:** `e2e/environment-switching.spec.ts`

```
Scenario: User switches from staging to production
  Given I am logged in as an admin user
  And I am on the Environment Dashboard page
  And the current active environment is "staging"
  When I click "Switch to production"
  And I confirm the environment switch dialog
  Then the active environment badge shows "production"
  And the environment health indicators update
  And a switch event appears in the activity log
  And the page URL contains "/env/production"

Scenario: Environment health check shows degraded service
  Given I am on the Environment Dashboard page
  And the API service is returning 503 errors
  When the health check poller runs
  Then the API service shows a red status indicator
  And the overall environment status shows "degraded"
  And a notification appears with priority "high"

Scenario: User cannot switch to a down environment
  Given I am on the Environment Dashboard page
  And the "production" environment status is "down"
  When I attempt to switch to "production"
  Then I see an error toast "Cannot switch to a down environment"
  And the active environment remains unchanged
```

### 3.2 Deployment Promote/Rollback Flow

**File:** `e2e/deployment-flow.spec.ts`

```
Scenario: Promote staging deployment to production with approval
  Given I am logged in as a deployer
  And there is a successful deployment on staging
  When I click "Promote to Production"
  Then a deployment approval request is created
  And the deployment status shows "Pending Approval"
  When an admin approves the deployment
  Then the deployment status changes to "In Progress"
  And a progress bar shows deployment steps
  When the deployment completes
  Then the status shows "Live"
  And the production environment reflects the new version

Scenario: Rollback production deployment
  Given I am logged in as an admin
  And the current production deployment is failing health checks
  When I click "Rollback" on the current deployment
  And I provide a rollback reason "API errors after deploy"
  Then the previous deployment is restored
  And the current deployment status shows "Rolled Back"
  And the rollback reason is recorded in the audit log
```

### 3.3 Agent Chat Flow

**File:** `e2e/agent-chat-flow.spec.ts`

```
Scenario: User spawns agent and sends a message
  Given I am logged in
  And I am on the Agent Command Center page
  When I click "Spawn New Agent"
  And I enter agent name "Test Agent"
  Then a new agent appears in the agent list with status "Active"
  When I select the agent from the list
  And I type "Run tests on src/lib/mcp" in the chat input
  And I press Enter
  Then the message appears in the chat history
  And the agent status shows "Running"
  When the agent completes the task
  Then a completion message appears in the chat
  And the agent status returns to "Active"

Scenario: Broadcast message to all agents
  Given I have 3 active agents
  When I click "Broadcast"
  And I type "Stop all tasks" and confirm
  Then all 3 agents show the broadcast message
  And a "Broadcast sent to 3 agents" confirmation appears

Scenario: Terminate stale agent
  Given I have an agent that has not sent a heartbeat for 5 minutes
  When I click "Terminate" on the stale agent
  Then the agent status changes to "Terminated"
  And the agent disappears from the active agents list
  And a notification confirms "Agent terminated successfully"
```

### 3.4 Notification Inbox Flow

**File:** `e2e/notification-flow.spec.ts`

```
Scenario: User reads and manages notifications
  Given I am logged in
  And I have 5 unread notifications
  And the notification bell shows "5"
  When I click the notification bell
  Then I see 5 notifications sorted by priority
  When I click on the highest priority notification
  Then it opens the notification detail
  And the notification is marked as read
  And the bell count updates to "4"

Scenario: Mark all notifications as read
  Given I have 10 unread notifications
  When I click "Mark all as read"
  Then all notifications show as read
  And the bell count shows "0"
  And a toast confirms "All notifications marked as read"
```

---

## 4. UI Component Tests (10%) -- Accessibility and Keyboard Navigation

### 4.1 Environment Panel

**File:** `src/components/dashboard/environment-panel.test.tsx`

| Test | What It Verifies |
|------|-----------------|
| renders environment list with correct ARIA roles | role="list", role="listitem" |
| active environment has aria-current="true" | accessibility state |
| Tab navigation cycles through environment cards | keyboard focus management |
| Enter/Space activates environment switch | keyboard activation |
| status badges use correct aria-label | "Environment production: healthy" |
| meets WCAG 2.1 color contrast for status indicators | axe-core check |
| responsive: collapses to accordion on mobile (< 768px) | layout test |

### 4.2 Deployment Control

**File:** `src/components/dashboard/deployment-control.test.tsx`

| Test | What It Verifies |
|------|-----------------|
| approval dialog is accessible (role="dialog", aria-modal) | dialog semantics |
| Escape key closes approval dialog | keyboard dismissal |
| progress bar has correct aria-valuenow/min/max | progress accessibility |
| rollback confirmation uses focus trap | focus management |
| disabled promote button has aria-disabled="true" | disabled state |

### 4.3 Agent Chat

**File:** `src/components/dashboard/agent-chat.test.tsx`

| Test | What It Verifies |
|------|-----------------|
| chat input has aria-label "Send message to agent" | input accessibility |
| message list has role="log" with aria-live="polite" | live region |
| agent status uses role="status" | status semantics |
| keyboard shortcut Ctrl+Enter sends message | keyboard interaction |
| agent list is navigable with arrow keys | listbox navigation |
| screen reader announces new messages | aria-live assertion |

---

## 5. Mock Strategy -- External Service Mocking

### 5.1 WebSocket Mock (Agent Command Center)

**File:** `src/lib/mcp/server/__test-utils__/mocks/websocket.ts`

```typescript
export function createMockWebSocket() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const sentMessages: string[] = [];

  return {
    send: vi.fn((data: string) => { sentMessages.push(data); }),
    close: vi.fn(),
    addEventListener: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    }),
    removeEventListener: vi.fn(),
    readyState: 1, // OPEN
    sentMessages,
    // Test helper: simulate receiving a message
    simulateMessage(data: string) {
      listeners.get("message")?.forEach((cb) => cb({ data }));
    },
    // Test helper: simulate connection close
    simulateClose(code = 1000) {
      listeners.get("close")?.forEach((cb) => cb({ code }));
    },
  };
}
```

Usage in tests: the agent command tools mock the WebSocket layer. The MCP tool tests do NOT test WebSocket directly -- they test business logic through the `createMockRegistry()` pattern, and the WebSocket is mocked behind the service layer.

### 5.2 GitHub Projects API Mock (Roadmap)

**File:** `src/lib/mcp/server/__test-utils__/mocks/github-projects.ts`

Mock the `gh` CLI or octokit calls used by the roadmap sync tool. Returns fixture data for project items with title, status, labels, and assignees.

### 5.3 Sentry API Mock (Analytics)

Mock Sentry error fetching for the analytics hub. Returns mock error counts, issue details, and error trends.

### 5.4 Vercel API Mock (Deployment)

Mock Vercel deployment API responses for `deploy_status`, `deploy_promote`, and `deploy_rollback`. Returns deployment status, URL, and build output.

### 5.5 Redis Pub/Sub Mock (Agent Message Routing)

For agent broadcast/message routing, mock the Redis pub/sub layer. The mock tracks published messages and allows test-controlled subscription delivery.

### 5.6 Mock Registration Pattern

All external service mocks follow the `vi.hoisted()` + `vi.mock()` pattern required by pool: "forks":

```typescript
const mockGitHubApi = vi.hoisted(() => ({
  fetchProjectItems: vi.fn(),
  updateProjectItem: vi.fn(),
}));
vi.mock("@/lib/github/projects-api", () => mockGitHubApi);
```

---

## 6. CI Integration -- Test Execution Order, Parallelization, Coverage Gates

### 6.1 Current CI Structure (No Changes Needed to Workflow)

The existing `ci-cd.yml` already supports the testing strategy:

- **4-shard parallel execution** (`matrix.shard: [1, 2, 3, 4]`) with pool: "forks"
- **Coverage thresholds:** 80% lines, 80% functions, 75% branches, 80% statements on `src/lib/mcp/**/*.ts`
- **Codecov merges** shard coverage via `codecov/codecov-action@v5`
- **PR branch runs:** `yarn test:run --changed main` (only affected tests)
- **Main branch runs:** full coverage with threshold enforcement

### 6.2 Test Execution Order

```
Tier 1 (parallel, no deps):
  quality-checks  ─── lint + tsc + security audit
  unit-tests[1-4] ─── MCP tool tests + agent tests (4 shards)
  package-tests   ─── workspace package tests
  build           ─── Next.js build

Tier 2 (sequential, after Tier 1):
  deploy-staging  ─── only on main, after all Tier 1 pass
```

### 6.3 Adding E2E Tests to CI

When E2E tests are implemented, add a new job in the CI pipeline:

```yaml
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [build]  # needs the build artifact
  steps:
    - uses: actions/checkout@v6
    - uses: ./.github/actions/setup
    - name: Download build
      uses: actions/download-artifact@v4
      with:
        name: nextjs-build
        path: .next
    - name: Install Playwright
      run: npx playwright install --with-deps chromium
    - name: Run E2E tests
      run: npx playwright test
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report
```

### 6.4 Coverage Gate Configuration

The existing vitest.config.ts thresholds apply automatically to all new MCP tool files placed under `src/lib/mcp/**/*.ts`:

```typescript
coverage: {
  include: ["src/lib/mcp/**/*.ts", "src/lib/agents/**/*.ts"],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
  },
}
```

No changes needed -- new tool files automatically fall under coverage enforcement.

### 6.5 Local Development Fast Feedback

Use the `file_guard` MCP tool for pre-commit validation. When all changed files are under `src/lib/mcp/`, the guard scopes the vitest run to the MCP layer for sub-10-second feedback.

---

## 7. Agent-Based Testing -- Testing the Agent Command Center (Agents Testing Agents)

### 7.1 The Problem

The Agent Command Center is unique: it manages agents that perform tasks. Testing "agents testing agents" requires three layers.

### 7.2 Three-Layer Testing Approach

**Layer A: MCP Tool Unit Tests (covered in Section 2.4)**
Test the `agent_cmd_*` tools in isolation using `createMockRegistry()`. This covers:
- Spawning/terminating agents (CRUD operations)
- Message routing logic
- Permission checks
- Resource limits

**Layer B: Orchestrator Integration Tests**
Test that the orchestrator tools (`orchestrator_create_plan`, `orchestrator_dispatch`, etc.) correctly coordinate multiple agent tasks. The existing `orchestrator.test.ts` pattern extends:

```typescript
describe("orchestrator + agent command integration", () => {
  it("should create a plan that spawns agents for each subtask", async () => {
    // 1. Create a plan with 3 subtasks
    const planResult = await createPlanHandler({
      description: "Test all dashboard features",
      subtasks: [
        { description: "Test environment switching" },
        { description: "Test deployment rollback" },
        { description: "Test notification delivery" },
      ],
    });
    // 2. Dispatch subtasks -- each dispatches to a spawned agent
    const dispatchResult = await dispatchHandler({ plan_id: planId, subtask_id: "subtask-1" });
    expect(getText(dispatchResult)).toContain("dispatched");
    // 3. Verify agent was assigned
    const statusResult = await statusHandler({ plan_id: planId });
    expect(getText(statusResult)).toContain("running");
  });
});
```

**Layer C: Self-Referential Agent Test**
An E2E test that uses the Agent Command Center to test itself:

```
Scenario: Agent validates its own command center
  Given I spawn a test agent via agent_cmd_spawn
  When I send the agent a task: "verify agent_cmd_status returns your own status"
  And the agent calls agent_cmd_status with its own ID
  Then the agent should receive its own metrics
  And the status should show "running"
  And the test validates round-trip message delivery
```

This is implemented as an MCP tool test that:
1. Spawns an agent (mocked at Prisma level)
2. Sends it a message
3. Checks the message appears in the queue
4. Submits a result
5. Verifies the result is recorded

### 7.3 Agent Heartbeat/Staleness Testing

```typescript
describe("agent staleness detection", () => {
  it("should mark agent as stale after 5 minutes without heartbeat", async () => {
    // Create agent with lastSeenAt = 6 minutes ago
    mockPrisma.claudeCodeAgent.findUnique.mockResolvedValue(
      createAgent({ lastSeenAt: new Date(Date.now() - 6 * 60_000) })
    );
    const result = await statusHandler({ agent_id: "agent-1" });
    expect(getText(result)).toContain("stale");
  });

  it("should mark agent as active with recent heartbeat", async () => {
    mockPrisma.claudeCodeAgent.findUnique.mockResolvedValue(
      createAgent({ lastSeenAt: new Date(Date.now() - 30_000) })
    );
    const result = await statusHandler({ agent_id: "agent-1" });
    expect(getText(result)).toContain("active");
  });
});
```

---

## 8. Regression Prevention -- What Tests Catch When Things Break

### 8.1 Environment Switching Regression Matrix

| What Breaks | Test That Catches It | Layer |
|-------------|---------------------|-------|
| `env_switch` handler stops validating target env exists | `env_switch validates target environment exists` | MCP (70%) |
| Active environment badge stops updating in UI | `active environment has aria-current="true"` | UI (10%) |
| Environment switch dialog stops closing on confirm | `Enter/Space activates environment switch` | UI (10%) |
| Health check stops detecting degraded services | `env_health_check detects degraded services` | MCP (70%) |
| Environment switch API returns 500 | `User cannot switch to a down environment` | E2E (20%) |
| Prisma query for env_list breaks | `env_list returns all environments with status badges` | MCP (70%) |
| Switch event stops being recorded in audit log | `env_switch records switch event in audit log` | MCP (70%) |
| URL routing breaks after env switch | `page URL contains "/env/production"` | E2E (20%) |

### 8.2 Agent Chat Regression Matrix

| What Breaks | Test That Catches It | Layer |
|-------------|---------------------|-------|
| Message routing sends to wrong agent | `agent_cmd_send routes message to specific agent` | MCP (70%) |
| Broadcast skips some agents | `agent_cmd_broadcast sends to all active agents` | MCP (70%) |
| Terminated agents receive messages | `agent_cmd_broadcast skips terminated agents` | MCP (70%) |
| Agent spawn exceeds limit | `agent_cmd_spawn rejects when agent limit reached` | MCP (70%) |
| Chat input loses keyboard focus | `chat input has aria-label "Send message to agent"` | UI (10%) |
| Screen reader misses new messages | `screen reader announces new messages` | UI (10%) |
| Chat message doesn't appear after send | `message appears in the chat history` | E2E (20%) |
| Agent status doesn't update after task | `agent status returns to Active after task` | E2E (20%) |
| Permission bypass on terminate | `agent_cmd_terminate rejects termination of other user's agent` | MCP (70%) |
| Stale agent detection threshold wrong | `should mark agent as stale after 5 minutes` | MCP (70%) |

### 8.3 Deployment Rollback Regression Matrix

| What Breaks | Test That Catches It | Layer |
|-------------|---------------------|-------|
| Rollback doesn't find previous deployment | `deploy_rollback prevents rollback when no previous exists` | MCP (70%) |
| Rollback reason not saved | `deploy_rollback records rollback reason in audit` | MCP (70%) |
| Failed deployment gets promoted | `deploy_promote rejects promotion of failed deployment` | MCP (70%) |
| Approval gate bypassed | `deploy_promote requires approval gate for production` | MCP (70%) |
| Rollback UI dialog not accessible | `rollback confirmation uses focus trap` | UI (10%) |
| Full rollback flow breaks | `Rollback production deployment` | E2E (20%) |

### 8.4 Cross-Feature Regression

| Scenario | Tests That Catch It |
|----------|-------------------|
| Deployment triggers notification but notification service broken | `notif_list` MCP test + `deploy_promote` MCP test (both must pass independently) |
| Agent spawned during deployment overloads system | `agent_cmd_spawn rejects when agent limit reached` |
| Scheduler creates task that conflicts with deployment window | `scheduler_check_conflicts returns overlapping schedules` |
| Analytics aggregation breaks when environment switches mid-query | `analytics_aggregate respects date range filter` |

---

## 9. Implementation Priority Order

1. **Fixtures and mocks** (`__test-utils__/fixtures/`, `__test-utils__/mocks/`) -- all other tests depend on these
2. **Environment + Deployment** tools and tests -- core operational features
3. **Notification Inbox** tools and tests -- wraps existing `NotificationService`
4. **Agent Command Center** tools and tests -- extends existing `agent-management`
5. **Scheduler + Analytics + Roadmap** tools and tests
6. **UI component tests** -- after tool implementations stabilize
7. **E2E specs** -- after all tools and UI components are in place

### Estimated Test Count

| Category | Feature | Test Count |
|----------|---------|-----------|
| MCP Tools (70%) | Environment Dashboard | ~14 |
| MCP Tools (70%) | Deployment Control | ~14 |
| MCP Tools (70%) | Roadmap | ~13 |
| MCP Tools (70%) | Agent Command Center | ~14 |
| MCP Tools (70%) | Analytics Hub | ~12 |
| MCP Tools (70%) | Task Scheduler | ~14 |
| MCP Tools (70%) | Notification Inbox | ~14 |
| UI Tests (10%) | Environment Panel | ~7 |
| UI Tests (10%) | Deployment Control | ~5 |
| UI Tests (10%) | Agent Chat | ~6 |
| E2E Specs (20%) | Environment Switching | ~3 scenarios |
| E2E Specs (20%) | Deployment Flow | ~2 scenarios |
| E2E Specs (20%) | Agent Chat Flow | ~3 scenarios |
| E2E Specs (20%) | Notification Flow | ~2 scenarios |
| **Total** | | **~123 tests** |

Distribution: ~95 MCP tool tests (77%), ~18 UI tests (15%), ~10 E2E scenarios (8%) -- closely matching the 70/10/20 target.

---

## 10. Key Technical Decisions

1. **No `any` types** -- All mocks use proper TypeScript types or `unknown` with type assertions
2. **vi.hoisted()** for all mock variables used in `vi.mock()` factories (pool: "forks" requirement)
3. **createMockRegistry()** pattern for all MCP tool tests -- battle-tested in 40+ existing test files
4. **Custom mcpMatchers** (`toBeSuccessfulMcpResult`, `toBeErrorMcpResult`, `toHaveTextContaining`) already registered in `vitest.setup.ts`
5. **getText() / isError()** assertion helpers from `__test-utils__/assertions.ts`
6. **Fixture factories** return typed objects with override support -- deterministic, no random data
7. **No eslint-disable** or **ts-ignore** -- fix the underlying issue instead
8. **Dynamic Prisma import pattern** continues: `const prisma = (await import("@/lib/prisma")).default`
