# Claude Code Agent Notes

**Agent**: Claude Code (@claude)\
**Last Modified**: 2026-02-08\
**Health Score**: 7/9

## Health Assessment

**Current State**: Productive with good codebase understanding. Strong at multi-file refactors, code review, and security fixes.

**Remaining friction (preventing 8-9/9)**:

- `@spike-npm-land/code` package resolution fails locally in testing.spike.land tests (works in CI after build)
- E2E tests have persistent timeout flakiness (shards 1, 8, 9) unrelated to code changes
- No direct access to Vercel preview URLs for automated smoke testing

**Strengths**:

- Deep understanding of monorepo structure and cross-package dependencies
- Effective at parallel task execution (subagents for research, concurrent edits)
- Strong security review capability (GAQL injection, XSS, CSP headers)
- Good at resolving merge conflicts between bot-generated PRs
- Reliable CI monitoring and failure triage

---

## Technical Notes

### Known Build/Test Gotchas

- **packages/code `tsc --build` freshness**: `tsconfig.tsBuildInfoFile` must be overridden to `./dts/tsconfig.tsbuildinfo` in packages/code, otherwise tsc thinks it's up-to-date after `yarn clean`
- **CDN polyfill 404s**: `esm-worker` generates `/node@<version>/buffer.mjs` URLs that 404 on esm.sh. Fix is server-side URL rewrite in `fetchHandler.ts`
- **testing.spike.land iframe embedding**: Must use regular iframes pointing to `testing.spike.land/live/{codespaceId}/`, not `srcdoc` (CSP blocks) or dynamic `import()` (bare specifiers need import map)
- **`@spike-npm-land/code` in tests**: This package doesn't resolve locally in testing.spike.land vitest. Tests that import it (mainFetchHandler.spec, chat.spec, replicateHandler.spec) fail locally but pass in CI
- **render-app.tsx environment detection**: Use `typeof URL.createObjectURL === "function"` to detect real browser vs JSDOM, NOT `process.env.VITEST`
- **CodeProcessor abort signals**: Always use `DOMException("Aborted", "AbortError")` with `{ once: true }` listener, check via `instanceof DOMException && name === "AbortError"`

### Security Headers (testing.spike.land)

- `X-Frame-Options` must be deleted (we use CSP `frame-ancestors` instead)
- CSP `frame-ancestors` must always be set, even when existing CSP exists — replace the directive, don't skip
- Never echo user input in validation error messages

### Cross-PR Coordination

- When bot-generated PRs (Jules, Copilot) modify the same files, review for conflicts before merging
- PR #1112's CodeProcessor changes were superior to PR #1113's — always compare implementations before choosing which to keep

---

## Work Log

### 2026-02-08: PR #1113 Code Review Implementation

**Task**: Implement code review findings for PR #1113 (GAQL injection fix) and PR #1112 (Gallery optimization).

**Changes Made**:

1. Strengthened accountId regex (`/^\d[\d-]*\d$|^\d$/`) to reject dash-only strings
2. Removed input echoing from validation error messages (XSS prevention)
3. Resolved merge conflicts with PR #1112, taking superior DOMException abort handling
4. Fixed X-Frame-Options: CSP frame-ancestors now always applied, handles existing CSP
5. Removed `process.env.VITEST` checks from render-app.tsx production code
6. Re-enabled importmap-utils tests (80 tests, 73 snapshots regenerated)
7. Fixed test assertions for new Response objects from addSecurityHeaders

**CI Results**: All unit tests, package tests, lint, security, build pass. 3 E2E timeouts (pre-existing flakiness).

---

## Observations & Recommendations

### What Works Well

1. **CLAUDE.md is comprehensive** — provides clear workflow guidance
2. **Ticket-driven development** — good traceability, prevents scope creep
3. **CI pipeline** — catches real issues, sharded E2E for speed
4. **Monorepo structure** — clear package boundaries

### Areas for Improvement

1. **E2E flakiness** — shards 1, 8, 9 have persistent timeouts. Consider increasing timeouts or adding retry logic
2. **Bot PR scope creep** — Jules PRs often include unrelated changes. Consider stricter PR scope requirements
3. **Token system docs** — API_REFERENCE.md and TOKEN_SYSTEM.md have completely different package naming/pricing. Needs reconciliation
4. **SKIPPED_TESTS.md** — summary counts (18 unit + 21 E2E) massively undercount actual skips (400+ E2E in Category I)

---

_This document is maintained by @claude and should only be modified by this agent._
