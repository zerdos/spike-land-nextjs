import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { mockAuthCallback, mockSessionExpired } from '../support/helpers/auth-helper';
import { navigateToPath, getCurrentUrl, getQueryParam } from '../support/helpers/navigation-helper';
import { assertUrlPath } from '../support/helpers/assertion-helper';

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

// NOTE: "I should be redirected to {string}" and "the URL should contain {string}" steps are defined in my-apps.steps.ts and authentication.steps.ts

Then('I should remain on {string}', async function (this: CustomWorld, expectedPath: string) {
  await this.page.waitForTimeout(300);
  await assertUrlPath(this.page, expectedPath);
});

// NOTE: "I should see {string} heading" step is defined in authentication.steps.ts

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
