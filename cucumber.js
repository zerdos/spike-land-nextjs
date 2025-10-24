module.exports = {
  default: {
    paths: ['e2e/features/**/*.feature'],
    require: ['e2e/step-definitions/**/*.ts', 'e2e/support/**/*.ts'],
    requireModule: ['tsx/cjs'],
    format: ['progress-bar', 'html:e2e/reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
    failFast: true, // Stop on first failure
    retry: 0, // Don't retry failed scenarios
    tags: 'not @skip', // Skip scenarios/features tagged with @skip
  },
};
