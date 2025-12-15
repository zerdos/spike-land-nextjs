# E2E Testing Documentation

## ⚠️ IMPORTANT: Current Status

**All wizard E2E tests are currently skipped** due to authentication issues in
CI/CD environments.

**Issue:** GitHub Issue #23 - E2E authentication bypass not working in Vercel
preview deployments

**Impact:**

- ✅ Unit tests: Running (100% coverage)
- ❌ E2E tests: Skipped (0% coverage for wizard scenarios)
- ❌ Integration coverage: Limited

**Action Required:** The authentication bypass mechanism needs to be fixed
before these tests can run in CI. All wizard feature files are tagged with
`@skip` until this is resolved.

**Tracking:** See GitHub Issue #23 for progress on fixing authentication

---

## Overview

This directory contains end-to-end (E2E) tests built with Playwright and
Cucumber. The tests use Behavior-Driven Development (BDD) approach with Gherkin
syntax for test scenarios.

## Recent Improvements (2025-10-27)

### 1. Retry Logic & Timeout Handling

**Problem**: Tests were flaky due to timing issues and strict mode violations
when elements weren't immediately available.

**Solution**: Created `retry-helper.ts` with:

- Environment-specific timeouts (longer for CI)
- Retry logic for flaky selectors
- Consistent wait strategies across all tests

**Usage**:

```typescript
import { clickButtonWithRetry, TIMEOUTS, waitForTestId } from "../support/helpers/retry-helper";

// Wait for element with retry
const button = await waitForTestId(page, "submit-button");

// Click with retry logic
await clickButtonWithRetry(page, "submit-button");

// Use environment-specific timeouts
await expect(element).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
```

### 2. Data-TestId Selectors

**Problem**: Using `getByRole('button', { name: 'Next' })` caused strict mode
violations when multiple elements matched (e.g., Next.js Dev Tools button).

**Solution**: Updated page objects and step definitions to prefer `data-testid`
selectors:

**Before**:

```typescript
async getNextButton() {
  return this.page.getByRole('button', { name: /Next/i }); // Ambiguous!
}
```

**After**:

```typescript
async getNextButton() {
  return this.page.getByTestId('wizard-next-button'); // Precise!
}
```

### 3. Feature File Organization

**Problem**: Single `app-creation-wizard.feature` with 35 scenarios and a shared
Background created tight coupling and slow test execution.

**Solution**: Split into focused, smaller feature files:

```
e2e/features/
├── app-wizard-step1-basic-info.feature      (8 scenarios)
├── app-wizard-step2-requirements.feature    (6 scenarios)
├── app-wizard-step3-monetization.feature    (8 scenarios)
├── app-wizard-step4-review.feature          (7 scenarios)
├── app-wizard-draft-persistence.feature     (5 scenarios)
└── app-wizard-navigation.feature            (1 scenario)
```

**Benefits**:

- Faster parallel execution
- Better test isolation
- Easier to understand and maintain
- Can run specific test suites

### 4. Test Tags for Selective Runs

**Problem**: No way to run only fast tests or skip known flaky tests.

**Solution**: Added test tags:

- `@fast` - Quick unit and integration tests
- `@slow` - Comprehensive integration tests
- `@flaky` - Known flaky tests (run separately with retries)
- `@unit` - Pure unit-level tests
- `@integration` - Integration tests across multiple steps

**Example**:

```gherkin
@fast @unit
Scenario: Validation error for empty app name
  When I click the "Next" button
  Then I should see the error message "App name is required"

@slow @integration
Scenario: Complete app creation flow
  Given I complete all wizard steps with valid data
  When I click the "Submit" button
  Then I should see a success message
```

### 5. Cucumber Profiles

**Problem**: No way to run different test suites with different configurations.

**Solution**: Added Cucumber profiles in `cucumber.js`:

| Profile   | Purpose                | Tags                       | Retry | Fail Fast |
| --------- | ---------------------- | -------------------------- | ----- | --------- |
| `default` | All tests except flaky | `not @skip and not @flaky` | 0     | Yes       |
| `fast`    | Quick tests only       | `@fast and not @skip`      | 0     | Yes       |
| `slow`    | Integration tests      | `@slow and not @skip`      | 1     | No        |
| `flaky`   | Known flaky tests      | `@flaky and not @skip`     | 2     | No        |
| `ci`      | CI/CD pipeline         | `not @skip and not @flaky` | 1     | No        |

## Running Tests

### Local Development

```bash
# Start dev server first
npm run dev

# Run all tests (default profile)
npm run test:e2e:local

# Run fast tests only
npm run test:e2e:fast

# Run slow tests only
npm run test:e2e:slow

# Run flaky tests with retries
npm run test:e2e:flaky
```

### CI/CD

```bash
# CI profile (all tests except flaky, with retries)
npm run test:e2e:ci
```

### Custom Tag Filtering

```bash
# Run only wizard step 1 tests
cucumber-js --tags "@step1"

# Run all integration tests
cucumber-js --tags "@integration"

# Run fast tests that aren't flaky
cucumber-js --tags "@fast and not @flaky"
```

## Timeout Configuration

Timeouts are automatically adjusted based on environment:

| Timeout          | Local | CI    |
| ---------------- | ----- | ----- |
| `DEFAULT`        | 5s    | 10s   |
| `LONG`           | 10s   | 20s   |
| `SHORT`          | 2.5s  | 5s    |
| `RETRY_INTERVAL` | 500ms | 500ms |

## Best Practices

### 1. Use Data-TestId Selectors

Always prefer `data-testid` for locating elements:

```typescript
// ❌ Bad - Ambiguous
page.getByRole("button", { name: "Next" });

// ✅ Good - Precise
page.getByTestId("wizard-next-button");
```

### 2. Use Retry Helpers

Use retry helpers for flaky operations:

```typescript
// ❌ Bad - No retry
await page.getByTestId("button").click();

// ✅ Good - With retry
await clickButtonWithRetry(page, "button");
```

### 3. Tag Scenarios Appropriately

```gherkin
# Fast, isolated test
@fast @unit
Scenario: Button is disabled by default

# Slow, multi-step test
@slow @integration
Scenario: Complete user registration flow

# Known flaky test
@flaky @integration
Scenario: Draft restoration after page reload
```

### 4. Keep Feature Files Focused

Each feature file should test a single feature or step:

```
✅ Good: app-wizard-step1-basic-info.feature
❌ Bad: app-wizard-all-steps.feature
```

### 5. Use Background Sparingly

Only use Background for setup that's truly common to ALL scenarios in the file.

## Troubleshooting

### Strict Mode Violations

**Error**: `strict mode violation: locator resolved to 2 elements`

**Solution**: Use `data-testid` instead of role/name selectors:

```typescript
// Instead of:
page.getByRole("button", { name: "Next" });

// Use:
page.getByTestId("wizard-next-button");
```

### Timeout Errors

**Error**: `Timeout 5000ms exceeded waiting for element`

**Solution**: Use retry helpers:

```typescript
// Instead of:
await page.getByTestId("button").click();

// Use:
await clickButtonWithRetry(page, "button", { timeout: TIMEOUTS.LONG });
```

### Flaky Tests

**Steps**:

1. Tag the scenario with `@flaky`
2. Run with the flaky profile: `npm run test:e2e:flaky`
3. Investigate root cause using retry helpers
4. Fix and remove `@flaky` tag

## Architecture

```
e2e/
├── features/                      # Gherkin feature files
│   ├── app-wizard-step1-*.feature
│   ├── app-wizard-step2-*.feature
│   └── ...
├── step-definitions/              # Step implementations
│   ├── app-creation.steps.ts
│   └── ...
├── support/
│   ├── helpers/
│   │   ├── retry-helper.ts       # Retry logic & timeouts
│   │   ├── auth-helper.ts        # Authentication mocking
│   │   └── ...
│   ├── page-objects/             # Page Object Models
│   │   ├── AppCreationWizard.ts
│   │   └── ...
│   └── world.ts                  # Cucumber World context
└── reports/                       # Test reports (generated)
```

## Migration Guide

### For Components

Add `data-testid` attributes to interactive elements:

```tsx
// Before
<button onClick={handleNext}>Next</button>

// After
<button data-testid="wizard-next-button" onClick={handleNext}>
  Next
</button>
```

### For Tests

Update selectors in step definitions:

```typescript
// Before
const button = page.getByRole("button", { name: "Next" });

// After
const button = page.getByTestId("wizard-next-button");
```

## Contributing

When adding new E2E tests:

1. Create focused feature files (one feature per file)
2. Use data-testid selectors in components
3. Tag scenarios appropriately (@fast, @slow, @flaky)
4. Use retry helpers for flaky operations
5. Add to appropriate page objects
6. Document new helpers in this README

## Environment Variables

- `BASE_URL` - The base URL to test against (default: http://localhost:3000)
- `CI` - Set to 'true' for CI-specific timeouts and configurations

## Reports

- HTML reports are generated in `e2e/reports/cucumber-report-*.html`
- JSON reports for CI in `e2e/reports/cucumber-report-ci.json`
- Screenshots of failed tests are saved in `e2e/reports/screenshots/`
- Reports are uploaded as artifacts in GitHub Actions

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Cucumber Documentation](https://cucumber.io/docs/cucumber/)
- [Gherkin Syntax Reference](https://cucumber.io/docs/gherkin/reference/)
