# AI Cloud Swarm Platform -- Admin Dashboard UI Architecture

Resolves #1254

## Document Purpose

Complete UI/UX architecture for replacing the existing `/admin` section with a mission-control-grade CEO dashboard. This document covers navigation, layout wireframes, component hierarchy, information density strategy, real-time patterns, keyboard shortcuts, and the status color system.

---

## 1. Navigation Structure and Page Hierarchy

### 1.1 Current State (Problems)

The existing sidebar at `/Users/z/Developer/spike-land-nextjs/src/app/admin/AdminSidebar.tsx` is a flat list of 18 nav items using emoji icons. Issues:
- No grouping or hierarchy -- all items are visually equal weight
- Emoji icons lack professionalism and are not semantically distinct at a glance
- No environment awareness -- the sidebar does not indicate which environment the user is operating in
- No real-time status indicators in navigation
- No keyboard shortcut infrastructure

### 1.2 Proposed Navigation Architecture

```
/admin                        --> Main Dashboard (Mission Control)
/admin/environments           --> Environment Control Panel
  /admin/environments/dev
  /admin/environments/next
  /admin/environments/prod
/admin/agents                 --> Agent Command Center (replaces current agents page)
  /admin/agents/[agentId]     --> Individual agent detail/chat
/admin/roadmap                --> Kanban Roadmap (replaces app-factory)
/admin/analytics              --> Analytics Hub (consolidates analytics, system, credits)
  /admin/analytics/users
  /admin/analytics/mcp
  /admin/analytics/errors
  /admin/analytics/tech-debt
/admin/scheduler              --> Task Scheduler (new)
/admin/inbox                  --> Notifications/Inbox (new)
/admin/settings               --> AI Tokens, MCP Health, System Config (consolidates)
```

### 1.3 Sidebar Design

**Structure:** Two-tier sidebar with collapsible groups.

**Top Section (Fixed):**
- Company logo mark (spike.land) -- small, left-aligned
- Environment Switcher pill: `[DEV] [NEXT] [PROD]` -- three segments, active one highlighted
- Current environment status dot (green/yellow/red) next to the active segment

**Navigation Groups:**
```
OVERVIEW
  [icon] Dashboard              Cmd+1
  [icon] Inbox                  Cmd+2    [badge: unread count]

OPERATIONS
  [icon] Environments           Cmd+3    [3 status dots]
  [icon] Agent Command          Cmd+4    [badge: active count]
  [icon] Roadmap                Cmd+5

INTELLIGENCE
  [icon] Analytics              Cmd+6
  [icon] Scheduler              Cmd+7    [badge: running count]

SYSTEM
  [icon] Settings               Cmd+8
```

**Bottom Section (Fixed):**
- User avatar + name (small)
- "Back to App" link
- Sidebar collapse toggle

**Sidebar Behavior:**
- Width: 240px expanded, 56px collapsed (icon-only mode)
- Collapse via toggle button or `Cmd+B`
- Active item: left border accent (3px, primary color), subtle background fill
- Hover: glass-0 background effect
- Group headers: uppercase, muted-foreground, 11px, letter-spacing 0.05em

**Icons:** Use Lucide icons consistently (already available in the project via lucide-react). Replace emoji icons entirely.

### 1.4 Top Bar Design

**Layout:** Fixed height 48px bar above the content area, right of sidebar.

**Left Zone:**
- Breadcrumb trail: `Dashboard > Agent Command > agent-name`
- Page title (when breadcrumb is short enough)

**Center Zone:**
- Command palette trigger: search bar shaped button `Cmd+K` -- "Search anything..."

**Right Zone:**
- Live clock showing current time in monospace font (seconds ticking)
- Connection status indicator (WebSocket): green pulsing dot when connected, red when disconnected
- Notification bell with badge count
- Environment health summary: three tiny dots for dev/next/prod status

---

## 2. Layout Wireframes

### 2.1 Main Dashboard (Mission Control)

This is the landing page. The user sees the state of the entire system at a glance.

```
+--------------------------------------------------------------+
| TOP BAR: breadcrumb / search / clock / connection             |
+--------------------------------------------------------------+
|                                                                |
|  ENVIRONMENT STATUS STRIP                                      |
|  +------------------+------------------+------------------+    |
|  |  DEV             |  NEXT            |  PROD            |    |
|  |  localhost:3000   |  Vercel Preview   |  spike.land      |    |
|  |  [green dot] UP   |  [yellow] DEPLOYING|  [green] UP     |    |
|  |  commit: abc123   |  PR #42 deploying  |  v2.1.4         |    |
|  |  0 errors         |  2 warnings        |  0 errors       |    |
|  +------------------+------------------+------------------+    |
|                                                                |
|  METRICS ROW (4 columns)                                       |
|  +------------+  +------------+  +------------+  +------------+|
|  | Active     |  | Tasks      |  | Errors     |  | Credits    ||
|  | Agents     |  | Completed  |  | (24h)      |  | Remaining  ||
|  |    3       |  |    47      |  |    2       |  |    8,450   ||
|  | [sparkline]|  | [sparkline]|  | [sparkline]|  | [sparkline]||
|  +------------+  +------------+  +------------+  +------------+|
|                                                                |
|  +-------------------------------+  +-------------------------+|
|  | AGENT ACTIVITY FEED           |  | ALERTS & ATTENTION      ||
|  | (scrollable, real-time)       |  | REQUIRED                ||
|  |                               |  |                         ||
|  | 14:23 Agent-A completed PR #42|  | [!] PR #38 failing CI   ||
|  | 14:21 Agent-B started task    |  | [!] Prod error spike    ||
|  | 14:19 Agent-C awaiting review |  | [?] Agent-D needs input ||
|  | 14:15 Deploy to next started  |  |                         ||
|  | ...                           |  | No critical alerts      ||
|  +-------------------------------+  +-------------------------+|
|                                                                |
|  +-------------------------------+  +-------------------------+|
|  | ROADMAP PROGRESS (condensed)  |  | QUICK ACTIONS            ||
|  | Plan: 3 | Dev: 5 | Test: 2   |  | [+] Spawn Agent          ||
|  | [horizontal stacked bar]      |  | [>] Promote to Prod      ||
|  | Next milestone: v2.2          |  | [?] Review PR #42        ||
|  +-------------------------------+  +-------------------------+|
+--------------------------------------------------------------+
```

**Grid System:** CSS Grid with `grid-template-areas` for maximum layout control.
- Row 1: Environment strip -- full width, 3-column grid, `h-24`
- Row 2: Metrics -- 4-column grid, `h-28` each
- Row 3: Activity Feed (2/3 width) + Alerts (1/3 width), `h-80`
- Row 4: Roadmap Summary (2/3) + Quick Actions (1/3), `h-40`

**Component Hierarchy:**
```
<DashboardPage>                               (server component - fetches initial data)
  <DashboardClient initialData={...}>         (client component - manages polling)
    <EnvironmentStrip environments={3} />
      <EnvironmentCard env="dev" />
      <EnvironmentCard env="next" />
      <EnvironmentCard env="prod" />
    <MetricsRow>
      <MetricCard title="Active Agents" value={3} sparkline={[...]} />
      <MetricCard title="Tasks Today" value={47} sparkline={[...]} />
      <MetricCard title="Errors (24h)" value={2} variant="warning" sparkline={[...]} />
      <MetricCard title="Credits" value={8450} sparkline={[...]} />
    </MetricsRow>
    <div className="grid grid-cols-3 gap-4">
      <ActivityFeed className="col-span-2" events={[...]} />
      <AlertsPanel alerts={[...]} />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <RoadmapSummary className="col-span-2" phases={...} />
      <QuickActions />
    </div>
  </DashboardClient>
</DashboardPage>
```

### 2.2 Environment Control Panel

Full-screen view focused on the three environments.

```
+--------------------------------------------------------------+
| TOP BAR                                                        |
+--------------------------------------------------------------+
|                                                                |
|  +-----------------------------------------------------------+|
|  | ENVIRONMENT DETAIL TABS: [DEV] [NEXT] [PROD]              ||
|  +-----------------------------------------------------------+|
|                                                                |
|  Selected: PROD                                                |
|                                                                |
|  +---------------------------+  +----------------------------+ |
|  | STATUS                    |  | DEPLOYMENT PIPELINE        | |
|  | URL: spike.land           |  |                            | |
|  | Version: v2.1.4           |  | main -> build -> deploy    | |
|  | Uptime: 99.97%            |  | [=====>    ] 73%           | |
|  | Last deploy: 2h ago       |  | Stage: Building...         | |
|  | Commit: abc1234           |  | ETA: ~3 min                | |
|  +---------------------------+  +----------------------------+ |
|                                                                |
|  +-----------------------------------------------------------+|
|  | RECENT DEPLOYMENTS (table)                                 ||
|  | Time       | Commit  | Author    | Status   | Duration    ||
|  | 2h ago     | abc1234 | zerdos    | SUCCESS  | 4m 23s      ||
|  | Yesterday  | def5678 | agent-A   | SUCCESS  | 3m 55s      ||
|  | 2 days ago | ghi9012 | agent-B   | FAILED   | 1m 02s      ||
|  +-----------------------------------------------------------+|
|                                                                |
|  +---------------------------+  +----------------------------+ |
|  | PROMOTE ACTIONS           |  | ENVIRONMENT DIFF           | |
|  | [Promote dev -> next]     |  | 3 commits ahead of prod    | |
|  | [Promote next -> prod]    |  | + src/lib/auth.ts          | |
|  | [Rollback prod]           |  | + src/app/admin/page.tsx   | |
|  +---------------------------+  +----------------------------+ |
+--------------------------------------------------------------+
```

### 2.3 Agent Command Center

The most complex and highest-value view. Real-time agent monitoring with chat capability.

```
+--------------------------------------------------------------+
| TOP BAR                                                        |
+--------------------------------------------------------------+
|                                                                |
|  AGENT OVERVIEW BAR                                            |
|  Active: 3 | Idle: 1 | Failed: 0 | Total tasks today: 12     |
|  [+ Spawn Agent]  [Stop All]                                   |
|                                                                |
|  +-------------------+  +------------------------------------+ |
|  | AGENT LIST        |  | AGENT DETAIL / CHAT                | |
|  | (scrollable)      |  |                                    | |
|  |                   |  | Agent: claude-worker-1              | |
|  | [*] claude-w-1    |  | Status: IN_PROGRESS                | |
|  |   IN_PROGRESS     |  | Task: Fix auth middleware #42      | |
|  |   Fix auth #42    |  | Branch: fix/auth-middleware         | |
|  |                   |  | Duration: 14m 23s                  | |
|  | [ ] claude-w-2    |  |                                    | |
|  |   PLANNING        |  | +--------------------------------+ | |
|  |   Refactor DB     |  | | LIVE LOG / CHAT                | | |
|  |                   |  | | (WebSocket streaming)          | | |
|  | [ ] jules-1       |  | |                                | | |
|  |   COMPLETED       |  | | 14:23 Reading src/lib/auth.ts  | | |
|  |   Build landing   |  | | 14:23 Found issue in line 42   | | |
|  |                   |  | | 14:24 Editing file...           | | |
|  | [ ] claude-w-3    |  | | 14:24 Running tests...          | | |
|  |   AWAITING_INPUT  |  | | 14:25 3/5 tests passing         | | |
|  |   Needs decision  |  | | > [user input area]             | | |
|  +-------------------+  | +--------------------------------+ | |
|                          |                                    | |
|                          | AGENT ACTIONS:                     | |
|                          | [Redirect Task] [Pause] [Stop]     | |
|                          | [Approve Plan] [View PR] [Jules]   | |
|                          +------------------------------------+ |
+--------------------------------------------------------------+
```

**Layout:** Split pane. Left panel is 280px fixed-width agent list. Right panel is flexible-width detail area.

**Agent List Items:**
- Status indicator dot (colored per status)
- Agent name (truncated)
- Current status badge
- Task summary (1-line truncated)
- Activity count and last activity time
- Click to select, current selection has left border highlight

**Agent Detail Area:**
- Header: agent name, status badge, task title, branch, duration timer (live-ticking)
- Chat/Log area: scrollable, auto-scrolls to bottom on new messages, monospace font for logs, normal font for chat messages
- Input area at bottom: text input for sending messages to the agent
- Action buttons: contextual based on agent status

**Real-time:** WebSocket connection for live agent activity streaming. Falls back to 3-second polling (matching existing `POLLING_INTERVAL` in app-factory). Visual indicator of connection state.

### 2.4 Roadmap View (Kanban)

Builds on the existing KanbanBoard component at `/Users/z/Developer/spike-land-nextjs/src/components/app-factory/KanbanBoard.tsx` but redesigned for a roadmap context.

```
+--------------------------------------------------------------+
| TOP BAR                                                        |
+--------------------------------------------------------------+
|                                                                |
|  ROADMAP HEADER                                                |
|  Milestone: v2.2  |  Due: Mar 15  |  Progress: 67%            |
|  [+ Add Item] [Sync GitHub] [Filter] [Group by: Label]        |
|                                                                |
|  +--------+ +--------+ +--------+ +--------+ +--------+       |
|  | BACKLOG| | PLAN   | | IN DEV | | REVIEW | | DONE   |       |
|  |   (12) | |   (3)  | |   (5)  | |   (2)  | |   (23) |       |
|  |        | |        | |        | |        | |        |       |
|  | [card] | | [card] | | [card] | | [card] | | [card] |       |
|  | [card] | | [card] | | [card] | | [card] | | [card] |       |
|  | [card] | | [card] | | [card] | |        | | [card] |       |
|  | [card] | |        | | [card] | |        | | ...    |       |
|  | [card] | |        | | [card] | |        | |        |       |
|  | ...    | |        | |        | |        | |        |       |
|  +--------+ +--------+ +--------+ +--------+ +--------+       |
+--------------------------------------------------------------+
```

**Kanban Cards:**
- Title (bold, 14px)
- Labels as colored pills
- Assignee avatar (if agent, show agent icon; if human, show user avatar)
- Priority indicator (P0: red left border, P1: orange, P2: blue)
- GitHub issue number link
- Drag handle on the left side

**Drag-and-drop:** Retain existing `@dnd-kit/core` integration. Add keyboard-based reordering (arrow keys when card is focused).

### 2.5 Analytics Hub

Tabbed interface consolidating all analytics views.

```
+--------------------------------------------------------------+
| TOP BAR                                                        |
+--------------------------------------------------------------+
|                                                                |
|  ANALYTICS TABS: [Users] [MCP Usage] [Errors] [Tech Debt]     |
|  Time Range: [24h] [7d] [30d] [Custom]                        |
|                                                                |
|  (Content depends on active tab -- see below)                  |
|                                                                |
|  Users Tab:                                                    |
|  - Reuse existing charts from analytics/page.tsx               |
|  - Add sparklines to metric cards                              |
|                                                                |
|  MCP Usage Tab:                                                |
|  - API calls per day (line chart)                              |
|  - Token consumption (bar chart by model)                      |
|  - Top tools by usage (horizontal bar)                         |
|  - Cost breakdown (pie chart)                                  |
|                                                                |
|  Errors Tab:                                                   |
|  - Reuse existing ErrorsAdminClient                            |
|  - Add error rate trend line at top                            |
|  - Keep filtering and detail dialog                            |
|                                                                |
|  Tech Debt Tab:                                                |
|  - Code coverage metrics                                       |
|  - Type safety score                                           |
|  - Dependency audit results                                    |
|  - ESLint violation trends                                     |
+--------------------------------------------------------------+
```

### 2.6 Task Scheduler

```
+--------------------------------------------------------------+
| TOP BAR                                                        |
+--------------------------------------------------------------+
|                                                                |
|  SCHEDULER HEADER                                              |
|  Active Tasks: 5 | Next Run: in 14 minutes                    |
|  [+ Create Task] [Pause All]                                   |
|                                                                |
|  +-----------------------------------------------------------+|
|  | TASK TABLE                                                 ||
|  | Name         | Schedule    | Last Run  | Next Run | Status ||
|  | Daily backup | 0 2 * * *   | 02:00 AM  | Tomorrow | OK    ||
|  | Sync GitHub  | */15 * * * * | 14:15     | 14:30    | OK    ||
|  | Health check | */5 * * * *  | 14:20     | 14:25    | WARN  ||
|  | Deploy check | 0 * * * *   | 14:00     | 15:00    | OK    ||
|  | Cleanup jobs | 0 3 * * 0   | Sunday    | Next Sun | OK    ||
|  +-----------------------------------------------------------+|
|                                                                |
|  +---------------------------+  +----------------------------+ |
|  | TIMELINE VIEW (24h)      |  | TASK DETAIL (selected)     | |
|  | (visual cron timeline)   |  | Name: Sync GitHub          | |
|  | 00  06  12  18  24       |  | Cron: */15 * * * *         | |
|  | |---|---|---|---|         |  | Every 15 minutes           | |
|  | * * * * * (health)       |  | Last result: OK (0.3s)     | |
|  |   *   *   * (sync)       |  | Avg duration: 0.4s         | |
|  | *           (backup)     |  | Failures (7d): 0           | |
|  +---------------------------+  +----------------------------+ |
+--------------------------------------------------------------+
```

### 2.7 Notifications/Inbox

```
+--------------------------------------------------------------+
| TOP BAR                                                        |
+--------------------------------------------------------------+
|                                                                |
|  INBOX                                                         |
|  [All] [Unread (3)] [From Agents] [CI/CD] [Errors]            |
|                                                                |
|  +-----------------------------------------------------------+|
|  | NOTIFICATION LIST                                          ||
|  |                                                            ||
|  | [unread dot] Agent claude-w-1 needs your input             ||
|  | "Should I proceed with breaking change to auth API?"       ||
|  | 5 minutes ago  [Reply] [Approve] [Dismiss]                 ||
|  |                                                            ||
|  | [unread dot] CI failed on PR #42                           ||
|  | "Test suite failing: 3 tests in auth.test.ts"              ||
|  | 12 minutes ago  [View PR] [View Logs] [Dismiss]            ||
|  |                                                            ||
|  | [read] Deploy to prod completed                            ||
|  | "v2.1.4 deployed successfully. 0 errors."                  ||
|  | 2 hours ago  [View Deploy]                                 ||
|  +-----------------------------------------------------------+|
+--------------------------------------------------------------+
```

---

## 3. Component Hierarchy for Main Dashboard

### 3.1 File Structure

```
src/app/admin/
  layout.tsx                    (AdminLayout - sidebar + topbar + content)
  page.tsx                      (DashboardPage - server component)

src/components/admin/
  layout/
    AdminSidebar.tsx            (new sidebar with groups)
    AdminTopBar.tsx             (breadcrumb, search, clock, status)
    EnvironmentSwitcher.tsx     (DEV/NEXT/PROD pill selector)
    CommandPalette.tsx          (Cmd+K search modal)

  dashboard/
    DashboardClient.tsx         (main dashboard client wrapper)
    EnvironmentStrip.tsx        (3-env status cards row)
    EnvironmentCard.tsx         (single env status)
    MetricsRow.tsx              (metrics card container)
    MetricCard.tsx              (single metric with sparkline)
    ActivityFeed.tsx            (real-time scrolling activity)
    AlertsPanel.tsx             (attention-required items)
    RoadmapSummary.tsx          (condensed kanban progress)
    QuickActions.tsx            (action buttons grid)

  agents/
    AgentCommandCenter.tsx      (main agent view)
    AgentList.tsx               (left panel agent list)
    AgentListItem.tsx           (individual agent row)
    AgentDetail.tsx             (right panel detail)
    AgentChat.tsx               (live chat/log stream)
    AgentActions.tsx            (contextual action buttons)
    SpawnAgentDialog.tsx        (create new agent modal)

  environments/
    EnvironmentPanel.tsx        (full detail for one env)
    DeploymentPipeline.tsx      (visual deploy progress)
    DeploymentHistory.tsx       (table of past deploys)
    PromoteActions.tsx          (promote/rollback buttons)
    EnvironmentDiff.tsx         (commit diff between envs)

  roadmap/
    RoadmapView.tsx             (kanban wrapper)
    RoadmapColumn.tsx           (single column)
    RoadmapCard.tsx             (issue/task card)
    RoadmapFilters.tsx          (filter bar)

  analytics/
    AnalyticsHub.tsx            (tabbed container)
    UsersTab.tsx
    McpUsageTab.tsx
    ErrorsTab.tsx
    TechDebtTab.tsx
    TimeRangeSelector.tsx

  scheduler/
    SchedulerView.tsx
    TaskTable.tsx
    TaskDetail.tsx
    CronTimeline.tsx
    CreateTaskDialog.tsx

  inbox/
    InboxView.tsx
    NotificationList.tsx
    NotificationItem.tsx
    NotificationFilters.tsx

  shared/
    StatusDot.tsx               (reusable status indicator)
    LiveBadge.tsx               (pulsing "Live" badge)
    SparklineChart.tsx          (tiny inline chart)
    RelativeTime.tsx            (auto-updating "5m ago")
    KeyboardShortcut.tsx        (shortcut hint display)
    ConnectionStatus.tsx        (WebSocket status indicator)
```

### 3.2 Shared Primitives Built on shadcn/ui

These extend existing components:

- **StatusDot:** `<div className="h-2 w-2 rounded-full" />` with color variants
- **LiveBadge:** Existing `Badge` + `animate-pulse` + green dot
- **SparklineChart:** Lightweight SVG, no Recharts dependency for these tiny charts
- **MetricCard:** Extends `Card` with variant="highlighted" for threshold breaches
- **RelativeTime:** Client component that ticks every minute, shows "5m ago" style

---

## 4. Information Density Strategy

### 4.1 Principles

1. **Scan, then drill.** The dashboard surface shows aggregated numbers. Clicking any metric opens its detail page.
2. **Progressive disclosure.** Cards show headline metric + sparkline. Hover shows tooltip with more context. Click opens full detail.
3. **Visual encoding over text.** Use color-coded dots, sparklines, and progress bars instead of verbose status text where possible.
4. **Consistent density zones.** Three density levels:
   - **Glance Zone** (top of page): large numbers, status dots, environment strip. ~40px line height.
   - **Working Zone** (middle): tables, lists, cards. ~32px line height. 13-14px font.
   - **Detail Zone** (expanded panels, modals): full information. ~24px line height. 12-13px font.

### 4.2 Typography Scale for Admin

```
Page Title:      text-2xl font-bold font-heading  (24px Montserrat)
Section Title:   text-lg font-semibold             (18px)
Card Title:      text-sm font-medium               (14px)
Card Value:      text-2xl font-bold tabular-nums   (24px, monospace digits)
Body Text:       text-sm                            (14px)
Caption/Meta:    text-xs text-muted-foreground      (12px)
Monospace Data:  text-xs font-mono                  (12px)
```

### 4.3 Card Density Patterns

**Metric Card (compact):**
```
+------------------+
| Label     [icon] |   <- 12px muted
| 3,847            |   <- 24px bold
| +12% [sparkline] |   <- 12px + tiny SVG
+------------------+
```
Height: ~100px. Use variant="default" Card from existing system.

**Activity Feed Item (scannable):**
```
[dot] 14:23  Agent-A completed PR #42 - "Fix auth middleware"  [View]
```
Height: ~36px per item. Time in monospace, agent name in bold, description truncated with ellipsis.

**Alert Item (attention-grabbing):**
```
[!] PR #38 failing CI
    3 tests failing in auth.test.ts
    [View PR] [View Logs]
```
Height: ~64px. Red left border for errors, amber for warnings.

### 4.4 Table Density

All admin tables use:
- Row height: 40px (touch-friendly on desktop, not wasteful)
- Column padding: `px-3 py-2`
- Header: `bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground`
- Alternating row backgrounds are NOT used -- hover highlight only
- Sticky header for scrollable tables

---

## 5. Real-Time Indicator Patterns

### 5.1 Connection Status

**WebSocket Connected:**
- Top bar: Small green dot, steady, with subtle `animate-pulse` (slow, 3s cycle)
- Tooltip on hover: "Connected - receiving live updates"

**WebSocket Disconnected:**
- Top bar: Red dot, no animation
- Toast notification: "Connection lost. Retrying..."
- Auto-retry with exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)

**Reconnecting:**
- Top bar: Amber dot with faster pulse
- Status text: "Reconnecting..."

### 5.2 Live Data Indicators

**LiveBadge Component:**
```tsx
<Badge variant="secondary" className="text-xs gap-1.5">
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
  </span>
  Live
</Badge>
```

**Polling Indicator:**
- When polling is active: `LiveBadge` with interval hint, e.g., "Live (3s)"
- When polling is paused: `Badge variant="outline"` with "Paused" text
- Pause/Resume toggle: existing pattern from `AgentsDashboardClient`

**Data Freshness:**
- "Last updated: 14:23:45" in top-right of each panel that polls
- If data is stale (>60s since last successful fetch): amber tint on the timestamp
- If data is very stale (>5min): red tint + "Stale data" warning

### 5.3 Agent Activity Streaming

**Agent Chat/Log Area:**
- New messages fade in from bottom (use existing `animate-in fade-in-50` from TabsContent)
- System messages: muted-foreground, monospace
- Agent output: foreground, sans-serif
- User messages: primary color tint, right-aligned
- Error messages: destructive color
- Auto-scroll to bottom unless user has scrolled up (scroll lock detection)

**Agent Status Transitions:**
- When status changes: the status badge animates with a brief scale-up (1.1x) and color transition (300ms)
- A subtle "pulse ring" emanates from the status dot on transition

### 5.4 Environment Deploy Progress

- Animated progress bar using CSS transitions
- Stage labels update in real-time
- On completion: brief green glow effect (use `shadow-glow-cyan` variant with green color)
- On failure: red glow + shake animation

---

## 6. Keyboard Shortcuts for Power Users

### 6.1 Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+K` | Open command palette | Anywhere |
| `Cmd+B` | Toggle sidebar collapse | Anywhere |
| `Cmd+1` through `Cmd+8` | Navigate to section | Anywhere |
| `Cmd+Shift+E` | Cycle environment focus | Environment panel |
| `Escape` | Close modal/palette/detail | When open |
| `?` | Show keyboard shortcut help | When not in input |

### 6.2 Dashboard-Specific

| Shortcut | Action | Context |
|----------|--------|---------|
| `R` | Refresh current view data | Dashboard/Agents/Analytics |
| `P` | Toggle polling pause/resume | Any polled view |
| `N` | New item (spawn agent, create task, etc.) | Context-dependent |

### 6.3 Agent Command Center

| Shortcut | Action | Context |
|----------|--------|---------|
| `J` / `K` | Navigate agent list (down/up) | Agent list focused |
| `Enter` | Select/expand agent | Agent list focused |
| `/` | Focus chat input | Agent detail view |
| `Cmd+Enter` | Send message | Chat input focused |
| `A` | Approve plan | When agent awaiting approval |

### 6.4 Kanban/Roadmap

| Shortcut | Action | Context |
|----------|--------|---------|
| `Arrow keys` | Navigate cards | Card focused |
| `Space` | Pick up / drop card (drag) | Card focused |
| `1-5` | Move card to column N | Card selected |

### 6.5 Implementation

Use a `useKeyboardShortcuts` hook that registers listeners on mount. Support a `CommandPalette` component (shadcn/ui Dialog + Command pattern) that fuzzy-searches across all pages, agents, tasks, and recent items.

The command palette should be the primary navigation accelerator:
- Type "agents" to jump to Agent Command Center
- Type "deploy prod" to jump to prod environment
- Type "errors" to jump to error analytics
- Type agent names to jump directly to their detail view

---

## 7. Color System for Status Indicators

### 7.1 Semantic Status Colors

These are used CONSISTENTLY across all views -- environments, agents, tasks, deployments, jobs.

| Status | Dot Color | Badge Background | Badge Text | Border Accent | CSS Variable |
|--------|-----------|------------------|------------|---------------|--------------|
| **Healthy / Success / Completed** | `bg-emerald-500` | `bg-emerald-900/30` | `text-emerald-300` | `border-l-emerald-500` | `--status-success` |
| **Active / In Progress / Running** | `bg-cyan-500` | `bg-cyan-900/30` | `text-cyan-300` | `border-l-cyan-500` | `--status-active` |
| **Planning / Queued / Pending** | `bg-blue-500` | `bg-blue-900/30` | `text-blue-300` | `border-l-blue-500` | `--status-pending` |
| **Awaiting Input / Needs Attention** | `bg-amber-500` | `bg-amber-900/30` | `text-amber-300` | `border-l-amber-500` | `--status-attention` |
| **Warning / Degraded** | `bg-orange-500` | `bg-orange-900/30` | `text-orange-300` | `border-l-orange-500` | `--status-warning` |
| **Error / Failed / Down** | `bg-red-500` | `bg-red-900/30` | `text-red-300` | `border-l-red-500` | `--status-error` |
| **Paused / Idle / Inactive** | `bg-neutral-500` | `bg-neutral-800/50` | `text-neutral-400` | `border-l-neutral-500` | `--status-inactive` |
| **Deploying / Transitioning** | `bg-violet-500` | `bg-violet-900/30` | `text-violet-300` | `border-l-violet-500` | `--status-deploying` |

### 7.2 Environment-Specific Colors

Each environment gets a subtle identity color used as a secondary accent:

| Environment | Accent Color | Use Case |
|-------------|-------------|----------|
| **DEV** | `hsl(150 80% 45%)` (green-teal) | Border top on env card, badge tint |
| **NEXT** | `hsl(45 90% 50%)` (amber-gold) | Border top on env card, badge tint |
| **PROD** | `hsl(220 80% 55%)` (blue) | Border top on env card, badge tint |

These are NOT the status colors -- they simply give each environment a visual identity. The status colors above (healthy/error/etc.) are applied ON TOP of these identity colors.

### 7.3 Priority Colors

| Priority | Left Border | Label Color |
|----------|-------------|-------------|
| **P0 (Critical)** | `border-l-4 border-red-500` | Red badge |
| **P1 (High)** | `border-l-4 border-orange-500` | Orange badge |
| **P2 (Normal)** | `border-l-4 border-blue-500` | Blue badge |
| **P3 (Low)** | `border-l-2 border-neutral-600` | Muted badge |

### 7.4 Status Dot Component Spec

```tsx
// Reusable across the entire admin dashboard
type StatusVariant =
  | "success" | "active" | "pending" | "attention"
  | "warning" | "error" | "inactive" | "deploying";

interface StatusDotProps {
  variant: StatusVariant;
  pulse?: boolean;       // default: true for "active", false for others
  size?: "sm" | "md";   // sm=6px, md=8px
}
```

The dot should have:
- The solid colored circle
- An optional pulsing ring effect (for active/deploying states)
- A subtle glow shadow matching the dot color at low opacity

### 7.5 CSS Variables to Add to globals.css

```css
:root {
  --status-success: 160 84% 39%;
  --status-active: 187 100% 50%;
  --status-pending: 217 91% 60%;
  --status-attention: 38 92% 50%;
  --status-warning: 25 95% 53%;
  --status-error: 0 84% 60%;
  --status-inactive: 0 0% 45%;
  --status-deploying: 263 70% 50%;

  --env-dev: 150 80% 45%;
  --env-next: 45 90% 50%;
  --env-prod: 220 80% 55%;
}
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Layout + Navigation)
- New `AdminSidebar` with grouped navigation and Lucide icons
- New `AdminTopBar` with breadcrumbs, clock, and connection status
- `EnvironmentSwitcher` component
- `CommandPalette` (Cmd+K)
- `StatusDot`, `LiveBadge`, `SparklineChart` shared components
- `useKeyboardShortcuts` hook
- Add status CSS variables to `globals.css`

### Phase 2: Main Dashboard
- `DashboardClient` with polling infrastructure
- `EnvironmentStrip` with 3 environment cards
- `MetricsRow` with 4 metric cards
- `ActivityFeed` with scrolling events
- `AlertsPanel`
- `RoadmapSummary` (condensed view)
- `QuickActions`

### Phase 3: Agent Command Center
- Refactor `AgentsDashboardClient` into split-pane layout
- `AgentList` with status dots and filtering
- `AgentDetail` with header, chat, and actions
- `AgentChat` with WebSocket streaming (or SSE fallback)
- `SpawnAgentDialog`
- J/K keyboard navigation

### Phase 4: Environment Control + Roadmap
- `EnvironmentPanel` full detail view
- `DeploymentPipeline` visual progress
- `DeploymentHistory` table
- Promote/Rollback actions
- Roadmap kanban with drag-and-drop (extend existing KanbanBoard)
- GitHub Projects sync

### Phase 5: Analytics + Scheduler + Inbox
- `AnalyticsHub` tabbed interface wrapping existing pages
- `McpUsageTab` (new)
- `TechDebtTab` (new)
- `SchedulerView` with cron timeline
- `InboxView` with notification list and filters

---

## 9. Migration Strategy

The existing admin pages should NOT be deleted during implementation. Instead:

1. Build new components in `src/components/admin/` namespace (already partially exists)
2. Create new page files that import the new components
3. Update `AdminSidebar` nav items to point to new routes
4. Keep old pages accessible at their current URLs during transition
5. Once all new views are verified, remove old page files
6. The existing `AdminDashboardClient`, `AgentsDashboardClient`, `ErrorsAdminClient`, `JobsAdminClient`, and `AppFactoryDashboardClient` contain significant business logic (API calls, polling, state management) that should be extracted into custom hooks and reused rather than rewritten

### Key Existing Code to Preserve/Refactor

| File | Reuse Strategy |
|------|---------------|
| `AgentsDashboardClient.tsx` (692 lines) | Extract `useAgentPolling` hook, reuse agent session types |
| `AppFactoryDashboardClient.tsx` (284 lines) | Extract `useAppFactoryData` hook, reuse kanban logic |
| `ErrorsAdminClient.tsx` (629 lines) | Wrap as `ErrorsTab` inside Analytics Hub |
| `JobsAdminClient.tsx` (1450 lines) | Keep as sub-page, link from dashboard |
| `analytics/page.tsx` (221 lines) | Wrap as `UsersTab` inside Analytics Hub |
| `system/page.tsx` (405 lines) | Merge into Analytics > System tab |

---

## 10. Accessibility Notes

- All interactive elements must have `aria-label` or visible label text
- Keyboard navigation must work for every feature (no mouse-only interactions)
- Color is never the SOLE indicator of status -- always pair with text, icons, or position
- Focus ring visible on all interactive elements (existing `focus-visible:ring-2` pattern)
- Status dots have tooltips with status text for screen readers
- Charts include `aria-label` with summary data
- Modals trap focus and can be dismissed with Escape
- `prefers-reduced-motion` support already in globals.css -- respect it for all new animations
