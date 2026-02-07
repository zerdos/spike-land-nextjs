# Copilot Agent Notes

**Agent**: GitHub Copilot (@copilot)\
**Last Modified**: 2026-02-07\
**Health Score**: 8/9

## Health Assessment

**Current State**: Fully configured with setup steps, instructions, skills, and custom agents.

**Remaining friction (preventing 9/9)**:

- No direct access to Vercel preview URLs for automated smoke testing (manual check via PR comments)

**Resolved since last assessment**:

- CI visibility: `debug-ci` skill + `gh run view --log-failed` workflows documented
- Test-fix cycles: `test-specialist` agent + path-specific testing instructions
- Skills were broken symlinks: Replaced with actual files (20 skills total)

**Strengths**:

- Excellent code analysis and refactoring capabilities
- Strong understanding of React performance patterns (memo, useCallback)
- Good integration with git workflow and PR process
- Full environment setup via `copilot-setup-steps.yml` (Node 24, Yarn 4, Prisma, Playwright)
- 20 skills covering Next.js, testing, security, design, and more
- Path-specific instructions for TypeScript, testing, Cloudflare Workers, shared package

---

## Configuration

### Setup Steps

`copilot-setup-steps.yml` provisions the environment:

- Node.js 24 (from `.nvmrc`)
- Corepack + Yarn 4 Berry
- Dependencies cached via `actions/cache`
- Prisma client generated
- Shared package built
- Playwright Chromium installed

### Instructions

- `.github/copilot-instructions.md` — Repo-wide guidance
- `.github/instructions/typescript.instructions.md` — TS strict mode rules
- `.github/instructions/testing.instructions.md` — Vitest + Playwright patterns
- `.github/instructions/cloudflare-workers.instructions.md` — Worker constraints
- `.github/instructions/shared-package.instructions.md` — Shared package conventions

### Skills (20 total)

| Category     | Skills                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| Framework    | nextjs, vercel-react-best-practices, frontend-patterns                                        |
| UI/Design    | shadcn-ui, tailwind-design-system, frontend-design, web-design-guidelines, building-native-ui |
| Testing      | javascript-testing-patterns, qa-testing-playwright                                            |
| Security     | security-review, better-auth-best-practices                                                   |
| Code Quality | clean-code, software-code-review                                                              |
| Content      | copywriting, seo-audit                                                                        |
| Media        | remotion-best-practices                                                                       |
| DevOps       | debug-ci                                                                                      |
| Tools        | agent-browser, skill-creator                                                                  |

### Custom Agents

- `test-specialist` — Write/fix tests for 100% coverage
- `ci-debugger` — Debug CI failures from workflow logs

### Manual Configuration Required

The following must be set up in **GitHub Repository Settings > Copilot > Coding agent**:

**MCP Servers** (Settings > MCP configuration):

```json
{
  "mcpServers": {
    "spike-land": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@spike-npm-land/mcp-server"],
      "tools": ["*"],
      "env": {
        "SPIKE_LAND_API_KEY": "$COPILOT_MCP_SPIKE_LAND_API_KEY"
      }
    }
  }
}
```

**Environment Secrets** (Settings > Environments > `copilot`):

- `COPILOT_MCP_SPIKE_LAND_API_KEY`

**Firewall Allowlist** (Settings > Copilot > Coding agent > Custom allowlist):

- `esm.sh`
- `testing.spike.land`
- `js.spike.land`
- `api.cloudflare.com`

---

## Work Log

### 2026-02-06: LibraryGrid Performance Optimization (PR #1097)

**Task**: Optimize LibraryGrid rendering to prevent unnecessary re-renders when selecting/deselecting items.

**Approach**:

1. Extracted `LibraryItem` to a memoized component to reduce re-renders from O(N) to O(1) on selection
2. Stabilized `toggleSelect` callback using `useCallback` to ensure stable references
3. Added comprehensive unit tests to verify behavior
4. Fixed TypeScript and lint errors iteratively

**Commits Made**:

- `f892444` - Fix lint errors and optimize LibraryGrid performance
- `d5fd153` - Fix TypeScript errors in LibraryGrid test and optimize rendering
- `28e4895` - perf(pixel): optimize LibraryGrid rendering
- `224362c` - Initial plan

**Performance Impact**:

- Before: Selecting one item caused all N items to re-render
- After: Selecting one item only re-renders the selected item (O(1) operation)

---

## Observations & Recommendations

### What Works Well

1. **Clear Documentation**: AGENTS.md provides comprehensive guidance for repository workflows
2. **Strict Quality Gates**: TypeScript strict mode + 100% test coverage prevents bugs
3. **Git Workflow**: Stacked PRs and proper commit conventions are well-established
4. **Monorepo Structure**: Clear separation between web app and workers packages

### Areas for Improvement

1. **Vercel Preview Access**: Automated smoke tests on preview URLs would close the gap to 9/9
2. **Test Performance**: Vitest runs could be faster with better caching or parallel execution
3. **Agent Coordination**: Need clearer protocols for when multiple agents work on same codebase

---

## Technical Notes

### Repository Patterns Observed

- **Testing**: Co-locate `.test.tsx` files with source files
- **Performance**: Use React.memo and useCallback for list optimizations
- **Types**: Strict TypeScript mode enforced throughout
- **Coverage**: 100% code coverage required for all new code

### Key Files for Agent Reference

- `AGENTS.md` - Main agent guidance document
- `docs/CEO_DECISIONS.md` - Strategic decisions log
- `.github/workflows/` - CI/CD pipeline definitions
- `vitest.config.ts` - Test configuration

---

_This document is maintained by @copilot and should only be modified by this agent._
