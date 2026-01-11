import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';

Given('I am on the "/competitors" page', async function (this: CustomWorld) {
  await this.page.goto('http://localhost:3000/competitors');
});

When('I fill in "{string}" with "{string}"', async function (this: CustomWorld, name: string, value: string) {
  await this.page.fill(`[name="${name}"]`, value);
});

When('I click the "{string}" button', async function (this: CustomWorld, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

Then('I should see "{string}" in the table', async function (this: CustomWorld, text: string) {
  const table = await this.page.locator('table');
  await expect(table).toContainText(text);
});

When(
  'I click the "{string}" button for "{string}"',
  async function (this: CustomWorld, buttonText: string, competitorName: string) {
    const row = await this.page.locator('tr', { hasText: competitorName });
    await row.locator(`button:has-text("${buttonText}")`).click();
  },
);

Then('I should not see "{string}" in the table', async function (this: CustomWorld, text: string) {
  const table = await this.page.locator('table');
  await expect(table).not.toContainText(text);
});
