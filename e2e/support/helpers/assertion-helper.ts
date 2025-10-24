import { Page, expect } from '@playwright/test';

export async function assertElementVisible(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
}

export async function assertElementNotVisible(page: Page, selector: string) {
  const element = page.locator(selector);
  await expect(element).not.toBeVisible();
}

export async function assertTextVisible(page: Page, text: string) {
  const element = page.getByText(text);
  await expect(element).toBeVisible();
}

export async function assertTextNotVisible(page: Page, text: string) {
  const element = page.getByText(text);
  await expect(element).not.toBeVisible();
}

export async function assertButtonVisible(page: Page, buttonText: string) {
  const button = page.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
}

export async function assertButtonNotVisible(page: Page, buttonText: string) {
  const button = page.getByRole('button', { name: buttonText });
  await expect(button).not.toBeVisible();
}

export async function assertButtonEnabled(page: Page, buttonText: string) {
  const button = page.getByRole('button', { name: buttonText });
  await expect(button).toBeEnabled();
}

export async function assertButtonDisabled(page: Page, buttonText: string) {
  const button = page.getByRole('button', { name: buttonText });
  await expect(button).toBeDisabled();
}

export async function assertLinkVisible(page: Page, linkText: string) {
  const link = page.getByRole('link', { name: linkText });
  await expect(link).toBeVisible();
}

export async function assertLinkNotVisible(page: Page, linkText: string) {
  const link = page.getByRole('link', { name: linkText });
  await expect(link).not.toBeVisible();
}

export async function assertHeadingVisible(page: Page, headingText: string) {
  const heading = page.getByRole('heading', { name: headingText });
  await expect(heading).toBeVisible();
}

export async function assertDropdownVisible(page: Page) {
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
}

export async function assertDropdownNotVisible(page: Page) {
  const menu = page.getByRole('menu');
  await expect(menu).not.toBeVisible();
}

export async function assertDropdownOptionVisible(page: Page, optionText: string) {
  const option = page.getByRole('menuitem', { name: optionText });
  await expect(option).toBeVisible();
}

export async function assertAvatarVisible(page: Page) {
  const avatar = page.locator('.fixed.top-4.right-4 [role="button"]').first();
  await expect(avatar).toBeVisible();
}

export async function assertAvatarNotVisible(page: Page) {
  const avatar = page.locator('.fixed.top-4.right-4 [role="button"]').first();
  await expect(avatar).not.toBeVisible();
}

export async function assertAvatarHasInitials(page: Page, initials: string) {
  const avatarFallback = page.locator('[class*="avatar-fallback"]').first();
  await expect(avatarFallback).toBeVisible();
  await expect(avatarFallback).toHaveText(initials);
}

export async function assertAvatarHasImage(page: Page) {
  const avatarImage = page.locator('img[alt*="User"]').first();
  await expect(avatarImage).toBeVisible();
  const src = await avatarImage.getAttribute('src');
  expect(src).toBeTruthy();
}

export async function assertPageTitle(page: Page, expectedTitle: string) {
  await expect(page).toHaveTitle(expectedTitle);
}

export async function assertUrlPath(page: Page, expectedPath: string) {
  const url = new URL(page.url());
  expect(url.pathname).toBe(expectedPath);
}

export async function assertUrlContains(page: Page, fragment: string) {
  expect(page.url()).toContain(fragment);
}

export async function assertInputValue(page: Page, inputLabel: string, expectedValue: string) {
  const input = page.getByLabel(inputLabel);
  await expect(input).toHaveValue(expectedValue);
}

export async function assertCheckboxChecked(page: Page, checkboxLabel: string) {
  const checkbox = page.getByLabel(checkboxLabel);
  await expect(checkbox).toBeChecked();
}

export async function assertCheckboxUnchecked(page: Page, checkboxLabel: string) {
  const checkbox = page.getByLabel(checkboxLabel);
  await expect(checkbox).not.toBeChecked();
}

export async function assertElementCount(page: Page, selector: string, expectedCount: number) {
  const elements = page.locator(selector);
  await expect(elements).toHaveCount(expectedCount);
}

export async function assertElementHasClass(page: Page, selector: string, className: string) {
  const element = page.locator(selector);
  await expect(element).toHaveClass(new RegExp(className));
}

export async function assertElementHasAttribute(page: Page, selector: string, attribute: string, value?: string) {
  const element = page.locator(selector);
  if (value !== undefined) {
    await expect(element).toHaveAttribute(attribute, value);
  } else {
    await expect(element).toHaveAttribute(attribute);
  }
}
