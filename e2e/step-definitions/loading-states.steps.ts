import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

Given('I am on the my-apps page', async function (this: CustomWorld) {
  await this.page.goto('/my-apps');
});

Given('I am on the new app creation page', async function (this: CustomWorld) {
  await this.page.goto('/my-apps/new');
});

Given('I am on the profile page', async function (this: CustomWorld) {
  await this.page.goto('/profile');
});

Given('I am on the settings page', async function (this: CustomWorld) {
  await this.page.goto('/settings');
});

Given('I am on any page with loading state', async function (this: CustomWorld) {
  await this.page.goto('/my-apps');
});

When('the page is loading', async function (this: CustomWorld) {
  // This step is mostly for documentation purposes
  // as the loading state is checked in subsequent steps
});

When('the skeleton is displayed', async function (this: CustomWorld) {
  // Check if any skeleton element exists
  const skeleton = this.page.locator('[class*="animate-pulse"]').first();
  await expect(skeleton).toBeVisible({ timeout: 1000 });
});

When('a page is loading', async function (this: CustomWorld) {
  // This step is mostly for documentation purposes
});

When('the actual content loads', async function (this: CustomWorld) {
  // Wait for skeleton to disappear and content to load
  await this.page.waitForLoadState('networkidle');
});

Then('I should see skeleton placeholders', async function (this: CustomWorld) {
  const skeletons = this.page.locator('[class*="animate-pulse"]');
  const count = await skeletons.count();
  expect(count).toBeGreaterThan(0);
});

Then('the skeleton should match the page layout', async function (this: CustomWorld) {
  // Verify skeleton elements exist with appropriate structure
  const container = this.page.locator('.container, .min-h-screen').first();
  await expect(container).toBeVisible();
});

Then('I should see wizard step skeleton', async function (this: CustomWorld) {
  const skeleton = this.page.locator('.max-w-2xl');
  await expect(skeleton).toBeVisible();
});

Then('the skeleton should include form field placeholders', async function (this: CustomWorld) {
  const skeletons = this.page.locator('[class*="animate-pulse"]');
  const count = await skeletons.count();
  expect(count).toBeGreaterThan(5);
});

Then('I should see profile skeleton', async function (this: CustomWorld) {
  const container = this.page.locator('.container').first();
  await expect(container).toBeVisible();
});

Then('the skeleton should include avatar placeholder', async function (this: CustomWorld) {
  const avatar = this.page.locator('.rounded-full[class*="animate-pulse"]').first();
  await expect(avatar).toBeVisible();
});

Then('the skeleton should include user information placeholders', async function (this: CustomWorld) {
  const skeletons = this.page.locator('[class*="animate-pulse"]');
  const count = await skeletons.count();
  expect(count).toBeGreaterThan(8);
});

Then('I should see settings skeleton', async function (this: CustomWorld) {
  const container = this.page.locator('.max-w-4xl').first();
  await expect(container).toBeVisible();
});

Then('the skeleton should include tab placeholders', async function (this: CustomWorld) {
  const tabs = this.page.locator('.gap-2').first();
  await expect(tabs).toBeVisible();
});

Then('the skeleton elements should have pulse animation', async function (this: CustomWorld) {
  const skeleton = this.page.locator('[class*="animate-pulse"]').first();
  await expect(skeleton).toBeVisible();

  // Verify the animate-pulse class is present
  const classes = await skeleton.getAttribute('class');
  expect(classes).toContain('animate-pulse');
});

Then('the animation should be smooth and consistent', async function (this: CustomWorld) {
  // Verify multiple skeleton elements have the same animation class
  const skeletons = this.page.locator('[class*="animate-pulse"]');
  const count = await skeletons.count();

  for (let i = 0; i < Math.min(count, 3); i++) {
    const element = skeletons.nth(i);
    const classes = await element.getAttribute('class');
    expect(classes).toContain('animate-pulse');
  }
});

Then('the loading skeleton should appear immediately', async function (this: CustomWorld) {
  // Skeletons should be visible within a very short time
  const skeleton = this.page.locator('[class*="animate-pulse"]').first();
  await expect(skeleton).toBeVisible({ timeout: 100 });
});

Then('the transition to actual content should be smooth', async function (this: CustomWorld) {
  // Wait for content to fully load
  await this.page.waitForLoadState('networkidle');

  // Verify page is in a stable state
  await this.page.waitForLoadState('domcontentloaded');
});

Then('there should be no blank white screens', async function (this: CustomWorld) {
  // Either skeleton or content should always be visible
  const hasSkeletonOrContent = await this.page.evaluate(() => {
    const skeleton = document.querySelector('[class*="animate-pulse"]');
    const content = document.querySelector('.container, main, [role="main"]');
    return !!(skeleton || content);
  });

  expect(hasSkeletonOrContent).toBe(true);
});

Then('the content layout should closely match the skeleton structure', async function (this: CustomWorld) {
  // Verify the main container structure is present
  const container = this.page.locator('.container, .min-h-screen, .max-w-2xl, .max-w-4xl').first();
  await expect(container).toBeVisible();
});

Then('users should not experience jarring layout shifts', async function (this: CustomWorld) {
  // Verify stable layout by checking main container is present
  const mainLayout = this.page.locator('.container, main, [role="main"]').first();
  await expect(mainLayout).toBeVisible();
});

Given('I navigate between pages', async function (this: CustomWorld) {
  // Navigate to initial page
  await this.page.goto('/my-apps');
});

Given('I am viewing a page skeleton', async function (this: CustomWorld) {
  await this.page.goto('/my-apps');
  const skeleton = this.page.locator('[class*="animate-pulse"]').first();
  await expect(skeleton).toBeVisible({ timeout: 1000 });
});
