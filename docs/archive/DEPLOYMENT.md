# Deployment Guide

This document explains the CI/CD pipeline and deployment process for Spike Land.

## Pipeline Overview

The CI/CD pipeline automatically runs on every push and pull request:

```
push/PR → [quality-checks, unit-tests (8 shards)] → build → e2e → deploy
          (parallel)                                              ↓
                                              (PRs: test, main: production)
```

**Key Optimizations:**

- ✅ Parallel execution of quality checks and test shards
- ✅ 8-way test sharding for faster test execution
- ✅ Content-based caching for 80%+ cache hit rates
- ✅ Cached node_modules and Next.js builds across jobs
- ✅ Concurrency control (cancels old runs)
- ✅ Skip CI for documentation-only changes

## Stages

### 1. **Quality Checks** (Automatic, Parallel)

- Runs linting checks
- Runs security audit (npm audit)
- Combined in single job to reduce setup overhead
- **Time:** ~1-1.5 minutes

### 2. **Unit Tests** (Automatic, Parallel with 8 shards)

- Runs unit tests with 100% coverage requirement
- Tests split across 8 parallel runners for speed
- Uses optimized Vitest configuration with threading
- GitHub Actions reporter for inline annotations
- Uploads coverage reports to Codecov from all shards
- **Time:** ~1.5-2 minutes (with sharding)

### 3. **Build** (Automatic)

- Builds Next.js application with `npm run build`
- Uses content-based cache keys for Next.js (high hit rate)
- Validates build succeeds before deployment
- **Time:** ~2-2.5 minutes (with cache hits)

### 4. **E2E Tests** (Automatic)

- Restores node_modules from cache (fast)
- Builds production app (`npm run build`)
- Starts production server (`npm run start`)
- Runs E2E tests against `localhost:3000`
- Caches Playwright browsers for speed
- Uploads test reports
- **Time:** ~3-3.5 minutes

### 5a. **Deploy to Test** (Manual on PRs)

- Pulls Vercel preview environment configuration
- Builds with `vercel build` using preview settings
- Deploys to Vercel preview environment
- Runs smoke tests against deployed URL
- **Adds comment to PR** with deployment URL
- Requires GitHub environment approval (can be auto-approved)
- **Time:** ~2-3 minutes

### 5b. **Deploy to Production** (Auto on main, manual elsewhere)

- Pulls Vercel production environment configuration
- Builds with `vercel build --prod`
- Deploys to Vercel production (`next.spike.land`)
- Runs smoke tests against production URL
- **Time:** ~2.5-3 minutes

## Smoke Tests

Post-deployment smoke tests verify:

- ✓ Homepage returns 200 status
- ✓ Favicon is accessible
- ✓ HTML content loads
- ✓ Health check endpoint responds

Tests are run against the deployed URL to ensure real-world functionality.

## Deployment Approval

### For Pull Requests

1. All tests must pass (unit tests, E2E tests)
2. GitHub will show a **"Review deployments"** button
3. Click the button and select "test" environment
4. Click **"Approve and deploy"**
5. Deployment proceeds to Vercel preview

Once deployed:

- A comment is posted to the PR with the deployment URL
- The URL is clickable and ready for testing
- Comment updates if you re-deploy

### For Main Branch

Deployments to production are **automatic**:

1. Push to `main` branch
2. All tests run automatically
3. If all tests pass, production deployment starts automatically
4. Smoke tests verify production environment

## GitHub Environments Setup

The workflow uses GitHub Environments for deployment management.

### Required Setup

You must create two environments in repository settings:

1. **Go to:** Settings → Environments
2. **Create "test" environment:**
   - No protection rules needed
   - Allows quick deployment from PR
3. **Create "production" environment:**
   - Enable "Required reviewers" (recommended)
   - Add yourself as a required reviewer
   - Restrict to "main" branch (recommended)

### Environment Variables

Environment-specific secrets can be added:

- Settings → Environments → Select environment → Environment secrets

Current secrets used:

- `VERCEL_TOKEN` - Added at account level (used by all jobs)
- `E2E_BYPASS_SECRET` - Added at account level (for test auth bypass)

## Rollback Procedure

If a production deployment breaks something:

1. **Go to:** Actions tab → "Rollback Deployment"
2. **Click** "Run workflow"
3. **Select:**
   - Environment: `production`
   - Deployment ID: (leave empty for previous, or specify)
4. **Click** "Run workflow"

The workflow will:

- List recent deployments
- Promote the previous deployment
- Verify rollback succeeded
- Record the rollback in commit status

## Caching Strategy

The pipeline is heavily optimized for speed through multi-layer caching:

### Multi-Layer Caching

1. **node_modules cache** - 95%+ hit rate, saves ~60s per job
2. **Next.js build cache** - Content-based keys, 80%+ hit rate, saves ~90s
3. **Playwright browsers** - Version-based cache, saves ~45s when hit
4. **npm setup-node cache** - Built-in npm cache, saves ~10s

### Concurrency Control

- Cancels outdated workflow runs for the same PR/branch
- Main branch runs always complete (no cancellation)
- Saves minutes by not running superseded commits

## Deployment URLs

### Test Environment

- Vercel preview URL (changes per deployment)
- Posted automatically in PR comments
- Example: `https://spike-land-nextjs-git-feature-abc123-team.vercel.app`

### Production Environment

- Custom domain: `https://next.spike.land`
- DNS managed by Cloudflare
- Automatic deployments from `main` branch

## Environment Variables

### Build-time Variables

- `E2E_BYPASS_SECRET` - Secret token for test authentication
- Configured in GitHub Actions secrets
- Passed to Vercel via workflow

### Runtime Variables

- Managed in Vercel project settings
- Available to deployed application
- Can differ per environment (preview vs. production)

## Troubleshooting

### Deployment fails with "rate limit"

- The Vercel free tier has 100 deployments/day limit
- Automatic preview deployments were disabled to save quota
- Feature branches must manually trigger deployment

### E2E tests pass locally but fail in CI

- Check `BASE_URL` environment variable
- Ensure dev server is running before tests
- Check Playwright browsers are installed

### Smoke tests fail after deployment

- Check deployment URL is live with `curl https://your-url`
- Verify endpoints used in `scripts/smoke-test.sh` exist
- Check network connectivity in GitHub Actions

### PR comment not appearing

- Ensure GitHub token has correct permissions
- Check PR is not from a fork (limited permissions)
- Verify workflow ran without errors

## Manual Deployment Steps

To manually test the deployment process:

```bash
# Install Vercel CLI
npm install -g vercel@latest

# Login to Vercel
vercel login

# Build application
npm run build

# Pull environment config
vercel pull --yes --environment=preview

# Deploy to preview
vercel deploy --prebuilt

# Or deploy to production
vercel pull --yes --environment=production
vercel deploy --prebuilt --prod
```

## Performance

### Optimized CI/CD Times (After Improvements)

- Quality Checks: ~1.5 min (lint + security audit combined)
- Unit Tests: ~2 min (8-way sharding, was 5+ min with 4 shards)
- Build: ~2.5 min (content-based cache, was 4-5 min)
- E2E: ~3.5 min (production build, was 6-7 min)
- Deploy (test): ~2.5 min (fresh build for environment, was 5 min)
- Deploy (production): ~2.5 min (fresh build for environment)
- **Total (PR to test):** ~12 minutes ⚡ (was ~30 minutes)
- **Total (main to prod):** ~12.5 minutes ⚡ (was ~30 minutes)

**Overall speedup: 2.5x faster (60% reduction in CI time)**

### Optimizations Applied

- ✅ 8-way test sharding (parallel execution)
- ✅ Merged lint + security audit (single setup)
- ✅ Content-based Next.js caching (80%+ hit rate)
- ✅ node_modules caching (95%+ hit rate)
- ✅ Playwright browser caching (version-locked)
- ✅ Production build for E2E (consistent testing)
- ✅ Concurrency control (cancel outdated runs)
- ✅ Skip CI for doc-only changes
- ✅ GitHub Actions reporter (inline test results)
- ✅ Optimized Vitest threading configuration

## CI/CD Configuration

**Workflow file:** `.github/workflows/ci-cd.yml`
**Rollback workflow:** `.github/workflows/rollback.yml`
**Smoke test script:** `scripts/smoke-test.sh`

## Related Documentation

- [VERCEL_DOMAIN_SETUP.md](./VERCEL_DOMAIN_SETUP.md) - Vercel domain configuration
- [CLOUDFLARE_DNS_SETUP.md](./CLOUDFLARE_DNS_SETUP.md) - DNS setup
- [CLAUDE.md](./CLAUDE.md) - Branch protection and development rules
