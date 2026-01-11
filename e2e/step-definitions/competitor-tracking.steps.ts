const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Given('I am on the "/competitors" page', async function () {
  await this.page.goto('http://localhost:3000/competitors');
});

When('I fill in "{string}" with "{string}"', async function (name, value) {
  await this.page.fill(`[name="${name}"]`, value);
});

When('I click the "{string}" button', async function (buttonText) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

Then('I should see "{string}" in the table', async function (text) {
  const table = await this.page.locator('table');
  await expect(table).toContainText(text);
});

When('I click the "{string}" button for "{string}"', async function (buttonText, competitorName) {
  const row = await this.page.locator('tr', { hasText: competitorName });
  await row.locator(`button:has-text("${buttonText}")`).click();
});

Then('I should not see "{string}" in the table', async function (text) {
  const table = await this.page.locator('table');
  await expect(table).not.toContainText(text);
});
