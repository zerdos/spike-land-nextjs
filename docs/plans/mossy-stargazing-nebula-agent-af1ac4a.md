# AI Cloud Swarm Platform Management Dashboard -- Business Analysis

## Executive Summary

SPIKE LAND LTD currently has a 19-page generic admin panel built with Next.js 16, shadcn/ui, and Prisma, backed by a PostgreSQL database with 170+ models. The admin already includes real-time polling, recharts visualizations, agent session management (Jules), error logs, system health, user analytics, and MCP health monitoring. The CEO (sole developer/operator) needs to transform this into a personalized command center that eliminates context switching between GitHub, Vercel, Sentry, Stripe, and the existing admin.

The analysis below is grounded in what actually exists in the codebase today -- not hypothetical infrastructure.

---

## 1. Current State Inventory

### Existing Admin Pages (19 pages, not 27)

| Page | Path | What It Does Today |
|------|------|--------------------|
| Dashboard Home | `/admin` | 4 KPI cards (users, enhancements, credits, workspaces), real-time job status, quick links |
| User Analytics | `/admin/analytics` | Daily registrations chart, auth provider pie chart, active users 7d/30d |
| Credit Economics | `/admin/credits` | Credit allocation vs usage |
| System Health | `/admin/system` | Job queue depth, failure rates by tier, hourly job chart, R2 storage stats |
| Jobs | `/admin/jobs` | Job management with deep-link support |
| Agents | `/admin/agents` | Jules agent sessions, GitHub issues panel, git info, resources panel |
| App Factory | `/admin/app-factory` | App creation dashboard |
| Create Agent | `/admin/create-agent` | Agent creation metrics: success rate, latency, model comparison, learning notes |
| User Management | `/admin/users` | User search, role management |
| Photos | `/admin/photos` | Photo browsing |
| Gallery | `/admin/gallery` | Featured gallery CRUD with reordering |
| Error Logs | `/admin/errors` | Error log viewer with search, filter, pagination, environment toggle |
| Social Media | `/admin/social-media` | Social media management (posts, accounts, analytics sub-pages) |
| Emails | `/admin/emails` | Email log viewer |
| Sitemap | `/admin/sitemap` | Sitemap preview |
| Merch | `/admin/merch` | Merch products and orders |
| Bolt | `/admin/bolt` | Bolt orchestration |
| MCP Health | `/admin/mcp-health` | MCP server connection status (spike-land, bridgemind, playwright) |
| My Apps | `/admin/my-apps` | App statistics |
| Store Skills | `/admin/store/skills` | Skill store management |

### Existing Data Sources Already Wired

- **Prisma DB**: 170+ models including `ErrorLog`, `ClaudeCodeAgent`, `ExternalAgentSession`, `AgentSessionActivity`, `ImageEnhancementJob`, `Workspace`, `SocialAccount`, `SocialPost`, `ToolInvocation`, `AgentAuditLog`, `AgentTrustScore`, `Skill`, etc.
- **GitHub API**: Already integrated via `GitHubIssuesPanel` and `GitInfoPanel` in the agents dashboard
- **Jules API**: Already integrated for external agent session management
- **MCP Server**: Health endpoint exists, 100+ tools across 5+ categories
- **Recharts**: Already used for line charts, bar charts, pie charts in analytics and system health
- **Real-time polling**: 30-second intervals with visibility-aware pausing already implemented

### What Does NOT Exist Yet

- No Sentry API integration (error logs are internal DB only)
- No Vercel API integration (deployments managed externally)
- No Stripe dashboard integration (payments managed externally)
- No GitHub Projects V2 API (only basic issues list)
- No BridgeMind MCP integration in the dashboard (exists as MCP tool but not surfaced)
- No task scheduler/cron management
- No inter-agent communication viewer
- No deployment promotion/rollback UI
- No roadmap visualization

---

## 2. Feature Prioritization Matrix

### MUST-HAVE (MVP) -- Features that eliminate daily context switching

| # | Feature | Rationale | Effort | Existing Foundation |
|---|---------|-----------|--------|---------------------|
| 1 | **Unified Command Home** | Replace generic dashboard with CEO-personalized morning briefing | Medium | `AdminDashboardClient.tsx` exists, needs redesign |
| 2 | **Environment Status Strip** | See dev/preview/prod status at a glance without opening Vercel | Low | No foundation, new Vercel API integration |
| 3 | **Agent Command Center v2** | Real-time chat with agents, see inter-agent comms, spawn/stop | High | `AgentsDashboardClient.tsx` + 6 API routes exist |
| 4 | **Error Feed (Enhanced)** | Combine internal `ErrorLog` with Sentry trends, link to source | Medium | `ErrorsAdminClient.tsx` exists with full search/filter |
| 5 | **Roadmap View** | GitHub Projects V2 board with drag-reorder | Medium | GitHub issues panel exists, needs Projects V2 API |

### NICE-TO-HAVE (v1.1) -- High value but can ship after MVP

| # | Feature | Rationale | Effort | Existing Foundation |
|---|---------|-----------|--------|---------------------|
| 6 | **Analytics Hub v2** | Unified user/MCP/revenue analytics with cohort analysis | Medium | User analytics page exists, needs Stripe + MCP usage data |
| 7 | **AI Agent Inbox** | Messages from agents requiring CEO attention | Medium | `AgentMessage` model exists in Prisma |
| 8 | **Task Scheduler** | Daily repeating tasks, cron management | Medium | No foundation |

### FUTURE (v2.0) -- Strategic but not blocking daily use

| # | Feature | Rationale | Effort | Existing Foundation |
|---|---------|-----------|--------|---------------------|
| 9 | **Deployment Control** | Promote, rollback, history via Vercel API | High | No foundation, requires Vercel API integration |
| 10 | **Tech Debt Tracker** | Automated code quality metrics, test coverage trends | Medium | Vitest coverage exists, needs dashboard surfacing |

---

## 3. Implementation Phases

### Phase 1: CEO Morning Briefing (Weeks 1-2)

**Goal**: The CEO opens one page and knows everything important in 30 seconds.

**What to build**:
1. **Redesigned `/admin` home page** with:
   - "Good morning, Zoltan" greeting with current date
   - Environment status strip (3 colored dots: dev/preview/prod) via Vercel API
   - Top 3 action items (agent approvals pending, errors spiking, jobs failing)
   - Key numbers: users, revenue (MRR), active agents, error count (24h)
   - Recent agent activity feed (last 5 agent actions)
2. **Vercel API integration** (`/api/admin/deployments/status`):
   - Fetch latest deployment status for each environment
   - Show commit SHA, deploy time, status (ready/building/error)
3. **Sidebar restructure** from flat list to grouped sections:
   - Command Center (Home, Agents, Errors)
   - Platform (Analytics, Users, System)
   - Content (Social Media, Gallery, Photos)
   - Commerce (Credits, Merch, Store)
   - Tools (MCP Health, Bolt, App Factory)

**Rationale**: This is the highest-leverage change. The CEO currently opens multiple tabs. One page with the right 10 data points replaces 30 minutes of context gathering.

**API Routes to create**:
- `GET /api/admin/deployments/status` (Vercel API)
- `PATCH /api/admin/dashboard` (update existing to include action items)

**Files to modify**:
- `/Users/z/Developer/spike-land-nextjs/src/components/admin/AdminDashboardClient.tsx`
- `/Users/z/Developer/spike-land-nextjs/src/app/admin/AdminSidebar.tsx`
- `/Users/z/Developer/spike-land-nextjs/src/app/admin/page.tsx`
- `/Users/z/Developer/spike-land-nextjs/src/app/api/admin/dashboard/route.ts`

### Phase 2: Agent Command Center v2 (Weeks 3-4)

**Goal**: Full control over AI agent swarm from one screen.

**What to build**:
1. **Real-time agent chat panel**: Send messages to running agents via existing `/api/admin/agents/[sessionId]/message` endpoint
2. **Inter-agent communication viewer**: Show `AgentMessage` records between agents in a threaded timeline
3. **Agent spawn control**: Extend create modal with template selection (bug fix, feature, refactor)
4. **Agent resource monitor**: Enhance existing `ResourcesPanel` with CPU/memory/token burn rate
5. **Agent activity timeline**: Expand existing `activityCount` into full activity log with file changes, commits, PR creation

**Rationale**: Agent management is the CEO's primary daily interaction. The current dashboard shows sessions but lacks two-way communication and visibility into what agents are actually doing.

**API Routes to create/modify**:
- `GET /api/admin/agents/[sessionId]/messages` (chat history)
- `POST /api/admin/agents/[sessionId]/message` (already exists, enhance)
- `GET /api/admin/agents/[sessionId]/activities` (already exists, enhance with file-level detail)
- `GET /api/admin/agents/inter-agent-comms` (new: cross-agent message timeline)

**Files to modify**:
- `/Users/z/Developer/spike-land-nextjs/src/components/admin/agents/AgentsDashboardClient.tsx`
- `/Users/z/Developer/spike-land-nextjs/src/components/admin/agents/ResourcesPanel.tsx`
- New: `/Users/z/Developer/spike-land-nextjs/src/components/admin/agents/AgentChatPanel.tsx`
- New: `/Users/z/Developer/spike-land-nextjs/src/components/admin/agents/InterAgentTimeline.tsx`

### Phase 3: Error Feed + Roadmap (Weeks 5-6)

**Goal**: Errors and roadmap visible without leaving the dashboard.

**What to build**:
1. **Enhanced Error Feed**:
   - Add Sentry API integration for error trends and grouping
   - Link errors to source code (clickable file paths that open in VS Code/GitHub)
   - Error trend sparkline on the home dashboard
   - Alert threshold configuration (notify when error rate exceeds X/hour)
2. **Roadmap View**:
   - GitHub Projects V2 integration via GraphQL API
   - Kanban board with drag-and-drop reordering
   - Link to BridgeMind MCP for AI-powered prioritization
   - Progress tracking per milestone

**API Routes to create**:
- `GET /api/admin/errors/trends` (Sentry API integration)
- `GET /api/admin/roadmap` (GitHub Projects V2 GraphQL)
- `POST /api/admin/roadmap/reorder` (GitHub Projects V2 mutation)
- `GET /api/admin/roadmap/bridgemind-suggest` (BridgeMind MCP integration)

### Phase 4: Analytics Hub + Agent Inbox (Weeks 7-8)

**Goal**: Data-driven decisions and agent message triage.

**What to build**:
1. **Analytics Hub v2**:
   - Merge user analytics, MCP usage, and credit economics into one dashboard
   - Add Stripe revenue data (MRR, churn, LTV)
   - Cohort retention table
   - MCP tool usage heatmap (which tools are used most, by which users)
2. **AI Agent Inbox**:
   - Aggregated messages from agents needing CEO attention
   - Priority scoring (plan approvals > errors > status updates)
   - One-click approve/reject/respond actions
   - Unread count badge on sidebar

---

## 4. KPIs per Feature

### Feature 1: Unified Command Home
| KPI | Target | Measurement |
|-----|--------|-------------|
| Time to first insight | < 10 seconds | Time from page load to CEO reading first actionable item |
| Daily active sessions | 1+ per day | The CEO opens this page daily (analytics event) |
| Context switches eliminated | -3 tabs | Before: 4+ tabs. After: 1 tab. Survey CEO after 1 week |
| Action items click-through rate | > 50% | CEO clicks on at least half the surfaced action items |

### Feature 2: Agent Command Center v2
| KPI | Target | Measurement |
|-----|--------|-------------|
| Agent tasks created per week | 5+ | Count of `ExternalAgentSession` records created via dashboard |
| Mean time to plan approval | < 15 min | Time from `AWAITING_PLAN_APPROVAL` to `planApprovedAt` |
| Agent success rate | > 70% | `COMPLETED / (COMPLETED + FAILED)` from `statusCounts` |
| Messages sent to agents per week | 3+ | Count of POST to `/api/admin/agents/[id]/message` |

### Feature 3: Error Feed (Enhanced)
| KPI | Target | Measurement |
|-----|--------|-------------|
| Error detection to resolution time | < 4 hours | Time from `ErrorLog.timestamp` to fix commit |
| Error count trend (24h) | Decreasing week-over-week | `stats.total24h` from error API |
| Zero-error days per month | 10+ | Days where `total24h == 0` |
| False positive rate | < 5% | Errors marked as "not actionable" by CEO |

### Feature 4: Roadmap View
| KPI | Target | Measurement |
|-----|--------|-------------|
| Issues completed per week | 3+ | GitHub issues moved to "Done" column |
| Roadmap accuracy (planned vs done) | > 60% | Items completed on schedule vs total planned |
| Time in "In Progress" | < 3 days average | Duration an issue stays in active column |

### Feature 5: Analytics Hub v2
| KPI | Target | Measurement |
|-----|--------|-------------|
| Weekly user growth rate | > 5% | `(new_users_this_week / total_users) * 100` |
| MCP tool utilization rate | > 40% | `active_tools_used / total_tools_available` |
| Revenue per user (ARPU) | Increasing | `total_revenue / total_users` from Stripe |
| Churn rate (monthly) | < 5% | Users who had activity 30 days ago but not in last 7 days |

---

## 5. User Stories (Top 5 Features)

### Feature 1: Unified Command Home

**US-1.1: Morning Briefing**
- GIVEN the CEO opens `/admin` at the start of the day
- WHEN the page loads
- THEN the CEO sees a personalized greeting, today's date, environment status (all green/one red), top 3 action items requiring attention, and key business numbers (users, MRR, active agents, 24h error count)

**US-1.2: Environment Status**
- GIVEN a Vercel deployment is in progress
- WHEN the CEO views the environment status strip
- THEN the affected environment shows a yellow "Building" indicator with the commit message, and the CEO can click it to open the Vercel deployment log

**US-1.3: Action Items**
- GIVEN an agent is in `AWAITING_PLAN_APPROVAL` status
- WHEN the CEO sees the action items section
- THEN a "Review agent plan" action item appears with the agent name and plan summary, and clicking it navigates to the agent detail view

### Feature 2: Agent Command Center v2

**US-2.1: Real-time Chat**
- GIVEN the CEO selects a running agent from the sessions list
- WHEN the CEO types a message in the chat panel and presses Send
- THEN the message is delivered to the agent via the existing message API, and the response appears in the chat thread within 30 seconds

**US-2.2: Inter-agent Communication**
- GIVEN multiple agents are running concurrently
- WHEN the CEO clicks "Inter-Agent Comms" tab
- THEN a timeline shows messages exchanged between agents, with sender/receiver labels, timestamps, and message content

**US-2.3: Agent Spawn with Template**
- GIVEN the CEO clicks "+ New Task"
- WHEN the create modal opens
- THEN the CEO can select from templates (Bug Fix, Feature, Refactor, Test Coverage) that pre-fill the task description with relevant context from the codebase

### Feature 3: Error Feed (Enhanced)

**US-3.1: Error Trend Alert**
- GIVEN the 24-hour error count exceeds a configured threshold (default: 10)
- WHEN the CEO views the dashboard home
- THEN a red alert badge appears on the "Errors" sidebar item, and the home page shows "Error spike: X errors in last 24h (threshold: Y)"

**US-3.2: Error-to-Source Link**
- GIVEN an error log entry has a `sourceFile` and `sourceLine`
- WHEN the CEO clicks the file path in the error detail view
- THEN it opens the file at the correct line on GitHub (in a new tab)

### Feature 4: Roadmap View

**US-4.1: Kanban Board**
- GIVEN the CEO navigates to `/admin/roadmap`
- WHEN the page loads
- THEN a kanban board appears with columns from the GitHub Projects V2 board (Backlog, In Progress, Review, Done), with issue cards showing title, assignee, and labels

**US-4.2: Drag Reorder**
- GIVEN the CEO drags an issue card from "Backlog" to "In Progress"
- WHEN the CEO drops the card
- THEN the issue's status is updated in GitHub Projects V2 via the GraphQL API, and the board reflects the change immediately

### Feature 5: Analytics Hub v2

**US-5.1: Revenue Dashboard**
- GIVEN the CEO navigates to the analytics hub
- WHEN the "Revenue" tab is selected
- THEN the CEO sees MRR, total revenue (all-time), active subscriptions by tier, and a revenue trend line chart (last 90 days) sourced from Stripe

**US-5.2: MCP Usage Heatmap**
- GIVEN MCP tools have been invoked by users
- WHEN the CEO views the "MCP Usage" tab
- THEN a heatmap shows tool invocation counts by category and day, with the most-used tools highlighted

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Vercel API rate limits** | Medium | Low | Cache deployment status for 60 seconds. Vercel allows 100 req/min on Pro plan. |
| **Sentry API complexity** | Medium | Medium | Start with basic event count endpoint only. Defer advanced grouping to Phase 4. |
| **GitHub Projects V2 API instability** | Low | Medium | GitHub GraphQL API is stable. Use `@octokit/graphql` for type safety. Fallback to basic issues list if Projects V2 unavailable. |
| **Agent real-time chat latency** | Medium | High | Use Server-Sent Events (SSE) instead of polling for agent messages. Fallback to 5-second polling if SSE fails. |
| **Scope creep from 19-page admin** | High | High | Freeze existing pages. Do NOT refactor them. Only modify the 4 pages listed in Phase 1. All other pages remain untouched. |
| **Single developer bottleneck** | High | Critical | Phase deliverables are sized for 1-2 week sprints. Each phase ships independently. No phase depends on completing the previous one (except Phase 1 sidebar restructure). |
| **Breaking existing admin functionality** | Medium | High | All new features are additive (new pages/components). Existing pages are only modified for sidebar restructure. Write tests before modifying any existing file. |
| **API key management for external services** | Low | Medium | Use existing `VaultSecret` model in Prisma for Sentry/Vercel API keys. Never store in `.env` files committed to git. |
| **Data staleness in morning briefing** | Medium | Medium | All data fetched at page load with 30-second polling (existing pattern). Add cache headers for Vercel/Sentry data. |
| **Over-engineering the agent chat** | Medium | Medium | Start with simple request/response. Do NOT build a full WebSocket chat system. Use existing POST endpoint + polling for responses. |

---

## 7. MVP Definition

The MVP is a dashboard the CEO opens every morning instead of opening GitHub + Vercel + Sentry + the current admin panel. It must answer these 5 questions in under 30 seconds:

1. **"Is anything broken?"** -- Environment status strip + error count + failing agents
2. **"What needs my attention?"** -- Action items (plan approvals, high-priority errors, stalled agents)
3. **"How are the agents doing?"** -- Agent status overview + latest activity
4. **"How is the business?"** -- User count, workspace count, credits used
5. **"What should I work on?"** -- Top roadmap items linked from GitHub Projects

### MVP Feature Set (Phase 1 + Phase 2)

| Component | Must Ship | Can Defer |
|-----------|-----------|-----------|
| Personalized home page | YES | |
| Environment status strip (Vercel) | YES | |
| Action items feed | YES | |
| Sidebar restructure | YES | |
| Agent chat panel | YES | |
| Inter-agent comms viewer | | Defer to v1.1 |
| Agent spawn templates | | Defer to v1.1 |
| Agent resource monitor (enhanced) | YES | |
| Sentry integration | | Defer to v1.1 |
| Roadmap kanban board | | Defer to v1.1 |
| Stripe revenue data | | Defer to v1.1 |
| Task scheduler | | Defer to v2.0 |
| Deployment control (promote/rollback) | | Defer to v2.0 |

### MVP Technical Requirements

- 0 new npm dependencies (Vercel/GitHub APIs use `fetch`)
- 4 new API routes
- 3 modified files (home page, sidebar, dashboard API)
- 2 new components (environment strip, action items)
- 1 new component for agent chat
- All behind existing admin auth guard (ADMIN/SUPER_ADMIN role check)

---

## 8. Success Criteria

The dashboard is "done enough" to use daily when:

1. **Replaces morning routine**: CEO no longer opens Vercel dashboard, GitHub issues page, or current admin separately. The new `/admin` home page is the first and only tab opened.

2. **Sub-30-second orientation**: From page load to "I know what to do today" takes less than 30 seconds. Measured by: all critical data visible above the fold without scrolling.

3. **Agent management without leaving**: CEO can approve agent plans, send messages to agents, and see agent activity without opening Jules UI, GitHub PRs, or terminal.

4. **Error awareness without Sentry tab**: Error trends visible on home page. Threshold alerts surface problems before the CEO goes looking for them.

5. **Weekly usage**: CEO opens the dashboard at least 5 out of 7 days per week (tracked via page view analytics already built into the platform).

6. **Reduced context switches**: CEO reports (subjective) that daily admin work dropped from 4+ tabs to 1-2 tabs.

### Quantitative Success Metrics (30-day post-launch)

| Metric | Baseline (current) | Target |
|--------|-------------------|--------|
| Admin page loads per day | Unknown (not tracked) | 3+ |
| Tabs opened for daily admin | 4-5 (Vercel, GitHub, admin, Sentry, Stripe) | 1-2 |
| Time from error occurrence to awareness | Hours (when CEO checks Sentry) | < 15 minutes |
| Agent plan approval latency | Unknown | < 15 minutes during work hours |
| Agent tasks created via dashboard | 0 (uses Jules UI directly) | 5+ per week |

---

## 9. SQL Queries for Ongoing Tracking

### Daily Active Admin Sessions
```sql
SELECT DATE(pv."timestamp") as day, COUNT(DISTINCT pv."visitorSessionId") as sessions
FROM "page_views" pv
JOIN "visitor_sessions" vs ON pv."visitorSessionId" = vs.id
WHERE pv.path LIKE '/admin%'
AND pv."timestamp" > NOW() - INTERVAL '30 days'
GROUP BY DATE(pv."timestamp")
ORDER BY day DESC;
```

### Agent Success Rate (Last 30 Days)
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE status = 'COMPLETED')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as success_rate
FROM "ExternalAgentSession"
WHERE "createdAt" > NOW() - INTERVAL '30 days';
```

### Error Trend (Hourly, Last 24h)
```sql
SELECT
  DATE_TRUNC('hour', "timestamp") as hour,
  COUNT(*) as error_count,
  COUNT(DISTINCT "errorType") as unique_types
FROM "ErrorLog"
WHERE "timestamp" > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', "timestamp")
ORDER BY hour DESC;
```

### MCP Tool Usage Heatmap (Last 7 Days)
```sql
SELECT
  ti."toolName",
  DATE(ti."startedAt") as day,
  COUNT(*) as invocations,
  ROUND(AVG(ti."durationMs")::numeric, 0) as avg_duration_ms
FROM "ToolInvocation" ti
WHERE ti."startedAt" > NOW() - INTERVAL '7 days'
GROUP BY ti."toolName", DATE(ti."startedAt")
ORDER BY invocations DESC;
```

### Agent Plan Approval Latency
```sql
SELECT
  id,
  name,
  "createdAt",
  "planApprovedAt",
  EXTRACT(EPOCH FROM ("planApprovedAt" - "createdAt")) / 60 as approval_minutes
FROM "ExternalAgentSession"
WHERE "planApprovedAt" IS NOT NULL
AND "createdAt" > NOW() - INTERVAL '30 days'
ORDER BY approval_minutes DESC;
```

---

## 10. Implementation Notes

### Existing Patterns to Follow

1. **Polling pattern**: Use the same `POLLING_INTERVAL = 30000` with visibility-aware pausing already used in `AdminDashboardClient.tsx` and `AgentsDashboardClient.tsx`.

2. **Component structure**: Server component for auth + data fetching, client component for interactivity. Already established in `/admin/page.tsx` + `AdminDashboardClient.tsx`.

3. **API route pattern**: All admin routes use `GET /api/admin/{feature}` and check for admin role. Follow existing patterns in `/api/admin/dashboard/route.ts`.

4. **Error handling**: Every fetch wrapped in try/catch with error state + retry button. Already standardized.

5. **No `any` types**: Per CLAUDE.md rules, all new code must use proper TypeScript types or `unknown`.

### External API Keys Needed

| Service | Environment Variable | Purpose |
|---------|---------------------|---------|
| Vercel | `VERCEL_API_TOKEN` | Deployment status |
| Sentry | `SENTRY_API_TOKEN` | Error trends (Phase 3) |
| GitHub PAT | `GH_PAT_TOKEN` | Already exists, needed for Projects V2 GraphQL |

### File Count Estimate

| Phase | New Files | Modified Files | New API Routes |
|-------|-----------|---------------|----------------|
| Phase 1 | 3 components | 4 files | 2 routes |
| Phase 2 | 2 components | 3 files | 2 routes |
| Phase 3 | 2 components | 1 file | 4 routes |
| Phase 4 | 3 components | 2 files | 3 routes |
| **Total** | **10 components** | **10 files** | **11 routes** |
