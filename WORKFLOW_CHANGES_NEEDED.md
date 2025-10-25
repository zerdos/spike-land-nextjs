# Required Workflow Changes for Issue #23

## Summary
To complete the E2E authentication bypass fix, the following changes need to be made to `.github/workflows/ci-cd.yml`:

## Changes Required

### 1. Add E2E_BYPASS_SECRET to Build Step
In the "Build Project Artifacts" step (around line 113-116), add the environment variable:

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

After making these workflow changes, you'll need to add the `E2E_BYPASS_SECRET` to GitHub Secrets:

1. Go to: https://github.com/zerdos/spike-land-nextjs/settings/secrets/actions
2. Click "New repository secret"
3. Name: `E2E_BYPASS_SECRET`
4. Value: Generate a secure random string (e.g., using `openssl rand -base64 32`)
5. Click "Add secret"

## Why These Changes Are Needed

The E2E authentication bypass implementation requires a secret value that:
- Is sent as the `x-e2e-auth-bypass` header by Playwright tests
- Is validated by the middleware to bypass authentication
- Must be configured in both the build environment (for Next.js to include it) and the test environment (for Playwright to send it)

## After These Changes

Once these changes are made and the secret is configured:
1. E2E tests will be able to bypass authentication securely
2. All 35 previously disabled test scenarios will run
3. Tests will pass on Vercel preview deployments

## Note
The workflow file couldn't be automatically updated because the GitHub App lacks `workflows` permission (a security feature). These changes must be made manually by a repository maintainer.
