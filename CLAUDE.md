# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚀 PLATFORM VISION & MANIFESTO

### **Spike Land: AI-Powered App Platform**

Spike Land is an innovative platform that democratizes app development by connecting users with AI agents to create, modify, and deploy applications on demand.

### **Core Vision**

We are building a platform where:

- **Anyone can create apps** without coding knowledge
- **AI agents build apps** based on user requirements
- **Users can fork and modify** existing apps
- **Apps generate revenue** through flexible monetization models
- **External domains** host successful apps independently

### **Platform Architecture**

#### **User Roles & Capabilities**

**Visitors (Unauthenticated)**

- Browse public apps and features
- View platform capabilities
- Sign up / Log in

**Authenticated Users**

- Access protected "My Apps" section
- Create new apps from scratch
- Fork existing apps
- Add and modify app requirements
- Manage app settings
- Deploy apps (future)
- Monetize apps (future)

#### **Key Features**

1. **Authentication System**
   - Multi-provider OAuth (GitHub, Google)
   - Phone-based authentication (Twilio)
   - User profiles and settings
   - Protected routes and content

2. **My Apps Dashboard** (Protected Route)
   - User's app collection
   - Create new app wizard
   - Fork existing apps
   - App management interface

3. **Requirements Management**
   - Natural language app requirements
   - Structured requirement storage
   - Version control for requirements
   - Safe, secure database storage

4. **AI Agent Integration** (Future Phase)
   - Claude Code agents build apps on demand
   - Interpret user requirements
   - Generate production-ready code
   - Iterative refinement based on feedback
   - Automated testing and deployment

5. **App Deployment** (Future Phase)
   - Custom domain support
   - One-click deployment
   - External domain hosting
   - Scalable infrastructure

6. **Monetization Models** (Future Phase)
   - One-off payments
   - Subscription models
   - Freemium + Pro tiers
   - Revenue sharing with platform

### **Technical Stack**

**Current:**

- Next.js 15 (App Router)
- TypeScript (Strict Mode)
- NextAuth.js (Multi-provider)
- Tailwind CSS 4
- shadcn/ui components
- Prisma (Database ORM) - To be added
- PostgreSQL (Database) - To be added

**Future:**

- AI Agent Orchestration
- Payment Processing (Stripe)
- Domain Management
- CDN & Hosting Infrastructure

### **Development Phases**

**Phase 1: Authentication & Foundation** ✅ (Complete)

- [x] NextAuth setup (GitHub, Google, Phone)
- [x] Protected routes
- [x] User profiles
- [x] Settings page

**Phase 2: My Apps Platform** ✅ (Complete - Demonstrated with Pixel)

- [x] "My Apps" protected section
- [x] App creation wizard
- [x] Fork functionality
- [x] Requirements management UI
- [x] Database schema for apps & requirements

**Phase 3: AI Agent Integration** (Future)

- [ ] AI agent orchestration system
- [ ] Requirement-to-code pipeline
- [ ] Automated app generation
- [ ] Quality assurance & testing

**Phase 4: Deployment & Hosting** (Future)

- [ ] App deployment system
- [ ] Custom domain support
- [ ] External hosting
- [ ] Monitoring & analytics

**Phase 5: Monetization** (Future)

- [ ] Payment integration
- [ ] Subscription management
- [ ] Revenue tracking
- [ ] Payout system

### **Pixel - AI Image Enhancement App (Completed Implementation)**

Pixel is the AI-powered image enhancement app that serves as the showcase application for the Spike Land platform. Access it at https://spike.land/apps/images. All 5 implementation phases are complete:

**Phase 1: MVP** ✅ Complete

- [x] Image upload with drag-drop UI
- [x] Single-tier AI enhancement (TIER_1K)
- [x] Before/after comparison slider
- [x] Download functionality
- [x] Authentication integration

**Phase 2: Token Economy** ✅ Complete

- [x] Multi-tier enhancement (TIER_1K, TIER_2K, TIER_4K)
- [x] Token balance system with auto-regeneration (1 per 15 min)
- [x] Stripe integration (one-time purchases and subscriptions)
- [x] Token transaction history
- [x] Low balance warnings and refunds on failure

**Phase 3: Albums & Export** ✅ Complete

- [x] Album creation, editing, deletion
- [x] Batch image upload and organization
- [x] Album sharing with unlisted links
- [x] Export formats (JPEG, PNG, WebP)
- [x] Version history for enhanced images
- [x] Batch enhancement with queue processing

**Phase 4: Referral Program** ✅ Complete

- [x] Unique referral links per user
- [x] Referrer and referee token rewards (50 each)
- [x] Referral dashboard with statistics
- [x] Anti-fraud measures (IP-based, email verification)
- [x] Sign-up attribution tracking

**Phase 5: Admin Dashboard** ✅ Complete

- [x] User analytics (registrations, MAU, retention)
- [x] Token economy analytics (purchases, spend, burn rate)
- [x] System health monitoring (job queue, failure rates)
- [x] Admin tools (user search, voucher creation)
- [x] Legal pages (Terms, Privacy, Contact)
- [x] Email infrastructure (Resend integration)

### **Database Schema (Future)**

```typescript
// Core Models
User {
  id: string
  email: string
  name: string
  image: string
  apps: App[]
  createdAt: DateTime
  updatedAt: DateTime
}

App {
  id: string
  name: string
  description: string
  userId: string (owner)
  forkedFrom: string? (original app id)
  requirements: Requirement[]
  status: "draft" | "building" | "deployed" | "archived"
  domain: string?
  monetization: MonetizationModel?
  createdAt: DateTime
  updatedAt: DateTime
}

Requirement {
  id: string
  appId: string
  description: text
  priority: "high" | "medium" | "low"
  status: "pending" | "in-progress" | "completed"
  version: int
  createdAt: DateTime
  updatedAt: DateTime
}

MonetizationModel {
  id: string
  appId: string
  type: "free" | "one-time" | "subscription" | "freemium"
  price: decimal?
  subscriptionInterval: string?
  features: json
}
```

### **Security & Privacy**

- All user data encrypted at rest
- Secure requirement storage
- No unauthorized AI access to user data
- GDPR & privacy compliant
- Regular security audits

### **Business Model**

- Platform fee on paid apps (10-20%)
- Premium features for power users
- White-label solutions for enterprises
- AI agent usage-based pricing

---

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

- **CRITICAL**: Use git worktrees for all feature development (see "Git Worktree Setup" section)
- **CRITICAL**: Make MINIMAL CHANGES to existing patterns and structures
- **CRITICAL**: Preserve existing naming conventions and file organization
- Follow project's established architecture and component patterns
- Use existing utility functions and avoid duplicating functionality

## Project Overview

This is a Next.js 15 application with TypeScript, Tailwind CSS 4, and shadcn/ui components. It uses the App Router architecture and React Server Components (RSC). The project includes comprehensive testing (unit and E2E), automated CI/CD pipeline, and enforced code quality standards.

## Git Worktree Setup

**IMPORTANT**: This repository uses **git worktrees** for parallel development. The current directory structure is:

```
/Volumes/Dev/github.com/zerdos/spike-land-nextjs/
├── .bare/           # Bare repository (DO NOT work here directly)
└── main/            # Main branch worktree (primary working directory)
```

### Working with Worktrees

When you need to work on a new feature or fix:

```bash
# Navigate to the main worktree first
cd /Volumes/Dev/github.com/zerdos/spike-land-nextjs/main

# Create a new worktree for a feature branch
git worktree add ../feature-name -b feature-name

# Or checkout an existing remote branch
git worktree add ../existing-branch existing-branch

# Work in the new worktree
cd ../feature-name
yarn install  # Install dependencies if needed
yarn dev

# List all active worktrees
git worktree list

# Remove a worktree when done (after merging)
git worktree remove ../feature-name
# Or if you're inside the worktree:
cd ../main && git worktree remove ../feature-name
```

### Worktree Best Practices

- **DO**: Always create new worktrees for feature branches from the `main` worktree
- **DO**: Work in separate worktrees for parallel tasks
- **DO**: Remove worktrees after merging branches to keep the workspace clean
- **DON'T**: Make changes directly in the `.bare/` directory
- **DON'T**: Create worktrees inside other worktrees

### Quick Navigation Alias

There's a shell alias configured for quick navigation:

```bash
cd n  # Jumps to /Volumes/Dev/github.com/zerdos/spike-land-nextjs/main
```

## Development Commands

### Development

- **Start dev server**: `yarn dev` (runs on http://localhost:3000)
- **Build**: `yarn build`
- **Production server**: `yarn start`
- **Lint**: `yarn lint`

### Testing

- **Unit tests**: `yarn test` (watch mode)
- **Unit tests (run once)**: `yarn test:run`
- **Unit tests with UI**: `yarn test:ui`
- **Code coverage**: `yarn test:coverage` (requires 100% coverage)
- **E2E tests (local)**: `yarn test:e2e:local` (requires dev server running)
- **E2E tests (CI)**: `yarn test:e2e:ci` (uses BASE_URL env var)

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
- **Run tests**: `yarn test:coverage` to verify coverage
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
   - **Main branch**: Deploys to Vercel Production (https://spike.land)
   - **Other branches**: Deploys to Vercel Preview (temporary URLs)
   - Outputs deployment URL

4. **E2E Job** - Runs on all branches after successful deployment
   - Runs Playwright/Cucumber tests against deployment URL
   - Uploads test reports and screenshots as artifacts

### Deployment Strategy

- **Production**: `main` branch automatically deploys to https://spike.land
- **Preview**: All other branches get temporary preview URLs for testing
- **Domain**: Custom domain `spike.land` managed via Cloudflare DNS (see `docs/archive/CLOUDFLARE_DNS_SETUP.md`)
- **Configuration**: See `docs/archive/VERCEL_DOMAIN_SETUP.md` for Vercel domain configuration

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
# 1. Create feature worktree (from main worktree)
cd /Volumes/Dev/github.com/zerdos/spike-land-nextjs/main
git worktree add ../feature/my-feature -b feature/my-feature
cd ../feature/my-feature

# 2. Install dependencies (if needed)
yarn install

# 3. Make changes, write tests (100% coverage required)
# Add your code and corresponding tests

# 4. Run tests locally
yarn test:coverage  # Must pass with 100% coverage
yarn build          # Must build successfully

# 5. Rebase with latest main before creating PR
cd ../main
git pull origin main  # Update main worktree
cd ../feature/my-feature
git rebase main  # Rebase your feature branch on latest main

# 6. Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/my-feature

# 7. Create Pull Request
# - All tests run automatically
# - Preview deployment created
# - E2E tests run against preview
# - Must pass before merge is allowed

# 8. Merge when all checks pass ✅
# - Deploy to production automatically on merge to main

# 9. Clean up worktree after merge
cd ../main
git worktree remove ../feature/my-feature
git pull  # Update main with merged changes
```

### Rules for Contributors

- ❌ **No direct commits to main** - All changes via Pull Requests
- ✅ **Rebase before creating PR** - Always rebase your branch with latest main from origin before creating a pull request
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

1. **Tests fail** → Fix the code, ensure `yarn test:coverage` passes locally
2. **Build fails** → Check TypeScript errors, ensure `yarn build` works locally
3. **Lint fails** → Run `yarn lint` and fix issues
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

## Documentation Guidelines

### Writing Documentation Files

**CRITICAL**: Agents must follow these rules when creating documentation:

1. **NEVER create .md files in the project root** (except README.md and CLAUDE.md which already exist)
2. **All documentation must go in the `docs/` directory or subdirectories**:
   - `docs/` - Main documentation (database docs, setup guides, etc.)
   - `docs/archive/` - Historical documentation, implementation summaries, completion reports

3. **Acceptable documentation locations**:
   - ✅ `docs/FEATURE_NAME.md` - Feature documentation
   - ✅ `docs/setup/DATABASE_SETUP.md` - Setup guides
   - ✅ `docs/archive/IMPLEMENTATION_SUMMARY.md` - Historical records
   - ❌ `PROJECT_ROOT/SOME_DOC.md` - Never in root!

4. **When updating existing docs**:
   - Check `docs/` directory first for existing documentation
   - Update existing files rather than creating duplicates
   - Maintain consistent formatting and structure

5. **Exception**: Only README.md and CLAUDE.md should exist in the project root

This keeps the project root clean and documentation organized for future reference (blog articles, knowledge base, etc.).

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

- Run `yarn test:coverage` to see uncovered lines
- Add tests for all branches, functions, and statements
- Check `coverage/` directory for detailed HTML report

### E2E Tests Failing Locally

- Ensure dev server is running: `yarn dev`
- Use `yarn test:e2e:local` (not `test:e2e`)
- Check browser is installed: `yarn dlx playwright install chromium`

### CI/CD Pipeline Failing

- Check Actions tab for detailed logs
- Verify all secrets are configured (VERCEL_TOKEN, CODECOV_TOKEN)
- Ensure tests pass locally first
- Check if branch protection rules are blocking merge

## 🔧 GitHub CLI Orchestration

**CRITICAL**: This project uses GitHub as the single source of truth for all project management. Agents MUST use the `gh` CLI for orchestration tasks.

### GitHub Features to Use

| GitHub Feature  | Purpose                       | Replaces         |
| --------------- | ----------------------------- | ---------------- |
| **Issues**      | Task tracking, bugs, features | Jira tickets     |
| **Projects**    | Kanban boards, roadmaps       | Jira boards      |
| **Milestones**  | Release planning              | Jira sprints     |
| **Wiki**        | Documentation, specs          | Confluence       |
| **Discussions** | RFCs, decisions, Q&A          | Confluence/Slack |

### Essential gh Commands for Agents

#### Issues (Task Queue)

```bash
# List open issues
gh issue list --state open --json number,title,labels,assignees

# Create a new issue (when discovering work)
gh issue create --title "Title" --body "Description" --label "bug"

# Add comment when starting work
gh issue comment <number> --body "🤖 Starting work on this"

# Close with summary when done
gh issue close <number> --comment "✅ Completed: <summary>"

# Add label when blocked
gh issue edit <number> --add-label "blocked"
```

#### Projects (Kanban Board)

**Initial Setup** (if no project exists):

```bash
# Create a new project board
gh project create --title "Spike Land Roadmap" --owner @me

# The project will have default columns. To customize:
# Go to: https://github.com/users/{username}/projects/{n}/settings
# Add columns: Backlog, Up Next, In Progress, Done
```

**Daily Usage**:

```bash
# List projects
gh project list

# View project items
gh project item-list <project-number> --format json

# Add issue to project
gh project item-add <project-number> --url <issue-url>

# Update item status (move between columns)
gh project item-edit --id <item-id> --field-id <status-field-id> --single-select-option-id <option-id>
```

#### Milestones (Release Planning)

```bash
# List milestones
gh api repos/{owner}/{repo}/milestones

# Create milestone
gh api repos/{owner}/{repo}/milestones -f title="v1.0" -f due_on="2025-01-15T00:00:00Z"

# Assign issue to milestone
gh issue edit <number> --milestone "v1.0"
```

#### Wiki (Documentation)

```bash
# Clone wiki repo (wikis are separate git repos)
git clone https://github.com/{owner}/{repo}.wiki.git

# Update wiki page
echo "# Page Content" > wiki-repo/Page-Name.md
cd wiki-repo && git add . && git commit -m "Update docs" && git push
```

### Agent Workflow: GitHub-First Orchestration

**When starting a session:**

1. Check open issues: `gh issue list --state open`
2. Check project board status: `gh project item-list <n>`
3. Report status to user before asking what to work on

**When discovering work/bugs (AUTO-CREATE - no need to ask):**

1. Create an issue immediately: `gh issue create --label "agent-created"`
2. Add to project board if exists
3. Add appropriate labels (bug, feature, tech-debt, p0, p1, p2)
4. Continue with current work - don't block on the discovery

**When starting work:**

1. Comment on issue: `gh issue comment <n> --body "🤖 Working on this"`
2. Assign yourself (or note agent is working): `gh issue edit <n> --add-assignee "@me"`

**When blocked:**

1. Add blocked label: `gh issue edit <n> --add-label "blocked"`
2. Comment with blocker details
3. Create new issue for the blocker if needed

**When completing work:**

1. Close issue with summary: `gh issue close <n> --comment "✅ Done: <summary>"`
2. Update project board if applicable
3. Link PR to issue: Include "Resolves #<n>" in PR description

### Labels to Use

- `p0`, `p1`, `p2` - Priority levels
- `bug` - Bug fixes
- `feature` - New features
- `tech-debt` - Technical debt
- `blocked` - Blocked by something
- `in-progress` - Currently being worked on
- `agent-created` - Auto-created by AI agent

### Creating Visibility for Decision Making

Agents should help the owner make decisions by:

1. Keeping issues updated with current status
2. Using labels consistently for filtering
3. Adding context in issue comments (not just commits)
4. Summarizing blockers and open questions prominently
