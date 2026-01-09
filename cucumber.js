module.exports = {
  default: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: ["progress-bar", "html:e2e/reports/cucumber-report.html"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: false, // Stop on first failure
    retry: 0, // Don't retry failed scenarios
    tags: "not @skip and not @flaky and not @wip", // Skip scenarios tagged with @skip, @flaky, or @wip (includes @requires-db)
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
    failfast: false,
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
    faifFast: false, // Run all slow tests even if some fail
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
  // NOTE: paths is used as fallback when no files passed via CLI (e.g., Docker build)
  // GitHub Actions sharding passes specific files which override this
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
    failfast: false, // In CI, run all tests to get full report
    retry: 0, // Retry once in CI to handle transient issues
    tags: "not @skip and not @flaky and not @wip", // Include @requires-db tests in sharded runs
    timeout: 10000, // 30 second timeout for CI
    parallel: 1, // Run 4 scenarios in parallel
  },
  local: {
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
    failFast: false, // In CI, run all tests to get full report
    retry: 0, // Retry once in CI to handle transient issues
    tags: "not @skip and not @flaky",
    timeout: 10000,
    parallel: 16,
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
    tags: "not @skip and not @flaky",
    timeout: 15000,
    parallel: 1, // Coverage requires single process to accumulate data
  },
  // Database profile - tests that require a seeded database
  // Run with: yarn cucumber --profile db
  // Requires DATABASE_URL_E2E environment variable
  db: {
    paths: ["e2e/features/**/*.feature"],
    require: ["e2e/step-definitions/**/*.steps.ts", "e2e/support/**/*.ts"],
    requireModule: ["tsx/cjs"],
    format: [
      "progress-bar",
      "html:e2e/reports/cucumber-report-db.html",
      "json:e2e/reports/cucumber-report-db.json",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    failFast: false, // Run all DB tests to get full report
    retry: 0, // Retry once for transient DB issues
    tags: "@requires-db and not @skip and not @flaky",
    timeout: 30000, // Longer timeout for DB operations and AI processing
    parallel: 1, // Parallel DB tests
  },
};
