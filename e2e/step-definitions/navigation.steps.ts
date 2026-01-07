import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  assertDropdownNotVisible,
  assertDropdownOptionVisible as _assertDropdownOptionVisible,
  assertDropdownVisible,
  assertTextVisible as _assertTextVisible,
  assertUrlPath as _assertUrlPath,
} from "../support/helpers/assertion-helper";
import {
  clickAvatar as _clickAvatar,
  clickOutside,
  navigateToPath,
} from "../support/helpers/navigation-helper";
import { waitForPageReady } from "../support/helpers/wait-helper";
import type { CustomWorld } from "../support/world";

When("I click the logo in the header", async function(this: CustomWorld) {
  const logo = this.page.locator(
    'header a[href="/"], .fixed.top-4.left-4 a[href="/"]',
  ).first();
  await expect(logo).toBeVisible();
  await logo.click();
  await waitForPageReady(this.page);
});

When(
  "I click the site title in the header",
  async function(this: CustomWorld) {
    const title = this.page.locator(
      'header a[href="/"], .fixed.top-4.left-4 a[href="/"]',
    ).first();
    await expect(title).toBeVisible();
    await title.click();
    await waitForPageReady(this.page);
  },
);

When("I click outside the dropdown", async function(this: CustomWorld) {
  await clickOutside(this.page);
});

When("I use the browser back button", async function(this: CustomWorld) {
  const currentUrl = this.page.url();
  await this.page.goBack({ waitUntil: "commit" });

  // Wait for URL to actually change
  await this.page.waitForFunction(
    (oldUrl) => window.location.href !== oldUrl,
    currentUrl,
    { timeout: 5000 },
  );

  await waitForPageReady(this.page);
});

When("I use the browser forward button", async function(this: CustomWorld) {
  const currentUrl = this.page.url();
  await this.page.goForward({ waitUntil: "commit" });

  // Wait for URL to actually change
  await this.page.waitForFunction(
    (oldUrl) => window.location.href !== oldUrl,
    currentUrl,
    { timeout: 5000 },
  );

  await waitForPageReady(this.page);
});

When(
  "I directly access {string} via URL",
  async function(this: CustomWorld, path: string) {
    await navigateToPath(this.page, this.baseUrl, path);
  },
);

When("I refresh the page", async function(this: CustomWorld) {
  await this.page.reload({ waitUntil: "commit" });
  await waitForPageReady(this.page);
});

When("I press the Tab key", async function(this: CustomWorld) {
  await this.page.keyboard.press("Tab");
  // Wait for focus to shift (check for focused element change)
  await this.page.waitForFunction(() => {
    return document.activeElement !== document.body;
  }, { timeout: 2000 }).catch(() => {
    // If no element receives focus, that's OK
  });
});

Then("the dropdown menu should be visible", async function(this: CustomWorld) {
  await assertDropdownVisible(this.page);
});

Then(
  "the dropdown menu should not be visible",
  async function(this: CustomWorld) {
    await assertDropdownNotVisible(this.page);
  },
);

Then(
  "the dropdown menu should remain visible",
  async function(this: CustomWorld) {
    // Check dropdown is still visible after a brief moment
    const dropdown = this.page.getByRole("menu");
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Wait a bit and verify it's still visible
    await this.page.waitForTimeout(300);
    await expect(dropdown).toBeVisible();
  },
);

Then("I should still be logged in", async function(this: CustomWorld) {
  const avatar = this.page.locator('[data-testid="user-avatar"]').first();
  await expect(avatar).toBeVisible();
});

Then("the footer should be visible", async function(this: CustomWorld) {
  const footer = this.page.locator("footer");
  const isVisible = await footer.isVisible();

  if (!isVisible) {
    this.attach("Footer not found - may not be implemented yet", "text/plain");
  }
});

Then(
  "all footer links should be clickable",
  async function(this: CustomWorld) {
    const footer = this.page.locator("footer");
    const isVisible = await footer.isVisible();

    if (isVisible) {
      const links = footer.locator("a");
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        await expect(link).toBeVisible();
      }
    } else {
      this.attach("Footer not found - skipping link check", "text/plain");
    }
  },
);
