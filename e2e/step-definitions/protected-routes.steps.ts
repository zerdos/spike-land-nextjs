import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { mockAuthCallback, mockSessionExpired } from '../support/helpers/auth-helper.js';
import { navigateToPath, getCurrentUrl, getQueryParam, verifyUrlContains } from '../support/helpers/navigation-helper.js';
import { assertTextVisible, assertUrlPath } from '../support/helpers/assertion-helper.js';

When('I navigate to {string}', async function (this: CustomWorld, path: string) {
  await navigateToPath(this.page, this.baseUrl, path);
});

When('I complete GitHub authentication as {string} with email {string}', async function (this: CustomWorld, name: string, email: string) {
  await mockAuthCallback(this.page, { name, email });
});

When('I complete Google authentication as {string} with email {string}', async function (this: CustomWorld, name: string, email: string) {
  await mockAuthCallback(this.page, { name, email });
});

When('my session expires', async function (this: CustomWorld) {
  await mockSessionExpired(this.page);
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
});

When('I attempt to access the following protected routes:', async function (this: CustomWorld, dataTable: { raw: () => string[][] }) {
  const routes = dataTable.raw().map(row => row[0]);
  this.attach(JSON.stringify({ routes }), 'application/json');

  for (const route of routes) {
    await navigateToPath(this.page, this.baseUrl, route);
    const currentUrl = await getCurrentUrl(this.page);

    const url = new URL(currentUrl);
    expect(url.pathname).toBe('/');

    const callbackUrl = await getQueryParam(this.page, 'callbackUrl');
    expect(callbackUrl).toBeTruthy();
  }
});

Then('I should be redirected to {string}', async function (this: CustomWorld, expectedPath: string) {
  await this.page.waitForTimeout(500);

  const currentUrl = await getCurrentUrl(this.page);
  const url = new URL(currentUrl);

  expect(url.pathname).toBe(expectedPath);
});

Then('I should remain on {string}', async function (this: CustomWorld, expectedPath: string) {
  await this.page.waitForTimeout(300);
  await assertUrlPath(this.page, expectedPath);
});

Then('the URL should contain {string}', async function (this: CustomWorld, fragment: string) {
  await verifyUrlContains(this.page, fragment);
});

Then('I should see {string} heading', async function (this: CustomWorld, headingText: string) {
  await assertTextVisible(this.page, headingText);
});

Then('I should not be redirected', async function (this: CustomWorld) {
  await this.page.waitForTimeout(300);
  const currentUrl = await getCurrentUrl(this.page);
  expect(currentUrl).toContain(this.baseUrl);
});

Then('all routes should redirect to home with callback URLs', async function (this: CustomWorld) {
  const currentUrl = await getCurrentUrl(this.page);
  const url = new URL(currentUrl);

  expect(url.pathname).toBe('/');

  const callbackUrl = await getQueryParam(this.page, 'callbackUrl');
  expect(callbackUrl).toBeTruthy();
});

Then('I should be on {string}', async function (this: CustomWorld, expectedPath: string) {
  await assertUrlPath(this.page, expectedPath);
});
