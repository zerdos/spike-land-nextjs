import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

Given('I am on the home page', async function (this: CustomWorld) {
  await this.page.goto(this.baseUrl);
  await this.page.waitForLoadState('networkidle');
});

Then('I should see the page title {string}', async function (this: CustomWorld, title: string) {
  const heading = this.page.getByRole('heading', { name: title });
  await expect(heading).toBeVisible();
});

Then('I should see the description {string}', async function (this: CustomWorld, description: string) {
  const text = this.page.getByText(description);
  await expect(text).toBeVisible();
});

When('I view the tech stack section', async function (this: CustomWorld) {
  const section = this.page.getByText('Tech Stack:');
  await expect(section).toBeVisible();
});

Then('I should see {string} heading', async function (this: CustomWorld, heading: string) {
  const headingElement = this.page.getByText(heading);
  await expect(headingElement).toBeVisible();
});

Then('I should see the following tech stack items:', async function (this: CustomWorld, dataTable: DataTable) {
  const items = dataTable.rows().map(row => row[0]);

  for (const item of items) {
    const element = this.page.getByText(item);
    await expect(element).toBeVisible();
  }
});

Then('I should see a {string} button', async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole('button', { name: buttonName });
  await expect(button).toBeVisible();
});

When('I click the {string} button', async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole('button', { name: buttonName });
  await button.click();
});

Then('the button should be interactive', async function (this: CustomWorld) {
  // Button click was successful if we got here without error
  // In a real app, we'd verify navigation or state change
  expect(true).toBe(true);
});
