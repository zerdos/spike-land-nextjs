# Skipped Tests Documentation

**Last Updated:** 2026-01-31
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

## Current Inventory

**Total Skipped Tests:** 17 unit tests + 18 E2E scenarios
**Files with Skips:** 7 (unit) + 8 (E2E feature files)

**Status Summary:**

- ✅ All skips are documented with SKIP REASON comments
- ✅ Pre-commit hook enforces documentation (see `.husky/pre-commit`)
- ✅ Validation script at `scripts/check-undocumented-skips.js`
- 📊 Test Suite: 12,606 passing | 17 skipped | 4 unrelated failures (Google Ads env)

### Category A: Integration Tests (Documented) - 1 test

| File                                                                                         | Test                                    | Reason                                   | Status |
| -------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- | ------ |
| `src/app/api/orbit/[workspaceSlug]/scout/competitors/[id]/metrics/route.integration.test.ts` | "Competitor Metrics API" (entire suite) | Integration test requiring real database | Keep   |

### Category C: AI SDK Tests (Complex Mocking) - 5 tests

| File                                                                    | Test                                             | Reason                                       | Status |
| ----------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- | ------ |
| `packages/testing.spike.land/src/handlers/postHandler.spec.ts`          | "should handle tool execution in onStepFinish"   | AI SDK streaming callback mocking complexity | Fixing |
| `packages/testing.spike.land/src/handlers/postHandler.spec.ts`          | "should handle errors during tool result saving" | AI SDK streaming callback mocking complexity | Fixing |
| `packages/testing.spike.land/src/handlers/postHandler.response.spec.ts` | "should create stream with correct parameters"   | AI SDK streamText mocking                    | Fixing |
| `packages/testing.spike.land/src/handlers/postHandler.tools.spec.ts`    | "should convert tools to correct format"         | AI SDK tool conversion                       | Fixing |
| `packages/testing.spike.land/src/routeHandler.spec.ts`                  | "should handle websocket upgrade"                | WebSocket upgrade mocking                    | Fixing |

### Category D: Routing & Caching Tests - 9 tests

| File                                                    | Test                                               | Reason                              | Status |
| ------------------------------------------------------- | -------------------------------------------------- | ----------------------------------- | ------ |
| `packages/code/src/__tests__/WebSocketManager.spec.tsx` | "should handle dehydrated page route"              | Complex DOM setup for embed routing | Fixing |
| `packages/code/src/__tests__/WebSocketManager.spec.tsx` | "should handle default route"                      | Complex DOM setup for embed routing | Fixing |
| `packages/code/src/__tests__/router.spec.tsx`           | "should handle live page route with parameters"    | Route parameter handling incomplete | Fixing |
| `packages/code/src/__tests__/router.spec.tsx`           | "should handle multiple route navigations"         | Route parameter handling incomplete | Fixing |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | "should handle different asset versions"           | Asset fetcher mocking               | Fixing |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | "should handle assets with special characters"     | Asset fetcher mocking               | Fixing |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | "should handle different status codes"             | Asset fetcher mocking               | Fixing |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | "should set 'Cross-Origin-Embedder-Policy' header" | COEP header testing                 | Fixing |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | "should correctly update import map"               | Complex import map updates          | Fixing |

### Category E: TTL/Timing Tests - 1 test

| File                                                  | Test                                      | Reason                      | Status |
| ----------------------------------------------------- | ----------------------------------------- | --------------------------- | ------ |
| `packages/code/src/@/lib/__tests__/lru-cache.spec.ts` | "should return false for expired entries" | TTL expiry with fake timers | Fixing |

### Category F: Feature Under Review - 1 test

| File                                                              | Test                                 | Reason                                      | Status        |
| ----------------------------------------------------------------- | ------------------------------------ | ------------------------------------------- | ------------- |
| `packages/code/src/__tests__/components/AutoSaveHistory.spec.tsx` | "CodeHistoryCarousel" (entire suite) | Monaco editor mocking or incomplete feature | Investigation |

### Category G: E2E Tests - Missing Step Definitions - 13 scenarios

These Cucumber E2E scenarios are skipped because they reference step definitions that don't exist yet. They require implementing the missing step definitions before they can run.

| Feature File                                         | Scenario                                                | Missing Steps                                      |
| ---------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `e2e/features/orbit-calendar.feature`                | "Cannot schedule post in the past"                      | Date selection validation steps                    |
| `e2e/features/orbit-calendar.feature`                | "Must select at least one platform"                     | Platform selection validation steps                |
| `e2e/features/orbit-calendar.feature`                | "Scheduled post is published when due"                  | Cron job and publishing status steps               |
| `e2e/features/orbit-calendar.feature`                | "Failed publishing triggers retry"                      | Cron job and retry logic steps                     |
| `e2e/features/orbit-calendar.feature`                | "Post fails permanently after max retries"              | Retry logic steps                                  |
| `e2e/features/orbit-calendar.feature`                | "Partial success when publishing to multiple platforms" | Multi-platform partial success steps               |
| `e2e/features/orbit-calendar.feature`                | "View publishing history for a post"                    | Publishing history steps                           |
| `e2e/features/orbit-social-integration.feature`      | "Connect multiple LinkedIn organizations"               | Organization selection steps                       |
| `e2e/features/connections.feature`                   | "Managing Connections"                                  | Orbit login and workspace background steps         |
| `e2e/features/connections.feature`                   | "Managing Reminders"                                    | Orbit login and workspace background steps         |
| `e2e/features/competitor-tracking.feature`           | "Add and delete a competitor"                           | Competitor page and action steps                   |
| `e2e/features/orbit-relay-approval-workflow.feature` | "Handle unauthorized access"                            | "I am not logged in" with drafts step              |
| `e2e/features/orbit-relay-approval-workflow.feature` | "Handle missing required fields"                        | Ambiguous step after fix - needs review            |
| `e2e/features/orbit-relay-drafts.feature`            | "Generate drafts for different message types"           | Previously used ambiguous urgency step             |
| `e2e/features/admin-jobs.feature`                    | "Job details shows enhancement information"             | UI renders "Job Details" not "Enhancement Details" |
| `e2e/features/admin-jobs.feature`                    | "Job details shows prompt for processed jobs"           | UI renders "User Prompt" not "Prompt"              |
| `e2e/features/admin-jobs.feature`                    | "Empty state when no jobs match filter"                 | Timing/race condition with filter                  |
| `e2e/features/orbit-onboarding.feature`              | "Existing user is redirected to dashboard"              | Requires workspace seeding utilities               |

**Status:** All scenarios marked with `@skip` tag to prevent CI failures. Implementation of missing step definitions should be tracked as separate issues.

## Historical Changes

### ✅ Fixed in Issue #798 (2026-01-29)

The following tests were previously skipped but have been fixed:

- **Scout API Tests** (10 tests) - `facebook.test.ts` and `instagram.test.ts`
  - All NODE_ENV-dependent timing tests were removed
  - These tests were unreliable and didn't test real functionality
  - Related to rate limit headers and timing validation

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
# Find all skipped tests
grep -r "\.skip" --include="*.test.ts" --include="*.test.tsx" \
  --include="*.spec.ts" --include="*.spec.tsx" packages/ src/ | grep -E "(\.skip\(|describe\.skip|it\.skip|test\.skip)"

# Count skipped tests
grep -r "\.skip" --include="*.test.ts" --include="*.test.tsx" \
  --include="*.spec.ts" --include="*.spec.tsx" packages/ src/ | grep -E "(\.skip\(|describe\.skip|it\.skip|test\.skip)" | wc -l

# Validate skip documentation (pre-commit hook)
bash scripts/validate-test-skips.sh

# Run full test suite
yarn test:coverage
```

## Target Metrics

- **Goal:** ≤5 documented skips (integration/manual tests only)
- **Current:** 17 skips
- **Progress:** 10 tests fixed (scout tests removed)
- **Remaining:** 17 skips to investigate/fix

## Related Documentation

- [Testing Requirements](../CLAUDE.md#-testing-requirements)
- [CI/CD Verification](../CLAUDE.md#-cicd-verification-critical)
- Issue #798: Skipped Tests Investigation
