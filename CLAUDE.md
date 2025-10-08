# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Feature Implementation System Guidelines

### Feature Implementation Priority Rules
- IMMEDIATE EXECUTION: Launch parallel Tasks immediately upon feature requests
- NO CLARIFICATION: Skip asking what type of implementation unless absolutely critical
- PARALLEL BY DEFAULT: Always use 7-parallel-Task method for efficiency

### Parallel Feature Implementation Workflow
1. **Component**: Create main component file
2. **Styles**: Create component styles/CSS
3. **Tests**: Create test files
4. **Types**: Create type definitions
5. **Hooks**: Create custom hooks/utilities
6. **Integration**: Update routing, imports, exports
7. **Remaining**: Update package.json, documentation, configuration files
8. **Review and Validation**: Coordinate integration, run tests, verify build, check for conflicts

### Context Optimization Rules
- Strip out all comments when reading code files for analysis
- Each task handles ONLY specified files or file types
- Task 7 combines small config/doc updates to prevent over-splitting

### Feature Implementation Guidelines
- **CRITICAL**: Make MINIMAL CHANGES to existing patterns and structures
- **CRITICAL**: Preserve existing naming conventions and file organization
- Follow project's established architecture and component patterns
- Use existing utility functions and avoid duplicating functionality




## Project Overview

This is a Next.js 15 application with TypeScript, Tailwind CSS 4, and shadcn/ui components. It uses the App Router architecture and React Server Components (RSC). The project includes comprehensive testing (unit and E2E), automated CI/CD pipeline, and enforced code quality standards.

## Development Commands

### Development
- **Start dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Lint**: `npm run lint`

### Testing
- **Unit tests**: `npm test` (watch mode)
- **Unit tests (run once)**: `npm run test:run`
- **Unit tests with UI**: `npm run test:ui`
- **Code coverage**: `npm run test:coverage` (requires 100% coverage)
- **E2E tests (local)**: `npm run test:e2e:local` (requires dev server running)
- **E2E tests (CI)**: `npm run test:e2e:ci` (uses BASE_URL env var)

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 with CSS variables for theming
- **UI Components**: shadcn/ui (New York style variant)
- **Fonts**: Geist Sans and Geist Mono (via next/font)
- **Unit Testing**: Vitest + React Testing Library (100% coverage enforced)
- **E2E Testing**: Playwright + Cucumber (BDD)
- **CI/CD**: GitHub Actions + Vercel deployment
- **Code Quality**: ESLint, TypeScript strict mode, automated testing

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── layout.tsx          # Root layout with fonts and metadata
│   ├── layout.test.tsx     # Layout tests
│   ├── page.tsx            # Home page
│   └── page.test.tsx       # Page tests
│   └── globals.css         # Global styles and Tailwind imports
├── components/             # React components
│   └── ui/                 # shadcn/ui components (button, card, etc.)
│       ├── button.tsx
│       ├── button.test.tsx
│       ├── card.tsx
│       └── card.test.tsx
└── lib/
    ├── utils.ts            # Utility functions (cn helper for class merging)
    └── utils.test.ts       # Utils tests

e2e/
├── features/               # Cucumber feature files (BDD scenarios)
├── step-definitions/       # Playwright step implementations
├── support/                # Test helpers and configuration
└── reports/                # Generated test reports

.github/
└── workflows/
    └── ci-cd.yml          # CI/CD pipeline configuration
```

### shadcn/ui Configuration
The project uses shadcn/ui with the following configuration (components.json):
- **Style**: new-york
- **RSC**: Enabled (React Server Components)
- **Base color**: neutral
- **CSS variables**: Enabled
- **Path aliases**:
  - `@/components` → src/components
  - `@/ui` → src/components/ui
  - `@/lib` → src/lib
  - `@/hooks` → src/hooks
  - `@/utils` → src/lib/utils

### Styling System
- Tailwind CSS uses HSL-based CSS variables for theming (defined in globals.css)
- Dark mode is configured with class-based strategy
- Custom border radius values use CSS variables (--radius)
- Use the `cn()` utility from `@/lib/utils` to merge Tailwind classes

### Adding shadcn/ui Components
When adding new shadcn/ui components, they should be placed in `src/components/ui/` and follow the established patterns using the configured path aliases.

## Testing Requirements

### Unit Testing (Vitest + React Testing Library)
- **100% code coverage required** - All statements, branches, functions, and lines must be covered
- **Test files**: Place `.test.ts` or `.test.tsx` files alongside source files
- **Configuration**: `vitest.config.ts` with coverage thresholds
- **Run tests**: `npm run test:coverage` to verify coverage
- **Exclusions**: Test files are excluded from Next.js type checking (see `tsconfig.json`)

### E2E Testing (Playwright + Cucumber)
- **BDD approach**: Write human-readable feature files in Gherkin syntax
- **Feature files**: Place `.feature` files in `e2e/features/`
- **Step definitions**: Implement steps in `e2e/step-definitions/*.steps.ts`
- **Environment-aware**: Tests run against localhost locally, deployed URL in CI
- **Screenshots**: Automatic screenshot capture on test failures
- **Reports**: HTML reports generated in `e2e/reports/`

## CI/CD Pipeline

### GitHub Actions Workflow
The project uses a multi-stage CI/CD pipeline (`.github/workflows/ci-cd.yml`):

1. **Test Job** - Runs on all pushes and PRs
   - Linting
   - Unit tests with 100% coverage requirement
   - Coverage reports uploaded to Codecov

2. **Build Job** - Only if tests pass
   - Next.js build
   - Build artifacts uploaded

3. **Deploy Job** - Runs on all branches after successful build
   - **Main branch**: Deploys to Vercel Production (https://next.spike.land)
   - **Other branches**: Deploys to Vercel Preview (temporary URLs)
   - Outputs deployment URL

4. **E2E Job** - Runs on all branches after successful deployment
   - Runs Playwright/Cucumber tests against deployment URL
   - Uploads test reports and screenshots as artifacts

### Deployment Strategy
- **Production**: `main` branch automatically deploys to https://next.spike.land
- **Preview**: All other branches get temporary preview URLs for testing
- **Domain**: Custom domain `next.spike.land` managed via Cloudflare DNS (see `CLOUDFLARE_DNS_SETUP.md`)
- **Configuration**: See `VERCEL_DOMAIN_SETUP.md` for Vercel domain configuration

### Required GitHub Secrets
- `VERCEL_TOKEN` - Vercel deployment token (required)
- `CODECOV_TOKEN` - Codecov upload token (optional, for coverage reports)

## Branch Protection Rules

### Main Branch Protection (REQUIRED SETUP)
To enforce code quality, configure branch protection for `main`:

1. Go to: Settings → Branches → Add branch protection rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
     - Required checks: `Run Tests`, `Build Application`, `E2E Tests`
   - ✅ **Do not allow bypassing the above settings**

**See `.github/BRANCH_PROTECTION_SETUP.md` for detailed instructions.**

### Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes, write tests (100% coverage required)
# Add your code and corresponding tests

# 3. Run tests locally
npm run test:coverage  # Must pass with 100% coverage
npm run build          # Must build successfully

# 4. Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/my-feature

# 5. Create Pull Request
# - All tests run automatically
# - Preview deployment created
# - E2E tests run against preview
# - Must pass before merge is allowed

# 6. Merge when all checks pass ✅
# - Deploy to production manually when ready
```

### Rules for Contributors
- ❌ **No direct commits to main** - All changes via Pull Requests
- ✅ **All tests must pass** - Unit tests with 100% coverage
- ✅ **Build must succeed** - No broken builds allowed
- ✅ **Preview deployment required** - Every PR gets tested preview
- ✅ **E2E tests required** - Must pass against preview before merge
- ✅ **Code review recommended** - Enable PR approvals in branch protection
- ⚠️ **CRITICAL: Always wait for CI to pass** - After pushing code, monitor the CI/CD pipeline and verify all checks pass before considering the task complete

## ⚠️ CRITICAL RULE: CI/CD Verification

**IMPORTANT FOR CLAUDE CODE AGENTS:**

When working on this repository, you **MUST** follow this process for every code change:

1. **Push your changes** to a feature branch
2. **Create a Pull Request** (or push to existing PR)
3. **Wait for CI checks to start** - Don't assume success
4. **Monitor the CI pipeline** - Use `gh pr checks` or `gh run view` commands
5. **Verify ALL checks pass**:
   - ✅ Run Tests (unit tests with 100% coverage)
   - ✅ Build Application (Next.js build)
   - ✅ Deploy to Vercel Preview (preview deployment)
   - ✅ E2E Tests (Playwright/Cucumber tests against preview)
   - ✅ Codecov (optional, for coverage reporting)
6. **Fix any failures immediately** - Do not leave failing CI
7. **Only consider the task complete** when all checks are green ✅

### How to Monitor CI Status

```bash
# Check PR status
gh pr view <PR-NUMBER> --json statusCheckRollup

# View specific check details
gh pr checks <PR-NUMBER>

# Watch a specific workflow run
gh run view <RUN-ID> --log-failed

# Wait for checks to complete (use sleep and poll)
sleep 30 && gh pr checks <PR-NUMBER>
```

### Common CI Failures and Fixes

1. **Tests fail** → Fix the code, ensure `npm run test:coverage` passes locally
2. **Build fails** → Check TypeScript errors, ensure `npm run build` works locally
3. **Lint fails** → Run `npm run lint` and fix issues
4. **Coverage drops** → Add tests to maintain 100% coverage

**DO NOT mark a task as complete if:**
- CI is still running (status: IN_PROGRESS, PENDING)
- Any check has failed (conclusion: FAILURE)
- You haven't verified the status after pushing

**Recurring Issue:** Agents often assume tasks are done after pushing code, without waiting for CI verification. This leads to broken builds in the repository. Always wait and verify!

## Adding New Features

When adding new features:
1. **Write the feature code** in appropriate `src/` directory
2. **Write unit tests** with 100% coverage in `.test.ts(x)` files
3. **Add E2E tests** if feature involves user interactions:
   - Create `.feature` file in `e2e/features/`
   - Implement step definitions in `e2e/step-definitions/`
4. **Run all tests locally** before pushing
5. **Create Pull Request** and wait for CI checks
6. **Merge only when all checks pass**

## Issue Management

### Resolving Project Issues

When the user asks to resolve project issues, follow this workflow:

1. **Fetch open issues** using the GitHub CLI:
   ```bash
   gh issue list --state open --json number,title,author,body,url
   ```

2. **Check issue authorship**:
   - **If created by `zerdos`**: Proceed with resolving the issue automatically
   - **If created by someone else**: Ask the user what to do with the issue before proceeding

3. **Delegate to agents**: Use the Task tool to delegate each issue to a specialized agent for resolution
   - Create separate agents for independent issues to work in parallel
   - Each agent **MUST** complete the full workflow:
     - Analyze the issue requirements
     - Implement the fix or feature
     - Write tests with 100% coverage
     - **Commit changes** with issue number in commit message
     - **Push to GitHub** on a feature branch
     - **Create Pull Request** using `gh pr create` with issue number in description
     - **Monitor CI/CD pipeline** using `gh pr checks`
     - **Wait for all CI checks to complete** - Do not assume success
     - **Fix any CI failures immediately** and push fixes
     - **Verify all checks pass** before marking task complete
     - Only complete the task when PR is ready to merge (all checks green ✅)

4. **Reference issues in commits and PRs**: **CRITICAL** - All changes from GitHub issues MUST include the issue number:
   ```bash
   # Commit message format (REQUIRED)
   git commit -m "Fix authentication bug

   Resolves #123"

   # PR creation with issue reference (REQUIRED)
   gh pr create --title "Fix authentication bug (#123)" --body "$(cat <<'EOF'
   ## Summary
   - Fixed authentication bug by updating session validation

   ## Issue
   Resolves #123

   ## Test plan
   - [x] Unit tests pass with 100% coverage
   - [x] E2E tests pass
   - [x] Build succeeds

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

### Example Workflow

```bash
# User: "Please resolve all open issues"

# 1. Fetch issues
gh issue list --state open --json number,title,author,body,url

# 2. For each issue from zerdos:
#    - Launch Task agent with context about the issue
#    - Agent workflow:
#      a. Create worktree for feature branch
#      b. Implement fix/feature
#      c. Write tests (100% coverage)
#      d. Commit with "Resolves #<issue-number>"
#      e. Push to GitHub
#      f. Create PR with gh pr create (include issue number)
#      g. Monitor CI with gh pr checks
#      h. Wait for CI to complete
#      i. If CI fails: fix issues, commit, push, repeat from step g
#      j. When all checks pass: mark task complete

# 3. For issues from others:
#    - Present issue details to user
#    - Wait for user decision before proceeding
```

### CI Monitoring Commands for Agents

Agents working on issues **MUST** use these commands to monitor CI:

```bash
# After creating PR, get the PR number
PR_NUMBER=$(gh pr view --json number -q .number)

# Check PR status (run this multiple times until complete)
gh pr checks $PR_NUMBER

# View detailed status
gh pr view $PR_NUMBER --json statusCheckRollup

# If checks fail, view logs
gh run list --branch <branch-name> --limit 1
gh run view <run-id> --log-failed
```

## Troubleshooting

### Coverage Not 100%
- Run `npm run test:coverage` to see uncovered lines
- Add tests for all branches, functions, and statements
- Check `coverage/` directory for detailed HTML report

### E2E Tests Failing Locally
- Ensure dev server is running: `npm run dev`
- Use `npm run test:e2e:local` (not `test:e2e`)
- Check browser is installed: `npx playwright install chromium`

### CI/CD Pipeline Failing
- Check Actions tab for detailed logs
- Verify all secrets are configured (VERCEL_TOKEN, CODECOV_TOKEN)
- Ensure tests pass locally first
- Check if branch protection rules are blocking merge
