# Performance Architecture: AI Cloud Swarm Platform Dashboard

## Executive Summary

This document defines the performance architecture for a real-time dashboard that aggregates agent chat (WebSocket), deployment status, error alerts, metrics, and data from 5+ external services (Sentry, Vercel, GitHub, Stripe, Upstash). The design builds on existing patterns in the spike-land-nextjs codebase -- particularly the Upstash Redis hybrid Pub/Sub + List architecture, TanStack Query polling with visibility-pause, SSE job streaming, and the circuit breaker pattern.

**Performance Budgets:**
- Initial load (LCP): < 1.5s
- Time to Interactive: < 2.5s
- API calls on initial load: <= 3 (down from 50+)
- Dashboard JS bundle: < 120KB gzipped
- SSE reconnection: < 500ms (warm), < 2s (cold)
- Stale data tolerance: 0-60s depending on data type

---

## 1. Data Fetching Waterfall Optimization

### Problem
A naive dashboard with 8-12 widgets, each independently fetching from `/api/mcp` or `/api/admin/*`, produces 50+ API calls on mount. On Vercel serverless, each call is a cold-start candidate with ~100-200ms overhead.

### Solution: Three-Phase Load with Server-Side Aggregation

```
Phase 1: Server Component (SSR, 0ms client cost)
  |-- Prisma: Agent sessions, system health baseline
  |-- Redis: Agent status, queue depth
  |-- Result: HTML with initial data embedded

Phase 2: Client Hydration + Single Aggregation Call (~200ms)
  |-- POST /api/admin/dashboard/aggregate
  |   Returns: {
  |     agents: { sessions, statusCounts, ... },
  |     errors: { recent, stats },
  |     deployments: { vercel status per env },
  |     metrics: { system health, queue depth },
  |     github: { open PRs, recent commits },
  |   }

Phase 3: Real-Time Subscriptions (progressive, non-blocking)
  |-- SSE /api/admin/dashboard/stream (agent events, error alerts)
  |-- Polling: 30s for metrics, 60s for external APIs
```

### Implementation Pattern

The admin agents page already uses server components for initial data fetch (see `/Users/z/Developer/spike-land-nextjs/src/app/admin/agents/page.tsx`). Extend this pattern:

```typescript
// src/app/admin/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  // Phase 1: Server-side parallel fetch
  const [sessions, systemHealth, queueStats] = await Promise.all([
    prisma.externalAgentSession.findMany({ ... }),
    fetchSystemHealth(), // internal function, not HTTP
    getQueueStats(),     // From src/lib/upstash/client.ts
  ]);

  return <DashboardClient initialData={{ sessions, systemHealth, queueStats }} />;
}
```

```typescript
// src/app/api/admin/dashboard/aggregate/route.ts
// Single endpoint that fans out to all data sources in parallel
export async function GET() {
  const [agents, errors, deployments, github, stripe] = await Promise.all([
    fetchAgentData(),        // Prisma + Redis
    fetchErrorData(),        // Prisma (reuses /api/admin/errors logic)
    fetchDeploymentStatus(), // Vercel API (cached 30s in Redis)
    fetchGitHubData(),       // GitHub API (cached 60s in Redis)
    fetchStripeData(),       // Stripe API (cached 300s in Redis)
  ]);

  return Response.json({ agents, errors, deployments, github, stripe });
}
```

### Priority Order

| Priority | Data Source | Method | Blocking? |
|----------|-----------|--------|-----------|
| P0 | Agent sessions + status | Server Component (SSR) | Yes (above fold) |
| P0 | System health metrics | Server Component (SSR) | Yes (above fold) |
| P1 | Error alerts | Aggregate endpoint | No (lazy hydrate) |
| P1 | Deployment status | Aggregate endpoint | No (lazy hydrate) |
| P2 | GitHub PRs/commits | Aggregate endpoint | No (below fold) |
| P2 | Stripe revenue | Aggregate endpoint | No (below fold) |
| P3 | Sentry error trends | Deferred polling | No (background) |

---

## 2. Caching Strategy Per Data Type

### Tiered Cache Architecture

The codebase already uses Upstash Redis extensively. Extend the existing patterns from `/Users/z/Developer/spike-land-nextjs/src/lib/upstash/client.ts`, `/Users/z/Developer/spike-land-nextjs/src/lib/brand-brain/rewrite-cache.ts`, and `/Users/z/Developer/spike-land-nextjs/src/lib/codespace/bundle-cache.ts`.

```
Layer 1: Browser (TanStack Query)
  staleTime: per-query (10s to 5min)
  gcTime: 5 minutes default

Layer 2: Edge/CDN (Vercel)
  Cache-Control: s-maxage=X, stale-while-revalidate=Y
  Only for non-personalized data

Layer 3: Upstash Redis (server-side)
  TTL: per-data-type (15s to 1h)
  Pattern: stale-while-revalidate via background refresh

Layer 4: PostgreSQL (Prisma)
  Source of truth, no caching layer
```

### Per-Data-Type Configuration

```typescript
// src/lib/dashboard/cache-config.ts
export const DASHBOARD_CACHE = {
  // Real-time: No server cache, client staleTime only
  agentStatus: {
    redis: null,                    // Uses TTL-based keys already (90s in redis-client.ts)
    clientStaleTime: 5_000,         // 5s
    clientRefetchInterval: 10_000,  // 10s polling
    transport: "sse",               // Primary: SSE events
  },

  // Near-real-time: Short server cache
  systemHealth: {
    redisKey: "dashboard:health",
    redisTTL: 15,                   // 15 seconds
    clientStaleTime: 10_000,        // 10s
    clientRefetchInterval: 30_000,  // 30s polling
    transport: "polling",
  },

  errorAlerts: {
    redisKey: "dashboard:errors",
    redisTTL: 30,                   // 30 seconds
    clientStaleTime: 15_000,        // 15s
    clientRefetchInterval: 30_000,  // 30s polling
    transport: "sse",               // Push critical errors immediately
  },

  // Periodic: Medium server cache
  deploymentStatus: {
    redisKey: (env: string) => `dashboard:deploy:${env}`,
    redisTTL: 30,                   // 30 seconds
    clientStaleTime: 30_000,        // 30s
    clientRefetchInterval: 60_000,  // 60s polling
    transport: "polling",
  },

  githubActivity: {
    redisKey: "dashboard:github",
    redisTTL: 60,                   // 1 minute
    clientStaleTime: 60_000,        // 1 minute
    clientRefetchInterval: 120_000, // 2 minutes
    transport: "polling",
  },

  // Slow-changing: Long server cache
  stripeRevenue: {
    redisKey: "dashboard:stripe",
    redisTTL: 300,                  // 5 minutes
    clientStaleTime: 300_000,       // 5 minutes
    clientRefetchInterval: 600_000, // 10 minutes
    transport: "polling",
  },

  sentryErrors: {
    redisKey: "dashboard:sentry",
    redisTTL: 120,                  // 2 minutes
    clientStaleTime: 120_000,       // 2 minutes
    clientRefetchInterval: 300_000, // 5 minutes
    transport: "polling",
  },
} as const;
```

### Stale-While-Revalidate Pattern for Redis

```typescript
// src/lib/dashboard/cache.ts
// Extends the pattern from src/lib/brand-brain/rewrite-cache.ts

import { redis } from "@/lib/upstash/client";

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  ttl: number;
}

export async function getWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  swrSeconds: number = ttlSeconds, // Grace period for stale data
): Promise<T> {
  const cached = await redis.get<CacheEntry<T>>(key);

  if (cached) {
    const age = (Date.now() - cached.fetchedAt) / 1000;

    // Fresh: return immediately
    if (age < ttlSeconds) {
      return cached.data;
    }

    // Stale but within SWR window: return stale, refresh in background
    if (age < ttlSeconds + swrSeconds) {
      // Fire-and-forget background refresh
      refreshCache(key, fetcher, ttlSeconds + swrSeconds).catch(console.error);
      return cached.data;
    }
  }

  // Miss or expired: fetch synchronously
  return refreshCache(key, fetcher, ttlSeconds + swrSeconds);
}

async function refreshCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  totalTTL: number,
): Promise<T> {
  const data = await fetcher();
  const entry: CacheEntry<T> = {
    data,
    fetchedAt: Date.now(),
    ttl: totalTTL,
  };
  await redis.set(key, entry, { ex: totalTTL });
  return data;
}
```

### Cache Invalidation Strategy

| Trigger | Action |
|---------|--------|
| Agent connects/disconnects | Redis Pub/Sub event -> invalidate `dashboard:agents` |
| New error in Sentry | Webhook -> invalidate `dashboard:errors`, `dashboard:sentry` |
| Deployment completes | Vercel webhook -> invalidate `dashboard:deploy:*` |
| PR merged | GitHub webhook -> invalidate `dashboard:github` |
| Profile version change | Key includes version (existing pattern from rewrite-cache.ts) |

---

## 3. Real-Time Data Architecture

### Transport Selection Matrix

| Data Type | Transport | Rationale |
|-----------|-----------|-----------|
| Agent chat messages | WebSocket (via existing PeerJS/Yjs) | Bidirectional, low-latency |
| Agent status changes | SSE | Unidirectional, auto-reconnect |
| Error alerts (critical) | SSE | Push immediately, no polling delay |
| Deployment status | Polling (60s) | Infrequent changes, HTTP caching |
| Metrics/KPIs | Polling (30s) | Aggregated data, tolerates staleness |
| GitHub activity | Polling (120s) | External API rate limits |
| Stripe data | Polling (600s) | Rarely changes, expensive API |

### SSE Architecture (Building on Existing Patterns)

The codebase already has a mature SSE pattern in `/Users/z/Developer/spike-land-nextjs/src/lib/codespace/broadcast.ts` and `/Users/z/Developer/spike-land-nextjs/src/lib/agents/redis-client.ts`. The dashboard SSE stream should follow the same hybrid Pub/Sub + List architecture:

```typescript
// src/app/api/admin/dashboard/stream/route.ts
// Follows the pattern from src/lib/codespace/broadcast.ts

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  let lastTimestamp = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send connected event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected" })}\n\n`
        )
      );

      // Poll Redis every 2 seconds for cross-instance events
      // (Same approach as codespace broadcast polling)
      const interval = setInterval(async () => {
        try {
          const events = await getAgentSSEEvents(userId, lastTimestamp);
          for (const event of events) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify(event)}\n\n`
              )
            );
            lastTimestamp = Math.max(lastTimestamp, event.timestamp);
          }
        } catch {
          // Connection may be closed
        }
      }, 2000);

      // Heartbeat every 15 seconds (keep-alive for Vercel)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(interval);
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

### Multiplexed SSE Stream

Instead of one SSE connection per widget (which would exhaust the browser's 6-connection limit), use a single multiplexed stream:

```typescript
// Client-side: Single SSE connection, dispatch to multiple handlers
// src/hooks/useDashboardStream.ts

export function useDashboardStream() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlers = useRef(new Map<string, Set<(data: unknown) => void>>());

  useEffect(() => {
    const es = new EventSource("/api/admin/dashboard/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      const typeHandlers = handlers.current.get(parsed.type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(parsed.data);
        }
      }
    };

    // Reconnection with exponential backoff
    // (follows pattern from src/hooks/useJobStream.ts)
    es.onerror = () => { /* reconnect logic */ };

    return () => es.close();
  }, []);

  const subscribe = useCallback(
    (type: string, handler: (data: unknown) => void) => {
      if (!handlers.current.has(type)) {
        handlers.current.set(type, new Set());
      }
      handlers.current.get(type)!.add(handler);
      return () => handlers.current.get(type)?.delete(handler);
    },
    [],
  );

  return { subscribe };
}
```

---

## 4. Bundle Optimization

### Code Splitting Per Admin View

The admin section has 20+ pages. Each should be a separate chunk:

```typescript
// Already handled by Next.js App Router -- each page.tsx is auto-split.
// Additional optimizations:

// 1. Lazy-load chart libraries (recharts is 200KB+ unminified)
const LineChart = dynamic(
  () => import("recharts").then(m => ({ default: m.LineChart })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

// 2. Lazy-load dashboard widgets below the fold
const GitHubWidget = dynamic(
  () => import("./widgets/GitHubWidget"),
  { loading: () => <WidgetSkeleton /> },
);

const StripeWidget = dynamic(
  () => import("./widgets/StripeWidget"),
  { loading: () => <WidgetSkeleton /> },
);
```

### Critical Rendering Path

```
First Paint (< 500ms):
  - Shell layout (sidebar, header) from server component
  - Skeleton widgets
  - Agent status cards with SSR data

First Contentful Paint (< 1s):
  - Agent session list (SSR data)
  - System health metrics (SSR data)

Largest Contentful Paint (< 1.5s):
  - Aggregate data hydrated
  - Charts rendered (lazy-loaded)

Full Interactive (< 2.5s):
  - SSE stream connected
  - All widgets populated
  - Drag-and-drop initialized
```

### Bundle Size Targets

| Chunk | Target (gzipped) | Contents |
|-------|------------------|----------|
| Dashboard shell | < 30KB | Layout, nav, skeletons |
| Dashboard core | < 50KB | Widget containers, SSE hook, state |
| Charts (lazy) | < 40KB | recharts subset (Line, Bar only) |
| DnD (lazy) | < 15KB | @dnd-kit/core + sortable |
| External widgets (lazy) | < 20KB | GitHub, Stripe, Sentry widgets |
| **Total** | **< 155KB** | |

---

## 5. Server-Side Aggregation Endpoint

### Design

```typescript
// src/app/api/admin/dashboard/aggregate/route.ts

interface DashboardAggregateResponse {
  agents: {
    sessions: AgentSessionSummary[];
    statusCounts: Record<string, number>;
    queueStats: {
      appsWithPending: number;
      totalPendingMessages: number;
    };
  };
  errors: {
    recent: ErrorSummary[];
    stats: { total24h: number; criticalCount: number };
  };
  deployments: {
    environments: Array<{
      name: string;
      status: "ready" | "building" | "error";
      url: string;
      lastDeployed: string;
    }>;
  };
  github: {
    openPRs: number;
    recentCommits: CommitSummary[];
    openIssues: number;
  };
  stripe: {
    mrr: number;
    activeSubscriptions: number;
    recentCharges: number;
  };
  _meta: {
    fetchedAt: number;
    cacheHits: string[];  // Which data sources came from cache
    fetchDurationMs: number;
  };
}

export async function GET() {
  const start = Date.now();
  const cacheHits: string[] = [];

  // Fan out all fetches in parallel, each with own Redis cache
  const [agents, errors, deployments, github, stripe] =
    await Promise.allSettled([
      fetchWithCache("dashboard:agents", fetchAgentData, 15),
      fetchWithCache("dashboard:errors", fetchErrorData, 30),
      fetchWithCache("dashboard:deploy", fetchDeploymentStatus, 30),
      fetchWithCache("dashboard:github", fetchGitHubData, 60),
      fetchWithCache("dashboard:stripe", fetchStripeData, 300),
    ]);

  return Response.json({
    agents: unwrapSettled(agents, defaultAgentData),
    errors: unwrapSettled(errors, defaultErrorData),
    deployments: unwrapSettled(deployments, defaultDeployData),
    github: unwrapSettled(github, defaultGitHubData),
    stripe: unwrapSettled(stripe, defaultStripeData),
    _meta: {
      fetchedAt: Date.now(),
      cacheHits,
      fetchDurationMs: Date.now() - start,
    },
  });
}
```

### Circuit Breaker Integration

Each external API call should use the existing circuit breaker pattern from `/Users/z/Developer/spike-land-nextjs/src/lib/create/circuit-breaker.ts` (currently hardcoded to "circuit_breaker:claude" -- needs parameterization):

```typescript
async function fetchWithCircuitBreaker<T>(
  serviceName: string,
  fetcher: () => Promise<T>,
  fallback: T,
): Promise<T> {
  const state = await getCircuitState(`cb:${serviceName}`);

  if (state === "OPEN") {
    return fallback; // Short-circuit, don't hit external API
  }

  try {
    const result = await fetcher();
    await recordCircuitSuccess(`cb:${serviceName}`);
    return result;
  } catch {
    await recordCircuitFailure(`cb:${serviceName}`);
    return fallback;
  }
}
```

---

## 6. Client-Side State Management

### Architecture: TanStack Query + Zustand for Real-Time

```
TanStack Query (existing, via QueryProvider at
  /Users/z/Developer/spike-land-nextjs/src/components/providers/QueryProvider.tsx)
  |-- Manages: API data, pagination, cache invalidation
  |-- Config: Per-query staleTime, refetchInterval with visibility-pause

Zustand Store (for SSE/WebSocket state)
  |-- Manages: Real-time agent status, live error count, connection state
  |-- Updates: From SSE events, merged into display

Reconciliation:
  |-- SSE events update Zustand immediately (optimistic)
  |-- TanStack Query refetch provides eventual consistency
  |-- On reconnect, full refetch reconciles any missed events
```

### Implementation

```typescript
// src/stores/dashboard-store.ts

import { create } from "zustand";

interface DashboardState {
  // Real-time agent status (updated via SSE)
  agentStatuses: Map<string, AgentStatus>;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;

  // Live error count (incremented via SSE, reset on full fetch)
  liveErrorCount: number;
  incrementErrorCount: () => void;
  resetErrorCount: (count: number) => void;

  // SSE connection state
  connectionState: "connecting" | "connected" | "disconnected";
  setConnectionState: (s: DashboardState["connectionState"]) => void;

  // Optimistic updates for drag-and-drop roadmap
  pendingMoves: Map<string, { fromColumn: string; toColumn: string }>;
  addPendingMove: (itemId: string, from: string, to: string) => void;
  confirmMove: (itemId: string) => void;
  revertMove: (itemId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  agentStatuses: new Map(),
  setAgentStatus: (agentId, status) =>
    set((state) => {
      const next = new Map(state.agentStatuses);
      next.set(agentId, status);
      return { agentStatuses: next };
    }),

  liveErrorCount: 0,
  incrementErrorCount: () =>
    set((state) => ({ liveErrorCount: state.liveErrorCount + 1 })),
  resetErrorCount: (count) => set({ liveErrorCount: count }),

  connectionState: "connecting",
  setConnectionState: (connectionState) => set({ connectionState }),

  pendingMoves: new Map(),
  addPendingMove: (itemId, fromColumn, toColumn) =>
    set((state) => {
      const next = new Map(state.pendingMoves);
      next.set(itemId, { fromColumn, toColumn });
      return { pendingMoves: next };
    }),
  confirmMove: (itemId) =>
    set((state) => {
      const next = new Map(state.pendingMoves);
      next.delete(itemId);
      return { pendingMoves: next };
    }),
  revertMove: (itemId) =>
    set((state) => {
      const next = new Map(state.pendingMoves);
      next.delete(itemId);
      return { pendingMoves: next };
    }),
}));
```

### Optimistic Updates for Drag-and-Drop Roadmap

```typescript
// src/hooks/useRoadmapDragDrop.ts

export function useRoadmapDragDrop() {
  const queryClient = useQueryClient();
  const { addPendingMove, confirmMove, revertMove } = useDashboardStore();

  const mutation = useMutation({
    mutationFn: async ({ itemId, targetColumn }: MoveParams) => {
      // Sync with GitHub Projects API
      return fetch("/api/admin/roadmap/move", {
        method: "POST",
        body: JSON.stringify({ itemId, targetColumn }),
      });
    },
    onMutate: async ({ itemId, sourceColumn, targetColumn }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["roadmap"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(["roadmap"]);

      // Optimistic update
      queryClient.setQueryData(
        ["roadmap"],
        (old: RoadmapData) =>
          moveItem(old, itemId, sourceColumn, targetColumn),
      );

      addPendingMove(itemId, sourceColumn, targetColumn);
      return { previous };
    },
    onError: (_err, { itemId }, context) => {
      // Revert on failure
      queryClient.setQueryData(["roadmap"], context?.previous);
      revertMove(itemId);
    },
    onSuccess: (_data, { itemId }) => {
      confirmMove(itemId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    },
  });

  return mutation;
}
```

---

## 7. Connection Pooling and Reconnection Strategy

### SSE Reconnection

The existing `/Users/z/Developer/spike-land-nextjs/src/hooks/useJobStream.ts` implements exponential backoff with max 5 attempts. Enhance for the always-on dashboard:

```typescript
// src/hooks/useDashboardStream.ts

const RECONNECT_CONFIG = {
  initialDelay: 500,       // 500ms first retry
  maxDelay: 30_000,        // 30s max
  maxAttempts: Infinity,   // Dashboard should always reconnect
  backoffMultiplier: 2,
  jitter: 0.3,             // +/- 30% to prevent thundering herd
};

function calculateDelay(attempt: number): number {
  const base = Math.min(
    RECONNECT_CONFIG.initialDelay
      * Math.pow(RECONNECT_CONFIG.backoffMultiplier, attempt),
    RECONNECT_CONFIG.maxDelay,
  );
  const jitter =
    base * RECONNECT_CONFIG.jitter * (Math.random() * 2 - 1);
  return Math.max(0, base + jitter);
}
```

### State Recovery on Reconnect

```typescript
// On SSE reconnect, recover missed events:
// 1. Send lastTimestamp as query parameter
// 2. Server replays events from Redis List (60s retention)
// 3. If gap > 60s, trigger full TanStack Query refetch

const es = new EventSource(
  `/api/admin/dashboard/stream?after=${lastTimestamp}`
);

// If reconnecting after > 60s gap:
if (Date.now() - lastTimestamp > 60_000) {
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}
```

### Vercel Serverless Connection Limits

Vercel limits SSE connections to ~25s on Hobby, ~300s on Pro. Handle gracefully:

```typescript
// Server-side: Set max lifetime and notify client
const MAX_CONNECTION_MS = 280_000; // 280s (under 300s limit)

setTimeout(() => {
  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({ type: "reconnect" })}\n\n`
    )
  );
  controller.close();
}, MAX_CONNECTION_MS);

// Client-side: On "reconnect" event, reconnect immediately
// (not an error, so no backoff delay)
```

### Redis Command Pipelining

Upstash Redis uses HTTP, not TCP -- so traditional connection pooling does not apply. However, pipeline Redis commands to reduce round trips:

```typescript
// Instead of N sequential Redis calls:
const [status, data, activity] = await Promise.all([
  redis.get(AGENT_KEYS.AGENT_STATUS(agentId)),
  redis.get(AGENT_KEYS.AGENT_DATA(agentId)),
  redis.lrange(AGENT_KEYS.AGENT_ACTIVITY(agentId), 0, 9),
]);

// Use Upstash pipeline for atomic execution (single HTTP request):
const pipeline = redis.pipeline();
pipeline.get(AGENT_KEYS.AGENT_STATUS(agentId));
pipeline.get(AGENT_KEYS.AGENT_DATA(agentId));
pipeline.lrange(AGENT_KEYS.AGENT_ACTIVITY(agentId), 0, 9);
const results = await pipeline.exec();
```

---

## 8. Metrics, Monitoring, and Performance Budgets

### Core Web Vitals Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP | < 1.5s | Vercel Speed Insights (already integrated) |
| INP | < 100ms | @vercel/speed-insights |
| CLS | < 0.05 | Skeleton loaders prevent layout shift |
| FCP | < 800ms | Server-rendered shell |
| TTFB | < 200ms | Vercel Edge Network |

### Custom Dashboard Metrics

```typescript
// src/lib/dashboard/metrics.ts

export const DASHBOARD_METRICS = {
  // Data freshness
  "dashboard.data_age_ms": "How old is the displayed data",
  "dashboard.cache_hit_rate": "Redis cache hit percentage",

  // Connection health
  "dashboard.sse_reconnects": "Number of SSE reconnections",
  "dashboard.sse_gap_ms": "Time between disconnect and reconnect",
  "dashboard.events_per_minute": "SSE events received per minute",

  // API performance
  "dashboard.aggregate_fetch_ms": "Time for aggregate endpoint",
  "dashboard.external_api_ms": "Per-service external API latency",
  "dashboard.circuit_breaker_trips": "Circuit breaker activations",

  // User experience
  "dashboard.widget_render_ms": "Time to render each widget",
  "dashboard.interaction_latency_ms": "Time from click to visual update",
  "dashboard.dnd_optimistic_revert_rate": "Drag-drop failure revert rate",
};
```

### Sentry Performance Integration

The project already has `@sentry/nextjs` configured. Add transaction tracing:

```typescript
// In aggregate endpoint:
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  return Sentry.withServerActionInstrumentation(
    "dashboard.aggregate",
    async () => {
      const results = await Promise.allSettled([
        Sentry.startSpan(
          { name: "fetch.agents" },
          () => fetchAgentData(),
        ),
        Sentry.startSpan(
          { name: "fetch.errors" },
          () => fetchErrorData(),
        ),
        Sentry.startSpan(
          { name: "fetch.vercel" },
          () => fetchDeploymentStatus(),
        ),
        Sentry.startSpan(
          { name: "fetch.github" },
          () => fetchGitHubData(),
        ),
        Sentry.startSpan(
          { name: "fetch.stripe" },
          () => fetchStripeData(),
        ),
      ]);

      return Response.json(assembleResponse(results));
    },
  );
}
```

---

## 9. Environment Status Polling

### Three Environments (Production, Staging, Preview)

```typescript
// src/lib/dashboard/environment-status.ts

interface EnvironmentHealth {
  name: string;
  url: string;
  status: "healthy" | "degraded" | "down";
  responseTimeMs: number;
  lastChecked: string;
  version: string;
}

async function checkEnvironmentHealth(env: {
  name: string;
  url: string;
}): Promise<EnvironmentHealth> {
  const start = Date.now();

  try {
    const response = await fetch(`${env.url}/api/health`, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    const data = await response.json();

    return {
      name: env.name,
      url: env.url,
      status: response.ok ? "healthy" : "degraded",
      responseTimeMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
      version: data.version || "unknown",
    };
  } catch {
    return {
      name: env.name,
      url: env.url,
      status: "down",
      responseTimeMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
      version: "unknown",
    };
  }
}

// Cached in Redis with 30s TTL
// Polled by client every 60s
// Critical status changes pushed via SSE
```

---

## 10. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/admin/dashboard/aggregate/route.ts` | Server-side aggregation endpoint |
| `src/app/api/admin/dashboard/stream/route.ts` | Multiplexed SSE stream |
| `src/app/admin/dashboard/page.tsx` | Server component with SSR data |
| `src/components/admin/dashboard/DashboardClient.tsx` | Client component orchestrator |
| `src/hooks/useDashboardStream.ts` | SSE connection hook with reconnection |
| `src/stores/dashboard-store.ts` | Zustand store for real-time state |
| `src/lib/dashboard/cache-config.ts` | Per-data-type cache configuration |
| `src/lib/dashboard/cache.ts` | Stale-while-revalidate Redis cache |
| `src/lib/dashboard/environment-status.ts` | Environment health checker |
| `src/hooks/useRoadmapDragDrop.ts` | Optimistic DnD with GitHub sync |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/create/circuit-breaker.ts` | Parameterize prefix (currently hardcoded to `circuit_breaker:claude`) |
| `src/components/providers/QueryProvider.tsx` | Consider per-route default overrides |
| `src/lib/upstash/client.ts` | Add pipeline helper for batch operations |
| `next.config.ts` | Add Cache-Control headers for dashboard aggregate endpoint |

---

## Summary: Before/After Performance Comparison

| Metric | Before (Naive) | After (Optimized) |
|--------|---------------|-------------------|
| API calls on load | 50+ | 3 (SSR + aggregate + SSE) |
| Time to first data | 2-4s | 0ms (SSR) |
| Time to full dashboard | 5-8s | 1.5-2.5s |
| Data freshness (agents) | 30s (polling) | < 2s (SSE) |
| Data freshness (metrics) | 60s | 30s (polling with SWR cache) |
| Bundle size (dashboard) | ~300KB | < 155KB |
| SSE connections | 8-12 per tab | 1 (multiplexed) |
| Redis calls per load | 30+ | 5-8 (pipelined) |
| External API calls/min | 60+ | 6-12 (cached) |
| Reconnection time | Manual refresh | < 2s automatic |
