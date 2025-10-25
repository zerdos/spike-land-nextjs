import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import * as fs from 'fs';
import * as path from 'path';

Given('I am on the my-apps page', async function (this: CustomWorld) {
  await this.page.goto('/my-apps');
  await this.page.waitForLoadState('domcontentloaded');
});

Given('I am on the new app creation page', async function (this: CustomWorld) {
  await this.page.goto('/my-apps/new');
  await this.page.waitForLoadState('domcontentloaded');
});

Given('I am on the profile page', async function (this: CustomWorld) {
  await this.page.goto('/profile');
  await this.page.waitForLoadState('domcontentloaded');
});

Given('I am on the settings page', async function (this: CustomWorld) {
  await this.page.goto('/settings');
  await this.page.waitForLoadState('domcontentloaded');
});

Given('the loading components are implemented', function (this: CustomWorld) {
  // This is a given state - loading components exist in the codebase
});

Given('I navigate between pages', async function (this: CustomWorld) {
  await this.page.goto('/my-apps');
  await this.page.waitForLoadState('domcontentloaded');
});

Then('the page should have proper layout structure', async function (this: CustomWorld) {
  // Verify the my-apps page has the expected structure
  const container = this.page.locator('.min-h-screen').first();
  await expect(container).toBeVisible();

  // Verify main content areas are present
  const hasContent = await this.page.evaluate(() => {
    return !!(document.querySelector('.container') || document.querySelector('main'));
  });
  expect(hasContent).toBe(true);
});

Then('the page should have wizard layout structure', async function (this: CustomWorld) {
  // Verify the wizard page has the expected structure
  const container = this.page.locator('.max-w-2xl').first();
  await expect(container).toBeVisible();
});

Then('the page should have profile layout structure', async function (this: CustomWorld) {
  // Verify the profile page has the expected structure
  const container = this.page.locator('.container').first();
  await expect(container).toBeVisible();
});

Then('the page should have settings layout structure', async function (this: CustomWorld) {
  // Verify the settings page has the expected structure
  const container = this.page.locator('.max-w-4xl').first();
  await expect(container).toBeVisible();
});

Then('there should be no blank white screens', async function (this: CustomWorld) {
  // Verify some content is always visible (either skeleton or actual content)
  const hasContent = await this.page.evaluate(() => {
    const body = document.body;
    const hasVisibleElements = body.children.length > 0;
    const hasContainer = !!(
      document.querySelector('.container') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.querySelector('.min-h-screen') ||
      document.querySelector('.max-w-2xl') ||
      document.querySelector('.max-w-4xl')
    );
    return hasVisibleElements && hasContainer;
  });

  expect(hasContent).toBe(true);
});

Then('loading.tsx should exist for my-apps route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/my-apps/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('loading.tsx should exist for my-apps\\/new route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/my-apps/new/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('loading.tsx should exist for profile route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/profile/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('loading.tsx should exist for settings route', function (this: CustomWorld) {
  const loadingPath = path.join(process.cwd(), 'src/app/settings/loading.tsx');
  expect(fs.existsSync(loadingPath)).toBe(true);
});

Then('the content should load smoothly', async function (this: CustomWorld) {
  // Wait for page to be fully loaded
  await this.page.waitForLoadState('networkidle');

  // Verify content is present
  const hasContent = await this.page.evaluate(() => {
    return !!(document.querySelector('.container') || document.querySelector('main'));
  });
  expect(hasContent).toBe(true);
});

Then('the layout should remain stable', async function (this: CustomWorld) {
  // Verify main layout structure remains consistent
  const mainLayout = this.page.locator('.container, main, [role="main"]').first();
  await expect(mainLayout).toBeVisible();
});
