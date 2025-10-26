# Deployment Guide

This document explains the CI/CD pipeline and deployment process for Spike Land.

## Pipeline Overview

The CI/CD pipeline automatically runs on every push and pull request:

```
push/PR → test → build → e2e (localhost) → deploy-test/deploy-production
                                           ↓
                            (PRs: manual test, main: auto production)
```

## Stages

### 1. **Test** (Automatic)
- Runs linting checks
- Runs unit tests with 100% coverage requirement
- Uploads coverage reports to Codecov
- **Time:** ~2-3 minutes

### 2. **Build** (Automatic)
- Builds Next.js application with `npm run build`
- Caches build artifacts for reuse
- **Time:** ~3-5 minutes
- **Reused by:** E2E tests and deployment jobs

### 3. **E2E Tests** (Automatic)
- Downloads pre-built artifacts (no rebuild needed)
- Installs Playwright browsers
- Starts dev server (`npm run start`)
- Runs E2E tests against `localhost:3000`
- Uploads test reports
- **Time:** ~5-7 minutes

### 4a. **Deploy to Test** (Manual on PRs)
- Downloads pre-built artifacts
- Deploys to Vercel preview environment
- Runs smoke tests against deployed URL
- **Adds comment to PR** with deployment URL
- Requires GitHub environment approval (can be auto-approved)
- **Time:** ~2-3 minutes

### 4b. **Deploy to Production** (Auto on main, manual elsewhere)
- Downloads pre-built artifacts
- Deploys to Vercel production environment (`next.spike.land`)
- Runs smoke tests against production URL
- Fails deployment if smoke tests fail
- **Time:** ~2-3 minutes

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

## Build Artifact Reuse

The pipeline optimizes CI time by building once and reusing artifacts:

1. **Build job** creates `.next` directory and `node_modules`
2. **E2E job** downloads artifacts (no rebuild needed)
3. **Deploy jobs** download artifacts (no rebuild needed)

This saves ~5-10 minutes per CI run compared to rebuilding 3 times.

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

### Average CI/CD Times
- Tests: 2-3 min
- Build: 3-5 min
- E2E: 5-7 min
- Deploy (test): 2-3 min
- Deploy (production): 2-3 min
- **Total:** ~13-18 minutes

### Optimizations Applied
- ✓ Build artifacts cached and reused
- ✓ Playwright browsers cached
- ✓ Node.js dependencies cached
- ✓ Parallel test execution
- ✓ Early exit on test failures

## CI/CD Configuration

**Workflow file:** `.github/workflows/ci-cd.yml`
**Rollback workflow:** `.github/workflows/rollback.yml`
**Smoke test script:** `scripts/smoke-test.sh`

## Related Documentation

- [VERCEL_DOMAIN_SETUP.md](./VERCEL_DOMAIN_SETUP.md) - Vercel domain configuration
- [CLOUDFLARE_DNS_SETUP.md](./CLOUDFLARE_DNS_SETUP.md) - DNS setup
- [CLAUDE.md](./CLAUDE.md) - Branch protection and development rules
