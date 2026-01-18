---
description: Run comprehensive smoke tests to validate the Orbit system end-to-end
---

# Smoke Test Workflow

This workflow validates spike-land-nextjs end-to-end across 7 stages. Use this after major changes or before releases.

## Quick Start

// turbo-all

### Run All Stages (Local)

```bash
# Ensure dev server is running first
yarn dev

# In another terminal, run smoke tests
BASE_URL=http://localhost:3000 npx tsx e2e/smoke-test-workflow.ts
```

### Run All Stages (Staging)

```bash
BASE_URL=https://next.spike.land npx tsx e2e/smoke-test-workflow.ts
```

### Run Specific Stage

```bash
# Stage 0: Pre-validation (lint, tsc, unit tests)
npx tsx e2e/smoke-test-workflow.ts --stage=0

# Stage 1: Infrastructure health
npx tsx e2e/smoke-test-workflow.ts --stage=1

# Stage 2: Core user flows
npx tsx e2e/smoke-test-workflow.ts --stage=2

# Stage 3: Feature-specific tests
npx tsx e2e/smoke-test-workflow.ts --stage=3

# Stage 4: Integration tests (real services)
ENABLE_REAL_AI_TESTS=true npx tsx e2e/smoke-test-workflow.ts --stage=4

# Stage 5: Admin functionality
npx tsx e2e/smoke-test-workflow.ts --stage=5

# Stage 6: Cross-device testing
npx tsx e2e/smoke-test-workflow.ts --stage=6

# Stage 7: Cleanup & reporting
npx tsx e2e/smoke-test-workflow.ts --stage=7
```

## GitHub Actions

Trigger via GitHub Actions UI:

1. Go to **Actions** → **Smoke Test**
2. Click **Run workflow**
3. Select environment (staging/production/local)
4. Optionally specify a stage number
5. Toggle real integration tests if needed

Or schedule is automatic: daily at 6 AM UTC on staging.

## Environment Variables

| Variable                    | Description                                              | Required       |
| --------------------------- | -------------------------------------------------------- | -------------- |
| `BASE_URL`                  | Target URL (localhost:3000, next.spike.land, spike.land) | Yes            |
| `E2E_BYPASS_SECRET`         | Auth bypass header for E2E tests                         | For auth tests |
| `ENABLE_REAL_AI_TESTS`      | Run real Gemini API tests                                | No             |
| `ENABLE_REAL_PAYMENT_TESTS` | Run real Stripe test mode                                | No             |
| `ENABLE_SOCIAL_POSTING`     | Run real social posting                                  | No             |
| `HEADLESS`                  | Set to "false" to see browser                            | No             |

## Stages Overview

| Stage | Name                  | Jobs                              | Duration |
| ----- | --------------------- | --------------------------------- | -------- |
| 0     | Pre-Validation        | Lint, TSC, Unit Tests             | ~5 min   |
| 1     | Infrastructure Health | API, Workers                      | ~1 min   |
| 2     | Core User Flows       | Public, Auth, Nav                 | ~2 min   |
| 3     | Feature-Specific      | Pixel, Albums, Tokens, Merch, MCP | ~5 min   |
| 4     | Integration Tests     | Stripe, AI, Social                | ~10 min  |
| 5     | Admin Functionality   | Dashboard, Sub-pages              | ~3 min   |
| 6     | Cross-Device          | Mobile, Tablet                    | ~2 min   |
| 7     | Cleanup & Reporting   | Screenshots, JSON Report          | ~2 min   |

## Output Files

After running, find results in:

- `e2e/smoke-test-screenshots/` - Page screenshots
- `e2e/reports/smoke-test-report.json` - JSON report

## Troubleshooting

### Pre-validation fails (Stage 0)

```bash
# Fix lint errors
yarn lint --fix

# Check types
yarn tsc --noEmit

# Run changed tests
yarn vitest run --changed main
```

### Infrastructure fails (Stage 1)

```bash
# Check local server
curl http://localhost:3000/api/health

# Check workers
curl https://testing.spike.land/api/health
curl https://js.spike.land/health
```

### Auth fails (Stage 2)

```bash
# Check middleware
grep -r "matcher" src/middleware.ts

# Verify auth config
cat src/auth.config.ts
```

### Screenshots show wrong content

```bash
# Run with visible browser
HEADLESS=false BASE_URL=http://localhost:3000 npx tsx e2e/smoke-test-workflow.ts --stage=2
```

## Integration with CI

The smoke test is independent of the main CI/CD pipeline (ci-cd.yml). Use it for:

1. **Pre-release validation** - Run on staging before production deploy
2. **Daily health checks** - Scheduled at 6 AM UTC
3. **Post-incident verification** - Confirm system recovery
4. **Cross-device QA** - Validate responsive design

## Related Commands

```bash
# Existing Cucumber E2E (faster, CI-oriented)
yarn test:e2e:fast

# Full E2E with database
yarn test:e2e:db

# Unit tests with coverage
yarn test:coverage
```
