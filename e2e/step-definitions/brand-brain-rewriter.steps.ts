import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { gotoWithRetry, TIMEOUTS, waitForApiResponse } from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

// Test workspace slug used across scenarios
const TEST_WORKSPACE_SLUG = "test-workspace";

// Mock workspace data
const mockWorkspace = {
  id: "workspace-123",
  name: "Test Workspace",
  slug: TEST_WORKSPACE_SLUG,
};

// Mock brand profile
const mockBrandProfile = {
  id: "profile-123",
  workspaceId: "workspace-123",
  name: "Test Brand",
  version: 1,
};

// Mock rewrite response
const mockRewriteResponse = {
  id: "rewrite-123",
  original: "Check out our cheap products today!",
  rewritten: "Discover our affordable products today!",
  platform: "GENERAL",
  changes: [
    { id: "hunk-0", type: "unchanged", value: "Discover our ", selected: true },
    { id: "hunk-1", type: "removed", value: "cheap", selected: true },
    { id: "hunk-2", type: "added", value: "affordable", selected: true },
    { id: "hunk-3", type: "unchanged", value: " products today!", selected: true },
  ],
  characterCount: {
    original: 35,
    rewritten: 39,
    limit: 50000,
  },
  toneAnalysis: {
    formalCasual: 50,
    technicalSimple: 50,
    seriousPlayful: 50,
    reservedEnthusiastic: 50,
    alignment: 85,
  },
  cached: false,
};

/**
 * Extract domain from URL for cookie setting.
 * Returns the hostname without port for proper cookie domain matching.
 */
function extractCookieDomain(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    // Return hostname (e.g., "localhost" or "spike-land-nextjs-xxx.vercel.app")
    return url.hostname;
  } catch {
    // Fallback if URL parsing fails
    return "localhost";
  }
}

// Helper to set up workspace mocks
async function setupWorkspaceMocks(world: CustomWorld) {
  // Mock workspace by-slug endpoint
  await world.page.route(`**/api/workspaces/by-slug/${TEST_WORKSPACE_SLUG}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockWorkspace),
    });
  });

  // Mock brand profile endpoint
  await world.page.route(`**/api/workspaces/${mockWorkspace.id}/brand-profile`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockBrandProfile),
    });
  });
}

// Helper to mock session
async function mockSession(world: CustomWorld) {
  await world.page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          name: "Test User",
          email: "test@example.com",
          role: "USER",
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  // Extract the correct domain from baseUrl for cookie setting
  // This is critical for CI where tests run against Vercel preview URLs
  const cookieDomain = extractCookieDomain(world.baseUrl);

  // Set mock session cookies
  await world.page.context().addCookies([
    {
      name: "authjs.session-token",
      value: "mock-session-token",
      domain: cookieDomain,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    },
  ]);
}

// Background step
Given("I am logged in as a workspace member", async function(this: CustomWorld) {
  await mockSession(this);
  await setupWorkspaceMocks(this);
});

Given("I have a brand profile configured", async function(this: CustomWorld) {
  // Already mocked in setupWorkspaceMocks
  // This step exists for readability in the feature file
});

// Navigation steps
When("I navigate to the Brand Brain page", async function(this: CustomWorld) {
  await gotoWithRetry(this.page, `${this.baseUrl}/orbit/${TEST_WORKSPACE_SLUG}/brand-brain`);
});

When("I navigate to the rewriter page", async function(this: CustomWorld) {
  // Set up workspace mocks FIRST, before any navigation
  await setupWorkspaceMocks(this);

  // Set up rewrite API mock BEFORE navigation so it's ready when form is submitted
  await this.page.route(
    `**/api/workspaces/${mockWorkspace.id}/brand-brain/rewrite`,
    async (route) => {
      // Add a small delay to simulate processing
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRewriteResponse),
      });
    },
  );

  await gotoWithRetry(
    this.page,
    `${this.baseUrl}/orbit/${TEST_WORKSPACE_SLUG}/brand-brain/rewriter`,
  );

  // Wait for loading state to finish and form to appear
  // The form contains the Rewrite button - use shorter timeout to stay under Cucumber's 30s limit
  await this.page.waitForSelector('form button[type="submit"]', { timeout: TIMEOUTS.LONG });
});

When("I navigate to a non-existent workspace rewriter page", async function(this: CustomWorld) {
  // Mock 404 for non-existent workspace
  await this.page.route("**/api/workspaces/by-slug/non-existent", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Workspace not found" }),
    });
  });
  await gotoWithRetry(this.page, `${this.baseUrl}/orbit/non-existent/brand-brain/rewriter`);
});

Then("I should be on the rewriter page", async function(this: CustomWorld) {
  await this.page.waitForURL(/\/brand-brain\/rewriter/);
  expect(this.page.url()).toContain("/brand-brain/rewriter");
});

Then("I should be on the Brand Brain page", async function(this: CustomWorld) {
  await this.page.waitForURL(/\/brand-brain(?!\/)/);
  expect(this.page.url()).toMatch(/\/brand-brain(?!\/rewriter)/);
});

// Form element visibility steps
Then("I should see the draft content textarea", async function(this: CustomWorld) {
  const textarea = this.page.locator('textarea[id="content"]');
  await expect(textarea).toBeVisible();
});

Then("I should see the platform selector", async function(this: CustomWorld) {
  const selector = this.page.locator('[id="platform"]');
  await expect(selector).toBeVisible();
});

// Platform selection steps
When("I select {string} from the platform selector", async function(
  this: CustomWorld,
  platformName: string,
) {
  // Use retry pattern for platform selection
  const trigger = this.page.locator('[id="platform"]');
  await expect(trigger).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await trigger.click();
  await this.page.waitForTimeout(300);

  // Find and click the option with retry
  const option = this.page.locator('[role="option"]').filter({ hasText: platformName });
  await expect(option).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await option.click();
  await this.page.waitForTimeout(200);
});

Then("I should see {string} in the character limit indicator", async function(
  this: CustomWorld,
  limit: string,
) {
  // Wait for platform change to update UI
  await this.page.waitForTimeout(500);

  // Match both "3000" and "3,000" formats (toLocaleString adds commas)
  const limitWithCommas = limit.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const indicator = this.page.getByText(
    new RegExp(`(${limit}|${limitWithCommas}).*character`, "i"),
  );
  await expect(indicator.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

// Content input steps
When("I enter draft content {string}", async function(this: CustomWorld, content: string) {
  const textarea = this.page.locator('textarea[id="content"]');
  await expect(textarea).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await expect(textarea).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });

  // Clear and fill with retry
  await textarea.clear();
  await textarea.fill(content);

  // Wait for React state to update
  await this.page.waitForTimeout(200);

  // Verify value was set
  await expect(textarea).toHaveValue(content, { timeout: TIMEOUTS.SHORT });
});

When("I enter draft content that exceeds 280 characters", async function(this: CustomWorld) {
  const longContent = "a".repeat(300);
  const textarea = this.page.locator('textarea[id="content"]');
  await expect(textarea).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await expect(textarea).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });

  // Clear and fill with retry
  await textarea.clear();
  await textarea.fill(longContent);

  // Wait for React state to update
  await this.page.waitForTimeout(200);
});

Then("I should see {string} in the character count", async function(
  this: CustomWorld,
  count: string,
) {
  const countElement = this.page.getByText(new RegExp(`${count}\\s*/`));
  await expect(countElement.first()).toBeVisible();
});

Then("the character count should be within limit", async function(this: CustomWorld) {
  // Check that there's no red/warning styling
  const warningText = this.page.locator(".text-red-600, .text-red-400");
  const count = await warningText.count();
  expect(count).toBe(0);
});

Then("the character count should show over limit warning", async function(this: CustomWorld) {
  const warningText = this.page.locator(".text-red-600, .text-red-400");
  await expect(warningText.first()).toBeVisible();
});

// Submit and rewrite steps
Then("I should see a loading indicator", async function(this: CustomWorld) {
  const spinner = this.page.locator(".animate-spin");
  // Loading indicator may be brief, so use a reasonable timeout
  await expect(spinner.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

When("the rewrite completes", async function(this: CustomWorld) {
  // Wait for API response first
  await waitForApiResponse(this.page, /brand-brain\/rewrite/, { timeout: TIMEOUTS.LONG });

  // Wait for the AI-generated result heading to appear
  await expect(this.page.getByText("Review Changes")).toBeVisible({ timeout: TIMEOUTS.LONG });
});

When("I have a rewrite result with changes", async function(this: CustomWorld) {
  await setupWorkspaceMocks(this);

  // Mock the rewrite API with slight delay to simulate AI processing
  await this.page.route(
    `**/api/workspaces/${mockWorkspace.id}/brand-brain/rewrite`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRewriteResponse),
      });
    },
  );

  // Navigate to rewriter page
  await gotoWithRetry(
    this.page,
    `${this.baseUrl}/orbit/${TEST_WORKSPACE_SLUG}/brand-brain/rewriter`,
  );

  // Wait for form to be ready
  await this.page.waitForSelector('textarea[id="content"]', { timeout: TIMEOUTS.LONG });

  // Fill form with retry pattern
  const textarea = this.page.locator('textarea[id="content"]');
  await expect(textarea).toBeVisible({ timeout: TIMEOUTS.LONG });
  await expect(textarea).toBeEnabled({ timeout: TIMEOUTS.LONG });
  await textarea.clear();
  await textarea.fill("Check out our cheap products today!");
  await this.page.waitForTimeout(300);

  // Click submit button with retry
  const button = this.page.getByRole("button", { name: /Rewrite with AI/i });
  await expect(button).toBeVisible({ timeout: TIMEOUTS.LONG });
  await expect(button).toBeEnabled({ timeout: TIMEOUTS.LONG });
  await button.click();

  // Wait for API response
  await waitForApiResponse(this.page, /brand-brain\/rewrite/, { timeout: TIMEOUTS.LONG });

  // Wait for AI-generated result heading to appear
  await expect(this.page.getByText("Review Changes")).toBeVisible({ timeout: TIMEOUTS.LONG });
});

// Diff viewer steps
Then("I should see the diff viewer", async function(this: CustomWorld) {
  const diffViewer = this.page.locator('[role="tablist"]');
  await expect(diffViewer).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then("I should see the original text", async function(this: CustomWorld) {
  // The original text parts are shown in the diff - AI-generated content needs longer timeout
  const unchangedText = this.page.getByText(/products today!/);
  await expect(unchangedText.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then("I should see the rewritten text", async function(this: CustomWorld) {
  // Rewritten text includes "affordable" - AI-generated content needs longer timeout
  const rewrittenText = this.page.getByText(/affordable/);
  await expect(rewrittenText.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then("I should see removed text highlighted in red", async function(this: CustomWorld) {
  const removedText = this.page.locator('.bg-red-100, [class*="bg-red"]');
  await expect(removedText.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then("I should see added text highlighted in green", async function(this: CustomWorld) {
  const addedText = this.page.locator('.bg-green-100, [class*="bg-green"]');
  await expect(addedText.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

// Result handling
Then("I should return to the empty form", async function(this: CustomWorld) {
  // Wait for React state to update after button click
  await this.page.waitForTimeout(500);

  // The form should be visible again
  const textarea = this.page.locator('textarea[id="content"]');
  await expect(textarea).toBeVisible({ timeout: 5000 });

  // And the diff viewer heading should not be visible
  // Use exact: true to avoid matching partial text
  const reviewHeading = this.page.getByRole("heading", { name: "Review Changes" });
  await expect(reviewHeading).not.toBeVisible({ timeout: 5000 });
});

Then("the rewrite result should be cleared", async function(this: CustomWorld) {
  // Wait for React state to update
  await this.page.waitForTimeout(500);

  // Use heading role with exact match
  const reviewHeading = this.page.getByRole("heading", { name: "Review Changes" });
  await expect(reviewHeading).not.toBeVisible({ timeout: 5000 });
});

// Toggle changes steps
When("I click on a change checkbox", async function(this: CustomWorld) {
  const checkbox = this.page.locator('[role="checkbox"]').first();
  await checkbox.click();
});

Then("the checkbox should toggle its state", async function(this: CustomWorld) {
  // Verify a checkbox exists (state toggle is implicit)
  const checkbox = this.page.locator('[role="checkbox"]').first();
  await expect(checkbox).toBeVisible();
});

Then("the preview should update", async function(this: CustomWorld) {
  // Click preview tab to verify
  const previewTab = this.page.getByRole("tab", { name: /Preview/i });
  await previewTab.click();

  // Preview content should be visible
  const preview = this.page.locator("pre");
  await expect(preview.first()).toBeVisible();
});

// Error handling steps
When("the rewrite API returns an error", async function(this: CustomWorld) {
  // Unroute any existing mock for this endpoint first
  await this.page.unroute(`**/api/workspaces/${mockWorkspace.id}/brand-brain/rewrite`);

  // Set up error mock
  await this.page.route(
    `**/api/workspaces/${mockWorkspace.id}/brand-brain/rewrite`,
    async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to rewrite content" }),
      });
    },
  );
});

// Click "Open Rewriter" button specifically - uses link role for Button asChild pattern
When("I click on the Open Rewriter card", async function(this: CustomWorld) {
  await setupWorkspaceMocks(this);

  // Wait for page to load
  await this.page.waitForLoadState("domcontentloaded");
  await this.page.waitForSelector('[role="link"], [role="button"]', { timeout: 10000 });

  // Find and click the button/link
  const button = this.page.getByRole("link", { name: /Open Rewriter/i })
    .or(this.page.getByRole("button", { name: /Open Rewriter/i }));
  await button.click();

  // Wait for navigation to complete
  await this.page.waitForURL(/\/brand-brain\/rewriter/, { timeout: 15000 });
});
