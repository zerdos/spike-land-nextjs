import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// Helper to mock admin status
async function mockAdminStatus(world: CustomWorld, isAdmin: boolean) {
  // If user is admin, we rely on real DB permissions (seeded) and real API responses.
  // We only intercept if we want to simulate a non-admin user getting blocked.
  if (!isAdmin) {
    // Update the e2e-user-role cookie to USER (overrides any previous ADMIN setting)
    // This is needed because the admin layout checks the role from the cookie directly
    await world.page.context().addCookies([
      {
        name: "e2e-user-role",
        value: "USER",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
    ]);

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

  // Mock the resources API to return valid data for E2E tests
  await this.page.route("**/api/admin/agents/resources", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        resources: {
          devServer: { running: true, port: 3000, url: "http://localhost:3000" },
          mcpServers: [
            { name: "playwright", type: "stdio", configured: true },
          ],
          database: { connected: true, provider: "postgresql" },
          environment: {
            nodeEnv: "test",
            julesConfigured: true,
            githubConfigured: true,
          },
        },
        checkedAt: new Date().toISOString(),
      }),
    });
  });

  // Mock the main agents API to return julesAvailable: true
  await this.page.route("**/api/admin/agents", async (route) => {
    const url = new URL(route.request().url());
    // Only mock exact /api/admin/agents path (not subpaths like /resources, /git)
    if (!url.pathname.endsWith("/api/admin/agents")) {
      await route.continue();
      return;
    }
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          julesAvailable: true,
          sessions: [],
          pagination: { total: 0, page: 1, limit: 20 },
          statusCounts: {},
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock the git info API to return valid data for E2E tests
  await this.page.route("**/api/admin/agents/git", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        branch: "feature/e2e-test-branch",
        baseBranch: "main",
        changedFiles: [
          { path: "src/components/example.tsx", status: "modified" },
          { path: "src/lib/utils.ts", status: "added" },
        ],
        uncommittedChanges: 2,
        aheadBy: 3,
        behindBy: 0,
        lastCommit: {
          sha: "abc123def",
          message: "feat: Add new feature",
          author: "Test User",
          date: new Date().toISOString(),
        },
      }),
    });
  });

  // Mock GitHub issues API to return valid data for E2E tests
  await this.page.route("**/api/admin/agents/github/issues*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        issues: [
          {
            number: 123,
            title: "Test Issue",
            state: "open",
            url: "https://github.com/test/repo/issues/123",
          },
        ],
        pullRequests: [
          {
            number: 456,
            title: "Test PR",
            state: "open",
            url: "https://github.com/test/repo/pull/456",
          },
        ],
        workflows: [
          {
            id: 1,
            name: "CI",
            status: "completed",
            conclusion: "success",
            createdAt: new Date().toISOString(),
          },
        ],
        githubConfigured: true,
        timestamp: new Date().toISOString(),
      }),
    });
  });

  // Mock the user analytics API to return valid data for E2E tests
  await this.page.route("**/api/admin/analytics/users", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dailyRegistrations: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
            .toISOString(),
          count: Math.floor(Math.random() * 10) + 1,
        })),
        authProviders: [
          { name: "Email", count: 45 },
          { name: "Google", count: 30 },
          { name: "GitHub", count: 15 },
        ],
        activeUsers: {
          last7Days: 25,
          last30Days: 60,
        },
        totalUsers: 100,
        growth: {
          last7Days: 5,
          last30Days: 20,
        },
      }),
    });
  });

  // Mock the token analytics API to return valid data for E2E tests
  await this.page.route("**/api/admin/analytics/tokens", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalTokens: 50000,
        usedTokens: 15000,
        averagePerUser: 150,
        topUsers: [
          { id: "user-1", name: "Test User 1", tokens: 500 },
          { id: "user-2", name: "Test User 2", tokens: 300 },
        ],
      }),
    });
  });
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
    await this.page.waitForLoadState("domcontentloaded");
    // Try networkidle with short timeout, but don't fail if it times out
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // Network may still be active, that's OK
    }
  },
);

When(
  "I click {string} in the sidebar",
  async function(this: CustomWorld, linkText: string) {
    const sidebar = this.page.locator("aside");
    // Use text-based locator since accessible name may include emoji icons
    const link = sidebar.locator("a").filter({ hasText: linkText });
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
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Find the link - try partial match for links with icons/prefixes like "← Back to App"
    let link = sidebar.locator("a").filter({ hasText: linkText });

    // Check if link exists
    const count = await link.count();
    if (count === 0) {
      // Try to find it in the Sheet/drawer for mobile view
      const sheet = this.page.locator('[role="dialog"]');
      link = sheet.locator("a").filter({ hasText: linkText });
    }

    // For "Back to App" link at bottom of sidebar, we may need to scroll the nav area
    // The sidebar has a fixed structure with scrollable nav section
    if (linkText.includes("Back to App")) {
      // Scroll the sidebar nav to bottom to make sure "Back to App" section is visible
      await sidebar.evaluate((el) => {
        const scrollableNav = el.querySelector(".overflow-y-auto");
        if (scrollableNav) {
          scrollableNav.scrollTop = scrollableNav.scrollHeight;
        }
      });
      await this.page.waitForTimeout(200);
    }

    // Scroll the link into view if needed
    await link.first().scrollIntoViewIfNeeded({ timeout: 5000 });

    await expect(link.first()).toBeVisible({ timeout: 5000 });

    // Wait for any potential animations or transitions
    await this.page.waitForTimeout(300);

    // Click and wait for navigation if it's a link
    await link.first().click();

    // Note: We don't wait for URL change here as the next step usually verifies the page
  },
);

// Then steps
Then(
  "I should see {string} metric card",
  async function(this: CustomWorld, metricName: string) {
    // First wait for the Admin Dashboard heading to ensure the page has loaded
    const heading = this.page.getByRole("heading", { name: "Admin Dashboard" });
    await expect(heading).toBeVisible({ timeout: 20000 });

    // Then look for the label text which should be visible
    // Use longer timeout for server-rendered admin pages which may take time to fetch data
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible({ timeout: 15000 });
  },
);

Then(
  "the {string} metric should display a number",
  async function(this: CustomWorld, metricName: string) {
    // First wait for the Admin Dashboard heading to ensure the page has loaded
    const heading = this.page.getByRole("heading", { name: "Admin Dashboard" });
    await expect(heading).toBeVisible({ timeout: 20000 });

    // Use longer timeout for server-rendered admin pages which may take time to fetch data
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible({ timeout: 15000 });

    // The value is in a sibling paragraph (p + p)
    // Structure: <div><p>Label</p><p>Value</p></div>
    const valueElement = label.locator("xpath=following-sibling::p");
    await expect(valueElement).toBeVisible({ timeout: 10000 });

    // Look for numeric value in the card
    const text = await valueElement.textContent();
    expect(text).toMatch(/[\d,]+/);
  },
);

Then(
  "I should see admin count in the metric card",
  async function(this: CustomWorld) {
    const adminText = this.page.getByText(/\d+ admin/);
    await expect(adminText).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the {string} metric should display total count",
  async function(this: CustomWorld, metricName: string) {
    // Use longer timeout for server-rendered admin pages which may take time to fetch data
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible({ timeout: 15000 });

    const valueElement = label.locator("xpath=following-sibling::p");
    await expect(valueElement).toBeVisible({ timeout: 10000 });

    // Verify numeric value exists
    const text = await valueElement.textContent();
    expect(text).toMatch(/[\d,]+/);
  },
);

Then("I should see active jobs count", async function(this: CustomWorld) {
  const jobsText = this.page.getByText(/\d+ active job/);
  await expect(jobsText).toBeVisible({ timeout: 10000 });
});

Then(
  "the {string} metric should display total",
  async function(this: CustomWorld, metricName: string) {
    // Use longer timeout for server-rendered admin pages which may take time to fetch data
    const label = this.page.getByText(metricName, { exact: true });
    await expect(label).toBeVisible({ timeout: 15000 });

    const valueElement = label.locator("xpath=following-sibling::p");
    await expect(valueElement).toBeVisible({ timeout: 10000 });

    // Verify numeric value exists
    const text = await valueElement.textContent();
    expect(text).toMatch(/[\d,]+/);
  },
);

Then("I should see tokens spent count", async function(this: CustomWorld) {
  const spentText = this.page.getByText(/\d+ spent/);
  await expect(spentText).toBeVisible({ timeout: 10000 });
});

Then(
  "I should see {string} quick link",
  async function(this: CustomWorld, linkText: string) {
    const quickLinksSection = this.page.locator("text=Quick Links").locator(
      "..",
    );
    const link = quickLinksSection.getByRole("link", { name: linkText });
    await expect(link).toBeVisible({ timeout: 10000 });
  },
);

Then("I should see the admin sidebar", async function(this: CustomWorld) {
  const sidebar = this.page.locator("aside");
  await expect(sidebar).toBeVisible({ timeout: 10000 });
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

    // Check if main has padding-left to account for sidebar (lg:pl-64 = 256px)
    const paddingLeft = await main.evaluate((el) => {
      return window.getComputedStyle(el).paddingLeft;
    });

    // Should have padding-left for the 256px sidebar (16rem * 16px = 256px)
    expect(paddingLeft).not.toBe("0px");
  },
);
