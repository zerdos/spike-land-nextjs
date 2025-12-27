# Implementation Plan for Issue #416: Add CI/CD Debugging Guide

## Summary

Create comprehensive `docs/CI_CD_DEBUGGING.md` covering:

- Expected build times
- Pipeline architecture
- Failure troubleshooting
- Common fixes
- Vercel preview URL location

## Pipeline Overview

```
+-------------------+     +-------------------+     +-------------------+
|  Quality Checks   |     |    Unit Tests     |     |      Build        |
|  (Lint, TSC,      |     |   (4 shards)      |     |    Application    |
|   Security Audit) |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
         |                        |                        |
         v                        v                        v
+-------------------------------------------------------------------+
|                         E2E Tests (8 shards)                       |
+-------------------------------------------------------------------+
```

## Expected Build Times

| Job                  | Expected | Max Normal | Investigate If |
| -------------------- | -------- | ---------- | -------------- |
| Quality Checks       | 1-2 min  | 3 min      | > 4 min        |
| Unit Tests (each)    | 1-2 min  | 3 min      | > 5 min        |
| Build                | 2-3 min  | 4 min      | > 5 min        |
| E2E Tests (each)     | 2-4 min  | 6 min      | > 8 min        |
| **Total (parallel)** | 4-6 min  | 8 min      | > 12 min       |

## Documentation Sections

### Finding Vercel Preview URLs

1. PR Comments (vercel bot)
2. GitHub Deployments tab
3. Vercel Dashboard
4. GitHub CLI: `gh pr view --json statusCheckRollup`

### Troubleshooting by Job Type

#### Quality Checks

- **Lint**: `yarn lint --fix`
- **TypeScript**: `yarn tsc --noEmit`
- **Security**: `yarn npm audit --all`

#### Unit Tests

- Coverage threshold issues
- Snapshot mismatches
- Async timeouts
- Mock issues

#### Build Failures

- TypeScript errors (different from tsc check)
- Import path issues
- Environment variable issues
- Prisma schema issues

#### E2E Tests

- Element not found (timeout)
- Strict mode violations
- Flaky tests
- Authentication issues

### CI Monitoring Commands

```bash
gh pr checks <PR-NUMBER>
gh run view <RUN-ID> --log-failed
gh run rerun <RUN-ID> --failed
```

### When to Retry vs Investigate

**Retry**: Network timeout, infrastructure issues, first-run flakiness
**Investigate**: Same test fails consistently, coverage dropped, security audit failure

## Implementation Steps

1. Create `/docs/CI_CD_DEBUGGING.md`
2. Update `/docs/README.md` index
3. Add reference in main README

## Critical Files

- `/docs/CI_CD_DEBUGGING.md` - New file
- `/docs/README.md` - Add link
- `/.github/workflows/ci-cd.yml` - Reference (read-only)
- `/e2e/README.md` - Reference (read-only)
