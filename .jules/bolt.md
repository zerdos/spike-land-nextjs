# Bolt's Notes ⚡

**Last Modified:** 2024-05-24
**Health Score:** 9/10

## 2024-05-22 - Vitest Output Suppression

**Learning:** `yarn test` or `vitest run` output might be suppressed or buffered when running in non-interactive shell environments here, making debugging hard. `fs.writeFileSync` is a reliable way to verify execution.
**Action:** When debugging tests in this environment, use explicit file writes to verify execution paths if stdout is silent.

## 2024-05-24 - Layout Component Optimization

**Learning:** Components used in Root Layout (like Footer) that need `usePathname` force the entire component tree to be Client Components if not carefully split.
**Action:** Split global layout components into a Client Wrapper (for conditional logic) and a Server Content component (passed as children or imported) to maximize server rendering.
