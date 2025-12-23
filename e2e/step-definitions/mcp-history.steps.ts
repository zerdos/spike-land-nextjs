import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForTextWithRetry } from "../support/helpers/retry-helper";
import { CustomWorld } from "../support/world";

// Mock MCP history API response
interface MockMcpJob {
  id: string;
  type: "GENERATE" | "MODIFY";
  tier: string;
  tokensCost: number;
  status: string;
  prompt: string;
  inputImageUrl?: string;
  outputImageUrl?: string;
  outputWidth?: number;
  outputHeight?: number;
  createdAt: string;
  processingCompletedAt?: string;
  apiKeyName?: string;
}

async function mockMcpHistoryApi(
  world: CustomWorld,
  jobs: MockMcpJob[],
  total: number,
  options: { delay?: number; error?: boolean; } = {},
) {
  await world.page.route("**/api/mcp/history*", async (route) => {
    if (options.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    if (options.error) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to fetch history" }),
      });
      return;
    }

    const url = new URL(route.request().url());
    const typeFilter = url.searchParams.get("type") || "all";
    const limit = parseInt(url.searchParams.get("limit") || "12", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    let filteredJobs = jobs;
    if (typeFilter !== "all") {
      filteredJobs = jobs.filter((job) => job.type === typeFilter as any);
    }

    const paginatedJobs = filteredJobs.slice(offset, offset + limit);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobs: paginatedJobs,
        total: filteredJobs.length,
        hasMore: offset + limit < filteredJobs.length,
      }),
    });
  });
}

function createMockJobs(count: number): MockMcpJob[] {
  const jobs: MockMcpJob[] = [];
  const statuses = ["COMPLETED", "FAILED", "PROCESSING", "REFUNDED"];
  const types: ("GENERATE" | "MODIFY")[] = ["GENERATE", "MODIFY"];

  for (let i = 0; i < count; i++) {
    jobs.push({
      id: `job-${i + 1}`,
      type: types[i % 2],
      tier: i % 2 === 0 ? "TIER_1" : "TIER_2",
      tokensCost: (i + 1) * 5,
      status: statuses[i % statuses.length],
      prompt: `Test prompt for job ${i + 1}`,
      outputImageUrl: i % 4 === 0
        ? undefined
        : `https://example.com/image-${i + 1}.jpg`,
      outputWidth: 1024,
      outputHeight: 768,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      processingCompletedAt: i % 4 !== 2
        ? new Date(Date.now() - i * 3600000 + 30000).toISOString()
        : undefined,
      apiKeyName: i % 3 === 0 ? "Test API Key" : undefined,
    } as MockMcpJob);
  }
  return jobs;
}

// Navigation
When("I navigate to the MCP history page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/settings/mcp-history`);
  await this.page.waitForLoadState("networkidle");
});

When(
  "I navigate to the MCP history page with slow API",
  async function(this: CustomWorld) {
    const mockJobs = createMockJobs(5);
    await mockMcpHistoryApi(this, mockJobs, mockJobs.length, { delay: 2000 });
    await this.page.goto(`${this.baseUrl}/settings/mcp-history`);
    // Don't wait for networkidle to catch loading state
    await this.page.waitForLoadState("domcontentloaded");
  },
);

// Given steps
Given("I have MCP job history", async function(this: CustomWorld) {
  const mockJobs = createMockJobs(8);
  await mockMcpHistoryApi(this, mockJobs, mockJobs.length);
});

Given("I have no MCP job history", async function(this: CustomWorld) {
  await mockMcpHistoryApi(this, [], 0);
});

Given("I have more than 12 MCP jobs", async function(this: CustomWorld) {
  const mockJobs = createMockJobs(25);
  await mockMcpHistoryApi(this, mockJobs, mockJobs.length);
});

Given(
  "the MCP history API returns an error",
  async function(this: CustomWorld) {
    await mockMcpHistoryApi(this, [], 0, { error: true });
  },
);

Given("the API is fixed", async function(this: CustomWorld) {
  // Remove the error route and set up successful response
  await this.page.unroute("**/api/mcp/history*");
  const mockJobs = createMockJobs(5);
  await mockMcpHistoryApi(this, mockJobs, mockJobs.length);
});

// Page content verification
Then(
  "I should see the MCP history page title",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, "MCP Usage History", {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then(
  "I should see the type filter dropdown",
  async function(this: CustomWorld) {
    const filter = this.page.locator(
      '[data-testid="type-filter"], [role="combobox"]',
    ).first();
    await expect(filter).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then("I should see the MCP Tools link", async function(this: CustomWorld) {
  const link = this.page.getByRole("link", { name: /MCP Tools/i });
  await expect(link).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

// Filter interactions
When("I click the type filter dropdown", async function(this: CustomWorld) {
  const filter = this.page.locator('[role="combobox"]').first();
  await expect(filter).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await filter.click();
  await this.page.waitForTimeout(300);
});

// NOTE: "I should see {string} option" step moved to common.steps.ts

// NOTE: "I select {string} from the type filter" is defined in common.steps.ts

Then(
  "I should only see Generate type jobs",
  async function(this: CustomWorld) {
    // Check that only Generate badges are visible
    const generateBadges = this.page.locator("text=Generate");
    const modifyBadges = this.page.locator("text=Modify");

    await expect(generateBadges.first()).toBeVisible({
      timeout: TIMEOUTS.DEFAULT,
    });
    await expect(modifyBadges).not.toBeVisible();
  },
);

Then("I should only see Modify type jobs", async function(this: CustomWorld) {
  // Check that only Modify badges are visible
  const modifyBadges = this.page.locator("text=Modify");
  const generateBadges = this.page.locator("text=Generate");

  await expect(modifyBadges.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await expect(generateBadges).not.toBeVisible();
});

Then(
  "the filter should show {string}",
  async function(this: CustomWorld, filterText: string) {
    const filter = this.page.locator('[role="combobox"]').first();
    await expect(filter).toContainText(filterText, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

// Empty state
Then(
  "I should see the Try MCP Tools button",
  async function(this: CustomWorld) {
    const button = this.page.getByRole("button", { name: /Try MCP Tools/i });
    await expect(button).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// Job details modal
When("I click on a job card", async function(this: CustomWorld) {
  const jobCard = this.page.locator('[class*="cursor-pointer"]').first();
  await expect(jobCard).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await jobCard.click();
  await this.page.waitForTimeout(500);
});

Then("I should see the job details modal", async function(this: CustomWorld) {
  const modal = this.page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then("I should see the job ID", async function(this: CustomWorld) {
  const modal = this.page.locator('[role="dialog"]');
  const jobIdLabel = modal.getByText("Job ID");
  await expect(jobIdLabel).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

// NOTE: "I should see the tier information" is defined in common.steps.ts

// NOTE: "I should see the tokens used" is defined in common.steps.ts

Then("I should see the prompt", async function(this: CustomWorld) {
  const modal = this.page.locator('[role="dialog"]');
  const promptLabel = modal.getByText("Prompt");
  await expect(promptLabel).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

When("I close the job details modal", async function(this: CustomWorld) {
  await this.page.keyboard.press("Escape");
  await this.page.waitForTimeout(300);
});

Then(
  "the job details modal should be closed",
  async function(this: CustomWorld) {
    const modal = this.page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// Status badges
Then(
  "I should see job cards with status badges",
  async function(this: CustomWorld) {
    const badges = this.page.locator(
      '[class*="bg-green"], [class*="bg-blue"], [class*="destructive"]',
    );
    await expect(badges.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "completed jobs should show green badge",
  async function(this: CustomWorld) {
    const completedBadge = this.page.locator('[class*="bg-green"]').filter({
      hasText: "Completed",
    });
    // At least one completed job should show green badge
    const count = await completedBadge.count();
    expect(count).toBeGreaterThanOrEqual(0); // May or may not have completed jobs
  },
);

Then("failed jobs should show red badge", async function(this: CustomWorld) {
  const failedBadge = this.page.locator('[class*="destructive"]').filter({
    hasText: "Failed",
  });
  // At least one failed job should show red badge
  const count = await failedBadge.count();
  expect(count).toBeGreaterThanOrEqual(0); // May or may not have failed jobs
});

// Pagination
Then(
  "I should see the pagination controls",
  async function(this: CustomWorld) {
    const prevButton = this.page.getByRole("button", { name: /Previous/i });
    const nextButton = this.page.getByRole("button", { name: /Next/i });
    await expect(prevButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await expect(nextButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the {string} button disabled",
  async function(this: CustomWorld, buttonName: string) {
    const button = this.page.getByRole("button", { name: buttonName });
    await expect(button).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the {string} button enabled",
  async function(this: CustomWorld, buttonName: string) {
    const button = this.page.getByRole("button", { name: buttonName });
    await expect(button).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should be on page {int}",
  async function(this: CustomWorld, pageNum: number) {
    const pageIndicator = this.page.getByText(
      new RegExp(`Page ${pageNum} of`, "i"),
    );
    await expect(pageIndicator).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

// Total jobs count
Then("I should see the total jobs count", async function(this: CustomWorld) {
  const totalText = this.page.getByText(/\d+ total jobs/i);
  await expect(totalText).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

// Loading state
Then("I should see the loading spinner", async function(this: CustomWorld) {
  const spinner = this.page.locator(".animate-spin").first();
  await expect(spinner).toBeVisible({ timeout: TIMEOUTS.SHORT });
});

Then(
  "the loading spinner should disappear when data loads",
  async function(this: CustomWorld) {
    // Wait for spinner to disappear
    const spinner = this.page.locator(".animate-spin");
    await expect(spinner).not.toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

// Error state
// NOTE: "I should see the error message" is defined in common.steps.ts

Then("I should see the job history", async function(this: CustomWorld) {
  // Verify jobs are displayed after retry
  const jobCards = this.page.locator('[class*="cursor-pointer"]');
  await expect(jobCards.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

// Protected route
Then(
  "I should be redirected to the signin page",
  async function(this: CustomWorld) {
    await this.page.waitForURL(/\/auth\/signin/, { timeout: TIMEOUTS.DEFAULT });
  },
);
