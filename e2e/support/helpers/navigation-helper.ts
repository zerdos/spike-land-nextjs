import { Page, expect } from '@playwright/test';

export async function navigateToHome(page: Page, baseUrl: string) {
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
}

export async function navigateToPath(page: Page, baseUrl: string, path: string) {
  await page.goto(`${baseUrl}${path}`);
  await page.waitForLoadState('networkidle');
}

export async function clickLink(page: Page, linkText: string) {
  const link = page.getByRole('link', { name: linkText });
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForLoadState('networkidle');
}

export async function clickButton(page: Page, buttonText: string) {
  const button = page.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
  await button.click();
}

export async function clickAvatar(page: Page) {
  const avatar = page.locator('[role="button"]').filter({
    has: page.locator('img, .avatar-fallback')
  }).first();
  await expect(avatar).toBeVisible();
  await avatar.click();
}

export async function clickDropdownOption(page: Page, optionText: string) {
  const option = page.getByRole('menuitem', { name: optionText });
  await expect(option).toBeVisible();
  await option.click();
}

export async function clickOutside(page: Page) {
  await page.mouse.click(10, 10);
  await page.waitForTimeout(300);
}

export async function goBack(page: Page) {
  await page.goBack();
  await page.waitForLoadState('networkidle');
}

export async function getCurrentUrl(page: Page): Promise<string> {
  return page.url();
}

export async function getQueryParam(page: Page, paramName: string): Promise<string | null> {
  const url = new URL(page.url());
  return url.searchParams.get(paramName);
}

export async function waitForNavigation(page: Page, urlPattern?: string | RegExp) {
  if (urlPattern) {
    await page.waitForURL(urlPattern);
  } else {
    await page.waitForLoadState('networkidle');
  }
}

export async function verifyUrlContains(page: Page, urlFragment: string) {
  const currentUrl = page.url();
  expect(currentUrl).toContain(urlFragment);
}

export async function verifyUrlEquals(page: Page, expectedUrl: string) {
  const currentUrl = page.url();
  expect(currentUrl).toBe(expectedUrl);
}

export async function verifyQueryParam(page: Page, paramName: string, expectedValue: string) {
  const actualValue = await getQueryParam(page, paramName);
  expect(actualValue).toBe(expectedValue);
}
