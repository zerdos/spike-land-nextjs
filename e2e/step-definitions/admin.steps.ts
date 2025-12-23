import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Helper to mock admin status
async function mockAdminStatus(world: CustomWorld, isAdmin: boolean) {
  // If user is admin, we rely on real DB permissions (seeded) and real API responses.
  // We only intercept if we want to simulate a non-admin user getting blocked.
  if (!isAdmin) {
    // Mock the admin check API or middleware to fail
    await world.page.route("**/api/admin/**", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Forbidden" }),
      });
    });

    await world.page.addInitScript(() => {
      // Intercept any admin checks client-side
      (window as unknown as Record<string, unknown>).__mockIsAdmin = false;
    });
  }
}

// Given steps
Given("the user is an admin", async function(this: CustomWorld) {
  await mockAdminStatus(this, true);
});

Given("the user is not an admin", async function(this: CustomWorld) {
  await mockAdminStatus(this, false);
});

Given("the user is a super admin", async function(this: CustomWorld) {
  await mockAdminStatus(this, true);
});

Given("I am on the admin dashboard", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/admin`);
  await this.page.waitForLoadState("networkidle");
});

// When steps
When(
  "I click the {string} quick link",
  async function(this: CustomWorld, linkText: string) {
    // Scope to the Quick Links section container (parent of the heading)
    // to avoid ambiguity with sidebar links or other parts of the page
    const quickLinksSection = this.page
      .getByRole("heading", { name: "Quick Links" })
      .locator("..");

    const link = quickLinksSection.getByRole("link", { name: linkText });
    await expect(link).toBeVisible();
    await link.click();
    await this.page.waitForLoadState("networkidle");
  },
);

When(
  "I click {string} in the sidebar",
  async function(this: CustomWorld, linkText: string) {
    const sidebar = this.page.locator("aside");
    // Use exact match to avoid matching partial text (e.g., "Brand" in "Pixel Brand Guidelines")
    const link = sidebar.getByRole("link", { name: linkText, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    // Don't wait for load state here, let the next step handle it if needed
    // or rely on auto-wait. Dashboard polling can cause networkidle to hang.
  },
);

When(
  "I click the {string} link in the sidebar",
  async function(this: CustomWorld, linkText: string) {
    const sidebar = this.page.locator("aside");
    // Ensure sidebar is stable
    await expect(sidebar).toBeVisible();

    // Use exact match to avoid matching partial text (e.g., "Brand" in "Pixel Brand Guidelines")
    const link = sidebar.getByRole("link", { name: linkText, exact: true });
    await expect(link).toBeVisible();

    // Wait for any potential animations or transitions
    await this.page.waitForTimeout(500);

    // Click and wait for navigation if it's a link
    await link.click();

    // Note: We don't wait for URL change here as the next step usually verifies the page
  },
);

// Then steps
Then(
  "I should see {string} metric card",
  async function(this: CustomWorld, metricName: string) {
    // Look for the label text which should be visible
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible();
  },
);

Then(
  "the {string} metric should display a number",
  async function(this: CustomWorld, metricName: string) {
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible();

    // The value is in a sibling paragraph (p + p)
    // Structure: <div><p>Label</p><p>Value</p></div>
    const valueElement = label.locator("xpath=following-sibling::p");
    await expect(valueElement).toBeVisible();

    // Look for numeric value in the card
    const text = await valueElement.textContent();
    expect(text).toMatch(/[\d,]+/);
  },
);

Then(
  "I should see admin count in the metric card",
  async function(this: CustomWorld) {
    const adminText = this.page.getByText(/\d+ admin/);
    await expect(adminText).toBeVisible();
  },
);

Then(
  "the {string} metric should display total count",
  async function(this: CustomWorld, metricName: string) {
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible();

    const valueElement = label.locator("xpath=following-sibling::p");
    await expect(valueElement).toBeVisible();

    // Verify numeric value exists
    const text = await valueElement.textContent();
    expect(text).toMatch(/[\d,]+/);
  },
);

Then("I should see active jobs count", async function(this: CustomWorld) {
  const jobsText = this.page.getByText(/\d+ active job/);
  await expect(jobsText).toBeVisible();
});

Then(
  "the {string} metric should display total",
  async function(this: CustomWorld, metricName: string) {
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible();

    const valueElement = label.locator("xpath=following-sibling::p");
    await expect(valueElement).toBeVisible();

    // Verify numeric value exists
    const text = await valueElement.textContent();
    expect(text).toMatch(/[\d,]+/);
  },
);

Then("I should see tokens spent count", async function(this: CustomWorld) {
  const spentText = this.page.getByText(/\d+ spent/);
  await expect(spentText).toBeVisible();
});

Then(
  "I should see {string} quick link",
  async function(this: CustomWorld, linkText: string) {
    const quickLinksSection = this.page.locator("text=Quick Links").locator(
      "..",
    );
    const link = quickLinksSection.getByRole("link", { name: linkText });
    await expect(link).toBeVisible();
  },
);

Then("I should see the admin sidebar", async function(this: CustomWorld) {
  const sidebar = this.page.locator("aside");
  await expect(sidebar).toBeVisible();
});

Then(
  "the sidebar should contain navigation links",
  async function(this: CustomWorld) {
    const sidebar = this.page.locator("aside");
    const navLinks = sidebar.locator("nav a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "I should see {string} link in sidebar",
  async function(this: CustomWorld, linkText: string) {
    const sidebar = this.page.locator("aside");
    const link = sidebar.getByRole("link", { name: linkText });
    await expect(link).toBeVisible();
  },
);

Then("I should see analytics content", async function(this: CustomWorld) {
  // Wait for page to load - specific content depends on implementation
  await this.page.waitForLoadState("networkidle");
  // Check for any card or heading that indicates analytics content
  const hasContent = (await this.page.locator('h1, h2, [class*="Card"]').count()) > 0;
  expect(hasContent).toBe(true);
});

Then(
  "I should see token economics content",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
    const hasContent = (await this.page.locator('h1, h2, [class*="Card"]').count()) > 0;
    expect(hasContent).toBe(true);
  },
);

Then("I should see system health content", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  const hasContent = (await this.page.locator('h1, h2, [class*="Card"]').count()) > 0;
  expect(hasContent).toBe(true);
});

Then(
  "I should see voucher management content",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
    const hasContent = (await this.page.locator('h1, h2, [class*="Card"]').count()) > 0;
    expect(hasContent).toBe(true);
  },
);

Then(
  "I should see user management content",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
    const hasContent = (await this.page.locator('h1, h2, [class*="Card"]').count()) > 0;
    expect(hasContent).toBe(true);
  },
);

Then(
  "I should see the admin user's name or email in the sidebar",
  async function(this: CustomWorld) {
    const sidebar = this.page.locator("aside");
    // Look for email or name in the header section
    const headerSection = sidebar.locator(".border-b").first();
    const hasUserInfo = (await headerSection.locator("text=/.*@.*|[A-Z][a-z]+\\s[A-Z][a-z]+/")
      .count()) > 0;
    expect(hasUserInfo).toBe(true);
  },
);

Then(
  "all quick link cards should be clickable",
  async function(this: CustomWorld) {
    const quickLinksSection = this.page.locator("text=Quick Links").locator(
      "..",
    );
    const links = quickLinksSection.getByRole("link");
    const count = await links.count();

    // Verify at least one link exists and is enabled
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const link = links.nth(i);
      await expect(link).toBeEnabled();
    }
  },
);

Then(
  "the sidebar should be fixed on the left",
  async function(this: CustomWorld) {
    const sidebar = this.page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Check if sidebar has fixed positioning
    const position = await sidebar.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    expect(position).toBe("fixed");
  },
);

Then(
  "the main content should be on the right",
  async function(this: CustomWorld) {
    const main = this.page.locator("main");
    await expect(main).toBeVisible();

    // Check if main has margin-left to account for sidebar
    const marginLeft = await main.evaluate((el) => {
      return window.getComputedStyle(el).marginLeft;
    });

    // Should have margin-left for the 256px sidebar (16rem * 16px = 256px)
    expect(marginLeft).not.toBe("0px");
  },
);
