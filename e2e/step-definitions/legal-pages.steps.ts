import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

// Cookie banner visibility
Given('the cookie consent banner is visible', async function (this: CustomWorld) {
  // Clear cookie consent to show banner
  await this.page.evaluate(() => {
    localStorage.removeItem('cookie-consent');
  });
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');

  // Wait for banner to be visible
  const banner = this.page.locator('[class*="fixed bottom-0"]').filter({ hasText: 'Cookie Consent' });
  await expect(banner).toBeVisible();
});

// Click link in cookie banner
When('I click the {string} link in the cookie banner', async function (this: CustomWorld, linkText: string) {
  const banner = this.page.locator('[class*="fixed bottom-0"]').filter({ hasText: 'Cookie Consent' });
  const link = banner.getByRole('link', { name: linkText });
  await expect(link).toBeVisible();
  await link.click();
  await this.page.waitForLoadState('networkidle');
});

// Click anchor links in table of contents
When('I click the {string} anchor link', async function (this: CustomWorld, linkText: string) {
  const link = this.page.getByRole('link', { name: linkText });
  await expect(link).toBeVisible();
  await link.click();
  // Wait a moment for smooth scroll
  await this.page.waitForTimeout(500);
});

// Verify page scrolled to section
Then('the page should scroll to the {string} section', async function (this: CustomWorld, sectionId: string) {
  const section = this.page.locator(`#${sectionId}`);
  await expect(section).toBeVisible();

  // Verify the section is in viewport
  const isInViewport = await section.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.top <= window.innerHeight;
  });

  expect(isInViewport).toBe(true);
});
