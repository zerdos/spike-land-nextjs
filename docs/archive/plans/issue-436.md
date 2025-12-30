# Implementation Plan for Issue #436: Provision Test Database for @requires-db Scenarios

## Summary

Provision a Neon serverless PostgreSQL database for E2E testing. Currently 314
scenarios tagged `@requires-db` are skipped in CI because no test database
exists.

## Current Database Setup

### Schema

- `/prisma/schema.prisma`: PostgreSQL with Prisma ORM
- 60+ models including User, Album, EnhancedImage, ImageEnhancementJob

### Existing Seed Scripts

- `/prisma/seed-e2e.ts`: Creates test users, images, albums, orders
- `/prisma/cleanup-e2e.ts`: Cleans up test data

### Cucumber Configuration (`cucumber.js`)

- `db` profile exists (lines 104-123)
- Runs tests tagged `@requires-db`
- Sequential execution (parallel: 1)
- 30-second timeout, 1 retry

### Current CI

- E2E tests run in 8 shards
- Excludes `@requires-db` scenarios

## Neon Provisioning Steps

1. Create Neon project: `spike-land-e2e`
2. Select region: `us-east-1` (same as Vercel)
3. Create `e2e-main` branch
4. Apply migrations: `DATABASE_URL=<neon-url> npx prisma migrate deploy`
5. Run seed: `DATABASE_URL=<neon-url> npx tsx prisma/seed-e2e.ts`

## CI Workflow Updates

### Add New Job: `e2e-db`

```yaml
e2e-db:
  runs-on: ubuntu-latest
  steps:
    - Checkout
    - Setup Node
    - Install dependencies
    - Install Playwright
    - Generate Prisma client
    - Seed database: npx tsx prisma/seed-e2e.ts
    - Run tests: cucumber-js --profile db
    - Cleanup database: npx tsx prisma/cleanup-e2e.ts
    - Upload artifacts

  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_E2E }}
    E2E_BYPASS_SECRET: ${{ secrets.E2E_BYPASS_SECRET }}
```

## Seed Script Enhancements

### Additional Test Data Needed

1. Enhancement jobs (PENDING, PROCESSING, COMPLETED, FAILED)
2. Multiple user variations for ownership tests
3. API keys for MCP tests
4. Vouchers for token/referral tests
5. Featured gallery items

### Requirements

- Accept `DATABASE_URL_E2E` or fallback to `DATABASE_URL`
- Idempotent (safe to run multiple times)
- Deterministic IDs prefixed with `e2e-`

## Package.json Script Additions

```json
"test:e2e:db": "DATABASE_URL=$DATABASE_URL_E2E cucumber-js --profile db",
"db:seed-e2e": "tsx prisma/seed-e2e.ts",
"db:cleanup-e2e": "tsx prisma/cleanup-e2e.ts"
```

## Implementation Phases

1. **Neon Setup (Manual)**: Create account, project, branch, run migrations
2. **GitHub Secrets**: Add `DATABASE_URL_E2E` secret
3. **Seed Script Enhancement**: Comprehensive test data
4. **Cleanup Script Enhancement**: Clean all test entities
5. **CI Workflow Update**: Add `e2e-db` job
6. **Verification**: Open PR, verify job runs successfully

## Questions

1. **Neon Account**: New account or use existing?
2. **Database Branching**: New branch per CI run (better isolation) or single
   persistent branch?
3. **Test Data Scope**: Comprehensive seed (slower) vs flexible scenarios?
4. **Parallel Execution**: Investigate per-scenario transactions later?
5. **Production Protection**: Add safeguards to prevent running against prod DB?

## Critical Files

- `/.github/workflows/ci-cd.yml` - Add e2e-db job
- `/prisma/seed-e2e.ts` - Enhance with additional test data
- `/prisma/cleanup-e2e.ts` - Add cleanup for all entities
- `/cucumber.js` - Already configured (db profile exists)
- `/e2e/support/hooks.ts` - Add database verification hooks
