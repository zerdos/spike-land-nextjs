# Required Workflow Changes for Issue #23

## Summary

To complete the E2E authentication bypass fix, the following changes need to be
made to `.github/workflows/ci-cd.yml`:

## Changes Required

### 1. Add E2E_BYPASS_SECRET to Build Step

In the "Build Project Artifacts" step (around line 113-116), add the environment
variable:

```yaml
- name: Build Project Artifacts
  env:
    E2E_BYPASS_SECRET: ${{ secrets.E2E_BYPASS_SECRET }}
  run: vercel build ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}
```

### 2. Add E2E_BYPASS_SECRET to E2E Test Step

In the "Run E2E tests" step (around line 167-171), add the environment variable:

```yaml
- name: Run E2E tests
  env:
    BASE_URL: ${{ needs.deploy.outputs.deployment-url }}
    E2E_BYPASS_SECRET: ${{ secrets.E2E_BYPASS_SECRET }}
  run: npm run test:e2e:ci
```

## GitHub Secret Setup

After making these workflow changes, you'll need to add the `E2E_BYPASS_SECRET`
to GitHub Secrets:

1. Go to: https://github.com/zerdos/spike-land-nextjs/settings/secrets/actions
2. Click "New repository secret"
3. Name: `E2E_BYPASS_SECRET`
4. Value: Generate a secure random string (e.g., using
   `openssl rand -base64 32`)
5. Click "Add secret"

## Vercel Environment Variable Setup

**CRITICAL:** In addition to GitHub Secrets, the `E2E_BYPASS_SECRET` must also
be added to Vercel for runtime middleware access.

### For Preview Environments (REQUIRED)

The middleware runs at runtime in Vercel's edge network and needs access to the
secret:

1. Go to:
   https://vercel.com/your-team/spike-land-next/settings/environment-variables
2. Click "Add New" → "Environment Variable"
3. **Name:** `E2E_BYPASS_SECRET`
4. **Value:** (same value as GitHub Secret - use `openssl rand -base64 32`)
5. **Environments:** ✅ **Preview ONLY** (do NOT select Production)
6. Click "Save"

### Why Vercel Needs This

- **Build-time:** GitHub Actions provides the secret during build (for Next.js
  build process)
- **Runtime:** Vercel provides the secret at runtime (for middleware execution
  on edge network)
- **GitHub Secrets** are available during CI/CD pipeline execution
- **Vercel Environment Variables** are available to the deployed application at
  runtime

### Security Configuration

⚠️ **IMPORTANT SECURITY REQUIREMENTS:**

- **DO NOT** add `E2E_BYPASS_SECRET` to Production environment in Vercel
- **ONLY** add to Preview and Development environments
- The middleware includes production environment checks that block the bypass
  even if the secret is configured
- Production is protected by checking both `NODE_ENV === 'production'` AND
  `VERCEL_ENV === 'production'`

## Production Environment Protection

The E2E bypass includes defense-in-depth security:

### Multi-Layer Protection

1. **Environment Check:** Bypass only works when `NODE_ENV` is NOT production OR
   `VERCEL_ENV` is NOT production
2. **Secret Validation:** Uses constant-time comparison to prevent timing
   attacks
3. **Audit Logging:** All bypass attempts are logged with timestamp, path, and
   environment info
4. **Explicit Configuration:** Secret must be explicitly set (empty strings are
   rejected)

### Environment Behavior

| NODE_ENV    | VERCEL_ENV  | Bypass Allowed? | Notes                               |
| ----------- | ----------- | --------------- | ----------------------------------- |
| production  | production  | ❌ **NO**       | Full production - bypass blocked    |
| production  | preview     | ✅ Yes          | Preview deployment - bypass allowed |
| development | production  | ✅ Yes          | Local dev - bypass allowed          |
| development | (undefined) | ✅ Yes          | Local dev - bypass allowed          |
| test        | preview     | ✅ Yes          | CI E2E tests - bypass allowed       |

### Audit Logging

When the E2E bypass is used, the middleware logs:

```javascript
[E2E Bypass] {
  timestamp: '2025-10-28T10:30:45.123Z',
  path: '/my-apps',
  environment: {
    NODE_ENV: 'test',
    VERCEL_ENV: 'preview'
  }
}
```

This appears in Vercel logs and can be used for security monitoring and
debugging.

## Why These Changes Are Needed

The E2E authentication bypass implementation requires a secret value that:

- Is sent as the `x-e2e-auth-bypass` header by Playwright tests
- Is validated by the middleware to bypass authentication
- Must be configured in both the build environment (for Next.js to include it)
  and the test environment (for Playwright to send it)

## After These Changes

Once these changes are made and the secret is configured:

1. E2E tests will be able to bypass authentication securely
2. All 35 previously disabled test scenarios will run
3. Tests will pass on Vercel preview deployments

## Note

The workflow file couldn't be automatically updated because the GitHub App lacks
`workflows` permission (a security feature). These changes must be made manually
by a repository maintainer.
