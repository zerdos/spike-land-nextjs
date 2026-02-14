# AI Cloud Swarm Platform Management Dashboard -- Component Architecture

Resolves #1254

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Server vs Client Component Strategy](#2-server-vs-client-component-strategy)
3. [State Management Approach](#3-state-management-approach)
4. [Shared Layout Components](#4-shared-layout-components)
5. [Widget System](#5-widget-system)
6. [Real-Time Data Flow Architecture](#6-real-time-data-flow-architecture)
7. [Error Boundary Strategy](#7-error-boundary-strategy)
8. [Loading Skeleton Patterns](#8-loading-skeleton-patterns)
9. [Key Shared Hooks](#9-key-shared-hooks)
10. [Type Definitions](#10-type-definitions)

---

## 1. File Structure

The new swarm dashboard lives under `src/app/admin/swarm/` as a route group with its own
layout that replaces the generic admin chrome with a purpose-built swarm command center layout.
Client components live under `src/components/admin/swarm/` following the existing
codebase convention where `src/app/` holds pages (server components) and
`src/components/` holds reusable client components.

```
src/
  app/
    admin/
      swarm/                          # <-- NEW route group
        layout.tsx                    # Server: swarm-specific layout (sidebar + topbar)
        page.tsx                      # Server: Dashboard Home (multi-widget overview)
        error.tsx                     # Client: error boundary for swarm section
        loading.tsx                   # Server: loading skeleton for dashboard
        environments/
          page.tsx                    # Server: Environment Control
          loading.tsx
          [envId]/
            page.tsx                  # Server: Single environment detail
        roadmap/
          page.tsx                    # Server: Kanban roadmap (initial data from GitHub Projects)
          loading.tsx
        agents/
          page.tsx                    # Server: Agent Command Center
          loading.tsx
          [agentId]/
            page.tsx                  # Server: Single agent detail / chat
        analytics/
          page.tsx                    # Server: Analytics charts
          loading.tsx
        scheduler/
          page.tsx                    # Server: Task scheduler / cron
          loading.tsx
        notifications/
          page.tsx                    # Server: Notifications inbox
          loading.tsx

  components/
    admin/
      swarm/                          # <-- NEW component directory
        layout/
          SwarmSidebar.tsx            # Client: sidebar nav with active route highlight
          SwarmTopBar.tsx             # Client: environment switcher + search + user avatar
          EnvironmentSwitcher.tsx     # Client: dropdown to switch dev/staging/prod
          CommandPalette.tsx          # Client: Cmd+K keyboard shortcut overlay
        dashboard/
          DashboardGrid.tsx           # Client: CSS grid container for widgets
          WidgetShell.tsx             # Client: generic widget frame (header, refresh, expand)
          MetricsWidget.tsx           # Client: KPI cards (users, uptime, errors, agents)
          EnvironmentSummaryWidget.tsx # Client: 3-env status strip
          ActiveAgentsWidget.tsx      # Client: live agent count + mini-grid
          AlertsFeedWidget.tsx        # Client: recent alerts/notifications stream
          DeploymentTimelineWidget.tsx # Client: recent deploys across envs
        environments/
          EnvironmentCard.tsx         # Client: single env card (status, deploy, rollback)
          DeploymentDialog.tsx        # Client: deploy confirmation dialog
          EnvironmentStatusBadge.tsx  # Client: colored status indicator
          EnvironmentMetrics.tsx      # Client: env-specific resource usage
        roadmap/
          RoadmapBoard.tsx            # Client: dnd-kit kanban board
          RoadmapColumn.tsx           # Client: single kanban column
          RoadmapCard.tsx             # Client: draggable issue card
          CreateIssueDialog.tsx       # Client: new issue form dialog
        agents/
          AgentGrid.tsx              # Client: grid of agent status cards
          AgentCard.tsx              # Client: single agent card
          AgentChat.tsx              # Client: real-time chat panel (WebSocket)
          AgentChatMessage.tsx       # Client: single chat message bubble
          SpawnAgentDialog.tsx       # Client: form to spawn new agent
          AgentStatusIndicator.tsx   # Client: live status dot
        analytics/
          AnalyticsDashboard.tsx     # Client: chart grid container
          UsersChart.tsx             # Client: user growth line chart (recharts)
          McpUsageChart.tsx          # Client: MCP tool usage bar chart
          TechDebtChart.tsx          # Client: tech debt radar/area chart
          ErrorRateChart.tsx         # Client: error rate time series
          DateRangePicker.tsx        # Client: date range filter
        scheduler/
          TaskSchedulerClient.tsx    # Client: daily task list + cron editor
          CronVisualizer.tsx         # Client: visual cron schedule timeline
          TaskRow.tsx                # Client: single scheduled task row
        notifications/
          NotificationInbox.tsx      # Client: notification list with filters
          NotificationItem.tsx       # Client: single notification row
          NotificationFilters.tsx    # Client: filter bar (type, severity, read/unread)
        shared/
          LiveIndicator.tsx          # Client: animated "live" dot
          RefreshButton.tsx          # Client: manual refresh with loading state
          TimeAgo.tsx                # Client: relative time display
          EmptyState.tsx             # Client: empty state illustration + message
          ConfirmDialog.tsx          # Client: reusable confirmation dialog

  lib/
    admin/
      swarm/                          # <-- NEW lib directory
        types.ts                     # All swarm type definitions
        constants.ts                 # Polling intervals, env names, status maps
        actions/
          environment-actions.ts     # Server actions: deploy, rollback, restart
          agent-actions.ts           # Server actions: spawn, stop, send message
          roadmap-actions.ts         # Server actions: move card, create issue
          scheduler-actions.ts       # Server actions: create/update/delete tasks
        hooks/
          use-environment.ts         # TanStack Query hook for environment data
          use-agents.ts              # TanStack Query hook for agent list + status
          use-agent-chat.ts          # WebSocket hook for single agent chat
          use-roadmap.ts             # TanStack Query hook for roadmap data
          use-analytics.ts           # TanStack Query hook for analytics
          use-notifications.ts       # TanStack Query hook for notifications
          use-scheduler.ts           # TanStack Query hook for scheduled tasks
          use-command-palette.ts     # Keyboard shortcut registration
          use-swarm-websocket.ts     # Shared WebSocket connection manager
```

### Key Architectural Decisions

**Why separate `src/app/admin/swarm/` from existing `/admin`?**
The existing admin routes (`/admin/agents`, `/admin/analytics`) serve different purposes
(photo enhancement jobs, basic user stats). The swarm dashboard is a distinct operational
tool. Keeping it under `/admin/swarm/` preserves the existing admin while giving the
swarm dashboard its own layout, error boundary, and navigation. The existing
`AdminSidebar` at `/admin` remains unchanged and gains a new "Swarm" link.

**Why `src/components/admin/swarm/` for components?**
The codebase convention is `src/app/` = route pages, `src/components/` = reusable
client components. This is exactly what `AdminDashboardClient.tsx` and
`AgentsDashboardClient.tsx` follow. The new components follow suit.

---

## 2. Server vs Client Component Strategy

### Principle: Server-First, Client When Interactive

Every `page.tsx` and `layout.tsx` is a **server component** that:
1. Authenticates via `auth()` + `verifyAdminAccess()`
2. Fetches initial data from Prisma or external APIs
3. Serializes dates to ISO strings (following the `AgentsDashboardClient` pattern)
4. Passes `initialData` props to a client component

Every component under `src/components/admin/swarm/` is a **client component** that:
1. Receives `initialData` as props (hydration data from the server)
2. Uses TanStack Query with `initialData` for cache seeding
3. Handles user interaction, polling, and WebSocket subscriptions

### Per-View Breakdown

| View | Server Component | Client Component | Why Client? |
|------|-----------------|------------------|-------------|
| **Dashboard Home** | `swarm/page.tsx` - fetches metrics, env status, active agents, recent alerts | `DashboardGrid.tsx` + widget children | Widgets refresh independently, drag-to-reorder |
| **Environments** | `swarm/environments/page.tsx` - fetches 3 env configs + last deploy | `EnvironmentCard.tsx` | Deploy buttons, status polling, optimistic updates |
| **Roadmap** | `swarm/roadmap/page.tsx` - fetches GitHub Project items via `gh` API | `RoadmapBoard.tsx` | Drag-and-drop (dnd-kit), optimistic column moves |
| **Agent Command** | `swarm/agents/page.tsx` - fetches agent list + status counts | `AgentGrid.tsx` + `AgentChat.tsx` | WebSocket streaming, spawn controls, live status |
| **Analytics** | `swarm/analytics/page.tsx` - fetches last 30 days of metrics | `AnalyticsDashboard.tsx` | Recharts rendering, date range picker interaction |
| **Scheduler** | `swarm/scheduler/page.tsx` - fetches task list + cron jobs | `TaskSchedulerClient.tsx` | Cron editing, task toggling, inline forms |
| **Notifications** | `swarm/notifications/page.tsx` - fetches unread notifications | `NotificationInbox.tsx` | Mark read, filters, infinite scroll |

### The `layout.tsx` Split

```tsx
// src/app/admin/swarm/layout.tsx (SERVER)
import { auth } from "@/auth";
import { verifyAdminAccess } from "@/lib/auth/admin-middleware";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SwarmSidebar } from "@/components/admin/swarm/layout/SwarmSidebar";
import { SwarmTopBar } from "@/components/admin/swarm/layout/SwarmTopBar";

export default async function SwarmLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) redirect("/");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SwarmSidebar userName={session.user.name} userEmail={session.user.email} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SwarmTopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

The existing `AdminLayout` at `src/app/admin/layout.tsx` does NOT need modification.
Next.js nested layouts mean `swarm/layout.tsx` wraps content inside `admin/layout.tsx`.
However, the swarm layout wants its OWN sidebar (not the admin one). To achieve this,
the swarm layout hides the parent admin main area padding by using `className="!p-0"` on
its wrapper or by using a route group `(swarm)` to opt out of the admin layout. The
cleaner approach is:

**Option A (Recommended):** Place swarm as `src/app/admin/(swarm)/swarm/` using a route
group `(swarm)` that has its own layout with NO sidebar from admin, while still being
under `/admin` for auth.

**Option B:** Keep `src/app/admin/swarm/layout.tsx` and have it render its own sidebar
that visually overrides the admin sidebar. Since the admin layout already renders
`<AdminSidebar>` plus `<main className="lg:pl-64">`, the swarm layout operates within
that `<main>` area. The swarm sidebar would then be a secondary sidebar within the content
area.

**Recommendation: Option A** -- use a route group to get a clean layout:

```
src/app/admin/(swarm)/
  layout.tsx          # Own layout with SwarmSidebar, no AdminSidebar
  swarm/
    page.tsx
    environments/
    roadmap/
    agents/
    analytics/
    scheduler/
    notifications/
```

This routes to `/admin/swarm/...` URLs but uses a completely independent layout from
`/admin`. The admin auth check can be duplicated in the swarm layout (it is just 5
lines of code) so it does not depend on the parent admin layout at all.

---

## 3. State Management Approach

### Three-Tier Data Strategy

```
Tier 1: Server Data (TanStack Query)
  - Environment configs, agent list, roadmap items, analytics, notifications
  - Fetched via server actions or API routes
  - Cached, stale-while-revalidate, background refetch

Tier 2: Real-Time Streams (WebSocket / SSE)
  - Agent chat messages, deployment progress, live agent status changes
  - WebSocket connection managed by a singleton hook
  - Updates pushed into TanStack Query cache via queryClient.setQueryData()

Tier 3: Local UI State (useState / useReducer / Zustand)
  - Sidebar collapsed, active filters, command palette open
  - Widget layout preferences (persisted to localStorage)
  - Optimistic drag-and-drop positions before server confirmation
```

### TanStack Query Configuration

The app already has `@tanstack/react-query` v5 with a `QueryProvider` in the root layout.
The swarm hooks simply use `useQuery` and `useMutation` within that provider.

```tsx
// Example: src/lib/admin/swarm/hooks/use-environment.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Environment, DeploymentRequest } from "../types";
import { deployToEnvironment } from "../actions/environment-actions";

const ENVIRONMENT_QUERY_KEY = ["swarm", "environments"] as const;

export function useEnvironments() {
  return useQuery<Environment[]>({
    queryKey: ENVIRONMENT_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/swarm/environments");
      if (!res.ok) throw new Error("Failed to fetch environments");
      return res.json();
    },
    refetchInterval: 15_000,       // poll every 15s (lightweight endpoint)
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}

export function useDeployMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: DeploymentRequest) => deployToEnvironment(req),
    onMutate: async (req) => {
      // Optimistic update: set env status to "deploying"
      await queryClient.cancelQueries({ queryKey: ENVIRONMENT_QUERY_KEY });
      const prev = queryClient.getQueryData<Environment[]>(ENVIRONMENT_QUERY_KEY);
      if (prev) {
        queryClient.setQueryData<Environment[]>(
          ENVIRONMENT_QUERY_KEY,
          prev.map((env) =>
            env.id === req.environmentId
              ? { ...env, status: "deploying" as const }
              : env,
          ),
        );
      }
      return { prev };
    },
    onError: (_err, _req, ctx) => {
      // Rollback on error
      if (ctx?.prev) {
        queryClient.setQueryData(ENVIRONMENT_QUERY_KEY, ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENVIRONMENT_QUERY_KEY });
    },
  });
}
```

### WebSocket for Agent Chat

Agent chat requires bidirectional real-time communication. The codebase already has
Cloudflare Durable Objects with WebSocket support (`packages/testing.spike.land`).
For the Next.js admin panel, use a custom hook that connects to the backend WebSocket
endpoint.

```tsx
// src/lib/admin/swarm/hooks/use-agent-chat.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentChatMessage } from "../types";

interface UseAgentChatOptions {
  agentId: string;
  enabled?: boolean;
}

interface UseAgentChatReturn {
  messages: AgentChatMessage[];
  sendMessage: (content: string) => void;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  error: string | null;
}

export function useAgentChat({
  agentId,
  enabled = true,
}: UseAgentChatOptions): UseAgentChatReturn {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !agentId) return;

    setConnectionStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/api/admin/swarm/agents/${agentId}/ws`,
    );
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus("connected");
    ws.onclose = () => setConnectionStatus("disconnected");
    ws.onerror = () => {
      setConnectionStatus("error");
      setError("WebSocket connection failed");
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as AgentChatMessage;
      setMessages((prev) => [...prev, msg]);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [agentId, enabled]);

  const sendMessage = useCallback(
    (content: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "message", content }));
      }
    },
    [],
  );

  return { messages, sendMessage, connectionStatus, error };
}
```

### SSE Fallback for Deployment Status

For environments where WebSocket is not available (e.g., Vercel serverless
functions), use Server-Sent Events (SSE) via a Next.js API route:

```tsx
// src/lib/admin/swarm/hooks/use-deployment-stream.ts
"use client";

import { useEffect, useState } from "react";
import type { DeploymentEvent } from "../types";

export function useDeploymentStream(deploymentId: string | null) {
  const [events, setEvents] = useState<DeploymentEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming" | "complete" | "error">("idle");

  useEffect(() => {
    if (!deploymentId) return;

    setStatus("streaming");
    const eventSource = new EventSource(
      `/api/admin/swarm/deployments/${deploymentId}/stream`,
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as DeploymentEvent;
      setEvents((prev) => [...prev, data]);
      if (data.type === "complete" || data.type === "failed") {
        setStatus("complete");
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setStatus("error");
      eventSource.close();
    };

    return () => eventSource.close();
  }, [deploymentId]);

  return { events, status };
}
```

### Zustand for Local Swarm UI State

The codebase uses Zustand for state management in `src/lib/store/`. Add a swarm-specific
store for layout preferences and UI state that does not belong in TanStack Query:

```tsx
// src/lib/admin/swarm/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SwarmUIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  activeEnvironment: "dev" | "staging" | "prod" | "all";
  setActiveEnvironment: (env: "dev" | "staging" | "prod" | "all") => void;

  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  widgetLayout: string[]; // ordered widget IDs for dashboard
  setWidgetLayout: (layout: string[]) => void;
}

export const useSwarmUI = create<SwarmUIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      activeEnvironment: "all",
      setActiveEnvironment: (env) => set({ activeEnvironment: env }),

      commandPaletteOpen: false,
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),

      widgetLayout: [
        "metrics",
        "environments",
        "active-agents",
        "alerts",
        "deployments",
      ],
      setWidgetLayout: (layout) => set({ widgetLayout: layout }),
    }),
    {
      name: "swarm-ui-preferences",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeEnvironment: state.activeEnvironment,
        widgetLayout: state.widgetLayout,
      }),
    },
  ),
);
```

---

## 4. Shared Layout Components

### SwarmSidebar

A narrower, icon-first sidebar (expandable on hover or toggle) for the swarm section.
Uses Lucide icons (already in dependencies) instead of emoji strings. Follows the
existing `AdminSidebar.tsx` pattern of `NavContent` rendered in both desktop and mobile
Sheet.

```tsx
// src/components/admin/swarm/layout/SwarmSidebar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSwarmUI } from "@/lib/admin/swarm/store";
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutDashboard,
  Map,
  Menu,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/swarm", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/swarm/environments", label: "Environments", icon: Globe },
  { href: "/admin/swarm/roadmap", label: "Roadmap", icon: Map },
  { href: "/admin/swarm/agents", label: "Agents", icon: Bot },
  { href: "/admin/swarm/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/swarm/scheduler", label: "Scheduler", icon: Calendar },
  { href: "/admin/swarm/notifications", label: "Notifications", icon: Bell },
];

interface SwarmSidebarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function SwarmSidebar({ userName, userEmail }: SwarmSidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useSwarmUI();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ... renders desktop + mobile sidebar using Sheet pattern
  // Desktop: fixed left sidebar, width toggles between w-16 and w-56
  // Collapsed mode: icon-only with Tooltip labels
  // Expanded mode: icon + label text
}
```

### SwarmTopBar

A horizontal bar at the top of the main content area containing:
- Breadcrumb showing current location (e.g., Swarm / Agents / claude-agent-3)
- Environment switcher dropdown (dev / staging / prod / all)
- Search trigger (opens command palette)
- Notification bell with unread count badge

```tsx
// src/components/admin/swarm/layout/SwarmTopBar.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSwarmUI } from "@/lib/admin/swarm/store";
import { useNotifications } from "@/lib/admin/swarm/hooks/use-notifications";
import { Bell, Search } from "lucide-react";

export function SwarmTopBar() {
  const { activeEnvironment, setActiveEnvironment, openCommandPalette } = useSwarmUI();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/40 bg-card/50 px-6">
      {/* Left: Breadcrumb (populated by each page via a context or slot) */}
      <div className="flex items-center gap-2">
        {/* Breadcrumb rendered here */}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Environment Switcher */}
        <Select
          value={activeEnvironment}
          onValueChange={(v) =>
            setActiveEnvironment(v as "dev" | "staging" | "prod" | "all")
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Envs</SelectItem>
            <SelectItem value="dev">Development</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="prod">Production</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <Button variant="ghost" size="icon" onClick={openCommandPalette}>
          <Search className="h-4 w-4" />
          <span className="sr-only">Search (Cmd+K)</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="/admin/swarm/notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </a>
        </Button>
      </div>
    </header>
  );
}
```

### CommandPalette

A Cmd+K dialog for power users to quickly navigate between swarm views, trigger
deployments, spawn agents, or search issues. Built with shadcn/ui `Dialog` +
`Command` (cmdk) pattern.

```tsx
// src/components/admin/swarm/layout/CommandPalette.tsx
"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/???"; // NOTE: shadcn/ui command component needed
import { useSwarmUI } from "@/lib/admin/swarm/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Would need to install: npx shadcn@latest add command
// This component requires the shadcn/ui `command` component which is not yet installed
```

**Action item:** Run `npx shadcn@latest add command` to install the Command component
before implementing CommandPalette.

---

## 5. Widget System

### Design: Composable, Independently Refreshable Widgets

Each dashboard widget:
1. Has its own TanStack Query subscription (independent refresh cycle)
2. Wrapped in a `WidgetShell` that provides common chrome (title, refresh, expand, error state)
3. Can be reordered via drag-and-drop (dnd-kit, already in dependencies)
4. Shows a skeleton while loading (via Suspense or query loading state)

```tsx
// src/components/admin/swarm/dashboard/WidgetShell.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/errors/error-boundary";
import { Maximize2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { LiveIndicator } from "../shared/LiveIndicator";

interface WidgetShellProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  isLive?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onExpand?: () => void;
  className?: string;
}

export function WidgetShell({
  title,
  children,
  isLoading,
  isLive,
  onRefresh,
  isRefreshing,
  onExpand,
  className,
}: WidgetShellProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <Card className={className}>
          <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            Widget failed to load. {onRefresh && (
              <Button variant="link" size="sm" onClick={onRefresh}>
                Retry
              </Button>
            )}
          </CardContent>
        </Card>
      }
    >
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {title}
            {isLive && <LiveIndicator className="ml-2 inline-block" />}
          </CardTitle>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label={`Refresh ${title}`}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            )}
            {onExpand && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onExpand}
                aria-label={`Expand ${title}`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </ErrorBoundary>
  );
}
```

### DashboardGrid

Uses CSS Grid with responsive breakpoints. Each widget registers itself with a
unique ID. The grid layout is driven by the Zustand store's `widgetLayout` array,
which persists to localStorage.

```tsx
// src/components/admin/swarm/dashboard/DashboardGrid.tsx
"use client";

import type { ReactNode } from "react";

interface DashboardGridProps {
  children: ReactNode;
}

export function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}
```

### Widget Registry Pattern

Each widget is a self-contained component with its own query:

```tsx
// src/components/admin/swarm/dashboard/MetricsWidget.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { WidgetShell } from "./WidgetShell";
import type { SwarmMetrics } from "@/lib/admin/swarm/types";

interface MetricsWidgetProps {
  initialData?: SwarmMetrics;
}

export function MetricsWidget({ initialData }: MetricsWidgetProps) {
  const { data, isLoading, refetch, isFetching } = useQuery<SwarmMetrics>({
    queryKey: ["swarm", "metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/swarm/metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
    initialData,
    refetchInterval: 30_000,
  });

  return (
    <WidgetShell
      title="Platform Metrics"
      isLoading={isLoading}
      isLive
      onRefresh={() => refetch()}
      isRefreshing={isFetching}
      className="col-span-full"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Active Agents" value={data?.activeAgents ?? 0} />
        <MetricCard label="Deployments Today" value={data?.deploymentsToday ?? 0} />
        <MetricCard label="Open Issues" value={data?.openIssues ?? 0} />
        <MetricCard label="Error Rate" value={`${data?.errorRate ?? 0}%`} />
      </div>
    </WidgetShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
```

---

## 6. Real-Time Data Flow Architecture

### Three Real-Time Channels

```
Channel 1: TanStack Query Polling (most data)
  Interval: 15-30s depending on view
  Data: environment status, agent list, metrics, notifications
  Pauses when: tab hidden (refetchIntervalInBackground: false)
  Pattern: useQuery({ refetchInterval: 15_000 })

Channel 2: WebSocket (agent chat only)
  Connection: per-agent, opened when chat panel is active
  Endpoint: /api/admin/swarm/agents/[agentId]/ws
  Protocol: JSON messages with type discriminator
  Reconnect: exponential backoff (1s, 2s, 4s, 8s, max 30s)
  Message types: "message" | "status_change" | "tool_call" | "error"

Channel 3: Server-Sent Events (deployment progress)
  Connection: per-deployment, opened on deploy trigger
  Endpoint: /api/admin/swarm/deployments/[id]/stream
  Events: "log" | "progress" | "complete" | "failed"
  Auto-close: on "complete" or "failed" event
```

### Data Flow Diagram

```
[Server Actions]          [API Routes]           [WebSocket/SSE]
      |                       |                        |
      v                       v                        v
  TanStack Query      TanStack Query         Direct state update
  Mutations           Queries                  via setQueryData()
      |                       |                        |
      +----------+------------+------------------------+
                 |
                 v
          React Component Tree
                 |
                 v
           shadcn/ui + Tailwind
```

### Optimistic Update Strategy

For operations where immediate feedback matters:

1. **Deploy to environment**: Immediately show "deploying" status, open SSE stream
2. **Move roadmap card**: Immediately reorder columns, fire GitHub Projects mutation
3. **Send agent message**: Immediately append to chat, confirm via WebSocket ack
4. **Mark notification read**: Immediately fade, fire server action

For operations where accuracy matters more than speed:

1. **Spawn new agent**: Show loading dialog, wait for server confirmation
2. **Rollback deployment**: Show confirmation dialog, wait for server response
3. **Delete scheduled task**: Show confirmation, wait for deletion

---

## 7. Error Boundary Strategy

### Hierarchy of Error Boundaries

```
[Root Error Boundary]                    -- src/app/error.tsx (existing)
  [Admin Layout Error]                   -- inherited
    [Swarm Section Error]                -- src/app/admin/(swarm)/swarm/error.tsx (NEW)
      [Per-Page Error]                   -- loading.tsx handles RSC errors
        [Per-Widget Error]               -- WidgetShell wraps each widget
          [Per-Component Error]          -- ErrorBoundary from existing component
```

### Swarm Error Boundary

```tsx
// src/app/admin/(swarm)/swarm/error.tsx
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { reportErrorBoundary } from "@/lib/errors/console-capture.client";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function SwarmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportErrorBoundary(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Swarm Dashboard Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {error.message || "The swarm dashboard encountered an unexpected error."}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
            Back to Admin
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### Widget-Level Error Isolation

Each widget in the dashboard is wrapped in the existing `ErrorBoundary` component
(from `src/components/errors/error-boundary.tsx`). This means a single widget failing
(e.g., analytics API is down) does NOT crash the entire dashboard. The `WidgetShell`
component (see Section 5) handles this with a fallback that shows a retry button.

### Query Error Handling

TanStack Query errors are surfaced via the `error` property of `useQuery`. Each
widget component inspects `isError` and renders inline error UI rather than throwing:

```tsx
if (isError) {
  return (
    <WidgetShell title="Active Agents" onRefresh={() => refetch()}>
      <div className="text-sm text-destructive">
        Failed to load agent data. <Button variant="link" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    </WidgetShell>
  );
}
```

---

## 8. Loading Skeleton Patterns

### Next.js `loading.tsx` for Route-Level Skeletons

Each route gets a `loading.tsx` that renders immediately while the server component
fetches data. These use the existing `Skeleton` component from
`src/components/ui/skeleton.tsx`.

```tsx
// src/app/admin/(swarm)/swarm/loading.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Metrics row skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Widget grid skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Specific Skeleton Variants

```tsx
// Agent grid loading skeleton
function AgentGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="mt-4 h-20 w-full" />
        </Card>
      ))}
    </div>
  );
}

// Kanban board loading skeleton
function RoadmapSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, colIdx) => (
        <div key={colIdx} className="w-72 shrink-0 space-y-3">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 3 }).map((_, cardIdx) => (
            <Card key={cardIdx} className="p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

// Chat loading skeleton
function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <div className={`max-w-[70%] space-y-1 ${i % 2 === 0 ? "" : "items-end"}`}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className={`h-16 ${i % 2 === 0 ? "w-64" : "w-48"} rounded-lg`} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 9. Key Shared Hooks

### Hook Index

| Hook | File | Purpose | Data Source |
|------|------|---------|-------------|
| `useEnvironments` | `hooks/use-environment.ts` | List + status of 3 envs | TanStack Query, 15s poll |
| `useDeployMutation` | `hooks/use-environment.ts` | Trigger deploy with optimistic update | TanStack Mutation |
| `useDeploymentStream` | `hooks/use-environment.ts` | SSE stream for deploy progress | EventSource |
| `useAgents` | `hooks/use-agents.ts` | List all agents + status counts | TanStack Query, 15s poll |
| `useAgentDetail` | `hooks/use-agents.ts` | Single agent full detail | TanStack Query |
| `useSpawnAgent` | `hooks/use-agents.ts` | Spawn new agent mutation | TanStack Mutation |
| `useAgentChat` | `hooks/use-agent-chat.ts` | WebSocket chat for single agent | WebSocket |
| `useRoadmap` | `hooks/use-roadmap.ts` | GitHub Projects kanban data | TanStack Query, 60s poll |
| `useMoveCard` | `hooks/use-roadmap.ts` | Move card between columns | TanStack Mutation (optimistic) |
| `useAnalytics` | `hooks/use-analytics.ts` | Chart data with date range | TanStack Query |
| `useNotifications` | `hooks/use-notifications.ts` | Notification list + unread count | TanStack Query, 30s poll |
| `useMarkRead` | `hooks/use-notifications.ts` | Mark notification as read | TanStack Mutation (optimistic) |
| `useScheduler` | `hooks/use-scheduler.ts` | List scheduled tasks | TanStack Query |
| `useCommandPalette` | `hooks/use-command-palette.ts` | Cmd+K keyboard registration | useEffect + Zustand |
| `useSwarmWebSocket` | `hooks/use-swarm-websocket.ts` | Shared WS connection manager | WebSocket singleton |

### Hook Implementation Details

#### `useAgents`

```tsx
// src/lib/admin/swarm/hooks/use-agents.ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Agent, AgentStatusCounts, SpawnAgentRequest } from "../types";

const AGENTS_KEY = ["swarm", "agents"] as const;

export function useAgents() {
  return useQuery<{ agents: Agent[]; statusCounts: AgentStatusCounts }>({
    queryKey: AGENTS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/swarm/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useAgentDetail(agentId: string) {
  return useQuery<Agent>({
    queryKey: [...AGENTS_KEY, agentId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/swarm/agents/${agentId}`);
      if (!res.ok) throw new Error("Failed to fetch agent detail");
      return res.json();
    },
    enabled: !!agentId,
  });
}

export function useSpawnAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: SpawnAgentRequest) => {
      const res = await fetch("/api/admin/swarm/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error("Failed to spawn agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENTS_KEY });
    },
  });
}
```

#### `useRoadmap` with Optimistic Drag

```tsx
// src/lib/admin/swarm/hooks/use-roadmap.ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { RoadmapColumn, MoveCardRequest } from "../types";

const ROADMAP_KEY = ["swarm", "roadmap"] as const;

export function useRoadmap() {
  return useQuery<RoadmapColumn[]>({
    queryKey: ROADMAP_KEY,
    queryFn: async () => {
      const res = await fetch("/api/admin/swarm/roadmap");
      if (!res.ok) throw new Error("Failed to fetch roadmap");
      return res.json();
    },
    refetchInterval: 60_000, // less frequent - roadmap changes slowly
  });
}

export function useMoveCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: MoveCardRequest) => {
      const res = await fetch("/api/admin/swarm/roadmap/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error("Failed to move card");
      return res.json();
    },
    onMutate: async (req) => {
      await queryClient.cancelQueries({ queryKey: ROADMAP_KEY });
      const prev = queryClient.getQueryData<RoadmapColumn[]>(ROADMAP_KEY);

      if (prev) {
        // Optimistically move card between columns
        const updated = prev.map((col) => {
          if (col.id === req.fromColumnId) {
            return { ...col, cards: col.cards.filter((c) => c.id !== req.cardId) };
          }
          if (col.id === req.toColumnId) {
            const card = prev
              .flatMap((c) => c.cards)
              .find((c) => c.id === req.cardId);
            if (card) {
              const cards = [...col.cards];
              cards.splice(req.position, 0, card);
              return { ...col, cards };
            }
          }
          return col;
        });
        queryClient.setQueryData(ROADMAP_KEY, updated);
      }

      return { prev };
    },
    onError: (_err, _req, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ROADMAP_KEY, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ROADMAP_KEY });
    },
  });
}
```

#### `useCommandPalette`

```tsx
// src/lib/admin/swarm/hooks/use-command-palette.ts
"use client";

import { useSwarmUI } from "@/lib/admin/swarm/store";
import { useEffect } from "react";

export function useCommandPalette() {
  const { commandPaletteOpen, openCommandPalette, closeCommandPalette } =
    useSwarmUI();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        closeCommandPalette();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, openCommandPalette, closeCommandPalette]);

  return { isOpen: commandPaletteOpen, open: openCommandPalette, close: closeCommandPalette };
}
```

---

## 10. Type Definitions

All types for the swarm dashboard live in a single file to maintain a clear contract
between server components, client components, hooks, and API routes.

```tsx
// src/lib/admin/swarm/types.ts

// =============================================================================
// Environment Types
// =============================================================================

export type EnvironmentName = "dev" | "staging" | "prod";

export type EnvironmentStatus =
  | "healthy"
  | "degraded"
  | "down"
  | "deploying"
  | "rolling-back"
  | "unknown";

export interface Environment {
  id: string;
  name: EnvironmentName;
  displayName: string;
  status: EnvironmentStatus;
  url: string;
  currentVersion: string;
  lastDeployedAt: string;          // ISO date string
  lastDeployedBy: string;
  uptimePercent: number;
  resourceUsage: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
  };
  recentDeployments: Deployment[];
}

export interface Deployment {
  id: string;
  environmentId: string;
  version: string;
  status: "pending" | "in-progress" | "success" | "failed" | "rolled-back";
  commitSha: string;
  commitMessage: string;
  deployedBy: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface DeploymentRequest {
  environmentId: string;
  branch: string;
  commitSha?: string;
  force?: boolean;
}

export interface DeploymentEvent {
  type: "log" | "progress" | "complete" | "failed";
  timestamp: string;
  message: string;
  progress?: number;             // 0-100
}

// =============================================================================
// Agent Types
// =============================================================================

export type AgentStatus =
  | "idle"
  | "running"
  | "waiting"
  | "error"
  | "stopped"
  | "spawning";

export type AgentProvider = "claude" | "jules" | "custom";

export interface Agent {
  id: string;
  name: string;
  provider: AgentProvider;
  status: AgentStatus;
  currentTask: string | null;
  model: string;                  // e.g., "claude-opus-4-6"
  spawnedAt: string;
  lastActivityAt: string;
  messagesCount: number;
  tokensUsed: number;
  assignedEnvironment: EnvironmentName | null;
  metadata: Record<string, unknown>;
}

export interface AgentStatusCounts {
  idle: number;
  running: number;
  waiting: number;
  error: number;
  stopped: number;
  total: number;
}

export interface SpawnAgentRequest {
  name: string;
  provider: AgentProvider;
  model: string;
  task: string;
  environment?: EnvironmentName;
}

export interface AgentChatMessage {
  id: string;
  agentId: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  toolCalls?: AgentToolCall[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "success" | "error";
  durationMs?: number;
}

// =============================================================================
// Roadmap Types
// =============================================================================

export type CardPriority = "p0" | "p1" | "p2" | "p3";
export type CardLabel = "bug" | "feature" | "tech-debt" | "blocked" | "in-progress";

export interface RoadmapCard {
  id: string;
  title: string;
  body: string | null;
  issueNumber: number;
  issueUrl: string;
  labels: CardLabel[];
  priority: CardPriority | null;
  assignees: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapColumn {
  id: string;
  name: string;                    // e.g., "Backlog", "In Progress", "Done"
  cards: RoadmapCard[];
  position: number;
}

export interface MoveCardRequest {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  position: number;
}

// =============================================================================
// Analytics Types
// =============================================================================

export interface AnalyticsDateRange {
  start: string;                   // ISO date
  end: string;                     // ISO date
}

export interface UserAnalytics {
  dailyActiveUsers: Array<{ date: string; count: number }>;
  weeklyActiveUsers: Array<{ date: string; count: number }>;
  totalUsers: number;
  newUsersThisPeriod: number;
  growthPercent: number;
}

export interface McpUsageAnalytics {
  toolCalls: Array<{
    toolName: string;
    callCount: number;
    avgDurationMs: number;
    errorRate: number;
  }>;
  totalCalls: number;
  totalErrors: number;
  dailyUsage: Array<{ date: string; calls: number; errors: number }>;
}

export interface TechDebtAnalytics {
  score: number;                   // 0-100
  categories: Array<{
    name: string;
    score: number;
    trend: "improving" | "stable" | "worsening";
  }>;
  topIssues: Array<{
    title: string;
    severity: "low" | "medium" | "high";
    file: string;
  }>;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByType: Array<{ type: string; count: number }>;
  errorTimeline: Array<{ date: string; count: number }>;
  topErrors: Array<{
    message: string;
    count: number;
    lastSeen: string;
    component: string;
  }>;
}

// =============================================================================
// Scheduler Types
// =============================================================================

export type TaskFrequency = "once" | "daily" | "weekly" | "monthly" | "cron";
export type TaskStatus = "active" | "paused" | "completed" | "failed";

export interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  frequency: TaskFrequency;
  cronExpression: string | null;   // e.g., "0 9 * * 1-5"
  status: TaskStatus;
  lastRunAt: string | null;
  nextRunAt: string;
  createdBy: string;
  command: string;                 // the actual command or action
  environment: EnvironmentName | null;
  history: TaskExecution[];
}

export interface TaskExecution {
  id: string;
  taskId: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "success" | "failed";
  output: string | null;
  durationMs: number | null;
}

// =============================================================================
// Notification Types
// =============================================================================

export type NotificationType =
  | "agent_message"
  | "deploy_complete"
  | "deploy_failed"
  | "issue_created"
  | "issue_closed"
  | "error_spike"
  | "system_alert";

export type NotificationSeverity = "info" | "warning" | "error" | "critical";

export interface SwarmNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  source: {
    type: "agent" | "environment" | "system" | "github";
    id: string;
    name: string;
  };
  actionUrl?: string;              // link to relevant page
}

// =============================================================================
// Dashboard / Metrics Types
// =============================================================================

export interface SwarmMetrics {
  activeAgents: number;
  totalAgents: number;
  deploymentsToday: number;
  openIssues: number;
  errorRate: number;               // percentage
  uptimeAvg: number;               // percentage across all envs
  tokensUsedToday: number;
  creditsRemaining: number;
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Create route group `src/app/admin/(swarm)/swarm/` with layout
2. Create `src/lib/admin/swarm/types.ts` (all types)
3. Create `src/lib/admin/swarm/constants.ts`
4. Create `src/lib/admin/swarm/store.ts` (Zustand UI state)
5. Install shadcn/ui `command` component: `npx shadcn@latest add command`
6. Create `SwarmSidebar` and `SwarmTopBar` layout components
7. Create `WidgetShell` and `DashboardGrid` components
8. Add "Swarm" link to existing `AdminSidebar`
9. Create `swarm/error.tsx` and `swarm/loading.tsx`

### Phase 2: Dashboard + Environments (Week 2)
1. Create API routes: `/api/admin/swarm/metrics`, `/api/admin/swarm/environments`
2. Implement hooks: `useEnvironments`, `useDeployMutation`
3. Build dashboard widgets: `MetricsWidget`, `EnvironmentSummaryWidget`, `ActiveAgentsWidget`
4. Build `EnvironmentCard`, `DeploymentDialog`, `EnvironmentStatusBadge`
5. Implement deployment SSE stream

### Phase 3: Agents + Chat (Week 3)
1. Create API routes: `/api/admin/swarm/agents`, WebSocket endpoint
2. Implement hooks: `useAgents`, `useAgentChat`, `useSpawnAgent`
3. Build `AgentGrid`, `AgentCard`, `AgentStatusIndicator`
4. Build `AgentChat`, `AgentChatMessage`
5. Build `SpawnAgentDialog`

### Phase 4: Roadmap + Analytics (Week 4)
1. Create API routes: `/api/admin/swarm/roadmap`, `/api/admin/swarm/analytics`
2. Implement hooks: `useRoadmap`, `useMoveCard`, `useAnalytics`
3. Build `RoadmapBoard`, `RoadmapColumn`, `RoadmapCard` (with dnd-kit)
4. Build analytics charts: `UsersChart`, `McpUsageChart`, `ErrorRateChart`
5. Build `DateRangePicker`

### Phase 5: Scheduler + Notifications + Polish (Week 5)
1. Create API routes for scheduler and notifications
2. Implement remaining hooks
3. Build `TaskSchedulerClient`, `CronVisualizer`
4. Build `NotificationInbox`, `NotificationFilters`
5. Build `CommandPalette` (Cmd+K)
6. Accessibility audit (keyboard nav, ARIA labels, focus management)
7. Performance audit (React DevTools profiler, bundle size)

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Route placement | `src/app/admin/(swarm)/swarm/` | Clean layout isolation via route group |
| Component placement | `src/components/admin/swarm/` | Follows existing codebase convention |
| Server vs Client | Server pages, client components | Auth + data fetching in RSC, interactivity in client |
| Data fetching | TanStack Query v5 | Already installed, excellent for polling + cache + mutations |
| Real-time chat | WebSocket via custom hook | Bidirectional, low latency for agent chat |
| Real-time deploys | SSE (EventSource) | Unidirectional, works on Vercel serverless |
| Local UI state | Zustand with persist | Sidebar toggle, env switcher, widget layout |
| Drag-and-drop | @dnd-kit (already installed) | Roadmap kanban, widget reorder |
| Charts | recharts (already installed) | Analytics views |
| Icons | lucide-react (already installed) | Consistent with existing UI |
| Error handling | Hierarchical error boundaries | Per-section + per-widget isolation |
| Loading states | loading.tsx + Skeleton + query isLoading | Progressive disclosure |
| Type safety | Single types.ts, NO `any` | TypeScript strict mode enforcement |

## 11. Technical Debt & Strictness Migration (BAZDMEG Principle 7)

As identified in the BAZDMEG Audit, the project has significant TypeScript technical debt (Resolves #1232) that impacts dashboard reliability.

1. **`exactOptionalPropertyTypes`**: Currently disabled with ~675 errors. New dashboard components MUST be written with this flag in mind.
2. **Migration Path**: All new components under `src/components/admin/swarm/` will be strictly typed.
3. **Debt Tracking**: The `TechDebtChart.tsx` widget will visualize the remaining TypeScript error count over time by parsing the output of `yarn tsc`.
