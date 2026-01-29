# Implementation Plan: Analytics Dashboard with AI Insights

**Issue**: #947
**Epic**: #836 (Phase 6)
**Type**: Feature
**Complexity**: Medium
**Estimated Effort**: 1-2 weeks

---

## Summary

Implement a comprehensive analytics dashboard for Orbit workspaces that provides visual insights into social media performance with AI-powered recommendations. This dashboard will aggregate metrics from connected social accounts, display trends, highlight top-performing content, and generate actionable AI insights.

This is Phase 6 of the Orbit pivot epic (#836).

---

## Acceptance Criteria

From issue #947:

- [x] AIInsight database model created
- [ ] Analytics components built
- [ ] Analytics page created
- [ ] Analytics API implemented
- [ ] AI insight generation implemented
- [ ] Added to navigation
- [ ] All tests passing

---

## Database Schema Changes

### 1. Add AIInsight Model

**File**: `prisma/schema.prisma`

Add the following model after the `Workspace` model section:

```prisma
model AIInsight {
  id              String      @id @default(cuid())
  workspaceId     String
  type            InsightType // OPPORTUNITY, WARNING, ACHIEVEMENT, TREND
  title           String
  description     String      @db.Text
  recommendation  String?     @db.Text
  metrics         Json        // Supporting data/metrics
  confidence      Float       // 0.0 to 1.0
  isRead          Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  workspace       Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([workspaceId, isRead])
  @@index([createdAt])
  @@index([type])
  @@map("ai_insights")
}

enum InsightType {
  OPPORTUNITY
  WARNING
  ACHIEVEMENT
  TREND
}
```

**Add relation to Workspace model**:

```prisma
model Workspace {
  // ... existing fields ...

  aiInsights AIInsight[]  // Add this line

  // ... rest of fields ...
}
```

**Migration**:

```bash
yarn db:generate
yarn db:migrate
```

---

## File Structure

### Components to Create

```
src/components/orbit/analytics/
├── EngagementOverview.tsx        # Overview metrics cards
├── GrowthChart.tsx                # Follower/engagement growth line chart
├── TopPostsTable.tsx              # Best performing posts table
├── AIInsightsPanel.tsx            # AI-generated insights
├── PlatformBreakdown.tsx          # Metrics by platform (pie/bar chart)
└── AnalyticsFilters.tsx           # Date range and platform filters
```

### Pages to Create

```
src/app/orbit/[workspaceSlug]/analytics/
├── page.tsx                       # Main analytics dashboard
├── loading.tsx                    # Loading skeleton
└── page.test.tsx                  # E2E tests
```

### API Routes to Create

```
src/app/api/orbit/[workspaceSlug]/analytics/
├── overview/route.ts              # GET engagement summary metrics
├── growth/route.ts                # GET growth trends over time
├── top-posts/route.ts             # GET best performing posts
├── insights/route.ts              # GET/POST AI insights
├── platforms/route.ts             # GET platform-specific breakdown
└── insights/[insightId]/route.ts  # PATCH to mark as read, DELETE
```

### Lib/Service Files to Create

```
src/lib/analytics/
├── insight-generator.ts           # AI insight generation logic
├── metrics-aggregator.ts          # Aggregate social metrics
└── types.ts                       # TypeScript types
```

---

## Implementation Steps

### Step 1: Database Migration

**Files to Modify**:

- `prisma/schema.prisma`

**Actions**:

1. Add `AIInsight` model with all fields
2. Add `InsightType` enum
3. Add `aiInsights` relation to `Workspace` model
4. Run `yarn db:generate && yarn db:migrate`
5. Verify migration succeeds

**Testing**:

- Migration completes without errors
- Can query `prisma.aIInsight` in API routes

---

### Step 2: Create Analytics API Routes

**Pattern**: Follow existing API route pattern from `/api/orbit/[workspaceSlug]/pulse/route.ts`

#### 2.1 Overview Endpoint

**File**: `src/app/api/orbit/[workspaceSlug]/analytics/overview/route.ts`

**Purpose**: Return summary metrics for the dashboard

**Response**:

```typescript
{
  totalFollowers: number;
  followerGrowth: number; // Percentage change
  totalEngagement: number;
  engagementRate: number;
  totalImpressions: number;
  totalReach: number;
  period: {
    start: string;
    end: string;
  }
}
```

**Logic**:

1. Fetch workspace and verify access
2. Get date range from query params (default: last 30 days)
3. Aggregate `SocialMetrics` for all workspace accounts
4. Calculate growth by comparing to previous period
5. Return summary object

**Tests**: Create `route.test.ts` with 100% coverage

---

#### 2.2 Growth Endpoint

**File**: `src/app/api/orbit/[workspaceSlug]/analytics/growth/route.ts`

**Purpose**: Return time-series data for charts

**Response**:

```typescript
{
  data: Array<{
    date: string;
    followers: number;
    engagement: number;
    impressions: number;
    reach: number;
  }>;
  period: {
    start: string;
    end: string;
  }
}
```

**Logic**:

1. Similar auth/workspace check as overview
2. Get date range (default: last 30 days)
3. Query `SocialMetrics` grouped by date
4. Aggregate across all accounts by date
5. Return time-series array sorted by date

**Tests**: Route test with mocked metrics data

---

#### 2.3 Top Posts Endpoint

**File**: `src/app/api/orbit/[workspaceSlug]/analytics/top-posts/route.ts`

**Purpose**: Return best performing posts

**Response**:

```typescript
{
  posts: Array<{
    id: string;
    content: string;
    platform: string;
    publishedAt: string;
    metrics: {
      likes: number;
      comments: number;
      shares: number;
      impressions: number;
      engagementRate: number;
    };
  }>;
}
```

**Logic**:

1. Auth/workspace verification
2. Query `SocialPost` with `status: PUBLISHED`
3. Filter by workspace and date range
4. Calculate engagement rate: (likes + comments + shares) / impressions
5. Sort by engagement rate DESC
6. Return top 10 posts

**Note**: May need to add metrics to `SocialPost` model or join with platform-specific metrics

**Tests**: Route test for sorting and filtering

---

#### 2.4 Platform Breakdown Endpoint

**File**: `src/app/api/orbit/[workspaceSlug]/analytics/platforms/route.ts`

**Purpose**: Return metrics grouped by platform

**Response**:

```typescript
{
  platforms: Array<{
    platform: string; // "TWITTER", "LINKEDIN", etc.
    followers: number;
    engagement: number;
    posts: number;
    avgEngagementRate: number;
  }>;
}
```

**Logic**:

1. Auth/workspace verification
2. Query `SocialAccount` by workspace
3. For each account, aggregate metrics
4. Group by platform
5. Calculate averages per platform

**Tests**: Route test with multiple platforms

---

#### 2.5 Insights Endpoint

**File**: `src/app/api/orbit/[workspaceSlug]/analytics/insights/route.ts`

**Purpose**: Get and generate AI insights

**GET Response**:

```typescript
{
  insights: Array<{
    id: string;
    type: "OPPORTUNITY" | "WARNING" | "ACHIEVEMENT" | "TREND";
    title: string;
    description: string;
    recommendation: string | null;
    confidence: number;
    isRead: boolean;
    createdAt: string;
  }>;
}
```

**POST Request**: Trigger insight generation

```typescript
{
  force?: boolean;  // Force regeneration even if recent insights exist
}
```

**Logic**:

- **GET**: Query `AIInsight` for workspace, order by createdAt DESC
- **POST**: Call `insight-generator.ts` service, save new insights

**Tests**:

- GET returns insights
- POST generates and saves insights

---

#### 2.6 Individual Insight Endpoint

**File**: `src/app/api/orbit/[workspaceSlug]/analytics/insights/[insightId]/route.ts`

**PATCH**: Mark insight as read

```typescript
{
  isRead: true;
}
```

**DELETE**: Remove insight

**Logic**:

1. Verify insight belongs to workspace
2. Update or delete accordingly

**Tests**: PATCH and DELETE operations

---

### Step 3: Implement AI Insight Generation

**File**: `src/lib/analytics/insight-generator.ts`

**Purpose**: Analyze metrics and generate actionable insights using AI

**Function Signature**:

```typescript
export async function generateInsights(workspaceId: string): Promise<AIInsight[]>;
```

**Logic**:

1. Fetch last 30 days of `SocialMetrics` for workspace
2. Calculate key statistics:
   - Growth trends (followers, engagement)
   - Best/worst performing days
   - Engagement rate changes
   - Platform performance comparison
3. Identify patterns:
   - **ACHIEVEMENT**: Significant growth or viral post
   - **OPPORTUNITY**: Untapped potential (low posting on high-engagement platform)
   - **WARNING**: Declining metrics or low engagement
   - **TREND**: Consistent patterns (best posting times, content types)
4. For each pattern, generate:
   - `title`: Short summary (e.g., "Twitter engagement up 45%")
   - `description`: Detailed explanation
   - `recommendation`: Actionable next step
   - `confidence`: 0.0-1.0 based on data strength
   - `metrics`: Supporting data as JSON
5. Save insights to database
6. Return generated insights

**AI Enhancement** (Optional):

- Use Anthropic Claude API to enhance descriptions/recommendations
- Feed it the metrics data and patterns
- Generate more natural language insights

**Tests**:

- Unit tests for pattern detection
- Unit tests for insight generation
- Mock data scenarios (growth, decline, stable)

---

### Step 4: Create Analytics Components

#### 4.1 EngagementOverview Component

**File**: `src/components/orbit/analytics/EngagementOverview.tsx`

**Purpose**: Display key metrics in card layout

**Props**:

```typescript
interface EngagementOverviewProps {
  data: {
    totalFollowers: number;
    followerGrowth: number;
    totalEngagement: number;
    engagementRate: number;
    totalImpressions: number;
    totalReach: number;
  };
}
```

**UI**:

- Grid of 4-6 cards (using shadcn Card component)
- Each card shows:
  - Metric name
  - Large number value
  - Growth indicator (up/down arrow with percentage)
  - Small trend sparkline (optional)

**Tests**: Component renders with mock data

---

#### 4.2 GrowthChart Component

**File**: `src/components/orbit/analytics/GrowthChart.tsx`

**Purpose**: Display time-series line chart

**Props**:

```typescript
interface GrowthChartProps {
  data: Array<{
    date: string;
    followers: number;
    engagement: number;
    impressions: number;
    reach: number;
  }>;
}
```

**Implementation**:

- Use Recharts library (already in dependencies)
- Line chart with multiple series
- Toggle to show/hide different metrics
- Responsive sizing
- Tooltip on hover

**Tests**: Chart renders with data points

---

#### 4.3 TopPostsTable Component

**File**: `src/components/orbit/analytics/TopPostsTable.tsx`

**Purpose**: Display top performing posts in table

**Props**:

```typescript
interface TopPostsTableProps {
  posts: Array<{
    id: string;
    content: string;
    platform: string;
    publishedAt: string;
    metrics: {
      likes: number;
      comments: number;
      shares: number;
      impressions: number;
      engagementRate: number;
    };
  }>;
}
```

**UI**:

- shadcn Table component
- Columns: Post preview, Platform, Published, Engagement Rate, Actions
- Sortable columns
- Link to view full post

**Tests**: Table displays posts correctly

---

#### 4.4 AIInsightsPanel Component

**File**: `src/components/orbit/analytics/AIInsightsPanel.tsx`

**Purpose**: Display AI-generated insights

**Props**:

```typescript
interface AIInsightsPanelProps {
  insights: Array<{
    id: string;
    type: InsightType;
    title: string;
    description: string;
    recommendation: string | null;
    confidence: number;
    isRead: boolean;
    createdAt: string;
  }>;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}
```

**UI**:

- List of insight cards
- Color-coded by type:
  - OPPORTUNITY: blue
  - WARNING: yellow/orange
  - ACHIEVEMENT: green
  - TREND: purple
- Each card shows:
  - Icon based on type
  - Title
  - Description
  - Recommendation (if present)
  - Confidence bar
  - Mark as read / Dismiss buttons
- Unread insights highlighted

**Tests**: Insights render with correct styling

---

#### 4.5 PlatformBreakdown Component

**File**: `src/components/orbit/analytics/PlatformBreakdown.tsx`

**Purpose**: Show metrics by platform

**Props**:

```typescript
interface PlatformBreakdownProps {
  platforms: Array<{
    platform: string;
    followers: number;
    engagement: number;
    posts: number;
    avgEngagementRate: number;
  }>;
}
```

**UI**:

- Horizontal bar chart or pie chart (Recharts)
- Shows followers or engagement by platform
- Toggle between metrics
- Platform icons/colors

**Tests**: Chart renders all platforms

---

#### 4.6 AnalyticsFilters Component

**File**: `src/components/orbit/analytics/AnalyticsFilters.tsx`

**Purpose**: Filter dashboard by date and platform

**Props**:

```typescript
interface AnalyticsFiltersProps {
  dateRange: { start: Date; end: Date; };
  selectedPlatforms: string[];
  onDateRangeChange: (range: { start: Date; end: Date; }) => void;
  onPlatformsChange: (platforms: string[]) => void;
}
```

**UI**:

- Date range picker (last 7/30/90 days, custom)
- Platform multi-select checkboxes
- Apply/Reset buttons

**Tests**: Filter changes trigger callbacks

---

### Step 5: Create Analytics Page

**File**: `src/app/orbit/[workspaceSlug]/analytics/page.tsx`

**Purpose**: Main analytics dashboard layout

**Implementation**:

```typescript
import { auth } from "@/auth";
import { AIInsightsPanel } from "@/components/orbit/analytics/AIInsightsPanel";
import { AnalyticsFilters } from "@/components/orbit/analytics/AnalyticsFilters";
import { EngagementOverview } from "@/components/orbit/analytics/EngagementOverview";
import { GrowthChart } from "@/components/orbit/analytics/GrowthChart";
import { PlatformBreakdown } from "@/components/orbit/analytics/PlatformBreakdown";
import { TopPostsTable } from "@/components/orbit/analytics/TopPostsTable";

export default async function AnalyticsPage({ params }) {
  const session = await auth();
  // Verify access, fetch workspace

  // Fetch data from API endpoints (server-side)
  const [overview, growth, topPosts, insights, platforms] = await Promise.all([
    fetch(`/api/orbit/${workspaceSlug}/analytics/overview`),
    fetch(`/api/orbit/${workspaceSlug}/analytics/growth`),
    fetch(`/api/orbit/${workspaceSlug}/analytics/top-posts`),
    fetch(`/api/orbit/${workspaceSlug}/analytics/insights`),
    fetch(`/api/orbit/${workspaceSlug}/analytics/platforms`),
  ]);

  return (
    <div className="container py-8">
      <h1>Analytics</h1>
      <AnalyticsFilters {...filterProps} />
      <EngagementOverview data={overview} />
      <div className="grid grid-cols-2 gap-6">
        <GrowthChart data={growth} />
        <PlatformBreakdown platforms={platforms} />
      </div>
      <AIInsightsPanel insights={insights} {...handlers} />
      <TopPostsTable posts={topPosts} />
    </div>
  );
}
```

**Layout**:

1. Page header with title and filters
2. Overview metrics cards (full width)
3. Two-column grid:
   - Left: Growth chart
   - Right: Platform breakdown
4. AI Insights panel (full width)
5. Top posts table (full width)

**Loading State**:

**File**: `src/app/orbit/[workspaceSlug]/analytics/loading.tsx`

```typescript
export default function Loading() {
  return (
    <div className="container py-8">
      <Skeleton className="h-12 w-64 mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
```

**Tests**:

- Page renders all components
- Data fetching works
- Error states handled

---

### Step 6: Add to Navigation

**File**: `src/app/orbit/[workspaceSlug]/OrbitSidebar.tsx`

**Modification**:

Add to `getNavItems` function (after "Allocator", before "Content Library"):

```typescript
{
  href: `/orbit/${workspaceSlug}/analytics`,
  label: "Analytics",
  icon: "📊"
}
```

**Tests**: Navigation includes Analytics link

---

### Step 7: Update Types

**File**: `src/lib/analytics/types.ts`

Define shared TypeScript types:

```typescript
export type InsightType = "OPPORTUNITY" | "WARNING" | "ACHIEVEMENT" | "TREND";

export interface AIInsight {
  id: string;
  workspaceId: string;
  type: InsightType;
  title: string;
  description: string;
  recommendation: string | null;
  metrics: Record<string, unknown>;
  confidence: number;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsOverview {
  totalFollowers: number;
  followerGrowth: number;
  totalEngagement: number;
  engagementRate: number;
  totalImpressions: number;
  totalReach: number;
  period: { start: string; end: string; };
}

export interface GrowthDataPoint {
  date: string;
  followers: number;
  engagement: number;
  impressions: number;
  reach: number;
}

export interface TopPost {
  id: string;
  content: string;
  platform: string;
  publishedAt: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    engagementRate: number;
  };
}

export interface PlatformMetrics {
  platform: string;
  followers: number;
  engagement: number;
  posts: number;
  avgEngagementRate: number;
}
```

---

## Testing Strategy

### Unit Tests (100% Coverage Required)

**Services**:

- `src/lib/analytics/insight-generator.test.ts`
  - Test pattern detection logic
  - Test confidence calculation
  - Test insight generation for each type
  - Mock database calls

- `src/lib/analytics/metrics-aggregator.test.ts`
  - Test aggregation logic
  - Test date range filtering
  - Test platform grouping

**API Routes**:
Each route file needs `.test.ts`:

- Test authentication/authorization
- Test workspace access verification
- Test data fetching and aggregation
- Test error handling
- Test query parameter validation

**Components**:
Each component needs tests:

- Renders with valid data
- Handles empty state
- Handles loading state
- User interactions (filters, sorting, marking read)

### E2E Tests

**File**: `e2e/features/analytics-dashboard.feature`

```gherkin
Feature: Analytics Dashboard

  Scenario: User views analytics dashboard
    Given I am logged into a workspace
    When I navigate to the Analytics page
    Then I should see engagement overview metrics
    And I should see a growth chart
    And I should see AI insights
    And I should see top posts

  Scenario: User filters analytics by date range
    Given I am on the Analytics page
    When I select "Last 7 days" from date filter
    Then the charts should update with 7-day data

  Scenario: User marks insight as read
    Given I am on the Analytics page
    And there are unread insights
    When I click "Mark as read" on an insight
    Then the insight should be marked as read
    And the unread badge should update
```

**File**: `e2e/step-definitions/analytics.steps.ts`

Implement steps using Playwright.

### Visual Regression Tests (Optional)

Use Playwright screenshots to verify:

- Chart rendering
- Card layouts
- Insight styling by type

---

## Dependencies

**Existing**:

- Recharts (for charts)
- shadcn/ui components (Card, Table, Button, etc.)
- Prisma (database)
- Next.js 15 (App Router)

**New** (if needed):

- None - all dependencies already in place

---

## Potential Risks & Mitigations

### Risk 1: Insufficient Metrics Data

**Issue**: If workspace has no or limited social metrics, dashboard is empty

**Mitigation**:

- Show empty state with call-to-action to connect accounts
- Display sample data explanation
- Show insights even with limited data

### Risk 2: AI Insight Quality

**Issue**: Generated insights may not be relevant or actionable

**Mitigation**:

- Set minimum confidence threshold (e.g., 0.6)
- Allow users to dismiss/hide insights
- Iterate on pattern detection logic based on feedback
- Consider adding user feedback mechanism

### Risk 3: Performance with Large Datasets

**Issue**: Workspaces with many accounts/posts may slow down queries

**Mitigation**:

- Add database indexes (already specified in schema)
- Implement pagination for top posts
- Cache aggregated metrics
- Consider background job for insight generation

### Risk 4: Date Range Calculation Complexity

**Issue**: Comparing periods, handling timezones

**Mitigation**:

- Use UTC consistently
- Store dates as ISO strings in responses
- Test edge cases (month boundaries, leap years)
- Use date-fns library for calculations

---

## Success Criteria

**Functional**:

- [ ] Analytics page loads in < 500ms with sample data
- [ ] All charts render correctly on desktop and mobile
- [ ] AI insights are generated and display correctly
- [ ] Filters work and update all components
- [ ] Navigation link added and working

**Quality**:

- [ ] 100% unit test coverage
- [ ] All E2E scenarios pass
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] Lighthouse accessibility score > 90

**User Experience**:

- [ ] Empty state shown when no data
- [ ] Loading skeletons prevent layout shift
- [ ] Error states handled gracefully
- [ ] Mobile-responsive layout
- [ ] Insights are actionable and clear

---

## Out of Scope

**Not included in this phase**:

- Export to CSV/PDF
- Custom date range picker (use preset ranges only)
- Comparing multiple workspaces
- Real-time updates (WebSocket)
- Advanced filtering (by content type, hashtags, etc.)
- Benchmarking against competitors
- Predictive analytics (forecasting)
- Integration with Google Analytics

These features can be added in future iterations.

---

## Migration Notes

### For Existing Workspaces

1. Run database migration to add `AIInsight` model
2. Existing social metrics data will be used immediately
3. First visit to analytics page triggers initial insight generation
4. No data migration required

### Backward Compatibility

- Fully backward compatible
- No breaking changes to existing features
- New page and API routes only
- No changes to existing models (only additions)

---

## Deployment Checklist

**Pre-deployment**:

- [ ] Run `yarn test:coverage` - verify 100%
- [ ] Run `yarn test:e2e:local` - all scenarios pass
- [ ] Run `yarn build` - no build errors
- [ ] Database migration tested on staging
- [ ] Environment variables (if any) documented

**Deployment**:

- [ ] Create feature branch: `feature/947-analytics-dashboard`
- [ ] Commit code changes
- [ ] Push and create PR
- [ ] Wait for CI checks to pass
- [ ] Deploy to Vercel preview
- [ ] Manual smoke test on preview URL
- [ ] Get approval and merge to main

**Post-deployment**:

- [ ] Verify analytics page loads in production
- [ ] Monitor error logs for issues
- [ ] Check database for insight generation
- [ ] Verify navigation link works
- [ ] User acceptance testing

---

## Timeline Estimate

**Complexity**: Medium

| Task                       | Estimated Time |
| -------------------------- | -------------- |
| Database migration         | 1 hour         |
| API routes implementation  | 1 day          |
| Insight generator logic    | 1 day          |
| Component development      | 2 days         |
| Analytics page layout      | 1 day          |
| Unit tests (100% coverage) | 1 day          |
| E2E tests                  | 0.5 day        |
| Integration and polish     | 0.5 day        |
| Documentation              | 0.5 day        |
| **Total**                  | **~7-8 days**  |

---

## Related Documentation

- [Epic Plan: #836](./836.md) - Overall pivot plan
- [Database Schema](./DATABASE_SCHEMA.md) - Schema reference
- [API Reference](./API_REFERENCE.md) - API conventions

---

## Questions for Clarification

None at this time. All requirements clear from epic plan.

---

## Notes

- Analytics dashboard leverages existing `SocialMetrics` data
- Follows established patterns from Pulse dashboard (`/api/orbit/[workspaceSlug]/pulse/route.ts`)
- Uses Recharts for visualization (already in dependencies)
- AI insight generation can start simple and be enhanced iteratively
- Consider adding cron job for periodic insight generation (future enhancement)

---

**Document Version**: 1.0
**Created**: 2026-01-29
**Author**: Planning Agent (Ralph Wiggum)
**Status**: Ready for Implementation
