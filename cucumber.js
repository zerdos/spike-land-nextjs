module.exports = {
  default: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: ["progress-bar", "html:e2e/reports/cucumber-report.html"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: true, // Stop on first failure
    retry: 0, // Don't retry failed scenarios
    tags: "not @skip and not @flaky and not @requires-db", // Skip scenarios tagged with @skip, @flaky, or @requires-db
    timeout: 15000, // Increase default step timeout to 15 seconds (was 5 seconds)
  },
  // Fast tests - unit tests and quick integration tests
  fast: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: ["progress-bar", "html:e2e/reports/cucumber-report-fast.html"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: true,
    retry: 0,
    tags: "@fast and not @skip and not @flaky",
    timeout: 15000,
  },
  // Slow tests - comprehensive integration tests
  slow: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: ["progress-bar", "html:e2e/reports/cucumber-report-slow.html"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: false, // Run all slow tests even if some fail
    retry: 1, // Retry slow tests once to handle flakiness
    tags: "@slow and not @skip",
    timeout: 15000,
  },
  // Flaky tests - tests known to be flaky, run with retries
  flaky: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: ["progress-bar", "html:e2e/reports/cucumber-report-flaky.html"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: false,
    retry: 2, // Retry flaky tests up to 2 times
    tags: "@flaky and not @skip",
    timeout: 15000,
  },
  // CI profile - all tests except flaky and database-dependent tests
  ci: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: [
      "progress",
      "html:e2e/reports/cucumber-report-ci.html",
      "json:e2e/reports/cucumber-report-ci.json",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: true, // In CI, run all tests to get full report\
    retry: 3, // Retry once in CI to handle transient issues
    tags: "not @skip and not @flaky and not @requires-db", // Skip db-dependent tests (no seeded test data in CI)
    timeout: 5000, // 30 second timeout for CI
    parallel: 8, // Run 4 scenarios in parallel
  },
  // Coverage profile - collect V8 coverage during E2E tests
  coverage: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: ["progress-bar", "html:e2e/reports/cucumber-report-coverage.html"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: false, // Run all tests to get full coverage
    retry: 0, // No retries for coverage - each run should be deterministic
    tags: "not @skip and not @flaky and not @requires-db",
    timeout: 15000,
    parallel: 1, // Disable parallelism for accurate coverage collection
  },
};
