# Skipped Tests Documentation

**Last Updated:** 2026-02-10
**Tracking Issue:** #798

## Overview

This document tracks all skipped tests in the codebase, categorizes them, and outlines the process for managing skipped tests.

## Policy

### When to Skip Tests

Tests may be skipped for the following reasons:

1. **Intentional/Documented** - Complex mocking scenarios that require significant infrastructure work
2. **Environment-specific** - Tests that cannot run in the test environment due to technical limitations
3. **Temporarily Disabled** - Tests disabled during refactoring or bug investigation (should be fixed ASAP)

### Required Documentation

Every skipped test MUST include a comment above the `.skip()` call:

```typescript
// SKIP REASON: <brief explanation>
// TRACKING: #<issue-number>
it.skip("test description", async () => {
  // test code
});
```

### Pre-commit Hook

A pre-commit hook verifies that all skipped tests are properly documented. Commits will be rejected if undocumented skips are found.

## Status Summary

| Metric | Count |
|--------|-------|
| **Total E2E feature files** | 57 |
| **Total E2E scenarios** | 851 |
| **Clean feature files (0 skips)** | 26 |
| **Feature files with skips** | 31 |
| **Unit test skips** | 1 (integration test - intentional) |

## Current Inventory

### Unit Tests: 1 skip (intentional)

| File | Test | Reason | Status |
|------|------|--------|--------|
| `src/app/api/orbit/[workspaceSlug]/scout/competitors/[id]/metrics/route.integration.test.ts` | "Competitor Metrics API" (entire suite) | Integration test requiring real database | Keep |

**Previously skipped, now fixed:**
- Category C (AI SDK tests, 5 tests) - Fixed
- Category D (Routing & Caching, 9 tests) - Fixed
- Category E (TTL/Timing, 1 test) - Fixed
- Category F (StreamingApp + AutoSaveHistory, 2 tests) - Fixed

### E2E Tests: Remaining Skipped Scenarios

#### Server-Side Prisma/DB Dependencies

These scenarios navigate to pages that call Prisma directly in server components. `page.route()` cannot intercept server-side database queries. Fixing requires either DB seeding infrastructure or converting pages to client-side data fetching.

| Feature File | Skipped | Running | Reason |
|-------------|---------|---------|--------|
| ~~`image-enhancement.feature`~~ | — | — | **Removed**: migrated to MCP unit tests (`enhancement-jobs.test.ts`) |
| `pixel-image-detail.feature` | 17 | 2 | Server component Prisma queries |
| `job-cancellation.feature` | 6 | 2 | Server component Prisma queries |
| `orbit-social-integration.feature` | 3 | 9 | Settings pages use server-side Prisma |
| `brand-brain-rewriter.feature` | 3 | 14 | Brand Brain dashboard is server-rendered with Prisma |
| `orbit-onboarding.feature` | 1 | 2 | Requires workspace seeding utilities |

#### Missing Feature / UI Mismatch

These scenarios reference UI elements that don't exist yet or have been removed.

| Feature File | Skipped | Running | Reason |
|-------------|---------|---------|--------|
| ~~`batch-enhancement.feature`~~ | — | — | **Removed**: migrated to MCP unit tests (`batch-enhance.test.ts`) |
| `batch-operations.feature` | 23 | 0 | Upload/selection lives in different pages than tested |
| `orbit-social-integration.feature` | 4 | 9 | 2 post creation + 1 OAuth flow + 1 org selection (missing infrastructure) |
| `pricing-verification.feature` | 1 | 9 | "Coming Soon" text removed from pricing page |
| `smoke-tests.feature` | 1 | 32 | `/referrals` page has been removed |

#### Flaky / Timeout Issues

These scenarios fail with timeouts, element-not-found errors, or race conditions.

| Feature File | Skipped | Running | Reason |
|-------------|---------|---------|--------|
| `admin-sitemap.feature` | 21 | 6 | Dynamic content/iframe loading timeouts |
| ~~`album-management.feature`~~ | — | — | **Removed**: migrated to MCP unit tests (`album-management.test.ts`) |
| `boxes-management.feature` | 17 | 3 | Element not found / timeouts |
| `orbit-calendar.feature` | 22 | 10 | Complex scheduling workflows, cron jobs |
| `pixel-pipelines.feature` | 17 | 8 | Step definitions need fixes |
| `admin-jobs.feature` | 5 | 30 | Timeout on click or visibility check |
| `admin-emails.feature` | 4 | 20 | waitForURL timeout |
| `admin-photos.feature` | 2 | 10 | Enhancement count / loading text visibility |
| `admin-agents.feature` | 2 | 20 | Timeout issues |
| `authentication.feature` | 2 | 18 | Loading state timing |
| `navigation.feature` | 2 | 14 | waitForURL timeout |
| `share-page.feature` | 2 | 6 | Assertion equality failures |
| `admin-gallery.feature` | 1 | 19 | waitForURL timeout |
| `merch/checkout.feature` | 1 | 9 | Promise timeout (30s) |

#### Feature-Level Skips (All Scenarios Skipped)

Entire features skipped due to infrastructure issues or removed features.

| Feature File | Scenarios | Reason |
|-------------|-----------|--------|
| `referral-system.feature` | 19 | Feature-level skip (referrals feature changes) |
| `tokens.feature` | 15 | Feature-level skip |
| `agent-polling-e2e.feature` | 13 | All scenarios failing with timeout |
| ~~`album-drag-drop.feature`~~ | — | **Removed**: migrated to MCP unit tests (`album-images.test.ts`) |
| `allocator-autopilot.feature` | 7 | All failing - needs investigation |
| `album-photo-addition.feature` | 6 | All failing - needs investigation |
| `allocator-audit.feature` | 2 | All failing - needs investigation |

## Clean Feature Files (26 files, all scenarios running)

These feature files have zero skipped scenarios:

- `admin-dashboard.feature` (19), `canvas-display.feature` (15), `canvas-editor.feature` (23)
- `competitor-tracking.feature` (1), `connections.feature` (2), `error-boundary.feature` (11)
- `landing-page.feature` (22), `learnit.feature` (2), `legal-pages.feature` (13)
- `loading-states.feature` (4), `my-apps-production.feature` (8), `orbit-allocator-dashboard.feature` (31)
- `orbit-allocator.feature` (17), `pixel-mcp-tools.feature` (29), `protected-routes.feature` (12)
- `public-pages.feature` (17), `smart-gallery.feature` (35), `smart-routing.feature` (4)
- `smoke-tests-unauth.feature` (2), `storybook-layout.feature` (9)
- `tabletop-basic.feature` (6), `tabletop-mobile.feature` (4), `tabletop-simulator.feature` (3)
- `merch/order-history.feature` (9), `merch/product-browsing.feature` (5), `merch/shopping-cart.feature` (9)

## Historical Changes

### Fixed in Sprint 2026-02-10 (Team: fix-everything)

**Unit tests fixed (16 tests un-skipped):**
- Category C: AI SDK tests (5 tests) - Complex mocking resolved
- Category D: Routing & Caching (9 tests) - DOM setup and import map fixes
- Category E: TTL/Timing (1 test) - Fake timer fix
- Category F: StreamingApp + AutoSaveHistory (2 tests) - Mock improvements

**E2E features fully cleaned (previously had @skip, now 0 skips):**
- `admin-dashboard.feature` - 19 scenarios fixed
- `canvas-display.feature` - 15 scenarios fixed
- `canvas-editor.feature` - 23 scenarios fixed
- `competitor-tracking.feature` - Selectors/steps fixed
- `connections.feature` - Auth bypass + workspace mocking
- `error-boundary.feature` - 11 scenarios fixed
- `landing-page.feature` - 22 scenarios rewritten for new UI
- `learnit.feature` - Step definitions added
- `my-apps-production.feature` - 8 scenarios fixed
- `orbit-allocator-dashboard.feature` - 31 scenarios fixed
- `orbit-allocator.feature` - 17 scenarios fixed
- `pixel-mcp-tools.feature` - 29 scenarios fixed
- `protected-routes.feature` - 12 scenarios fixed
- `smart-gallery.feature` - 35 scenarios fixed
- `smart-routing.feature` - Step definitions added
- `storybook-layout.feature` - Selectors updated

**E2E features partially cleaned (some @skip removed):**
- `orbit-social-integration.feature` - 7 scenarios un-skipped (streams-based), 7 remain (settings/OAuth/create)
- `smoke-tests.feature` - Multiple scenarios fixed, 1 remains (removed page)
- `authentication.feature` - Multiple fixed, 2 remain (timing)
- `navigation.feature` - Multiple fixed, 2 remain (timeout)
- `brand-brain-rewriter.feature` - 14 running, 3 remain (server-rendered)
- `pricing-verification.feature` - 9 running, 1 remains (UI change)
- `share-page.feature` - 6 running, 2 remain (assertion)
- `image-enhancement.feature` - 4 running, 19 remain (server Prisma)
- `job-cancellation.feature` - 2 running, 6 remain (server Prisma)
- `boxes-management.feature` - 3 running, 17 remain (timeouts)
- `orbit-calendar.feature` - 10 running, 22 remain (complex workflows)
- `admin-jobs.feature` - 30 running, 5 remain (timeouts)

### Fixed in Issue #798 (2026-01-29)

- **Scout API Tests** (10 tests) - `facebook.test.ts` and `instagram.test.ts` - NODE_ENV timing tests removed

## Process for Skipping Tests

1. **Add proper documentation** above the `.skip()` call:
   ```typescript
   // SKIP REASON: <brief explanation>
   // TRACKING: #<issue-number>
   it.skip("test name", async () => { ... });
   ```
2. **Create tracking issue** if one doesn't exist
3. **Update this document** with the new skip
4. **Ensure pre-commit hook passes** (validates documentation)

## Verification Commands

```bash
# Find all skipped unit tests
grep -r "\.skip" --include="*.test.ts" --include="*.test.tsx" \
  --include="*.spec.ts" --include="*.spec.tsx" packages/ src/ | \
  grep -E "(\.skip\(|describe\.skip|it\.skip|test\.skip)" | grep -v node_modules

# Count E2E feature files with @skip
grep -rl '@skip' --include='*.feature' e2e/features/ | wc -l

# List clean feature files (no @skip)
for f in e2e/features/*.feature; do [ $(grep -c '@skip' "$f") -eq 0 ] && echo "$f"; done

# Run full test suite
yarn test:coverage
```

## Target Metrics

- **Goal:** Reduce skipped E2E scenarios to <50 (server-side Prisma + removed features only)
- **Current:** ~285 skipped E2E scenarios across 31 feature files, 1 unit test skip
- **Next priorities:**
  1. Fix flaky/timeout issues (admin-sitemap, album-management, boxes-management) - ~79 scenarios
  2. Fix feature-level skips (referral-system, tokens, agent-polling) - ~72 scenarios
  3. Add DB seeding for server-side Prisma pages - ~49 scenarios

## Related Documentation

- [Testing Requirements](../CLAUDE.md#-testing-requirements)
- [CI/CD Verification](../CLAUDE.md#-cicd-verification-critical)
- Issue #798: Skipped Tests Investigation
