# Implementation Plan for Issue #407: Replace 'as any' Type Assertions

## Summary

This tech debt issue addresses the extensive use of `as any` type assertions across the codebase.

**Analysis Results:**

- **Total Files with `as any`**: 45+ source files
- **Total Instances**: 500+ occurrences
- **Test Files**: ~98% of instances (nearly all)
- **Production Files**: Only 2 instances found
- **Scripts**: 2 instances in `vitest-coverage-mapper-reporter.ts`

The vast majority of `as any` usage is in test files, primarily for mocking Prisma models, auth sessions, and API responses. The ESLint configuration already has `@typescript-eslint/no-explicit-any: "off"` for test files.

## File Categorization

### Category 1: Production Code (CRITICAL)

Only 1 file has `as any` in production code:

- `/scripts/vitest-coverage-mapper-reporter.ts` (Lines 149-150) - Vitest internal APIs

### Category 2: Test Files - Prisma Mock Pattern (60%+ of instances)

Files that mock Prisma client methods using `as any` for type casting.

### Category 3: Test Files - Auth/Session Mock Pattern (20%+)

Files that mock NextAuth sessions.

### Category 4: Test Files - Hook Mocking Pattern (10%+)

Files that mock custom hooks.

## Proposed Solution: Mock Factory Pattern

### Pattern 1: Typed Prisma Mock Factory

```typescript
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";

const createMockJob = (overrides: Partial<MockEnhancementJob> = {}): MockEnhancementJob => ({
  id: "job-1",
  // ... all required fields
  ...overrides,
});
```

### Pattern 2: Typed Session Mock Factory

```typescript
const createMockSession = (overrides: Partial<MockSession["user"]> = {}): MockSession => ({
  user: { id: "user-123", role: "USER", ...overrides },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
});
```

### Pattern 3: DeepPartial Utility

```typescript
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; }
  : T;
```

## Implementation Phases

### Phase 1: Create Mock Factory Infrastructure

1. Create `src/test-utils/types.ts` with DeepPartial utility
2. Create `src/test-utils/mock-factories/session.ts`
3. Create `src/test-utils/mock-factories/prisma.ts`

### Phase 2: Fix Production Code

1. Update `scripts/vitest-coverage-mapper-reporter.ts` with proper interfaces

### Phase 3: Migrate Test Files

Priority order by instance count, starting with highest impact files.

### Phase 4: Add ESLint Rules

1. Update ESLint config to warn about `as any` in test files
2. Add stricter rule for production code

## Questions

1. **Test Coverage Goal**: Should we aim for 0 `as any` in test files, or is "minimize and justify" acceptable?
2. **Migration Strategy**: Migrate all at once, or incrementally with lint warning phase?
3. **Mock Factory Location**: `src/test-utils/` or co-located with modules?

## Critical Files

- `/eslint.config.mjs` - Add/modify ESLint rules
- `/src/test-utils/marketing-mocks.tsx` - Existing mock pattern to follow
- `/src/components/enhance/EnhancedImagesList.test.tsx` - Best existing example
- `/prisma/schema.prisma` - Reference for Prisma model types
