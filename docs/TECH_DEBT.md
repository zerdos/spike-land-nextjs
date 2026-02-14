# Tech Debt Registry

> Last updated: 2026-02-14
> Last audit: 2026-02-14 (Sprint 3 Inventory)

## Overview

This document tracks known technical debt across the spike-land-nextjs monorepo.
Items are prioritized P0 (critical) through P3 (minor/nice-to-have).

## Active Items

### P0 - Critical

#### TD-P0-1: next-auth on beta.30

- **Status**: Open
- **Impact**: Production running on pre-release version
- **Details**: `next-auth` is pinned to `5.0.0-beta.30` in root `package.json`. Beta releases may contain breaking changes, missing fixes, or undocumented behavior.
- **Action**: Monitor next-auth releases; upgrade when stable v5 is available.

#### TD-P0-2: Test coverage below targets

- **Status**: Open
- **Impact**: Bugs ship undetected, refactoring is risky
- **Details**: CI coverage thresholds are well below the 100% target stated in CLAUDE.md. Several modules have 0% coverage including `src/lib/feature-flags/`, `src/lib/learnit/`, `src/lib/mcp/server/`, `src/lib/validation/`, and `src/lib/sync/clients/`.
- **Action**: Incrementally increase thresholds as coverage improves; prioritize business-critical modules.

#### TD-P0-3: Sentry MCP token lacks API scopes

- **Status**: Resolved
- **Impact**: Sentry MCP integration is non-functional (all API calls return 403)
- **Details**: The `SENTRY_AUTH_TOKEN` in `.mcp.json` is a source-map upload token, not an API token. It lacks `org:read`, `project:read`, and `issue:read` scopes.
- **Resolution**: Split token usage — `SENTRY_AUTH_TOKEN` for source-map uploads only, `SENTRY_MCP_AUTH_TOKEN` for all Sentry API calls (bridge, admin, MCP tools). All code paths updated to read from `SENTRY_MCP_AUTH_TOKEN`.

### P1 - High Priority

#### TD-P1-1: Duplicate ErrorBoundary implementations

- **Status**: Open
- **Impact**: Code duplication, potential behavioral differences
- **Details**: ErrorBoundary exists in both `src/components/errors/error-boundary.tsx` and `packages/code/src/@/components/app/error-boundary.tsx`. These may diverge over time.
- **Action**: Audit both implementations, choose one canonical version, update all imports.

#### TD-P1-2: Duplicate route handling logic in testing.spike.land

- **Status**: Open
- **Impact**: Hard to trace request flow, risk of route conflicts
- **Details**: Request routing is scattered across `chat.ts`, `mainFetchHandler.ts`, `fetchHandler.ts`, and `routeHandler.ts` with overlapping responsibilities.
- **Action**: Consolidate into a single router with clear middleware pattern.

#### TD-P1-3: Inconsistent error handling patterns in testing.spike.land

- **Status**: Open
- **Impact**: Unpredictable error responses, difficult debugging
- **Details**: Mixed approaches: `handleErrors()` wrapper in some routes, direct try-catch in others, no error handling in some handlers.
- **Action**: Standardize on `handleErrors()` wrapper for all route handlers.

#### TD-P1-4: Unused dependencies (66 total per knip analysis)

- **Status**: Partially resolved (root-level cleaned)
- **Impact**: Bloated node_modules, slower installs, unnecessary security surface
- **Details**: `packages/code` has 38 unused dependencies + 6 devDependencies. `packages/testing.spike.land` has 8 unused. `packages/js.spike.land` has 1 unused.
- **Action**: Clean up per-package dependencies with careful testing (runtime deps may not be detected by static analysis).

#### TD-P1-5: Unused files (253 total per knip analysis)

- **Status**: Open
- **Impact**: Code maintenance burden, confusing codebase navigation
- **Details**: Primarily in `packages/code/src/@/components/` and `packages/code/src/@/lib/`, including 60+ unused shadcn/ui components and stale utility modules.
- **Action**: Per-file review before deletion; verify no runtime-only references exist.

### P2 - Medium Priority

#### TD-P2-1: Deprecated analyzeImage in gemini-client.ts

- **Status**: Open
- **Impact**: Using deprecated function pattern
- **Details**: `analyzeImage` in `src/lib/ai/gemini-client.ts` is deprecated in favor of `analyzeImageV2`. Still called from `src/workflows/enhance-image.direct.ts`.
- **Action**: Migrate callers to `analyzeImageV2`, then remove the deprecated function.

#### TD-P2-2: @ai-sdk/anthropic not in root package.json

- **Status**: Open
- **Impact**: Dependency management inconsistency
- **Details**: `@ai-sdk/anthropic` is used in `packages/testing.spike.land` and `packages/code` but not declared in root `package.json`.
- **Action**: Add to root `package.json` or consolidate dependency declarations.

#### TD-P2-3: Wrangler compatibility dates need update

- **Status**: Open
- **Impact**: Missing newer Cloudflare runtime features
- **Details**: `packages/js.spike.land/wrangler.toml` has `compatibility_date = "2024-12-01"`. `packages/testing.spike.land/wrangler.toml` has `compatibility_date = "2025-07-12"`.
- **Action**: Update wrangler.toml compat dates across all worker packages to current.

#### TD-P2-4: Hardcoded URLs and origins in testing.spike.land

- **Status**: Open
- **Impact**: Fragile deployments, difficult environment switching
- **Details**: Hardcoded esbuild URL in `chat.ts`, hardcoded renderer URL in `liveRoutes.ts`, various `testing.spike.land` references in frontend code.
- **Action**: Move all external URLs to environment variables; create a `config/urls.ts` module.

#### TD-P2-5: Session storage migration code in chatRoom.ts

- **Status**: Open
- **Impact**: Technical debt that accumulates over time
- **Details**: Backward compatibility code at `chatRoom.ts:413-431` migrating from old `session` key to `session_core`. Added ~Feb 2026.
- **Action**: Set a removal date (Aug 2026); remove after sufficient migration time.

#### TD-P2-6: R2 storage keys not namespaced

- **Status**: Open
- **Impact**: Potential key conflicts as system grows
- **Details**: R2 storage uses flat keys like `r2_html_{codeSpace}` instead of hierarchical keys.
- **Action**: Migrate to namespaced keys: `codespace/{codeSpace}/html`.

#### TD-P2-7: Commented-out auto-save system in chatRoom.ts

- **Status**: Open
- **Impact**: Code clutter, unclear feature status
- **Details**: Large blocks of commented-out auto-save functionality at `chatRoom.ts:572-620`, including `setupAutoSave()`, `autoSave()`, `getAutoSaveHistory()`, `restoreFromAutoSave()`.
- **Action**: Either remove entirely if deprecated, or implement properly and create a ticket.

#### TD-P2-8: esbuild resolution pins may be obsolete

- **Status**: Open (needs investigation)
- **Impact**: May prevent esbuild upgrades
- **Details**: Root `package.json` has resolutions pinning `esbuild@0.14.47` to `0.25.0`. The `resolutions-comments` field notes this "may be obsolete."
- **Action**: Test removing the `esbuild@0.14.47` resolution; verify esbuild-wasm still works.

### P3 - Low Priority / Nice-to-Have

#### TD-P3-1: Scripts directory cleanup

- **Status**: Open
- **Impact**: Developer confusion, maintenance overhead
- **Details**: 34 scripts in `/scripts/` directory. Some are one-off migrations that have been completed (e.g., `migrate-users-to-stable-ids.ts`, `fix-user-tier.ts`, `fix-user-tokens.ts`).
- **Action**: Review each script, archive completed migration scripts to `scripts/archive/`.

#### TD-P3-2: Magic numbers and strings throughout codebase

- **Status**: Open
- **Impact**: Reduced readability, harder to maintain
- **Details**: Hardcoded browser dimensions (1920x1080) in `chatRoom.ts`, animation timings in `AgentProgressIndicator.tsx`, and other numeric literals scattered across the codebase.
- **Action**: Extract to named constants with descriptive names.

#### TD-P3-3: Inconsistent async patterns

- **Status**: Open
- **Impact**: Minor -- confusing but not harmful
- **Details**: Some handlers in `liveRoutes.ts` are marked `async` but contain no `await` expressions.
- **Action**: Remove unnecessary `async` keywords or document the pattern.

#### TD-P3-4: CSS flexbox scroll container pattern not standardized

- **Status**: Open
- **Impact**: Recurring UI bugs with scroll containers
- **Details**: The `h-full` vs `absolute inset-0` pattern for scroll containers in flex layouts (seen in `my-apps/[codeSpace]/page.tsx`). Fix was applied ad-hoc.
- **Action**: Create a reusable `ScrollContainer` component that handles this pattern correctly.

#### TD-P3-5: TypeScript config issues in testing.spike.land

- **Status**: Open
- **Impact**: Requires `--skipLibCheck` workaround
- **Details**: Missing type definitions for `@cloudflare/vitest-pool-workers` in `packages/testing.spike.land/tsconfig.json`.
- **Action**: Add the missing dev dependency or remove from tsconfig if not used.

## Resolved Items (Sprint 3 - 2026-02-14)

| Item | Resolution | Date |
|------|-----------|------|
| Empty/stub files (12 files) | Deleted in Sprint 3 cleanup | 2026-02-14 |
| Stub MCP tools (canvas, tabletop) | Deleted -- no backing models exist | 2026-02-14 |
| Unused test fixtures (marketing-mocks, sse-mock) | Deleted -- no imports found | 2026-02-14 |
| Unused packages (react-app-examples, opfs-node-adapter, video) | Deleted -- never imported | 2026-02-14 |
| Duplicate rollup.config.js | Deleted -- kept .mjs version | 2026-02-14 |
| Duplicate Prisma migration (20260211133638) | Older duplicate removed, DB records cleaned | 2026-02-14 |
| Unorganized docs/ (73 files) | Reorganized into subdirectories | 2026-02-14 |
| Stale docs (Stripe, Tabletop, Vibeathon, Sprint 2) | Archived to docs/archive/ | 2026-02-14 |
| .eslintcache in repo | Already in .gitignore -- no action needed | 2026-02-14 |

## Architecture Notes

### Durable Object State Management

The `Code` class in `chatRoom.ts` manages session state with this structure:

```
Storage Keys:
  session_core      -> Metadata (codeSpace, etc.)
  session_code      -> Source code (TSX)
  session_transpiled -> Transpiled JS
  version_count     -> Number of saved versions
  version_{N}       -> Individual version snapshots
  (R2) r2_html_{codeSpace} -> Rendered HTML
  (R2) r2_css_{codeSpace}  -> CSS styles
```

The split between Durable Object storage (code, transpiled) and R2 storage (html, css) is intentional for size limits, but creates complexity in save/load operations.

### Request Flow Architecture

```
External Request
       |
       v
  cf-workers.ts     Entry point
       |
       v
  chat.ts           Main router (static, MCP, AI)
       |
       v
  mainFetchHandler   Security headers, error handling
       |
       v
  fetchHandler.ts    Route dispatch (live, api, etc.)
       |  (for /live/*)
       v
  Durable Object     Code class instance (chatRoom.ts)
       |
       v
  routeHandler.ts    Internal DO routing
       |
       v
  Route Handlers     liveRoutes, codeRoutes, etc.
```

## Sprint History

| Sprint | Date | Focus | Status |
|--------|------|-------|--------|
| Sprint 1 | 2026-01-17 | Initial stabilization | Completed |
| Sprint 2 | 2026-01-27 (target) | Continuation | Abandoned -- superseded by Sprint 3 |
| Sprint 3 | 2026-02-14 | Comprehensive inventory and cleanup | In Progress |

## Contributing

When adding new tech debt items:

1. Assign a priority (P0-P3) and a unique ID (e.g., TD-P1-6)
2. Include specific file locations
3. Describe the impact
4. Suggest a fix if known
5. Create a GitHub issue and link it here

Priority definitions:

- **P0 (Critical)**: Blocks development or causes production issues
- **P1 (High)**: Significant code quality or maintainability impact
- **P2 (Medium)**: Should be addressed but not urgent
- **P3 (Low)**: Nice-to-have improvements
