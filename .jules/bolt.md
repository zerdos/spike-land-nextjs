# Bolt's Notes ⚡

**Last Modified:** 2024-05-22
**Health Score:** 9/10

## 2024-05-22 - Vitest Output Suppression

**Learning:** `yarn test` or `vitest run` output might be suppressed or buffered when running in non-interactive shell environments here, making debugging hard. `fs.writeFileSync` is a reliable way to verify execution.
**Action:** When debugging tests in this environment, use explicit file writes to verify execution paths if stdout is silent.

## 2024-05-24 - Vitest Execution
**Learning:** `yarn vitest` can be silent in this environment, but running the binary directly `node node_modules/vitest/vitest.mjs` works reliably and outputs results.
**Action:** Use direct node execution for vitest if `yarn` commands are silent.
