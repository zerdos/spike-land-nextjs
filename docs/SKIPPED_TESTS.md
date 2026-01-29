# Skipped Tests Documentation

**Last Updated:** 2026-01-29
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
// CATEGORY: [intentional|environment|unfinished]
// TRACKING: #<issue-number>
// ACTION: [keep|fix|remove]
it.skip("test description", async () => {
  // test code
});
```

### Pre-commit Hook

A pre-commit hook verifies that all skipped tests are properly documented. Commits will be rejected if undocumented skips are found.

## Current Inventory

**Total Skipped Tests:** 27

### Category 1: Intentionally Skipped (Documented) - 3 tests

| File | Line | Test | Reason | Action |
|------|------|------|--------|--------|
| `packages/testing.spike.land/src/handlers/postHandler.spec.ts` | 498 | "should handle tool execution in onStepFinish" | AI SDK streaming callback mocking complexity | Keep |
| `packages/testing.spike.land/src/handlers/postHandler.spec.ts` | 554 | "should handle errors during tool result saving" | AI SDK streaming callback mocking complexity | Keep |
| `src/app/api/orbit/[workspaceSlug]/scout/competitors/[id]/metrics/route.integration.test.ts` | 10 | "Competitor Metrics API" (entire suite) | Integration test requiring real database | Keep |

### Category 2: Environment-Specific Tests - 10 tests

**Files:**
- `src/lib/scout/public-api-clients/facebook.test.ts` (5 tests)
- `src/lib/scout/public-api-clients/instagram.test.ts` (5 tests)

**Reason:** NODE_ENV modification unreliable in Vitest environment
**Action:** Remove these tests (not testing real functionality)

| File | Line | Test | Reason |
|------|------|------|--------|
| `src/lib/scout/public-api-clients/facebook.test.ts` | 61 | "should not delay in test environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/facebook.test.ts` | 152 | "should not delay in test environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/facebook.test.ts` | 160 | "should not delay in CI environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/facebook.test.ts` | 199 | "should be false in test environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/facebook.test.ts` | 207 | "should be false in CI environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/instagram.test.ts` | 62 | "should not delay in test environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/instagram.test.ts` | 177 | "should not delay in test environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/instagram.test.ts` | 186 | "should not delay in CI environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/instagram.test.ts` | 226 | "should be false in test environment" | NODE_ENV unreliable |
| `src/lib/scout/public-api-clients/instagram.test.ts` | 234 | "should be false in CI environment" | NODE_ENV unreliable |

### Category 3: Unfinished/Needs Fix - 14 tests

#### WebSocket Route Handling (2 tests)
| File | Line | Test | Status |
|------|------|------|--------|
| `packages/code/src/__tests__/WebSocketManager.spec.tsx` | 219 | "should handle dehydrated page route" | Needs fix |
| `packages/code/src/__tests__/WebSocketManager.spec.tsx` | 252 | "should handle default route" | Needs fix |

#### Router Navigation (2 tests)
| File | Line | Test | Status |
|------|------|------|--------|
| `packages/code/src/__tests__/router.spec.tsx` | 99 | "should handle live page route with parameters" | Needs fix |
| `packages/code/src/__tests__/router.spec.tsx` | 119 | "should handle multiple route navigations" | Needs fix |

#### Asset Caching (5 tests)
| File | Line | Test | Status |
|------|------|------|--------|
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | 352 | "should handle different asset versions" | Needs fix |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | 401 | "should handle assets with special characters" | Needs fix |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | 422 | "should handle different status codes" | Needs fix |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | 543 | "should set 'Cross-Origin-Embedder-Policy' header" | Needs fix |
| `packages/code/src/__tests__/serve-with-cache.spec.tsx` | 645 | "should correctly update import map" | Needs fix |

#### Component Tests (1 test)
| File | Line | Test | Status |
|------|------|------|--------|
| `packages/code/src/__tests__/components/AutoSaveHistory.spec.tsx` | 28 | "CodeHistoryCarousel" (entire suite) | Needs review/removal |

#### Backend Tests (3 tests)
| File | Line | Test | Status |
|------|------|------|--------|
| `packages/testing.spike.land/src/routeHandler.spec.ts` | 104 | "should handle websocket upgrade" | Needs fix |
| `packages/testing.spike.land/src/handlers/postHandler.response.spec.ts` | 134 | "should create stream with correct parameters" | Needs fix |
| `packages/testing.spike.land/src/handlers/postHandler.tools.spec.ts` | 119 | "should convert tools to correct format" | Needs fix |

#### LRU Cache (1 test)
| File | Line | Test | Status |
|------|------|------|--------|
| `packages/code/src/@/lib/__tests__/lru-cache.spec.ts` | 202 | "should return false for expired entries" | Needs fix |

## Review Schedule

- **Weekly:** Review Category 3 (Unfinished) tests
- **Monthly:** Review all skipped tests for potential fixes
- **Quarterly:** Audit skipped test policy and update documentation

## Process for Skipping Tests

1. **Add proper documentation** above the `.skip()` call
2. **Create tracking issue** if one doesn't exist
3. **Update this document** with the new skip
4. **Set reminder** to revisit the test (for Category 3)

## Verification Commands

```bash
# Find all skipped tests
grep -rn "\.skip(\|describe\.skip(\|it\.skip(\|test\.skip(" packages/ src/ \
  --include="*.test.ts" --include="*.test.tsx" \
  --include="*.spec.ts" --include="*.spec.tsx"

# Check for undocumented skips
bash scripts/check-undocumented-skips.sh

# Run full test suite
yarn test:coverage
```

## Related Documentation

- [Testing Requirements](../CLAUDE.md#-testing-requirements)
- [CI/CD Verification](../CLAUDE.md#-cicd-verification-critical)
- Issue #798: Skipped Tests Investigation
