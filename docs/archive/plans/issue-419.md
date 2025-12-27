# Implementation Plan for Issue #419: Add Dependency Management Guide

## Summary

Create comprehensive `docs/DEPENDENCY_MANAGEMENT.md` covering dependency management practices including:

- Adding/removing packages with yarn
- Dead code detection with Knip
- Dependabot PR review workflow
- Bundle size awareness

## Package Overview

| Metric                   | Count                          |
| ------------------------ | ------------------------------ |
| Production dependencies  | 62 (not 93 as stated in issue) |
| Development dependencies | 33                             |
| Package manager          | Yarn 4.12.0                    |
| Workspaces               | `packages/*`                   |

## Existing Dead Code Commands (Knip)

- `yarn dead-code` - Full analysis
- `yarn dead-code:files` - Unused files
- `yarn dead-code:exports` - Unused exports
- `yarn dead-code:deps` - Unused dependencies

## Dependabot Configuration

From `.github/dependabot.yml`:

- Schedule: Weekly on Monday at 09:00 UTC
- PR Limit: 10
- Reviewer: @zerdos
- Labels: dependencies, security
- Groups: development-dependencies, production-dependencies

## Documentation Sections

### Adding Dependencies

1. Before adding: Check if functionality exists, evaluate package, consider alternatives
2. Installation: `yarn add <package>` or `yarn add -D <package>`
3. Post-installation checklist: lint, build, test, update Knip if needed

### Removing Dependencies

1. Search for usage: `grep -r "from '<package>'" src/`
2. Run `yarn dead-code:deps`
3. Post-removal: verify build and tests

### Dead Code Detection

- When to run: monthly maintenance, before refactors, after removing features
- Handling unused exports: verify, check public API, remove or ignore
- Configuring Knip: `ignoreDependencies` in `knip.json`

### Security Auditing

- CI runs: `yarn npm audit --all --severity moderate`
- Manual: `yarn npm audit --all`
- Handling vulnerabilities: update package, use resolutions, document accepted risks

### Dependabot Workflow

- Review checklist: CI passes, changelog review, bundle impact, manual verification
- Merge criteria by update type (patch/minor/major/security)
- Testing requirements

### Bundle Size Awareness

- Current: No bundle analyzer installed
- Next.js build outputs route sizes
- Targets: First Load JS < 100KB, Page JS < 50KB
- Use bundlephobia.com before adding large packages

## Implementation Steps

1. Create `/docs/DEPENDENCY_MANAGEMENT.md`
2. Update `/docs/README.md` index
3. Verify dependency counts match package.json

## Questions

1. Add `@next/bundle-analyzer` for detailed analysis?
2. Dependency count discrepancy: 62 vs 93?
3. Add `yarn dead-code` to CI pipeline (as warning)?
4. Adjust bundle size thresholds based on current baseline?
5. Enable auto-merge for Dependabot patch updates?

## Critical Files

- `/docs/DEPENDENCY_MANAGEMENT.md` - New file
- `/package.json` - Dependency definitions
- `/knip.json` - Dead code detection config
- `/.github/dependabot.yml` - Dependabot config
- `/docs/README.md` - Update index
