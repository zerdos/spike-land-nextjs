# GitHub Actions CI/CD Pipeline

This workflow automatically tests, builds, and deploys your Next.js application on every commit to the main branch.

## Workflow Steps

1. **Test** - Runs linter and unit tests with 100% coverage requirement
2. **Build** - Builds the Next.js application (only if tests pass)
3. **Deploy** - Deploys to Vercel (only on main branch, only if build succeeds)

## Required Secrets

To enable deployment, you need to add the following secrets to your GitHub repository:

### Vercel Deployment (Required)

1. **VERCEL_TOKEN**
   - Go to https://vercel.com/account/tokens
   - Create a new token
   - Add it to GitHub: Settings → Secrets and variables → Actions → New repository secret
   - Name: `VERCEL_TOKEN`

2. **VERCEL_ORG_ID** (Optional, for team deployments)
   - Run `vercel link` in your project directory
   - Find the value in `.vercel/project.json`

3. **VERCEL_PROJECT_ID** (Optional, for specific project targeting)
   - Run `vercel link` in your project directory
   - Find the value in `.vercel/project.json`

### Code Coverage (Optional)

4. **CODECOV_TOKEN** (Optional, for coverage reporting)
   - Go to https://codecov.io
   - Link your GitHub repository
   - Copy the token
   - Add it to GitHub secrets with name: `CODECOV_TOKEN`

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings**
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with its respective name and value

## Local Testing

To test the workflow locally, you can use [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash  # Linux

# Run the workflow
act push
```

## Triggering the Workflow

The workflow automatically runs when:
- You push commits to `main` or `develop` branches
- You create a pull request targeting `main` or `develop`

Deployment only happens when:
- Tests pass ✅
- Build succeeds ✅
- Push is to the `main` branch ✅
