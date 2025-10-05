# E2E Tests with Playwright and Cucumber

This directory contains end-to-end tests using Playwright and Cucumber (BDD framework).

## Structure

```
e2e/
├── features/           # Cucumber feature files (.feature)
├── step-definitions/   # Step implementations (.steps.ts)
├── support/           # Test helpers and configuration
│   ├── world.ts       # Custom World with Playwright integration
│   └── hooks.ts       # Before/After hooks
└── reports/           # Test reports and screenshots (generated)
```

## Running Tests

### Local Development (against localhost:3000)

First, start your dev server:
```bash
npm run dev
```

Then in another terminal:
```bash
npm run test:e2e:local
```

### Against Any URL

```bash
BASE_URL=https://your-app.vercel.app npm run test:e2e
```

### CI/CD (GitHub Actions)

Tests automatically run against the deployed Vercel URL after successful deployment on the main branch.

## Writing Tests

### Feature Files

Create `.feature` files in `e2e/features/`:

```gherkin
Feature: Feature Name
  Scenario: Scenario name
    Given I am on the home page
    When I click the button
    Then I should see a message
```

### Step Definitions

Create `.steps.ts` files in `e2e/step-definitions/`:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

Given('I am on the home page', async function (this: CustomWorld) {
  await this.page.goto(this.baseUrl);
});
```

## Environment Variables

- `BASE_URL` - The base URL to test against (default: http://localhost:3000)
- `CI` - Set to 'true' to run in headless mode

## Reports

- HTML reports are generated in `e2e/reports/cucumber-report.html`
- Screenshots of failed tests are saved in `e2e/reports/screenshots/`
- Reports are uploaded as artifacts in GitHub Actions

## Tips

- Use `@playwright/test` expect assertions for better error messages
- Screenshots are automatically captured on test failures
- Tests run in headless mode in CI, headed mode locally
- Each scenario gets a fresh browser context for isolation
