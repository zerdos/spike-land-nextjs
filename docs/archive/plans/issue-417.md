# Implementation Plan for Issue #417: Document Testing Strategy

## Summary

Create comprehensive `docs/TESTING_STRATEGY.md` documenting the testing
infrastructure, conventions, and best practices. Project has ~456 test files
with 80%+ coverage requirements.

## Testing Overview

| Aspect       | Value                                 |
| ------------ | ------------------------------------- |
| Unit Testing | Vitest + React Testing Library        |
| E2E Testing  | Playwright + Cucumber (BDD)           |
| Coverage     | 80%+ thresholds enforced in CI        |
| CI Pipeline  | GitHub Actions with parallel sharding |

## Test Pyramid

### Unit Tests (80%)

- Location: Alongside source files (`*.test.ts`, `*.test.tsx`)
- Tools: Vitest, React Testing Library
- Run: `yarn test` or `yarn test:coverage`

### Integration Tests (15%)

- API routes with mocked database
- Auth flows, form submissions
- Same location as unit tests

### E2E Tests (5%)

- Location: `e2e/features/*.feature`, `e2e/step-definitions/*.steps.ts`
- Tools: Playwright + Cucumber
- Run: `yarn test:e2e:local`

## File Naming Conventions

| Convention | Example                                    |
| ---------- | ------------------------------------------ |
| Extension  | `.test.ts` or `.test.tsx` (NOT `.spec.ts`) |
| Location   | Same directory as source file              |
| Pattern    | `ComponentName.test.tsx`                   |

## Coverage Requirements (vitest.config.ts)

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 80%       |
| Functions  | 84%       |
| Branches   | 78%       |
| Statements | 80%       |

### Excluded from Coverage

- Type definitions (`*.d.ts`)
- Config files
- Storybook stories
- Barrel exports (`index.ts`)
- Temporal workflows (`*.workflow.ts`)

## Documentation Content

### Testing Patterns

- Component testing examples
- API route testing examples
- Custom hook testing examples
- E2E feature file examples
- Step definition examples

### E2E Tags

- `@skip`: Temporarily skipped
- `@flaky`: Known flakiness, run with retries
- `@fast`: Quick tests for smoke testing
- `@requires-db`: Needs seeded database
- `@wip`: Work in progress

### Database Testing

- Unit tests: Mock Prisma client
- E2E: `@requires-db` tag for real database

### Best Practices

**DO**: Test alongside implementation, descriptive names, mock externals, use
data-testid **DON'T**: Test implementation details, rely on test order, use
.spec.ts, skip without documenting

## Implementation Steps

1. Create `/docs/TESTING_STRATEGY.md` with full content
2. Update `/docs/README.md` index
3. Verify coverage thresholds match vitest.config.ts

## Questions

1. Coverage thresholds: actual 80%/84%/78%/80% vs issue mentions "100%"?
2. Database testing: document actual DB integration tests locally?
3. Test data seeding: include `yarn db:seed-e2e` documentation?

## Critical Files

- `/docs/TESTING_STRATEGY.md` - New file
- `/vitest.config.ts` - Coverage thresholds reference
- `/vitest.setup.ts` - Test setup patterns
- `/cucumber.js` - E2E profiles and tags
- `/e2e/support/world.ts` - E2E infrastructure
