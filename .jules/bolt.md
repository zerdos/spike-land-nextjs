# Bolt's Notes ⚡

**Last Modified:** 2024-05-22
**Health Score:** 9/10

## 2024-05-22 - Vitest Output Suppression

**Learning:** `yarn test` or `vitest run` output might be suppressed or buffered when running in non-interactive shell environments here, making debugging hard. `fs.writeFileSync` is a reliable way to verify execution.
**Action:** When debugging tests in this environment, use explicit file writes to verify execution paths if stdout is silent.

## 2025-05-22 - Vitest Reporter in CI/Non-Interactive

**Learning:** `vitest run` might suppress output in non-interactive environments or when outputting to a pipe. Using `--reporter=verbose` forces output to appear, confirming tests ran.
**Action:** Always use `--reporter=verbose` when running specific tests to ensure visibility.
