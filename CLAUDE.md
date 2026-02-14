# AGENTS.md

This file provides guidance to agents when working with code in this repository.

---

## 🏢 Business Context

| Field       | Value                                 |
| ----------- | ------------------------------------- |
| **Company** | SPIKE LAND LTD (UK Company #16906682) |
| **Domain**  | spike.land                            |
| **Owner**   | Zoltan Erdos                          |

See [docs/business/BUSINESS_STRUCTURE.md](./docs/business/BUSINESS_STRUCTURE.md) for full company
documentation.

---

## 📚 Documentation References

**DO NOT duplicate content from these docs in this file. Link to them instead.**

| Topic                      | Document                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- |
| Platform Vision & Features | [docs/features/FEATURES.md](./docs/features/FEATURES.md)                         |
| API Reference              | [docs/architecture/API_REFERENCE.md](./docs/architecture/API_REFERENCE.md)       |
| Token System               | [docs/architecture/TOKEN_SYSTEM.md](./docs/architecture/TOKEN_SYSTEM.md)         |
| Database Schema            | [docs/architecture/DATABASE_SCHEMA.md](./docs/architecture/DATABASE_SCHEMA.md)   |
| Database Setup             | [docs/architecture/DATABASE_SETUP.md](./docs/architecture/DATABASE_SETUP.md)     |
| My-Apps Architecture       | [docs/architecture/MY_APPS_ARCHITECTURE.md](./docs/architecture/MY_APPS_ARCHITECTURE.md) |
| Development Setup          | [README.md](./README.md)                                                         |
| Shared Package             | [packages/shared/README.md](./packages/shared/README.md)                         |
| Code Editor                | [packages/code/README.md](./packages/code/README.md)                             |
| Backend Worker             | [packages/testing.spike.land/README.md](./packages/testing.spike.land/README.md) |
| Transpiler Worker          | [packages/js.spike.land/README.md](./packages/js.spike.land/README.md)           |

---

## 🎫 Ticket-Driven Development (BLOCKING REQUIREMENT)

**CRITICAL**: No code changes without a ticket. Every PR must trace back to
documented requirements.

### Phase 0: Ticket Governance (BLOCKING)

> **Fast-path:** If CI runs under 10 seconds and the change is small (single commit),
> you may commit directly to main without a ticket. Use `file_guard` to verify first.

#### Step 1: Investigate Project Board

```bash
# Log in
echo ${GH_PAT_TOKEN} | gh auth login --with-token

# List all items in the project board
gh project item-list 2 --owner zerdos --format json

# Check for existing issues matching keywords
gh issue list --repo zerdos/spike-land-nextjs --search "<feature keywords>" --json number,title,body,state
```

#### Step 2: For Each Feature Request

**IF related ticket exists:**

```bash
gh issue edit <number> --body "$(cat <<'EOF'
## Updated Requirements
<updated content here>
EOF
)"
```

**IF no ticket exists:**

```bash
gh issue create --repo zerdos/spike-land-nextjs \
  --title "Feature: <clear title>" \
  --body "## User Request
<original user request verbatim>

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Approach
<planned implementation>

## Files Expected to Change
- path/to/file1.ts

## Out of Scope
- Explicitly list what this ticket does NOT cover" \
  --label "feature" \
  --project "zerdos/2"
```

#### Step 3: Link & Confirm

- Output ticket URLs to user for approval before proceeding
- **WAIT** for user confirmation: "Tickets approved, proceed"

### Implementation Phases

1. **Discovery**: Read relevant docs ONLY after tickets exist
2. **Parallel Implementation**: Spawn subagents per ticket
3. **PR Review**: Verify traceability to acceptance criteria

### Feature Implementation Rules

- **TICKET FIRST**: Create/update GitHub issue BEFORE any code changes
- **USER APPROVAL**: Wait for user to confirm tickets before implementation
- **TRACEABILITY**: Every PR change must map to acceptance criteria
- **NO SCOPE CREEP**: Undocumented changes = blocked PR

---

## ⚠️ CI/CD Verification (CRITICAL)

**IMPORTANT FOR CLAUDE CODE AGENTS:**

When working on this repository, you **MUST** follow this process for every code
change:

1. **Push your changes** to a feature branch
2. **Create a Pull Request** (or push to existing PR)
3. **Wait for CI checks to start** - Don't assume success
4. **Monitor the CI pipeline** - Use `gh pr checks` or `gh run view`
5. **Verify ALL checks pass**:
   - ✅ Run Tests (unit tests with enforced CI coverage thresholds)
   - ✅ Build Application (Next.js build)
   - ✅ Deploy to Vercel Preview
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
```

**DO NOT mark a task as complete if:**

- CI is still running (status: IN_PROGRESS, PENDING)
- Any check has failed (conclusion: FAILURE)
- You haven't verified the status after pushing

---

## 🔥 Pre-Merge Smoke Test (MANDATORY)

Before merging ANY pull request, manually verify on the **Vercel preview URL**:

- [ ] Home page loads without errors
- [ ] Navigation works correctly
- [ ] No console errors in browser dev tools
- [ ] New/modified features work as expected
- [ ] Login flow works (if applicable)

Document the result in PR comments before merging.

---

## 🔧 GitHub CLI Orchestration

**CRITICAL**: This project uses GitHub as the single source of truth for all
project management.

### Essential gh Commands

```bash
# Issues
gh issue list --state open --json number,title,labels,assignees
gh issue create --title "Title" --body "Description" --label "bug"
gh issue comment <number> --body "🤖 Starting work on this"
gh issue close <number> --comment "✅ Completed: <summary>"

# Projects
gh project item-list 2 --owner zerdos --format json
gh project item-add 2 --owner zerdos --url <issue-url>

# PRs
gh pr create --title "feat: <title> (#<number>)" --body "Resolves #<number>"
gh pr checks <PR-NUMBER>
```

### Agent Workflow

**When starting a session:**

1. Check open issues: `gh issue list --state open`
2. Check project board: `gh project item-list 2 --owner zerdos`
3. Report status to user before asking what to work on

**When discovering work/bugs:**

1. Create an issue immediately: `gh issue create --label "agent-created"`
2. Add appropriate labels (bug, feature, tech-debt, p0, p1, p2)
3. Continue with current work - don't block on the discovery

**When completing work:**

1. Close issue: `gh issue close <n> --comment "✅ Done: <summary>"`
2. Link PR to issue: Include "Resolves #<n>" in PR description

### Labels

- `p0`, `p1`, `p2` - Priority levels
- `bug`, `feature`, `tech-debt` - Issue types
- `blocked`, `in-progress`, `agent-created` - Status

---

## 📁 Issue Management

### Resolving Project Issues

1. **Fetch open issues**:
   `gh issue list --state open --json number,title,author,body,url`

2. **Check authorship**:
   - **If created by `zerdos`**: Proceed automatically
   - **If created by someone else**: Ask user what to do

3. **Reference issues in commits and PRs** (REQUIRED):
   ```bash
   git commit -m "Fix authentication bug

   Resolves #123"

   gh pr create --title "Fix authentication bug (#123)" --body "Resolves #123"
   ```

---

## 🌳 Git Worktree Setup

This repository uses **git worktrees** for parallel development:

```
<repository-root>/
├── .bare/           # Bare repository (DO NOT work here directly)
└── main/            # Main branch worktree (primary working directory)
```

### Working with Worktrees

```bash
# Create new worktree for feature branch (from main worktree)
git worktree add ../feature-name -b feature-name

# Work in the new worktree
cd ../feature-name
yarn install --immutable
yarn dev

# Remove worktree when done
cd ../main && git worktree remove ../feature-name
```

### Best Practices

- **DO**: Create worktrees for feature branches from `main` worktree
- **DO**: Remove worktrees after merging
- **DON'T**: Make changes in `.bare/` directory
- **DON'T**: Create worktrees inside other worktrees

---

## 🛠️ Quick Reference

### Development Commands

**Web App:**

```bash
yarn dev              # Start dev server (http://localhost:3000)
yarn build            # Build for production
yarn lint             # Run ESLint
yarn test:coverage    # Unit tests with enforced CI coverage thresholds
```

**Dev Workflow (MCP-integrated):**

```bash
yarn start:dev            # Start dev server + Claude Code with MCP
yarn start:dev:guard      # Start with file guard (auto-test on change)
yarn dev:logs             # View dev server logs
yarn dev:logs:tail        # Follow dev server logs
yarn dev:logs:clear       # Clear dev server logs
```

**MCP Dev Tools (localhost only):**

When running locally, the spike.land MCP server exposes dev workflow tools:
- `dev_logs` — Read dev server logs (filterable, tail-able)
- `dev_status` — Server PID, uptime, port, current commit
- `github_status` — Current branch, commit, CI status, open PRs
- `file_guard` — Pre-check file changes against `vitest --changed`
- `notify_agent` — Send/receive dev event notifications

### Trunk-Based Development (When CI < 10s)

When `vitest --changed HEAD` runs in under 10 seconds:
- Commit directly to main — no branches needed
- Use `file_guard` MCP tool to verify changes pre-commit
- CI catches issues in real-time
- Still create branches for multi-day features or multi-agent collaboration

**Shared Package:**

```bash
cd packages/shared
yarn build            # Build shared package
yarn dev              # Watch mode
```

**Cloudflare Workers:**

```bash
# Code Editor Frontend (packages/code)
cd packages/code && yarn dev          # Start Vite dev server
cd packages/code && yarn test:run     # Run tests

# Backend Worker (packages/testing.spike.land)
cd packages/testing.spike.land && yarn dev      # Start worker locally
cd packages/testing.spike.land && yarn test:unit # Run unit tests

# Transpiler Worker (packages/js.spike.land)
cd packages/js.spike.land && yarn dev           # Start worker locally
```

### Tech Stack

**Web App:**

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Vitest (unit + MCP tool tests)
- **CI/CD**: GitHub Actions + Vercel

### Directory Structure (Monorepo)

```
spike-land-nextjs/
├── src/                      # Web app (Next.js)
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   │   └── ui/               # shadcn/ui components
│   └── lib/                  # Utilities
│
├── packages/
│   ├── code/                 # React code editor (Vite + Monaco)
│   │   ├── src/@/            # Main source with shadcn/ui
│   │   │   ├── components/   # Editor components
│   │   │   ├── lib/          # Utilities and AI handlers
│   │   │   └── workers/      # Web Workers (esbuild, ata)
│   │   └── src/workflows/    # AI workflow tools
│   │
│   ├── js.spike.land/        # Cloudflare Worker transpiler
│   │   └── src/              # esbuild-based transpilation
│   │
│   ├── testing.spike.land/   # Backend Cloudflare Worker
│   │   └── src/
│   │       ├── mcp/          # MCP server implementation
│   │       ├── routes/       # API routes (live, auth, AI)
│   │       └── chatRoom.ts   # Durable Object (Code class)
│   │
│   └── shared/               # Shared code
│       └── src/
│           ├── types/        # TypeScript types
│           ├── constants/    # Shared constants
│           ├── validations/  # Zod schemas
│           └── utils/        # Utility functions
```

See [README.md](./README.md) for full development setup.

---

## ✅ Testing Requirements

- **Coverage thresholds enforced in CI** on MCP business logic (`src/lib/mcp/**/*.ts`):
  - Lines: 80%, Functions: 80%, Branches: 75%, Statements: 80%
- **Test files**: Place `.test.ts(x)` alongside source files
- **MCP tool tests**: Business logic exposed as MCP tools, tested with `createMockRegistry()` pattern

---

## 🔒 Code Quality Rules (BLOCKING)

- **NEVER** use `any` type (`as any`, `: any`, `Record<string, any>`) - use proper types or `unknown`
- **NEVER** add `eslint-disable` or `eslint-ignore` comments - fix the underlying issue instead
- **NEVER** use `@ts-ignore` or `@ts-nocheck` - fix the type error properly
- Existing pattern for dynamic Prisma imports: `const prisma = (await import("@/lib/prisma")).default;` (no type annotation needed - TypeScript infers it)

---

## 🐛 Bug-Fixing Workflow (BLOCKING REQUIREMENT)

**CRITICAL**: When fixing styling or UI bugs, agents MUST follow this test-driven process:

### Step 1: Reproduce the Bug

- Visually confirm the bug exists
- Document the reproduction steps

### Step 2: Write a Failing Test

- **Unit test** (preferred for logic/state bugs): Write a test in the component's `.test.tsx` that fails with the current buggy code
- **MCP tool test** (preferred for business logic bugs): Write an MCP tool test that fails with the buggy code
- **Verify the test fails** before proceeding to the fix

### Step 3: Fix the Bug

- Implement the minimal fix
- The test from Step 2 must now pass

### Step 4: Verify

- Run `yarn test:coverage` — all tests pass
- Run `yarn lint` — no lint errors
- For UI bugs: visually confirm the fix in the browser

---

## 📝 Documentation Guidelines

**CRITICAL**: Agents must follow these rules:

1. **NEVER create .md files in project root** (except README.md and CLAUDE.md)
2. **All documentation goes in `docs/` directory**
3. **Update existing files** rather than creating duplicates
4. **Archive historical docs** in `docs/archive/`

---

## 🚨 Troubleshooting

### Coverage Not 100%

- Run `yarn test:coverage` to see uncovered lines
- Check `coverage/` for detailed HTML report

### CI/CD Failing

- Check Actions tab for logs
- Verify secrets are configured
- Ensure tests pass locally first
