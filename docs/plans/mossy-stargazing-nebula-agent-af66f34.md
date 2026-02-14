# AI Cloud Swarm Platform Management Dashboard -- Backend Architecture

Resolves #1254

## Executive Summary

Replace all 35 existing `/api/admin/*` REST routes with an MCP-first data layer.
The dashboard frontend calls a single `/api/mcp` endpoint (already deployed) using
JSON-RPC, with a new dedicated SSE channel at `/api/mcp/stream` for real-time
push events. All data flows through MCP tools registered in the existing
`ToolRegistry` with progressive disclosure.

---

## 1. Architecture Overview

```
                                                  +------------------+
                                                  |   Sentry API     |
                                                  +--------+---------+
                                                           |
+------------------+       +-----------+          +--------v---------+
|  Admin Dashboard |------>| /api/mcp  |--------->| MCP Tool Layer   |
|  (Next.js RSC +  | POST  | (JSON-RPC)| stateless|  (ToolRegistry)  |
|   Client hooks)  |       +-----------+          |                  |
|                  |                              |  swarm_*         |
|                  |       +------------------+   |  env_*           |
|                  |<------| /api/mcp/stream  |<--|  dash_*          |
|                  |  SSE  | (Server-Sent Ev) |   |  sentry_*        |
+------------------+       +------------------+   |  vercel_*        |
                                                  |  github_*        |
                                                  +-----+--+---------+
                                                        |  |
                                    +-------------------+  +------------------+
                                    |                                         |
                            +-------v-------+                         +-------v-------+
                            | PostgreSQL    |                         | Upstash Redis |
                            | (Prisma ORM)  |                         | (cache, pub/  |
                            |               |                         |  sub, queues) |
                            +---------------+                         +---------------+
                                    |
                    +---------------+------------------+
                    |               |                   |
             +------v------+  +----v------+    +-------v--------+
             | Vercel API  |  | GitHub    |    | Stripe API     |
             | (Analytics) |  | Projects  |    | (Billing)      |
             +-------------+  | V2 + REST |    +----------------+
                              +-----------+
```

---

## 2. New MCP Tool Categories and Definitions

### 2.1 Category: `swarm` -- Agent Command Center (8 tools)

These tools supersede the existing `agents` category for the admin dashboard.
The current `agents_*` tools are user-scoped (ownership check). Swarm tools are
admin-scoped (require ADMIN/SUPER_ADMIN role).

| Tool Name | Description | Inputs | Output |
|-----------|-------------|--------|--------|
| `swarm_list_agents` | List all agents across all users with filtering | `{ status?: "active"\|"idle"\|"all", user_id?: string, limit?: number, offset?: number }` | Agent list with pagination, trust scores, token budgets |
| `swarm_get_agent` | Full agent detail including capability tokens, audit trail, trust score | `{ agent_id: string }` | Complete agent profile |
| `swarm_spawn_agent` | Create a new agent session with capability token and initial task | `{ display_name: string, project_path?: string, allowed_categories: string[], max_token_budget?: number, initial_task?: string }` | New agent ID + capability token |
| `swarm_stop_agent` | Gracefully stop an agent, revoke capability tokens | `{ agent_id: string, reason?: string }` | Confirmation + final stats |
| `swarm_redirect_agent` | Send a priority directive to change an agent's current task | `{ agent_id: string, new_task: string, priority: "normal"\|"urgent" }` | Message ID + delivery confirmation |
| `swarm_broadcast` | Send a message to all active agents | `{ content: string, filter_categories?: string[] }` | Delivery report (count, agent IDs) |
| `swarm_agent_timeline` | Get real-time activity feed for an agent (tool calls, messages, errors) | `{ agent_id: string, since?: string, limit?: number }` | Chronological activity entries |
| `swarm_topology` | Get agent-to-agent delegation graph (parent/child capability tokens) | `{}` | Adjacency list of agent relationships |

**Implementation file:** `/src/lib/mcp/server/tools/swarm.ts`

All handlers verify `userId` has ADMIN role via Prisma `user.role` check. Data
comes from `ClaudeCodeAgent`, `AgentMessage`, `AgentCapabilityToken`,
`AgentAuditLog`, and `AgentTrustScore` tables.

### 2.2 Category: `dash` -- Dashboard Aggregation (5 tools)

These replace the existing `/api/admin/dashboard` and `/api/admin/system/health`
REST routes with MCP-native equivalents that return structured data.

| Tool Name | Description | Inputs | Output |
|-----------|-------------|--------|--------|
| `dash_overview` | Single-call dashboard overview: user count, agent count, active jobs, error rate, credit usage | `{}` | JSON with all top-level KPIs |
| `dash_health` | System health: job queue depth, hourly throughput, failure rates by tier, avg processing time | `{ period?: "1h"\|"24h"\|"7d" }` | Health metrics |
| `dash_errors` | Error aggregation: top error types, error rate trends, affected routes | `{ period?: "1h"\|"24h"\|"7d", limit?: number }` | Error summary from ErrorLog table |
| `dash_activity_feed` | Real-time platform activity: recent tool invocations, agent messages, errors | `{ limit?: number, types?: string[] }` | Chronological feed entries |
| `dash_widget_data` | Parameterized widget data fetch for specific dashboard cards | `{ widget: "users_over_time"\|"jobs_by_status"\|"agent_activity"\|"credit_burn_rate"\|"error_heatmap", period?: string }` | Widget-specific data series |

**Implementation file:** `/src/lib/mcp/server/tools/dashboard.ts`

### 2.3 Category: `env` -- Environment Management (4 tools)

Multi-environment visibility across dev, preview (Vercel), and production.

| Tool Name | Description | Inputs | Output |
|-----------|-------------|--------|--------|
| `env_list` | List all known environments with status | `{}` | Array of `{ name, url, status, version, lastDeploy }` |
| `env_status` | Deep health check for a specific environment | `{ environment: "dev"\|"preview"\|"production" }` | DB connectivity, Redis, external service health |
| `env_compare` | Compare two environments: schema version, feature flags, config drift | `{ source: string, target: string }` | Diff report |
| `env_deployments` | List recent Vercel deployments with status | `{ limit?: number, state?: "READY"\|"ERROR"\|"BUILDING" }` | Deployment list from Vercel API |

**Implementation file:** `/src/lib/mcp/server/tools/environment.ts`

Data sources:
- `env_status` for dev: reads `.dev-logs/dev-meta.json` (same as `dev_status`)
- `env_status` for preview/prod: calls Vercel API + runs lightweight health probes
- `env_deployments`: Vercel REST API (`/v6/deployments`)
- `env_compare`: Prisma migration history + environment variable diff

### 2.4 Category: `sentry` -- Error Tracking Bridge (3 tools)

Bridge Sentry's API into MCP tools for the dashboard's error panel.

| Tool Name | Description | Inputs | Output |
|-----------|-------------|--------|--------|
| `sentry_issues` | List top Sentry issues for the project | `{ period?: "1h"\|"24h"\|"7d"\|"30d", limit?: number, query?: string }` | Issue list with count, assignee, first/last seen |
| `sentry_issue_detail` | Get full details + events for a Sentry issue | `{ issue_id: string }` | Issue detail with stack traces, tags, affected users |
| `sentry_stats` | Aggregate error stats: events per hour, error types, affected releases | `{ period?: "24h"\|"7d" }` | Time-series data + breakdown |

**Implementation file:** `/src/lib/mcp/server/tools/sentry-bridge.ts`

Data source: Sentry HTTP API (`https://sentry.io/api/0/`). Auth token from env
var `SENTRY_AUTH_TOKEN`. Project slug from `SENTRY_PROJECT_SLUG`.

### 2.5 Category: `vercel` -- Deployment & Analytics Bridge (3 tools)

Bridge Vercel's API for deployment monitoring.

| Tool Name | Description | Inputs | Output |
|-----------|-------------|--------|--------|
| `vercel_deployments` | List deployments with build status | `{ limit?: number, state?: string, target?: "production"\|"preview" }` | Deployment list |
| `vercel_deployment_detail` | Get logs, build output, and env for a deployment | `{ deployment_id: string }` | Full deployment info |
| `vercel_analytics` | Page views, web vitals, top pages | `{ period?: "24h"\|"7d"\|"30d" }` | Analytics data (wraps existing `fetchVercelAnalytics`) |

**Implementation file:** `/src/lib/mcp/server/tools/vercel-bridge.ts`

### 2.6 Category: `github-admin` -- GitHub Project Board Bridge (3 tools)

Extends the existing `gateway` category (BridgeMind) with admin-focused tools.

| Tool Name | Description | Inputs | Output |
|-----------|-------------|--------|--------|
| `github_admin_roadmap` | Get GitHub Projects V2 items with status columns | `{ project_number?: number, limit?: number }` | Project items with status, assignee, labels |
| `github_admin_issues_summary` | Aggregate issue stats: open/closed counts, label distribution, stale issues | `{ period?: "7d"\|"30d" }` | Issue metrics |
| `github_admin_pr_status` | Active PRs with CI check status | `{ state?: "open"\|"merged", limit?: number }` | PR list with check conclusions |

**Implementation file:** `/src/lib/mcp/server/tools/github-admin.ts`

Data source: GitHub REST + GraphQL APIs via `gh` CLI or `@octokit/graphql`.

---

## 3. Real-Time Communication Architecture

### Decision: SSE for Push, MCP JSON-RPC for Pull

The existing MCP endpoint (`/api/mcp`) already supports SSE via the
`Accept: text/event-stream` header. However, it is stateless (no session ID) and
request-scoped -- SSE only streams results for that specific tool call.

For true server-push (agent heartbeats, new errors, deployment status changes),
we need a persistent SSE connection.

### 3.1 New Endpoint: `/api/admin/stream`

```
GET /api/admin/stream
Authorization: Bearer <token>
Accept: text/event-stream

Response:
event: agent_heartbeat
data: {"agent_id":"abc","status":"active","last_tool":"sandbox_exec","ts":"..."}

event: error_alert
data: {"source":"sentry","issue_id":"123","title":"TypeError...","count":42}

event: deployment_status
data: {"id":"dpl_xxx","state":"READY","url":"...","target":"production"}

event: agent_message
data: {"agent_id":"abc","role":"ASSISTANT","content":"...","ts":"..."}
```

### 3.2 Soft Reconnection & State Reconciliation (BAZDMEG Resilience)

To address the risk of "stale dashboard" states during SSE disconnections (e.g., WiFi drops or server restarts), the following strategy is implemented:

1. **Last-Event-ID**: The client sends the `Last-Event-ID` header on reconnection. The server attempts to replay missed events from the Redis List if still available.
2. **Explicit Full Refresh**: If the reconnection fails or the cursor is too old, the server sends a `reconcile_state` event.
3. **Client-Side Trigger**: Upon receiving `reconcile_state`, the dashboard triggers an `invalidateQueries()` on all active TanStack Query keys to refetch the full state from MCP tools, ensuring zero drift.

**Architecture:**

```
+-------------------+
| Admin Dashboard   |
| EventSource       |<----- GET /api/admin/stream (persistent SSE)
+-------------------+
         ^
         |
+--------+---------+
| SSE Coordinator  |
| (server-side)    |
+--------+---------+
         |
    +----+----+
    |         |
+---v---+ +---v---+
| Redis | | Timer |
| PubSub| | (30s) |
+-------+ +-------+
```

**How it works:**

1. **Redis Pub/Sub channel** `admin:events` receives events from any source:
   - Agent heartbeat cron writes to Redis every 10s
   - Sentry webhook handler publishes new issues
   - Vercel deploy hook publishes deployment events
   - Tool invocations publish `tool_called` events (fire-and-forget in `safeToolCall`)

2. **SSE Coordinator** (in `/api/admin/stream` route handler):
   - Subscribes to `admin:events` Redis channel
   - Transforms raw events into SSE format
   - Sends keepalive `:ping` every 15s
   - Max connection duration: 5 minutes (Vercel limit), client auto-reconnects

3. **Fallback polling**: If SSE is unavailable, dashboard polls `dash_activity_feed`
   tool every 5 seconds via standard MCP JSON-RPC.

### 3.2 Event Types

| Event Type | Source | Frequency | Data |
|-----------|--------|-----------|------|
| `agent_heartbeat` | Redis poll of ClaudeCodeAgent.lastSeenAt | Every 10s | Agent ID, status, current tool |
| `agent_message` | Redis pub/sub on message insert | On event | Agent ID, role, content preview |
| `error_alert` | Sentry webhook or ErrorLog insert trigger | On event | Error type, count, severity |
| `deployment_status` | Vercel deploy hook | On event | Deployment ID, state, URL |
| `job_status` | ImageEnhancementJob status change | On event | Job ID, old/new status |
| `swarm_topology_change` | CapabilityToken create/revoke | On event | Agent ID, action |

### 3.3 Agent Chat Real-Time

For agent-to-human chat, the SSE stream carries `agent_message` events.
Sending messages to agents uses the existing `swarm_redirect_agent` or
`agents_send_message` MCP tools via POST.

This is intentionally **not** WebSocket. Rationale:
- Vercel serverless does not support persistent WebSocket connections
- SSE works natively with serverless + edge functions
- MCP protocol is inherently request/response (JSON-RPC)
- Redis pub/sub provides the pub/sub layer without WebSocket complexity

---

## 4. Data Aggregation Strategy

### 4.1 Tiered Caching with Redis

```
Layer 1: In-memory (process-local)     -- 30s TTL, hot dashboard widgets
Layer 2: Upstash Redis                  -- 5min TTL, cross-instance shared
Layer 3: PostgreSQL (source of truth)   -- Always fresh, used for cache miss
```

**Cache key schema:**
```
dash:overview:{period}          -> dash_overview result
dash:health:{period}            -> dash_health result
dash:errors:{period}:{limit}    -> dash_errors result
swarm:agents:list               -> swarm_list_agents result
env:status:{environment}        -> env_status result
sentry:issues:{period}          -> sentry_issues result
vercel:deployments:{limit}      -> vercel_deployments result
```

### 4.2 Widget Data Pre-computation

For expensive aggregation queries (time-series, heatmaps), use a background
cron job that pre-computes and caches results:

**File:** `/src/lib/dashboard/precompute.ts`

```typescript
// Runs every 60 seconds via Vercel Cron or external scheduler
export async function precomputeDashboardData(): Promise<void> {
  const redis = (await import("@/lib/upstash/client")).redis;

  // Pre-compute expensive queries in parallel
  const [overview, health, errorStats] = await Promise.all([
    computeOverviewMetrics(),
    computeHealthMetrics("24h"),
    computeErrorStats("24h"),
  ]);

  // Store with 90s TTL (longer than compute interval for overlap)
  await Promise.all([
    redis.set("dash:overview:24h", JSON.stringify(overview), { ex: 90 }),
    redis.set("dash:health:24h", JSON.stringify(health), { ex: 90 }),
    redis.set("dash:errors:24h", JSON.stringify(errorStats), { ex: 90 }),
  ]);
}
```

### 4.3 Aggregation Patterns

The `dash_overview` tool performs a single parallel query batch:

```typescript
const [
  userCount,
  agentCount,
  activeAgents,
  pendingJobs,
  failedJobs,
  creditsUsed,
  errorCount24h,
  toolInvocations24h,
] = await Promise.all([
  prisma.user.count(),
  prisma.claudeCodeAgent.count({ where: { deletedAt: null } }),
  prisma.claudeCodeAgent.count({
    where: {
      deletedAt: null,
      lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  }),
  prisma.imageEnhancementJob.count({ where: { status: "PENDING" } }),
  prisma.imageEnhancementJob.count({ where: { status: "FAILED" } }),
  prisma.workspace.aggregate({ _sum: { usedAiCredits: true } }),
  prisma.errorLog.count({
    where: { timestamp: { gte: new Date(Date.now() - 86400000) } },
  }),
  prisma.toolInvocation.count({
    where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
  }),
]);
```

This replaces the 8+ separate REST endpoints that the current admin dashboard calls.

---

## 5. Environment Management API Design

### 5.1 Environment Registry

Environments are defined as configuration, not database records:

```typescript
// /src/lib/dashboard/environments.ts

export interface EnvironmentConfig {
  name: string;
  slug: "dev" | "preview" | "production";
  baseUrl: string;
  healthEndpoint: string;
  vercelProjectId?: string;
  sentryEnvironment?: string;
}

export const ENVIRONMENTS: EnvironmentConfig[] = [
  {
    name: "Development",
    slug: "dev",
    baseUrl: "http://localhost:3000",
    healthEndpoint: "/api/health",
    sentryEnvironment: "development",
  },
  {
    name: "Preview (Vercel)",
    slug: "preview",
    baseUrl: "", // Dynamic per deployment
    healthEndpoint: "/api/health",
    vercelProjectId: process.env.VERCEL_PROJECT_ID,
    sentryEnvironment: "preview",
  },
  {
    name: "Production",
    slug: "production",
    baseUrl: "https://spike.land",
    healthEndpoint: "/api/health",
    vercelProjectId: process.env.VERCEL_PROJECT_ID,
    sentryEnvironment: "production",
  },
];
```

### 5.2 Health Probe

The `env_status` tool probes each environment:

```typescript
interface EnvironmentHealth {
  environment: string;
  status: "healthy" | "degraded" | "down";
  checks: {
    http: { ok: boolean; latencyMs: number };
    database: { ok: boolean; latencyMs: number };
    redis: { ok: boolean; latencyMs: number };
  };
  version: string; // git commit SHA
  lastDeployedAt: string;
}
```

For `dev`: read `.dev-logs/dev-meta.json` directly.
For `preview`/`production`: HTTP probe to `/api/health` endpoint + Vercel API.

---

## 6. Agent Command Protocol

### 6.1 Spawn Protocol

```
Admin calls swarm_spawn_agent
    |
    v
1. Create ClaudeCodeAgent record (Prisma)
2. Generate AgentCapabilityToken with specified scope
3. Store initial task as AgentMessage (role: USER)
4. Publish "agent_spawned" to Redis admin:events
5. Return agent_id + connect_id for the agent to call back
    |
    v
Agent process connects via /api/agents/connect/{connect_id}
    |
    v
Agent polls /api/mcp for tool calls using its capability token
```

The actual agent process is spawned externally (via Claude Code CLI, Jules API,
or custom launcher). The MCP tool creates the database records and capability
token. The agent connects using the standard agent connection flow.

### 6.2 Stop Protocol

```
Admin calls swarm_stop_agent
    |
    v
1. Revoke all active AgentCapabilityTokens for this agent
2. Send priority message: "SYSTEM: Agent shutdown requested"
3. Set agent.deletedAt = now()
4. Publish "agent_stopped" to Redis admin:events
5. Return final stats (tokens used, tasks completed, session time)
```

### 6.3 Redirect Protocol

```
Admin calls swarm_redirect_agent
    |
    v
1. Create AgentMessage with role=USER, metadata.priority="urgent"
2. Publish "agent_redirect" to Redis admin:events with agent_id
3. If agent is connected via SSE, message is delivered immediately
4. Otherwise, agent picks it up on next queue poll
```

### 6.4 Message Delivery Guarantees

- **At-least-once delivery**: Messages are persisted in `AgentMessage` table
  before being published to Redis. Agent marks messages as read after processing.
- **Ordering**: Messages ordered by `createdAt` timestamp.
- **Priority**: Urgent messages have `metadata.priority = "urgent"` and are
  surfaced first in the agent's queue response.

---

## 7. Caching Strategy

### 7.1 Cache Architecture

```
+------------------+     +------------------+     +------------------+
|   MCP Tool       |---->| Cache Layer      |---->| Data Source       |
|   Handler        |     | (read-through)   |     | (Prisma/API)     |
+------------------+     +------------------+     +------------------+

Cache Layer:
  1. Check process-local Map (30s TTL)
  2. If miss, check Upstash Redis (5min TTL)
  3. If miss, query source and populate both layers
```

### 7.2 Cache Implementation

```typescript
// /src/lib/dashboard/cache.ts

import { redis } from "@/lib/upstash/client";

const localCache = new Map<string, { data: unknown; expiry: number }>();
const LOCAL_TTL = 30_000;  // 30 seconds
const REDIS_TTL = 300;     // 5 minutes (seconds for Redis)

export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { localTtl?: number; redisTtl?: number },
): Promise<T> {
  // Layer 1: Process-local
  const local = localCache.get(key);
  if (local && local.expiry > Date.now()) {
    return local.data as T;
  }

  // Layer 2: Redis
  const cached = await redis.get(key);
  if (cached) {
    const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
    localCache.set(key, {
      data: parsed,
      expiry: Date.now() + (options?.localTtl ?? LOCAL_TTL),
    });
    return parsed as T;
  }

  // Layer 3: Source
  const data = await fetcher();
  localCache.set(key, {
    data,
    expiry: Date.now() + (options?.localTtl ?? LOCAL_TTL),
  });
  await redis.set(key, JSON.stringify(data), {
    ex: options?.redisTtl ?? REDIS_TTL,
  });

  return data;
}
```

### 7.3 Cache Invalidation

- **Write-through**: When an MCP tool modifies data (e.g., `swarm_stop_agent`),
  it deletes the relevant cache keys after the write.
- **TTL-based expiry**: Most dashboard data is acceptable at 30s staleness.
- **Event-driven**: Redis pub/sub events can trigger cache invalidation for
  connected instances.

### 7.4 Per-Tool Cache Configuration

| Tool | Local TTL | Redis TTL | Invalidation Trigger |
|------|----------|----------|---------------------|
| `dash_overview` | 30s | 60s | Any write tool in `admin`/`swarm` category |
| `dash_health` | 15s | 30s | Job status change |
| `dash_errors` | 60s | 300s | New ErrorLog insert |
| `swarm_list_agents` | 10s | 30s | Agent connect/disconnect |
| `sentry_issues` | 120s | 300s | Sentry webhook |
| `vercel_deployments` | 60s | 300s | Deploy webhook |
| `env_status` | 30s | 60s | Health probe |

---

## 8. External Service Bridge Strategy

### 8.1 Bridge Pattern

Each external service follows the same pattern:

```typescript
// /src/lib/bridges/<service>.ts

export interface BridgeConfig {
  baseUrl: string;
  authToken: string;
  projectId?: string;
}

export class SentryBridge {
  constructor(private config: BridgeConfig) {}

  async listIssues(params: ListIssuesParams): Promise<SentryIssue[]> {
    const response = await fetch(
      `${this.config.baseUrl}/projects/${this.config.projectId}/issues/`,
      {
        headers: { Authorization: `Bearer ${this.config.authToken}` },
      },
    );
    if (!response.ok) throw new Error(`Sentry API error: ${response.status}`);
    return response.json();
  }
}
```

### 8.2 Service Configuration

All external service credentials come from environment variables, matching
existing patterns:

| Service | Env Vars | Existing? |
|---------|----------|-----------|
| Sentry | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | New |
| Vercel | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | Partial (analytics exists) |
| GitHub | `GH_PAT_TOKEN` or `GITHUB_TOKEN` | Exists |
| Stripe | `STRIPE_SECRET_KEY` | Exists |

### 8.3 Error Handling for External Services

All bridge calls use the existing `safeToolCall` wrapper. External service
failures return a structured error with:
- `isError: true`
- Error code `UPSTREAM_SERVICE_ERROR`
- Suggestion to retry or check service status
- Never blocks the entire dashboard (other widgets still render)

---

## 9. Registration in MCP Server

Add new tool registration calls in `/src/lib/mcp/server/mcp-server.ts`:

```typescript
import { registerSwarmTools } from "./tools/swarm";
import { registerDashboardTools } from "./tools/dashboard";
import { registerEnvironmentTools } from "./tools/environment";
import { registerSentryBridgeTools } from "./tools/sentry-bridge";
import { registerVercelBridgeTools } from "./tools/vercel-bridge";
import { registerGithubAdminTools } from "./tools/github-admin";

// In createMcpServer():

// Swarm tools (admin-only agent command center)
registerSwarmTools(registry, userId);

// Dashboard aggregation tools
registerDashboardTools(registry, userId);

// Environment management tools
registerEnvironmentTools(registry, userId);

// External service bridges (conditional on config)
if (process.env.SENTRY_AUTH_TOKEN) {
  registerSentryBridgeTools(registry, userId);
}
registerVercelBridgeTools(registry, userId);
registerGithubAdminTools(registry, userId);
```

### Category Descriptions (add to `CATEGORY_DESCRIPTIONS`):

```typescript
"swarm": "Agent command center: spawn, stop, redirect, broadcast, and monitor AI agent swarms",
"dash": "Dashboard aggregation: overview metrics, health checks, error summaries, and widget data",
"env": "Environment management: status, comparison, and deployment tracking across dev/preview/prod",
"sentry": "Sentry error tracking bridge: issues, details, and aggregate statistics",
"vercel": "Vercel deployment bridge: deployments, build logs, and web analytics",
"github-admin": "GitHub admin: project board roadmap, issue summaries, and PR status",
```

---

## 10. Admin API Routes to Delete

All 35 routes under `/src/app/api/admin/` will be deleted:

```
src/app/api/admin/agents/[sessionId]/activities/route.ts
src/app/api/admin/agents/[sessionId]/approve-plan/route.ts
src/app/api/admin/agents/[sessionId]/message/route.ts
src/app/api/admin/agents/[sessionId]/route.ts
src/app/api/admin/agents/git/route.ts
src/app/api/admin/agents/github/issues/route.ts
src/app/api/admin/agents/resources/route.ts
src/app/api/admin/agents/route.ts
src/app/api/admin/analytics/users/route.ts
src/app/api/admin/app-factory/route.ts
src/app/api/admin/bolt/route.ts
src/app/api/admin/create-agent/metrics/route.ts
src/app/api/admin/create-agent/notes/route.ts
src/app/api/admin/dashboard/route.ts
src/app/api/admin/emails/route.ts
src/app/api/admin/errors/route.ts
src/app/api/admin/errors/stats/route.ts
src/app/api/admin/gallery/browse/route.ts
src/app/api/admin/gallery/reorder/route.ts
src/app/api/admin/gallery/route.ts
src/app/api/admin/jobs/[jobId]/rerun/route.ts
src/app/api/admin/jobs/[jobId]/route.ts
src/app/api/admin/jobs/cleanup/route.ts
src/app/api/admin/jobs/route.ts
src/app/api/admin/mcp-health/route.ts
src/app/api/admin/my-apps/stats/route.ts
src/app/api/admin/photos/route.ts
src/app/api/admin/social/anomalies/route.ts
src/app/api/admin/storage/route.ts
src/app/api/admin/store/skills/route.ts
src/app/api/admin/system/health/route.ts
src/app/api/admin/tracked-urls/route.ts
src/app/api/admin/users/[userId]/enhancements/route.ts
src/app/api/admin/users/password/route.ts
src/app/api/admin/users/route.ts
```

**Exception:** Keep `/api/admin/stream` as the new SSE endpoint (created, not deleted).

---

## 11. New Files to Create

```
src/lib/mcp/server/tools/swarm.ts              -- 8 tools
src/lib/mcp/server/tools/swarm.test.ts          -- Tests
src/lib/mcp/server/tools/dashboard.ts           -- 5 tools
src/lib/mcp/server/tools/dashboard.test.ts      -- Tests
src/lib/mcp/server/tools/environment.ts         -- 4 tools
src/lib/mcp/server/tools/environment.test.ts    -- Tests
src/lib/mcp/server/tools/sentry-bridge.ts       -- 3 tools
src/lib/mcp/server/tools/sentry-bridge.test.ts  -- Tests
src/lib/mcp/server/tools/vercel-bridge.ts       -- 3 tools
src/lib/mcp/server/tools/vercel-bridge.test.ts  -- Tests
src/lib/mcp/server/tools/github-admin.ts        -- 3 tools
src/lib/mcp/server/tools/github-admin.test.ts   -- Tests
src/lib/bridges/sentry.ts                       -- Sentry API client
src/lib/bridges/vercel.ts                       -- Vercel API client
src/lib/bridges/github-projects.ts              -- GitHub Projects V2 client
src/lib/dashboard/cache.ts                      -- Two-tier cache layer
src/lib/dashboard/precompute.ts                 -- Background precompute logic
src/lib/dashboard/environments.ts               -- Environment config
src/app/api/admin/stream/route.ts               -- SSE endpoint
```

---

## 12. Migration Strategy

### Phase 1: Build New Tools (No Breaking Changes)
1. Create all 6 new tool files + tests
2. Register in `mcp-server.ts`
3. Create bridge clients for Sentry, Vercel, GitHub
4. Create cache layer
5. Deploy -- both old REST and new MCP tools work simultaneously

### Phase 2: Create SSE Stream Endpoint
1. Build `/api/admin/stream` SSE route
2. Set up Redis pub/sub channel `admin:events`
3. Integrate event publishing into existing code paths
4. Deploy and verify with test client

### Phase 3: Update Dashboard Frontend
1. Replace REST `fetch()` calls with MCP tool calls
2. Replace polling with SSE EventSource
3. Update agent command UI to use `swarm_*` tools

### Phase 4: Delete Old Routes
1. Remove all 35 `/api/admin/*` route files
2. Remove any admin-specific middleware no longer used
3. Final verification

---

## 13. Potential Bottlenecks and Scaling Considerations

| Concern | Mitigation |
|---------|-----------|
| Dashboard overview query hits 8+ tables | Parallel `Promise.all` + Redis cache at 60s TTL |
| SSE connection limit on Vercel (50 concurrent) | Auto-reconnect client, 5min max connection, Redis pub/sub for fan-out |
| Sentry/Vercel API rate limits | Bridge clients implement retry with exponential backoff + cache results aggressively (5min TTL) |
| Agent message delivery latency | Redis pub/sub for immediate delivery; `AgentMessage` table for persistence + at-least-once guarantee |
| Large agent audit log queries | Index on `(agentId, createdAt)` already exists; add `LIMIT` + cursor-based pagination |
| MCP server creation per request (stateless) | Lightweight object creation; tool registration is just Map inserts (no I/O) |
| Cache stampede on TTL expiry | Use Redis `SET NX` as a lock; stale-while-revalidate pattern for dashboard widgets |

---

## 14. Technology Recommendations

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time transport | SSE (not WebSocket) | Vercel serverless compatibility; MCP is request/response; Redis provides pub/sub |
| Cache layer | Upstash Redis + in-process Map | Already in stack; two-tier gives sub-30ms reads for hot data |
| External API clients | Native `fetch` with retry wrapper | No new dependencies; consistent with existing `apiRequest` helper |
| Agent message bus | Redis pub/sub | Already deployed; lightweight; good enough for <1000 concurrent agents |
| Time-series aggregation | Raw SQL via `prisma.$queryRaw` | Existing pattern in system-report.ts; avoids adding TimescaleDB for now |
| Auth for admin tools | Prisma `user.role` check in tool handler | Consistent with existing `requireAdminByUserId` pattern, but MCP-native |

---

## 15. Security Considerations

1. **Admin role enforcement**: Every `swarm_*`, `dash_*`, and `env_*` tool
   handler starts with:
   ```typescript
   const user = await prisma.user.findUnique({
     where: { id: userId },
     select: { role: true },
   });
   if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
     return textResult("**Error: PERMISSION_DENIED**\nAdmin access required.");
   }
   ```

2. **SSE endpoint auth**: The `/api/admin/stream` endpoint validates the Bearer
   token on connection and rejects non-admin users.

3. **Capability token scoping**: When `swarm_spawn_agent` creates a capability
   token, the `allowedCategories` and `deniedTools` are set based on the admin's
   input, preventing over-privileged agents.

4. **Audit trail**: All `swarm_*` tool calls are recorded in `AgentAuditLog`
   via the existing `safeToolCall` recording mechanism.

5. **Rate limiting**: The existing MCP endpoint rate limiter
   (`rateLimitConfigs.mcpJsonRpc`) applies to all admin tool calls.
