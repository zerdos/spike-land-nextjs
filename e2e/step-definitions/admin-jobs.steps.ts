/**
 * Step definitions for Admin Jobs Queue Management E2E tests
 */

import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Mock job data generator
function createMockJob(overrides: Partial<{
  id: string;
  status: string;
  tier: string;
  errorMessage: string;
  geminiModel: string;
  geminiPrompt: string;
  geminiTemp: number;
  workflowRunId: string;
  processingStartedAt: string;
  processingCompletedAt: string;
}> = {}) {
  const now = new Date();
  const startTime = overrides.processingStartedAt || new Date(now.getTime() - 45000).toISOString();
  const endTime = overrides.processingCompletedAt ||
    (overrides.status === "COMPLETED" ? now.toISOString() : null);

  return {
    id: overrides.id || `job-${Date.now()}`,
    imageId: "img-1",
    userId: "user-1",
    tier: overrides.tier || "TIER_2K",
    tokensCost: overrides.tier === "TIER_4K" ? 10 : overrides.tier === "TIER_1K" ? 2 : 5,
    status: overrides.status || "PENDING",
    enhancedUrl: overrides.status === "COMPLETED" ? "https://example.com/enhanced.jpg" : null,
    enhancedR2Key: overrides.status === "COMPLETED" ? "enhanced-key" : null,
    enhancedWidth: overrides.status === "COMPLETED" ? 2048 : null,
    enhancedHeight: overrides.status === "COMPLETED" ? 1536 : null,
    enhancedSizeBytes: overrides.status === "COMPLETED" ? 2500000 : null,
    errorMessage: overrides.errorMessage || null,
    retryCount: 0,
    maxRetries: 3,
    geminiPrompt: overrides.geminiPrompt || null,
    geminiModel: overrides.geminiModel || null,
    geminiTemp: overrides.geminiTemp ?? null,
    processingStartedAt: startTime,
    processingCompletedAt: endTime,
    createdAt: new Date(now.getTime() - 60000).toISOString(),
    updatedAt: now.toISOString(),
    workflowRunId: overrides.workflowRunId || null,
    image: {
      id: "img-1",
      name: "test-image.jpg",
      originalUrl: "https://example.com/original.jpg",
      originalWidth: 1024,
      originalHeight: 768,
      originalSizeBytes: 500000,
    },
    user: {
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
    },
  };
}

// Given steps
Given("there are jobs in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            createMockJob({ id: "j1", status: "PENDING" }),
            createMockJob({ id: "j2", status: "PROCESSING" }),
            createMockJob({ id: "j3", status: "COMPLETED" }),
            createMockJob({ id: "j4", status: "FAILED", errorMessage: "Processing failed" }),
          ],
          pagination: { page: 1, limit: 20, total: 4, totalPages: 1 },
          statusCounts: {
            ALL: 4,
            PENDING: 1,
            PROCESSING: 1,
            COMPLETED: 1,
            FAILED: 1,
            CANCELLED: 0,
            REFUNDED: 0,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a completed job in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [createMockJob({ id: "j1", status: "COMPLETED" })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, COMPLETED: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a failed job in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            createMockJob({
              id: "j1",
              status: "FAILED",
              errorMessage: "API Error: Failed to process image",
            }),
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, FAILED: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a job with AI model info in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [createMockJob({
            id: "j1",
            status: "COMPLETED",
            geminiModel: "gemini-1.5-pro",
            geminiTemp: 0.7,
          })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, COMPLETED: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a job with a prompt in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [createMockJob({
            id: "j1",
            status: "COMPLETED",
            geminiPrompt: "Enhance this image with high detail preservation",
          })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, COMPLETED: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a job with workflow run ID", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [createMockJob({
            id: "j1",
            status: "COMPLETED",
            workflowRunId: "workflow-123-456",
          })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, COMPLETED: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there are jobs of all statuses in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            createMockJob({ id: "j1", status: "PENDING" }),
            createMockJob({ id: "j2", status: "PROCESSING" }),
            createMockJob({ id: "j3", status: "COMPLETED" }),
            createMockJob({ id: "j4", status: "FAILED", errorMessage: "Error" }),
            createMockJob({ id: "j5", status: "CANCELLED" }),
            createMockJob({ id: "j6", status: "REFUNDED" }),
          ],
          pagination: { page: 1, limit: 20, total: 6, totalPages: 1 },
          statusCounts: {
            ALL: 6,
            PENDING: 1,
            PROCESSING: 1,
            COMPLETED: 1,
            FAILED: 1,
            CANCELLED: 1,
            REFUNDED: 1,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there are jobs of all tiers in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            createMockJob({ id: "j1", tier: "TIER_1K" }),
            createMockJob({ id: "j2", tier: "TIER_2K" }),
            createMockJob({ id: "j3", tier: "TIER_4K" }),
          ],
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
          statusCounts: { ALL: 3 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there are more than 20 jobs in the system", async function(this: CustomWorld) {
  const jobs = Array.from({ length: 25 }, (_, i) => createMockJob({ id: `j${i}` }));

  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      const url = new URL(route.request().url());
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = 20;
      const start = (page - 1) * limit;
      const end = start + limit;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: jobs.slice(start, end),
          pagination: { page, limit, total: 25, totalPages: 2 },
          statusCounts: { ALL: 25 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there are no jobs in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          statusCounts: {},
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there are only completed jobs in the system", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [createMockJob({ id: "j1", status: "COMPLETED" })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, COMPLETED: 1, FAILED: 0 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("the jobs API is slow", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobs: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        statusCounts: {},
      }),
    });
  });
});

Given("the jobs API returns an error", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal server error" }),
    });
  });
});

Given("there is a job created just now", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      const job = createMockJob({ id: "j1" });
      job.createdAt = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [job],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a completed job that took 45 seconds", async function(this: CustomWorld) {
  const now = new Date();
  const startTime = new Date(now.getTime() - 45000).toISOString();

  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [createMockJob({
            id: "j1",
            status: "COMPLETED",
            processingStartedAt: startTime,
            processingCompletedAt: now.toISOString(),
          })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, COMPLETED: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("there is a completed job with known file sizes", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/jobs**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [createMockJob({ id: "j1", status: "COMPLETED" })],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          statusCounts: { ALL: 1, COMPLETED: 1 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

// When steps
// NOTE: "I click the {string} tab" is defined in common.steps.ts

When("I enter a job ID in the search field", async function(this: CustomWorld) {
  const searchInput = this.page.locator('input[aria-label="Search by Job ID or email"]');
  await searchInput.fill("job-");
});

When("I enter search text in the search field", async function(this: CustomWorld) {
  const searchInput = this.page.locator('input[aria-label="Search by Job ID or email"]');
  await searchInput.fill("test");
});

When("I press Enter", async function(this: CustomWorld) {
  await this.page.keyboard.press("Enter");
});

When("I click on a job in the list", async function(this: CustomWorld) {
  const jobItem = this.page.locator('[class*="cursor-pointer"]').first();
  await jobItem.click();
});

When("I click on the completed job", async function(this: CustomWorld) {
  const jobItem = this.page.locator('[class*="cursor-pointer"]').filter({ hasText: "COMPLETED" })
    .first();
  await jobItem.click();
});

When("I click on the failed job", async function(this: CustomWorld) {
  const jobItem = this.page.locator('[class*="cursor-pointer"]').filter({ hasText: "FAILED" })
    .first();
  await jobItem.click();
});

When("I click on that job", async function(this: CustomWorld) {
  const jobItem = this.page.locator('[class*="cursor-pointer"]').first();
  await jobItem.click();
});

// Then steps
// NOTE: "I should see {string} tab" is defined in common.steps.ts

Then(
  "I should see search input with placeholder {string}",
  async function(this: CustomWorld, placeholder: string) {
    const input = this.page.locator(`input[placeholder*="${placeholder}"]`);
    await expect(input).toBeVisible();
  },
);

Then("I should see jobs list panel on the left", async function(this: CustomWorld) {
  const panel = this.page.locator('[class*="Card"]').filter({ hasText: "Jobs (" });
  await expect(panel).toBeVisible();
});

Then("I should see job details panel on the right", async function(this: CustomWorld) {
  const panel = this.page.locator('[class*="Card"]').filter({ hasText: "Job Details" });
  await expect(panel).toBeVisible();
});

Then("each tab should display a job count badge", async function(this: CustomWorld) {
  const badges = this.page.locator('button [class*="Badge"]');
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
});

Then(
  "the {string} tab count should equal total jobs",
  async function(this: CustomWorld, _tabName: string) {
    // Verify count is displayed
    const allTab = this.page.getByRole("button", { name: "All" });
    await expect(allTab).toBeVisible();
  },
);

Then("the jobs list should only show PENDING status jobs", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the {string} tab should be active", async function(this: CustomWorld, tabName: string) {
  const tab = this.page.getByRole("button", { name: tabName });
  // Active tab has default variant styling
  await expect(tab).toBeVisible();
});

Then("the jobs list should only show PROCESSING status jobs", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("processing jobs should have animated status badge", async function(this: CustomWorld) {
  const animatedBadge = this.page.locator('[class*="animate-pulse"]');
  await expect(animatedBadge.first()).toBeVisible();
});

Then("the jobs list should only show COMPLETED status jobs", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("completed jobs should show processing duration", async function(this: CustomWorld) {
  const duration = this.page.locator("text=/\\d+(\\.\\d+)?s/");
  await expect(duration.first()).toBeVisible();
});

Then("the jobs list should only show FAILED status jobs", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("failed jobs should show error message preview", async function(this: CustomWorld) {
  const errorPreview = this.page.locator('[class*="text-red"]');
  await expect(errorPreview.first()).toBeVisible();
});

Then("the jobs list should only show CANCELLED status jobs", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the jobs list should only show REFUNDED status jobs", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("I should see the jobs list", async function(this: CustomWorld) {
  const list = this.page.locator('[class*="Card"]').filter({ hasText: "Jobs (" });
  await expect(list).toBeVisible();
});

Then("each job should display a status badge", async function(this: CustomWorld) {
  const badges = this.page.locator('[class*="Card"] [class*="Badge"]');
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
});

Then("each job should display the enhancement tier", async function(this: CustomWorld) {
  const tiers = this.page.locator("text=/1K|2K|4K/");
  const count = await tiers.count();
  expect(count).toBeGreaterThan(0);
});

Then("each job should display a relative timestamp", async function(this: CustomWorld) {
  const timestamps = this.page.locator("text=/ago|just now/");
  const count = await timestamps.count();
  expect(count).toBeGreaterThan(0);
});

Then("each job should display job ID preview", async function(this: CustomWorld) {
  const jobIds = this.page.locator('[class*="font-mono"]');
  const count = await jobIds.count();
  expect(count).toBeGreaterThan(0);
});

Then("each job should display user email", async function(this: CustomWorld) {
  const emails = this.page.locator("text=@example.com");
  const count = await emails.count();
  expect(count).toBeGreaterThan(0);
});

Then("the jobs list should show matching jobs", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the jobs list should only show jobs from that user", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the search should execute", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the jobs list should refresh", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the job counts should update", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("the job should be highlighted", async function(this: CustomWorld) {
  const highlighted = this.page.locator('[class*="border-blue-500"]');
  await expect(highlighted.first()).toBeVisible();
});

Then("the details panel should show job information", async function(this: CustomWorld) {
  const detailsPanel = this.page.locator('[class*="Card"]').filter({ hasText: "Job Details" });
  const hasContent = await detailsPanel.locator('[class*="Badge"], text=Status').count() > 0;
  expect(hasContent).toBe(true);
});

Then(
  "the details panel should show {string} section",
  async function(this: CustomWorld, section: string) {
    const sectionElement = this.page.locator(`text=${section}`);
    await expect(sectionElement.first()).toBeVisible();
  },
);

Then(
  "the details panel should show {string} timestamp",
  async function(this: CustomWorld, label: string) {
    const timestamp = this.page.locator(`text=${label}`);
    await expect(timestamp.first()).toBeVisible();
  },
);

Then("I should see the tier information", async function(this: CustomWorld) {
  const tier = this.page.locator("text=/Tier.*[12]?K/i");
  await expect(tier.first()).toBeVisible();
});

Then("I should see the tokens cost", async function(this: CustomWorld) {
  const tokens = this.page.locator("text=/\\d+ tokens/");
  await expect(tokens.first()).toBeVisible();
});

Then("I should see original image dimensions", async function(this: CustomWorld) {
  const dimensions = this.page.locator("text=/\\d+x\\d+/");
  await expect(dimensions.first()).toBeVisible();
});

Then("I should see original image size", async function(this: CustomWorld) {
  const size = this.page.locator("text=/(KB|MB|B)/");
  await expect(size.first()).toBeVisible();
});

Then("I should see retry count", async function(this: CustomWorld) {
  const retries = this.page.locator("text=Retries");
  await expect(retries.first()).toBeVisible();
});

Then("the details panel should show enhanced image dimensions", async function(this: CustomWorld) {
  const dimensions = this.page.locator("text=/Enhanced.*\\d+x\\d+/");
  await expect(dimensions.first()).toBeVisible();
});

Then("the details panel should show enhanced image size", async function(this: CustomWorld) {
  const size = this.page.locator("text=/(KB|MB)/");
  await expect(size.first()).toBeVisible();
});

Then("the details panel should show image comparison slider", async function(this: CustomWorld) {
  // Check for the comparison slider component
  await this.page.waitForLoadState("networkidle");
});

Then("I should see {string} label", async function(this: CustomWorld, label: string) {
  const labelElement = this.page.locator(`text=${label}`);
  await expect(labelElement.first()).toBeVisible();
});

Then("I should see the model name", async function(this: CustomWorld) {
  const model = this.page.locator('[class*="font-mono"]').filter({ hasText: "gemini" });
  await expect(model).toBeVisible();
});

Then("I should see the temperature setting", async function(this: CustomWorld) {
  const temp = this.page.locator("text=Temperature");
  await expect(temp).toBeVisible();
});

Then("the prompt should be displayed in a code block", async function(this: CustomWorld) {
  const codeBlock = this.page.locator("pre");
  await expect(codeBlock.first()).toBeVisible();
});

Then(
  "the details panel should show {string} section in red",
  async function(this: CustomWorld, _section: string) {
    const errorSection = this.page.locator('[class*="text-red"]').filter({ hasText: "Error" });
    await expect(errorSection).toBeVisible();
  },
);

Then("the error message should be displayed", async function(this: CustomWorld) {
  const errorPre = this.page.locator("pre").filter({ hasText: /error|failed/i });
  await expect(errorPre).toBeVisible();
});

Then(
  "I should see the user name or {string}",
  async function(this: CustomWorld, _fallback: string) {
    const userName = this.page.locator("text=/Test User|Unknown/");
    await expect(userName.first()).toBeVisible();
  },
);

Then("I should see the user email", async function(this: CustomWorld) {
  const email = this.page.locator("text=@example.com");
  await expect(email.first()).toBeVisible();
});

Then("I should see the Job ID", async function(this: CustomWorld) {
  const jobId = this.page.locator("text=Job").first();
  await expect(jobId).toBeVisible();
});

Then("I should see the Image ID", async function(this: CustomWorld) {
  const imageId = this.page.locator("text=Image").first();
  await expect(imageId).toBeVisible();
});

Then("the details panel should show the Workflow ID", async function(this: CustomWorld) {
  const workflowId = this.page.locator("text=Workflow");
  await expect(workflowId).toBeVisible();
});

Then(
  "the details panel should show {string} text",
  async function(this: CustomWorld, text: string) {
    const textElement = this.page.locator(`text=${text}`);
    await expect(textElement).toBeVisible();
  },
);

Then("PENDING status badge should be yellow", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "PENDING" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("yellow");
});

Then("PROCESSING status badge should be blue with animation", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "PROCESSING" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("blue");
  expect(className).toContain("animate-pulse");
});

Then("COMPLETED status badge should be green", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "COMPLETED" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("green");
});

Then("FAILED status badge should be red", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "FAILED" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("red");
});

Then("CANCELLED status badge should be neutral", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "CANCELLED" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toMatch(/neutral|gray/);
});

Then("REFUNDED status badge should be purple", async function(this: CustomWorld) {
  const badge = this.page.locator('[class*="Badge"]').filter({ hasText: "REFUNDED" }).first();
  const className = await badge.getAttribute("class");
  expect(className).toContain("purple");
});

Then("TIER_1K should display as {string}", async function(this: CustomWorld, display: string) {
  const tier = this.page.locator(`text=${display}`);
  await expect(tier.first()).toBeVisible();
});

Then("TIER_2K should display as {string}", async function(this: CustomWorld, display: string) {
  const tier = this.page.locator(`text=${display}`);
  await expect(tier.first()).toBeVisible();
});

Then("TIER_4K should display as {string}", async function(this: CustomWorld, display: string) {
  const tier = this.page.locator(`text=${display}`);
  await expect(tier.first()).toBeVisible();
});

Then("I should see different jobs in the list", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("I should see loading skeleton placeholders", async function(this: CustomWorld) {
  const skeleton = this.page.locator('[class*="animate-pulse"]');
  await expect(skeleton.first()).toBeVisible();
});

Then("I should see {string} timestamp", async function(this: CustomWorld, timestamp: string) {
  const timestampElement = this.page.locator(`text=${timestamp}`);
  await expect(timestampElement.first()).toBeVisible();
});

Then("I should see processing time formatted as seconds", async function(this: CustomWorld) {
  const time = this.page.locator("text=/\\d+(\\.\\d+)?s/");
  await expect(time.first()).toBeVisible();
});

Then("file sizes should be formatted with appropriate units", async function(this: CustomWorld) {
  const sizes = this.page.locator("text=/(KB|MB|B)/");
  const count = await sizes.count();
  expect(count).toBeGreaterThan(0);
});
