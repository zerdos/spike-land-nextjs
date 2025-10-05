# Branch Protection Setup Guide

This guide explains how to configure GitHub branch protection rules to ensure no code can be merged to `main` without passing all tests.

## Steps to Configure Branch Protection

### 1. Navigate to Branch Protection Settings

1. Go to your GitHub repository: https://github.com/zerdos/spike-land-nextjs
2. Click on **Settings** (top navigation)
3. Click on **Branches** (left sidebar under "Code and automation")
4. Under "Branch protection rules", click **Add rule** or **Add branch protection rule**

### 2. Configure the Protection Rule

#### Branch Name Pattern
- Enter: `main`

#### Protect Matching Branches - Enable These Settings:

✅ **Require a pull request before merging**
   - This ensures all changes go through a PR
   - Optional: Check "Require approvals" if you want code reviews (set number of required reviewers)
   - Optional: Check "Dismiss stale pull request approvals when new commits are pushed"

✅ **Require status checks to pass before merging**
   - Check this box
   - Check "Require branches to be up to date before merging"
   - In the search box, add these status checks (they appear after your first CI run):
     - `Run Tests` (unit tests)
     - `Build Application` (build verification)
     - Note: `Deploy to Vercel` and `E2E Tests` will only run after merge to main, so don't add them here

✅ **Require conversation resolution before merging** (recommended)
   - Ensures all PR comments are addressed

✅ **Do not allow bypassing the above settings** (recommended)
   - Prevents admins from bypassing these rules
   - Uncheck if you need emergency override capability

#### Optional but Recommended Settings:

✅ **Require linear history**
   - Prevents merge commits, keeps history clean
   - Requires rebase or squash merge

✅ **Require deployments to succeed before merging**
   - Optional: only if you want to require preview deployments

### 3. Save the Rule

Click **Create** or **Save changes** at the bottom of the page.

## How It Works

### After Configuration:

1. **Direct commits to `main` are blocked** - You must create a branch and PR
2. **All required status checks must pass** - Tests and build must succeed
3. **PR can only be merged after checks pass** - Green checkmarks required
4. **Failed tests block merging** - Red X prevents merge

### Workflow Example:

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"

# 3. Push to GitHub
git push origin feature/my-feature

# 4. Create Pull Request on GitHub
# - Tests will automatically run
# - Wait for all checks to pass ✅
# - Merge button will be enabled only when all checks pass

# 5. Merge the PR
# - After merge, deployment and E2E tests run on main
```

## Required Status Checks

The following checks must pass before merging:

- ✅ **Run Tests** - Unit tests with 100% coverage (Vitest)
- ✅ **Build Application** - Next.js build must succeed

After merge to main, these run automatically:
- **Deploy to Vercel** - Automatic deployment
- **E2E Tests** - Playwright/Cucumber tests against deployed URL

## Testing the Protection

Try to push directly to main:
```bash
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "Test protection"
git push origin main
```

You should see an error like:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
```

## Troubleshooting

### Status Checks Don't Appear
- Push a commit to trigger the CI pipeline first
- Status checks only appear after running at least once
- Check the workflow runs in the Actions tab

### Can't Find Status Checks
- Make sure you've run the workflow at least once
- The job names must match exactly: "Run Tests" and "Build Application"
- Check for spaces and capitalization

### Need to Override Protection
- Temporarily disable "Do not allow bypassing"
- Or give specific users/teams bypass permissions
- Re-enable after emergency fix

## Alternative: GitHub CLI Method

You can also set this up via GitHub CLI:

```bash
# Install GitHub CLI if needed
# brew install gh  # macOS
# Or: https://cli.github.com/

# Authenticate
gh auth login

# Create branch protection rule
gh api repos/zerdos/spike-land-nextjs/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=Run Tests \
  --field required_status_checks[contexts][]=Build Application \
  --field required_pull_request_reviews[required_approving_review_count]=0 \
  --field enforce_admins=true \
  --field restrictions=null
```

## Benefits

✅ **No broken code in main** - All tests must pass
✅ **Consistent quality** - Enforced code standards
✅ **Safe deployments** - Only tested code reaches production
✅ **Code review process** - PRs encourage collaboration
✅ **Audit trail** - All changes documented in PRs

## Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Status Checks Documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
