# Environment Management Dashboard -- Architecture Plan

Resolves #1254

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Fetching Strategy](#2-data-fetching-strategy)
3. [API Route Design](#3-api-route-design)
4. [Deployment Promotion Workflow](#4-deployment-promotion-workflow)
5. [Rollback Mechanism](#5-rollback-mechanism)
6. [Cron Job Monitoring](#6-cron-job-monitoring)
7. [Health Check Aggregation](#7-health-check-aggregation)
8. [Real-Time Status Updates](#8-real-time-status-updates)
9. [Security Model](#9-security-model)
10. [File Structure](#10-file-structure)
11. [Cost Estimation](#11-cost-estimation)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Architecture Overview

```
+------------------------------------------------------------------+
|                     Admin Dashboard (Next.js)                     |
|  /admin/environments                                              |
|                                                                    |
|  +------------------+  +------------------+  +------------------+ |
|  |      DEV         |  |      NEXT        |  |      PROD        | |
|  |  localhost:3000   |  | next.spike.land  |  |   spike.land     | |
|  |  self-reported    |  |  Vercel preview  |  |  Vercel prod     | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                    |
|  +------------------+  +------------------+  +------------------+ |
|  | CF Worker: Code  |  | CF Worker: Trans |  | CF Worker: Back  | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                    |
|  +------------------+  +------------------+  +------------------+ |
|  | Cron Jobs (11)   |  | Neon DB Branches |  | Sentry Errors    | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
         |                      |                       |
    Vercel API            GitHub API            Cloudflare API
    Sentry API             Neon API            Upstash Redis
```

### Design Principles

- **Server-side aggregation**: All external API calls happen in Next.js API routes, never from the browser. This keeps API tokens secure and reduces CORS complexity.
- **Cache-first**: Environment status data is cached in Upstash Redis with short TTLs (30s-5min) to avoid hammering external APIs and to stay within rate limits.
- **Progressive enhancement**: The dashboard loads with cached data immediately, then refreshes via polling. No WebSocket complexity needed for status data that changes on the order of minutes.
- **Existing patterns**: Follows the existing admin route pattern (`/admin/*`), admin middleware (`requireAdminByUserId`), and `tryCatch` error handling established in the codebase.

---

## 2. Data Fetching Strategy

### Per-Environment Data Sources

| Data Point | Dev | Next (Staging) | Prod |
|---|---|---|---|
| Current commit | MCP `dev_status` tool / self-report | Vercel API `GET /v6/deployments` | Vercel API `GET /v6/deployments` |
| Branch | Git local | Vercel deployment metadata | `main` (always) |
| Deploy time | N/A (live reload) | Vercel deployment `createdAt` | Vercel deployment `createdAt` |
| Health check | `GET http://localhost:3000/api/health` | `GET https://next.spike.land/api/health` | `GET https://spike.land/api/health` |
| Active users | N/A | Vercel Analytics API | Vercel Analytics API |
| Error rate | Console | Sentry API project stats | Sentry API project stats |
| PRs included | Current working tree | PR linked to preview deployment | All merged PRs since last deploy |

### Caching Strategy (Upstash Redis)

```
Key Pattern                           TTL      Source
env:status:dev                        30s      Self-reported via MCP
env:status:next                       60s      Vercel API
env:status:prod                       60s      Vercel API
env:deployments:history               120s     Vercel API (last 20)
cf:worker:status:{name}               60s      Cloudflare API
cron:last_run:{path}                  none     Written by cron jobs themselves
cron:execution_log:{path}             24h      Written by cron jobs themselves
sentry:error_count:{env}              300s     Sentry API
neon:branches                         120s     Neon API
```

### Why Redis Caching is Necessary

- **Vercel API**: Rate limit is 120 req/min per account. With multiple admin users polling every 10s, we would exhaust this in seconds. Caching at 60s means 1 req/min per data type.
- **Cloudflare API**: 1200 req/5min. Similar concern with 3 workers to monitor.
- **Sentry API**: 100 req/min for organization-level endpoints.
- **Neon API**: No published rate limits but prudent to cache.

---

## 3. API Route Design

All new routes live under `/api/admin/environments/` and follow existing patterns.

### 3.1 `GET /api/admin/environments/status`

Returns aggregated status of all 3 environments.

```typescript
// Response shape
interface EnvironmentStatusResponse {
  environments: {
    dev: EnvironmentInfo | null;  // null if dev server not running
    next: EnvironmentInfo;
    prod: EnvironmentInfo;
  };
  lastUpdated: string;  // ISO timestamp
}

interface EnvironmentInfo {
  name: "dev" | "next" | "prod";
  url: string;
  commit: string;          // short SHA
  commitMessage: string;
  branch: string;
  deployedAt: string;      // ISO timestamp
  deployedBy: string;      // GitHub username
  health: "healthy" | "degraded" | "down" | "unknown";
  healthCheckedAt: string;
  errorCount24h: number;   // from Sentry
  activeUsers: number;     // from Vercel Analytics (0 for dev)
  prsIncluded: string[];   // PR numbers/titles
}
```

**Implementation flow**:
1. Check Redis cache `env:status:*` -- if fresh, return cached.
2. If stale, fan out parallel requests to Vercel API, health endpoints, Sentry.
3. Write results back to Redis.
4. Return response.

### 3.2 `GET /api/admin/environments/deployments`

Returns deployment history for promotion/rollback UI.

```typescript
interface DeploymentHistoryResponse {
  deployments: VercelDeployment[];
  currentProd: VercelDeployment;
  currentNext: VercelDeployment | null;
}

interface VercelDeployment {
  id: string;           // Vercel deployment ID
  url: string;
  commit: string;
  commitMessage: string;
  branch: string;
  createdAt: string;
  creator: string;
  state: "READY" | "ERROR" | "BUILDING" | "QUEUED" | "CANCELED";
  target: "production" | "preview" | null;
  inspectorUrl: string;
}
```

**Vercel API call**: `GET https://api.vercel.com/v6/deployments?projectId={id}&limit=20&target=production`

### 3.3 `POST /api/admin/environments/promote`

Triggers promotion of staging to production.

```typescript
// Request
interface PromoteRequest {
  deploymentId: string;  // Vercel deployment ID to promote
  reason: string;        // Audit trail
}

// Response
interface PromoteResponse {
  success: boolean;
  newDeploymentUrl: string;
  previousDeploymentId: string;
}
```

**Implementation**: Calls `vercel promote <deploymentId>` via Vercel API or triggers the `deploy.yml` GitHub Action via `gh workflow run`.

### 3.4 `POST /api/admin/environments/rollback`

Triggers rollback to a previous deployment.

```typescript
interface RollbackRequest {
  deploymentId?: string;  // Specific deployment to rollback to (optional, defaults to previous)
  environment: "production";
  reason: string;
}
```

**Implementation**: Triggers the existing `rollback.yml` GitHub Action workflow.

### 3.5 `GET /api/admin/environments/workers`

Returns Cloudflare Worker status for all 3 workers.

```typescript
interface WorkersStatusResponse {
  workers: CloudflareWorkerInfo[];
}

interface CloudflareWorkerInfo {
  name: string;             // "code", "transpiler", "backend"
  scriptName: string;       // CF worker script name
  lastDeployed: string;     // ISO timestamp
  routes: string[];         // bound routes
  stats: {
    requests24h: number;
    errors24h: number;
    errorRate: number;      // percentage
    p50Latency: number;     // ms
    p99Latency: number;     // ms
    cpuTimeAvg: number;     // ms
  };
}
```

**Cloudflare API calls**:
- `GET /accounts/{id}/workers/scripts` -- list workers
- `GET /accounts/{id}/workers/analytics/stored?since=-1440m` -- 24h analytics

### 3.6 `GET /api/admin/environments/crons`

Returns cron job monitoring data.

```typescript
interface CronStatusResponse {
  crons: CronJobInfo[];
}

interface CronJobInfo {
  path: string;            // e.g., "/api/cron/pulse-metrics"
  schedule: string;        // cron expression
  scheduleHuman: string;   // e.g., "Every 15 minutes"
  lastRun: {
    timestamp: string;
    durationMs: number;
    status: "success" | "failure";
    statusCode: number;
    errorMessage?: string;
  } | null;
  nextRun: string;         // calculated from cron expression
  stats: {
    successCount7d: number;
    failureCount7d: number;
    avgDurationMs: number;
    maxDurationMs: number;
  };
}
```

### 3.7 `GET /api/admin/environments/database`

Returns Neon database branch status.

```typescript
interface DatabaseStatusResponse {
  branches: NeonBranch[];
  migrations: {
    latest: string;
    pendingCount: number;
    appliedCount: number;
  };
}

interface NeonBranch {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  currentState: "ready" | "init" | "deleted";
  logicalSize: number;    // bytes
  environment: "dev" | "next" | "prod" | "unknown";
}
```

**Neon API call**: `GET https://console.neon.tech/api/v2/projects/{id}/branches`

---

## 4. Deployment Promotion Workflow (next -> prod)

### Flow

```
Admin clicks "Promote to Production"
        |
        v
Dashboard shows confirmation dialog:
  - Current prod commit: abc1234
  - Staging commit to promote: def5678
  - Changes included: PR #100, PR #102, PR #105
  - Reason field (required)
        |
        v
POST /api/admin/environments/promote
        |
        v
Server-side:
  1. Verify user is SUPER_ADMIN (not just ADMIN)
  2. Log audit event to database
  3. Call Vercel API: POST /v13/deployments/{id}/promote
     OR trigger deploy.yml via GitHub Actions API
  4. Poll for deployment readiness
  5. Run health check against new production URL
  6. Return result
        |
        v
Dashboard polls for promotion status
        |
        v
If health check fails:
  - Auto-rollback to previous deployment
  - Alert admin via dashboard notification
  - Log incident
```

### Two Promotion Strategies

**Strategy A -- Vercel Promote (Preferred)**:
Uses `vercel promote <deployment-id>` which is an instant domain swap. No rebuild needed. The staging deployment already exists and is verified.

```typescript
// Vercel API
const response = await fetch(
  `https://api.vercel.com/v13/deployments/${deploymentId}/promote`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
  },
);
```

**Strategy B -- GitHub Actions Trigger (Fallback)**:
Triggers the existing `deploy.yml` workflow with `environment=production`.

```typescript
await fetch(
  "https://api.github.com/repos/zerdos/spike-land-nextjs/actions/workflows/deploy.yml/dispatches",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GH_PAT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: "main",
      inputs: { environment: "production" },
    }),
  },
);
```

### Audit Trail

Every promotion writes to a `DeploymentAudit` table:

```sql
CREATE TABLE deployment_audits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,            -- 'promote' | 'rollback'
  environment TEXT NOT NULL,       -- 'production'
  from_deployment_id TEXT,
  to_deployment_id TEXT,
  triggered_by TEXT NOT NULL,      -- user ID
  reason TEXT NOT NULL,
  status TEXT NOT NULL,            -- 'pending' | 'success' | 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

---

## 5. Rollback Mechanism

### Immediate Rollback (< 30 seconds)

Uses Vercel's instant promote to swap back to the previous production deployment. No rebuild needed.

```
Admin clicks "Rollback"
        |
        v
Dashboard shows:
  - Current prod deployment (to be replaced)
  - List of last 5 production deployments to rollback to
  - Reason field (required)
        |
        v
POST /api/admin/environments/rollback
        |
        v
Server-side:
  1. Verify SUPER_ADMIN role
  2. Determine target deployment:
     - If deploymentId provided, use it
     - Otherwise, get second-most-recent production deployment from Vercel API
  3. Log audit event
  4. Call: vercel promote <target-deployment-id>
  5. Health check the new production
  6. Return result
```

### Automatic Rollback Trigger

Optionally, after any promotion, if the health check fails within 5 minutes:

1. The promote endpoint sets a Redis key: `rollback:pending:{deploymentId}` with 5-min TTL
2. A health check poller (client-side in the dashboard, or a lightweight cron) checks production health
3. If health degrades, trigger automatic rollback
4. Notify via dashboard + audit log

### Database Rollback Consideration

Vercel rollbacks only affect the application code, not the database. For database-coupled rollbacks:

- **Forward-only migrations**: The project already uses Prisma migrations, which are forward-only. Rollback requires writing a reverse migration.
- **Neon branching**: For risky deployments, create a Neon branch snapshot before promoting. If rollback is needed, the branch can be restored.

---

## 6. Cron Job Monitoring

### Self-Reporting Pattern

Rather than polling an external API to check cron status, each cron job self-reports its execution. This is the most reliable approach because Vercel Cron does not expose a "last run" API.

**Instrumentation wrapper** (new utility at `src/lib/cron/instrument.ts`):

```typescript
import { redis } from "@/lib/upstash/client";

interface CronExecutionResult {
  path: string;
  timestamp: string;
  durationMs: number;
  status: "success" | "failure";
  statusCode: number;
  errorMessage?: string;
}

export async function instrumentCron(
  path: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const start = Date.now();
  let result: CronExecutionResult;

  try {
    const response = await handler();
    result = {
      path,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      status: response.ok ? "success" : "failure",
      statusCode: response.status,
    };
    return response;
  } catch (error) {
    result = {
      path,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      status: "failure",
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    throw error;
  } finally {
    // Fire-and-forget: don't block the response
    void writeCronResult(path, result);
  }
}

async function writeCronResult(
  path: string,
  result: CronExecutionResult,
): Promise<void> {
  const key = `cron:last_run:${path}`;
  const historyKey = `cron:history:${path}`;

  await Promise.all([
    redis.set(key, JSON.stringify(result)),
    redis.lpush(historyKey, JSON.stringify(result)),
    redis.ltrim(historyKey, 0, 672),  // Keep ~7 days at 15-min intervals
    redis.expire(historyKey, 7 * 24 * 60 * 60),
  ]);
}
```

**Usage in each cron route** (minimal change to existing code):

```typescript
// Before:
export async function GET(request: NextRequest) {
  // ... existing handler
}

// After:
export async function GET(request: NextRequest) {
  return instrumentCron("/api/cron/pulse-metrics", async () => {
    // ... existing handler (return NextResponse)
  });
}
```

### Next Run Calculation

Use a lightweight cron expression parser (e.g., `cron-parser` package) to calculate the next scheduled run from the schedule defined in `vercel.json`.

### Cron Dashboard Data Assembly

The `GET /api/admin/environments/crons` endpoint reads:
1. The `vercel.json` crons array for schedule definitions (static, compiled into the build)
2. Redis `cron:last_run:{path}` for each cron's last execution
3. Redis `cron:history:{path}` for trend data (avg duration, failure rate)

---

## 7. Health Check Aggregation

### Health Check Endpoint Enhancement

The existing `/api/health` returns `{ status: "ok" }`. Enhance it to provide richer data without breaking existing consumers:

```typescript
// GET /api/health?detailed=true
interface DetailedHealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;         // from package.json
  commit: string;          // from VERCEL_GIT_COMMIT_SHA env
  branch: string;          // from VERCEL_GIT_COMMIT_REF env
  deployedAt: string;      // from VERCEL_DEPLOYMENT_CREATED env
  uptime: number;          // process uptime in seconds
  checks: {
    database: "ok" | "error";
    redis: "ok" | "error" | "not_configured";
  };
}
```

Without `?detailed=true`, the endpoint returns the existing minimal `{ status: "ok" }` for backward compatibility.

### Aggregated Health Check

The dashboard's `/api/admin/environments/status` endpoint calls health checks on all environments in parallel:

```typescript
const [devHealth, nextHealth, prodHealth] = await Promise.allSettled([
  fetchWithTimeout("http://localhost:3000/api/health?detailed=true", 3000),
  fetchWithTimeout("https://next.spike.land/api/health?detailed=true", 5000),
  fetchWithTimeout("https://spike.land/api/health?detailed=true", 5000),
]);
```

Dev health check is best-effort (may not be running). The dashboard UI shows "offline" gracefully.

---

## 8. Real-Time Status Updates Architecture

### Approach: Client-Side Polling (not WebSockets)

For an admin dashboard monitoring deployments, polling is the right choice over WebSockets:

- Environment status changes on the order of minutes, not milliseconds
- Fewer moving parts (no WebSocket server, no connection management)
- Works with Vercel's serverless architecture (no persistent connections)
- The existing admin system health page already uses this pattern (`useEffect` with `fetch`)

### Polling Intervals

| Data Type | Interval | Rationale |
|---|---|---|
| Environment status | 30 seconds | Deployments take minutes; 30s is responsive enough |
| Health checks | 60 seconds | Prevents excessive external requests |
| Cron job status | 60 seconds | Crons run at 1-15 min intervals |
| Worker stats | 60 seconds | CF analytics aggregate over minutes |
| Deployment history | Manual refresh + after promote/rollback | Changes only on explicit actions |

### Client-Side Hook

```typescript
// src/hooks/useEnvironmentStatus.ts
export function useEnvironmentStatus(interval = 30_000) {
  const [data, setData] = useState<EnvironmentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/environments/status");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchStatus();
    const timer = setInterval(fetchStatus, interval);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [interval]);

  return { data, loading, error };
}
```

### Optimistic Updates

When a user triggers promote or rollback, the UI immediately shows "deploying..." state without waiting for the next poll cycle. The actual status is confirmed on the next poll.

---

## 9. Security Model

### Role-Based Access Control

| Action | ADMIN | SUPER_ADMIN |
|---|---|---|
| View environment status | Yes | Yes |
| View deployment history | Yes | Yes |
| View cron job status | Yes | Yes |
| View worker status | Yes | Yes |
| Promote next -> prod | No | Yes |
| Rollback production | No | Yes |
| Trigger manual deployment | No | Yes |
| Manage Neon branches | No | Yes |

**Rationale**: Viewing is safe for all admins. Deployment actions (promote, rollback) are restricted to SUPER_ADMIN because they affect production availability.

### API Token Security

All external API tokens are stored as Vercel environment variables and accessed server-side only:

```
VERCEL_TOKEN          -- Vercel API (deployments, analytics)
GH_PAT_TOKEN          -- GitHub API (actions, PRs)
CF_API_TOKEN          -- Cloudflare API (workers, analytics)
CF_ACCOUNT_ID         -- Cloudflare account identifier
SENTRY_AUTH_TOKEN     -- Sentry API (error counts)
SENTRY_ORG            -- Sentry organization slug
SENTRY_PROJECT        -- Sentry project slug
NEON_API_KEY          -- Neon API (branch management)
NEON_PROJECT_ID       -- Neon project identifier
```

These are NEVER exposed to the client. All API calls happen in server-side API routes behind admin authentication.

### Audit Logging

Every write action (promote, rollback) is logged with:
- Who triggered it (user ID, email)
- When (timestamp)
- What (action type, deployment IDs)
- Why (required reason field)
- Result (success/failure, health check result)

---

## 10. File Structure

All new files follow existing conventions. No new root-level files.

```
src/
  app/
    admin/
      environments/
        page.tsx                          # Main dashboard page (server component)
        EnvironmentDashboard.tsx          # Client component with polling
        EnvironmentCard.tsx               # Per-environment status card
        DeploymentHistory.tsx             # Deployment list with promote/rollback
        WorkerStatus.tsx                  # Cloudflare worker cards
        CronMonitor.tsx                   # Cron job table with status indicators
        DatabaseBranches.tsx              # Neon branch management
        PromoteDialog.tsx                 # Confirmation dialog for promotion
        RollbackDialog.tsx               # Confirmation dialog for rollback
    api/
      admin/
        environments/
          status/route.ts                 # GET - aggregated environment status
          deployments/route.ts            # GET - deployment history
          promote/route.ts                # POST - promote staging to prod
          rollback/route.ts               # POST - rollback production
          workers/route.ts                # GET - Cloudflare worker status
          crons/route.ts                  # GET - cron job monitoring
          database/route.ts               # GET - Neon database branches
  lib/
    cron/
      instrument.ts                       # Cron execution instrumentation wrapper
    environments/
      vercel-client.ts                    # Vercel API client (typed, cached)
      cloudflare-client.ts               # Cloudflare API client (typed, cached)
      sentry-client.ts                    # Sentry API client (typed, cached)
      neon-client.ts                      # Neon API client (typed, cached)
      health-checker.ts                   # Multi-environment health check logic
      cron-parser.ts                      # Cron schedule parsing + next run calc
      types.ts                            # All shared TypeScript interfaces
  hooks/
    useEnvironmentStatus.ts               # Client-side polling hook
    useCronStatus.ts                      # Cron monitoring hook
    useWorkerStatus.ts                    # Worker status hook
```

### Admin Sidebar Addition

Add to `AdminSidebar.tsx` NAV_ITEMS:

```typescript
{ href: "/admin/environments", label: "Environments", icon: "🌐" },
```

This should be inserted near the top of the list, after "Dashboard", since environment management is a primary operations concern.

---

## 11. Cost Estimation

### Monthly API Call Volume

Assuming 3 admins viewing the dashboard intermittently (averaging 2 hours/day each):

| API | Calls/hr/admin | Admins | Hours/day | Monthly Calls | Rate Limit |
|---|---|---|---|---|---|
| Vercel Deployments | 60 (30s poll) | 3 | 2 | ~10,800 | 120/min = OK |
| Vercel Health Check | 60 | 3 | 2 | ~10,800 | N/A (own endpoint) |
| Cloudflare Analytics | 60 | 3 | 2 | ~10,800 | 1200/5min = OK |
| Sentry Stats | 12 (5min cache) | 3 | 2 | ~2,160 | 100/min = OK |
| Neon Branches | 30 (2min cache) | 3 | 2 | ~5,400 | Not published |

**With Redis caching** (recommended, already in use):

All API calls collapse to 1 call per TTL period regardless of admin count:

| API | Calls/hr (cached) | Monthly |
|---|---|---|
| Vercel | 60 | ~43,200 |
| Cloudflare | 60 | ~43,200 |
| Sentry | 12 | ~8,640 |
| Neon | 30 | ~21,600 |

**All well within rate limits.**

### Infrastructure Cost Impact

| Service | Current Cost | Additional Cost | Notes |
|---|---|---|---|
| Vercel | Existing plan | $0 | API calls included in plan |
| Upstash Redis | Existing plan | ~$0-2/mo | Minimal additional keys (< 100) |
| Cloudflare | Existing plan | $0 | Analytics API included |
| Sentry | Existing plan | $0 | API included |
| Neon | Existing plan | $0 | API included |
| **Total additional** | | **~$0-2/mo** | |

### Cost Savings Recommendations

1. **Reduce cron frequency**: Several crons run every 15 minutes (`pulse-metrics`, `allocator-autopilot`, `cleanup-sandboxes`, `cleanup-jobs`) but may not need that frequency. Moving to 30-minute intervals would halve their Vercel Function invocations. Potential savings: ~50% of cron compute costs.

2. **Consolidate health checks**: Instead of each admin session independently calling health endpoints, the Redis cache ensures exactly 1 external call per TTL period. Already accounted for above.

3. **Use Vercel Speed Insights over custom analytics**: If not already using it, Vercel's built-in analytics may reduce the need for custom pulse metrics collection.

---

## 12. Implementation Phases

### Phase 1: Foundation (2-3 days)

- Create `src/lib/environments/types.ts` with all TypeScript interfaces
- Create `src/lib/environments/vercel-client.ts` -- Vercel API wrapper
- Create `src/lib/cron/instrument.ts` -- cron instrumentation wrapper
- Create `GET /api/admin/environments/status` -- environment status API
- Create `GET /api/admin/environments/crons` -- cron status API
- Enhance `GET /api/health` with `?detailed=true` support
- Add Prisma migration for `deployment_audits` table

### Phase 2: Dashboard UI (2-3 days)

- Create `src/app/admin/environments/page.tsx` and client components
- Implement `EnvironmentCard.tsx` -- per-environment status display
- Implement `CronMonitor.tsx` -- cron job table
- Create polling hooks (`useEnvironmentStatus`, `useCronStatus`)
- Add "Environments" to admin sidebar navigation

### Phase 3: Deployment Controls (2-3 days)

- Create `GET /api/admin/environments/deployments` -- deployment history
- Create `POST /api/admin/environments/promote` -- promotion endpoint
- Create `POST /api/admin/environments/rollback` -- rollback endpoint
- Implement `DeploymentHistory.tsx` with promote/rollback buttons
- Implement `PromoteDialog.tsx` and `RollbackDialog.tsx`
- Wire up SUPER_ADMIN authorization checks

### Phase 4: External Integrations (2-3 days)

- Create `src/lib/environments/cloudflare-client.ts` -- CF API wrapper
- Create `src/lib/environments/sentry-client.ts` -- Sentry API wrapper
- Create `src/lib/environments/neon-client.ts` -- Neon API wrapper
- Create `GET /api/admin/environments/workers` -- worker status API
- Create `GET /api/admin/environments/database` -- Neon branch API
- Implement `WorkerStatus.tsx` and `DatabaseBranches.tsx` components

### Phase 5: Instrumentation Rollout (1-2 days)

- Wrap all 11 cron jobs with `instrumentCron()` wrapper
- Verify cron execution data flows to Redis and dashboard
- Add execution duration trend charts to cron monitor

### Phase 6: Testing & Hardening (1-2 days)

- Write unit tests for all API routes (following existing `createMockRegistry()` pattern)
- Write unit tests for API client wrappers
- Test promote/rollback flow end-to-end on staging
- Verify rate limit behavior under concurrent admin usage
- Add error boundaries to dashboard components

---

## Architecture Decision Records

### ADR-1: Polling over WebSockets

**Decision**: Use client-side polling (30-60s intervals) instead of WebSockets.

**Context**: The dashboard displays infrastructure status that changes infrequently (deployments take minutes, cron jobs run every 1-60 minutes).

**Rationale**: Vercel's serverless architecture does not support persistent WebSocket connections from API routes. Server-Sent Events (SSE) would work but add complexity for data that is inherently poll-friendly. The existing admin dashboard already uses polling successfully.

### ADR-2: Redis Cache Layer

**Decision**: Cache all external API responses in Upstash Redis with short TTLs.

**Context**: Multiple admin users viewing the dashboard simultaneously would generate excessive API calls to external services.

**Rationale**: Redis is already deployed and used extensively. The cache layer collapses N admin sessions into 1 external API call per TTL period. TTLs are short enough (30-120s) that data staleness is acceptable for a monitoring dashboard.

### ADR-3: Cron Self-Reporting

**Decision**: Cron jobs self-report execution results to Redis rather than querying Vercel for cron status.

**Context**: Vercel does not expose a "cron execution history" API. The only way to know if a cron ran is to check Vercel Function logs, which are not programmatically accessible in real-time.

**Rationale**: By wrapping each cron handler with `instrumentCron()`, execution data is written to Redis immediately. This is more reliable than log parsing and provides exact timing, status codes, and error messages.

### ADR-4: SUPER_ADMIN for Write Actions

**Decision**: Deployment promotion and rollback require SUPER_ADMIN role, not just ADMIN.

**Context**: The existing codebase distinguishes between ADMIN and SUPER_ADMIN roles.

**Rationale**: Deployment actions directly affect production availability. Restricting these to SUPER_ADMIN provides an additional safety layer. Regular ADMINs can still view all status information for debugging purposes.

### ADR-5: Vercel Promote over GitHub Actions for Promotion

**Decision**: Use Vercel's `promote` API as the primary promotion mechanism, with GitHub Actions as fallback.

**Context**: Two mechanisms exist: `vercel promote` (instant domain swap) and `deploy.yml` (full rebuild + deploy).

**Rationale**: `vercel promote` is instant because the deployment already exists and has been verified on staging. A full rebuild is unnecessary and introduces risk of build-time failures. The GitHub Actions fallback exists for cases where promote fails or a fresh build is explicitly needed.
