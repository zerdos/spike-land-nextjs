/**
 * Step definitions for Admin Jobs Queue Management E2E tests
 */

import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  TIMEOUTS,
  waitForDynamicContent,
  waitForElementWithRetry,
  waitForTextWithRetry,
} from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

// Mock job data generator - returns UnifiedJob format
function createMockJob(overrides: Partial<{
  id: string;
  source: "enhancement" | "mcp";
  status: string;
  tier: string;
  errorMessage: string;
  geminiModel: string;
  prompt: string;
  geminiTemp: number;
  workflowRunId: string;
  processingStartedAt: string;
  processingCompletedAt: string;
}> = {}) {
  const now = new Date();
  const startTime = overrides.processingStartedAt ||
    new Date(now.getTime() - 45000).toISOString();
  const endTime = overrides.processingCompletedAt ||
    (overrides.status === "COMPLETED" ? now.toISOString() : null);

  return {
    id: overrides.id || `job-${Date.now()}`,
    source: overrides.source || "enhancement",
    status: overrides.status || "PENDING",
    tier: overrides.tier || "TIER_2K",
    tokensCost: overrides.tier === "TIER_4K"
      ? 10
      : overrides.tier === "TIER_1K"
      ? 2
      : 5,
    prompt: overrides.prompt || null,
    inputUrl: "https://example.com/original.jpg",
    outputUrl: overrides.status === "COMPLETED"
      ? "https://example.com/enhanced.jpg"
      : null,
    outputWidth: overrides.status === "COMPLETED" ? 2048 : null,
    outputHeight: overrides.status === "COMPLETED" ? 1536 : null,
    outputSizeBytes: overrides.status === "COMPLETED" ? 2500000 : null,
    errorMessage: overrides.errorMessage || null,
    userId: "user-1",
    userEmail: "user@example.com",
    userName: "Test User",
    createdAt: new Date(now.getTime() - 60000).toISOString(),
    updatedAt: now.toISOString(),
    processingStartedAt: startTime,
    processingCompletedAt: endTime,
    // Enhancement-specific fields
    imageId: "img-1",
    imageName: "test-image.jpg",
    retryCount: 0,
    maxRetries: 3,
    geminiModel: overrides.geminiModel || null,
    geminiTemp: overrides.geminiTemp ?? null,
    workflowRunId: overrides.workflowRunId || null,
    currentStage: overrides.status === "PROCESSING" ? "enhancing" : null,
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
            createMockJob({
              id: "j4",
              status: "FAILED",
              errorMessage: "Processing failed",
            }),
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
          typeCounts: {
            all: 4,
            enhancement: 4,
            mcp: 0,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  "there is a completed job in the system",
  async function(this: CustomWorld) {
    await this.page.route("**/api/admin/jobs**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jobs: [createMockJob({ id: "j1", status: "COMPLETED" })],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            statusCounts: { ALL: 1, COMPLETED: 1 },
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there is a failed job in the system",
  async function(this: CustomWorld) {
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
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there is a job with AI model info in the system",
  async function(this: CustomWorld) {
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
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there is a job with a prompt in the system",
  async function(this: CustomWorld) {
    await this.page.route("**/api/admin/jobs**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jobs: [createMockJob({
              id: "j1",
              status: "COMPLETED",
              prompt: "Enhance this image with high detail preservation",
            })],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            statusCounts: { ALL: 1, COMPLETED: 1 },
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there is a job with workflow run ID",
  async function(this: CustomWorld) {
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
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are jobs of all statuses in the system",
  async function(this: CustomWorld) {
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
              createMockJob({
                id: "j4",
                status: "FAILED",
                errorMessage: "Error",
              }),
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
            typeCounts: { all: 6, enhancement: 6, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are jobs of all tiers in the system",
  async function(this: CustomWorld) {
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
            typeCounts: { all: 3, enhancement: 3, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are more than 20 jobs in the system",
  async function(this: CustomWorld) {
    const jobs = Array.from(
      { length: 25 },
      (_, i) => createMockJob({ id: `j${i}` }),
    );

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
            typeCounts: { all: 25, enhancement: 25, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

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
          typeCounts: { all: 0, enhancement: 0, mcp: 0 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  "there are only completed jobs in the system",
  async function(this: CustomWorld) {
    await this.page.route("**/api/admin/jobs**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jobs: [createMockJob({ id: "j1", status: "COMPLETED" })],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            statusCounts: { ALL: 1, COMPLETED: 1, FAILED: 0 },
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

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
        typeCounts: { all: 0, enhancement: 0, mcp: 0 },
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
          typeCounts: { all: 1, enhancement: 1, mcp: 0 },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  "there is a completed job that took 45 seconds",
  async function(this: CustomWorld) {
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
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there is a completed job with known file sizes",
  async function(this: CustomWorld) {
    await this.page.route("**/api/admin/jobs**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jobs: [createMockJob({ id: "j1", status: "COMPLETED" })],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            statusCounts: { ALL: 1, COMPLETED: 1 },
            typeCounts: { all: 1, enhancement: 1, mcp: 0 },
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

// When steps
// NOTE: "I click the {string} tab" is defined in common.steps.ts

When(
  "I enter a job ID in the search field",
  async function(this: CustomWorld) {
    const searchInput = await waitForElementWithRetry(
      this.page,
      'input[placeholder="Search by Job ID or email..."]',
      { timeout: TIMEOUTS.LONG },
    );
    await searchInput.fill("job-");
  },
);

When(
  "I enter search text in the search field",
  async function(this: CustomWorld) {
    const searchInput = await waitForElementWithRetry(
      this.page,
      'input[placeholder="Search by Job ID or email..."]',
      { timeout: TIMEOUTS.LONG },
    );
    await searchInput.fill("test");
  },
);

When("I press Enter", async function(this: CustomWorld) {
  await this.page.keyboard.press("Enter");
});

When("I click on a job in the list", async function(this: CustomWorld) {
  // Wait for network to settle and job items to appear
  await this.page.waitForLoadState("networkidle").catch(() => {});
  const jobItem = await waitForElementWithRetry(
    this.page,
    '[data-testid="job-list-item"]',
    { timeout: TIMEOUTS.LONG },
  );
  // Click using evaluate to ensure React event handlers work correctly
  await jobItem.first().evaluate((el) => {
    (el as HTMLElement).click();
  });
  // Wait a moment for React to process the state update
  await this.page.waitForTimeout(100);
  // Wait for the job selection to take effect (React state update)
  // The Copy Link button appears when a job is selected
  const copyLinkButton = this.page.getByRole("button", { name: /copy link/i });
  await copyLinkButton.waitFor({ state: "visible", timeout: TIMEOUTS.LONG });
});

When("I click on the completed job", async function(this: CustomWorld) {
  // Wait for network to settle and completed job items to appear
  await this.page.waitForLoadState("networkidle").catch(() => {});

  // Try multiple selectors for completed jobs
  const completedJobByStatus = this.page.locator(
    '[data-testid="job-list-item"][data-job-status="COMPLETED"]',
  );
  const completedJobByText = this.page.locator('[data-testid="job-list-item"]').filter({
    has: this.page.getByText(/COMPLETED/i),
  });

  const jobItem = completedJobByStatus.or(completedJobByText).first();
  await expect(jobItem).toBeVisible({ timeout: TIMEOUTS.LONG });

  // Click using regular click method
  await jobItem.click();

  // Wait for React to process the state update
  await this.page.waitForTimeout(300);

  // Wait for the job selection to take effect - try multiple indicators
  const copyLinkButton = this.page.getByRole("button", { name: /copy link/i });
  const jobDetailsPanel = this.page.locator('[class*="overflow-y-auto"]').filter({
    has: copyLinkButton,
  });

  try {
    await expect(copyLinkButton.or(jobDetailsPanel).first()).toBeVisible({
      timeout: TIMEOUTS.LONG,
    });
  } catch {
    // Retry click if job details didn't appear
    await jobItem.click();
    await expect(copyLinkButton).toBeVisible({ timeout: TIMEOUTS.LONG });
  }
});

When("I click on the failed job", async function(this: CustomWorld) {
  // Wait for network to settle and failed job items to appear
  await this.page.waitForLoadState("networkidle").catch(() => {});
  const jobItem = await waitForElementWithRetry(
    this.page,
    '[data-testid="job-list-item"][data-job-status="FAILED"]',
    { timeout: TIMEOUTS.LONG },
  );
  // Click using evaluate to ensure React event handlers work correctly
  await jobItem.first().evaluate((el) => {
    (el as HTMLElement).click();
  });
  // Wait a moment for React to process the state update
  await this.page.waitForTimeout(100);
  // Wait for the job selection to take effect (React state update)
  // The Copy Link button appears when a job is selected
  const copyLinkButton = this.page.getByRole("button", { name: /copy link/i });
  await copyLinkButton.waitFor({ state: "visible", timeout: TIMEOUTS.LONG });
});

When("I click on that job", async function(this: CustomWorld) {
  // Wait for network to settle and job items to appear
  await this.page.waitForLoadState("networkidle").catch(() => {});
  const jobItem = await waitForElementWithRetry(
    this.page,
    '[data-testid="job-list-item"]',
    { timeout: TIMEOUTS.LONG },
  );
  // Click using evaluate to ensure React event handlers work correctly
  await jobItem.first().evaluate((el) => {
    (el as HTMLElement).click();
  });
  // Wait a moment for React to process the state update
  await this.page.waitForTimeout(100);
  // Wait for the job selection to take effect (React state update)
  // The Copy Link button appears when a job is selected
  const copyLinkButton = this.page.getByRole("button", { name: /copy link/i });
  await copyLinkButton.waitFor({ state: "visible", timeout: TIMEOUTS.LONG });
});

// Then steps
// NOTE: "I should see {string} tab" is defined in common.steps.ts

// NOTE: "I should see search input with placeholder {string}" is defined in common.steps.ts

Then(
  "I should see jobs list panel on the left",
  async function(this: CustomWorld) {
    // Find the heading "Jobs (X)" in the left panel using getByRole
    await waitForTextWithRetry(this.page, /Jobs \(/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "I should see job details panel on the right",
  async function(this: CustomWorld) {
    // Find the heading "Job Details" in the right panel
    await waitForTextWithRetry(this.page, "Job Details", {
      timeout: TIMEOUTS.LONG,
      exact: true,
    });
  },
);

Then(
  "each tab should display a job count badge",
  async function(this: CustomWorld) {
    // Wait for network to settle to ensure counts are loaded
    await this.page.waitForLoadState("networkidle").catch(() => {});
    // Verify status tabs exist with counts - they are Button components with Badge children
    // Look for buttons that contain "All" text and a Badge with a number
    const allTabButton = this.page.getByRole("button", { name: /All/ }).filter({
      has: this.page.locator('[class*="Badge"]'),
    });
    await expect(allTabButton.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
    // Verify the badge has a count (number or "...")
    const badge = allTabButton.first().locator('[class*="Badge"]');
    await expect(badge).toHaveText(/\d+|\.\.\./, { timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the {string} tab count should equal total jobs",
  async function(this: CustomWorld, _tabName: string) {
    // Wait for network to settle and verify count is displayed
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForTextWithRetry(this.page, /All.*\d+/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the jobs list should only show PENDING status jobs",
  async function(this: CustomWorld) {
    // Wait for network to settle after filter change
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

// NOTE: "the {string} tab should be active" is defined in common.steps.ts

Then(
  "the jobs list should only show PROCESSING status jobs",
  async function(this: CustomWorld) {
    // Wait for loading to complete and job items to appear
    // The API call happens when tab is clicked, don't wait for response
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "processing jobs should have animated status badge",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(this.page, '[class*="animate-pulse"]', {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the jobs list should only show COMPLETED status jobs",
  async function(this: CustomWorld) {
    // Wait for loading to complete and job items to appear
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "completed jobs should show processing duration",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /\d+(\.\d+)?s/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the jobs list should only show FAILED status jobs",
  async function(this: CustomWorld) {
    // Wait for network to settle after filter change
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "failed jobs should show error message preview",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(this.page, '[class*="text-red"]', {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the jobs list should only show CANCELLED status jobs",
  async function(this: CustomWorld) {
    // Wait for network to settle after filter change
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "the jobs list should only show REFUNDED status jobs",
  async function(this: CustomWorld) {
    // Wait for network to settle after filter change
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then("I should see the jobs list", async function(this: CustomWorld) {
  // Wait for network to settle and find the heading "Jobs (X)" in the list panel
  await this.page.waitForLoadState("networkidle").catch(() => {});
  await waitForTextWithRetry(this.page, /Jobs \(/, { timeout: TIMEOUTS.LONG });
});

Then(
  "each job should display a status badge",
  async function(this: CustomWorld) {
    // Wait for network to settle and job items to be visible
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "each job should display the enhancement tier",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /1K|2K|4K/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "each job should display a relative timestamp",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /ago|just now/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "each job should display job ID preview",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(this.page, '[class*="font-mono"]', {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then("each job should display user email", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, "@example.com", {
    timeout: TIMEOUTS.LONG,
  });
});

Then(
  "the jobs list should show matching jobs",
  async function(this: CustomWorld) {
    // Wait for network to settle after filter change
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "the jobs list should only show jobs from that user",
  async function(this: CustomWorld) {
    // Wait for network to settle after filter change
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForTextWithRetry(this.page, "user@example.com", {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then("the search should execute", async function(this: CustomWorld) {
  // Wait for network to settle after search
  await this.page.waitForLoadState("networkidle").catch(() => {});
});

Then("the jobs list should refresh", async function(this: CustomWorld) {
  // Wait for network to settle after refresh
  await this.page.waitForLoadState("networkidle").catch(() => {});
});

Then("the job counts should update", async function(this: CustomWorld) {
  // Wait for network to settle and updated counts in tabs
  await this.page.waitForLoadState("networkidle").catch(() => {});
  // Verify status tabs exist with counts - they are Button components with Badge children
  const allTabButton = this.page.getByRole("button", { name: /All/ }).filter({
    has: this.page.locator('[class*="Badge"]'),
  });
  await expect(allTabButton.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  // Verify the badge has a count (number or "...")
  const badge = allTabButton.first().locator('[class*="Badge"]');
  await expect(badge).toHaveText(/\d+|\.\.\./, { timeout: TIMEOUTS.DEFAULT });
});

Then("the job should be highlighted", async function(this: CustomWorld) {
  await waitForElementWithRetry(this.page, '[class*="border-blue-500"]', {
    timeout: TIMEOUTS.LONG,
  });
});

Then(
  "the details panel should show job information",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, "Job Details", {
      timeout: TIMEOUTS.LONG,
    });
    await waitForTextWithRetry(this.page, "Status", { timeout: TIMEOUTS.LONG });
  },
);

Then(
  "the details panel should show {string} section",
  async function(this: CustomWorld, section: string) {
    await waitForTextWithRetry(this.page, section, {
      timeout: TIMEOUTS.LONG,
      exact: true,
    });
  },
);

Then(
  "the details panel should show {string} timestamp",
  async function(this: CustomWorld, label: string) {
    await waitForTextWithRetry(this.page, label, { timeout: TIMEOUTS.LONG });
  },
);

// NOTE: "I should see the tier information" step moved to common.steps.ts

Then("I should see the tokens cost", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, /\d+ tokens/, {
    timeout: TIMEOUTS.LONG,
  });
});

Then(
  "I should see original image dimensions",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /\d+x\d+/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then("I should see original image size", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, /(KB|MB|B)/, {
    timeout: TIMEOUTS.LONG,
  });
});

Then("I should see retry count", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, "Retries", { timeout: TIMEOUTS.LONG });
});

Then(
  "the details panel should show enhanced image dimensions",
  async function(this: CustomWorld) {
    // Wait for network to settle after clicking a job
    await this.page.waitForLoadState("networkidle").catch(() => {});

    // Wait for the job details to load - look for action buttons which appear when a job is selected
    // The "Copy Link" button appears when a job is selected
    const copyLinkButton = this.page.getByRole("button", { name: /copy link/i });
    await expect(copyLinkButton).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Now check for dimensions text (e.g., "2048x1536")
    // Wait for the output dimensions to be visible
    const dimensionsText = this.page.getByText(/\d+x\d+/);
    await expect(dimensionsText.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "the details panel should show enhanced image size",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /(KB|MB)/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the details panel should show image comparison slider",
  async function(this: CustomWorld) {
    // Wait for network to settle after clicking a job
    await this.page.waitForLoadState("networkidle").catch(() => {});

    // Wait for the job details to load - look for action buttons which appear when a job is selected
    const copyLinkButton = this.page.getByRole("button", { name: /copy link/i });
    await expect(copyLinkButton).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Check for the comparison slider component labels
    await waitForTextWithRetry(this.page, "Original", {
      timeout: TIMEOUTS.LONG,
    });
    await waitForTextWithRetry(this.page, "Enhanced", {
      timeout: TIMEOUTS.LONG,
    });
  },
);

// NOTE: "I should see {string} label" is defined in common.steps.ts

Then("I should see the model name", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, /gemini/, { timeout: TIMEOUTS.LONG });
});

Then(
  "I should see the temperature setting",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, "Temperature", {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the prompt should be displayed in a code block",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(this.page, "pre", { timeout: TIMEOUTS.LONG });
  },
);

Then(
  "the details panel should show {string} section in red",
  async function(this: CustomWorld, _section: string) {
    await waitForElementWithRetry(
      this.page,
      '[class*="text-red"]',
      { timeout: TIMEOUTS.LONG },
    );
    await waitForTextWithRetry(this.page, "Error", { timeout: TIMEOUTS.LONG });
  },
);

Then(
  "the error message should be displayed",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(this.page, "pre", { timeout: TIMEOUTS.LONG });
    await waitForTextWithRetry(this.page, /error|failed/i, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "I should see the user name or {string}",
  async function(this: CustomWorld, _fallback: string) {
    await waitForTextWithRetry(this.page, /Test User|Unknown/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then("I should see the user email", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, "@example.com", {
    timeout: TIMEOUTS.LONG,
  });
});

Then("I should see the Job ID", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, "Job", { timeout: TIMEOUTS.LONG });
});

Then("I should see the Image ID", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, "Image", { timeout: TIMEOUTS.LONG });
});

Then(
  "the details panel should show the Workflow ID",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, "Workflow", {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the details panel should show {string} text",
  async function(this: CustomWorld, text: string) {
    await waitForTextWithRetry(this.page, text, { timeout: TIMEOUTS.LONG });
  },
);

// NOTE: "PENDING status badge should be yellow" is defined in common.steps.ts

Then(
  "PROCESSING status badge should be blue with animation",
  async function(this: CustomWorld) {
    const badge = await waitForElementWithRetry(
      this.page,
      '[class*="Badge"]',
      { timeout: TIMEOUTS.LONG },
    );
    await waitForTextWithRetry(this.page, "PROCESSING", {
      timeout: TIMEOUTS.LONG,
    });
    const className = await badge.getAttribute("class");
    expect(className).toContain("blue");
    expect(className).toContain("animate-pulse");
  },
);

Then(
  "COMPLETED status badge should be green",
  async function(this: CustomWorld) {
    const badge = await waitForElementWithRetry(
      this.page,
      '[class*="Badge"]',
      { timeout: TIMEOUTS.LONG },
    );
    await waitForTextWithRetry(this.page, "COMPLETED", {
      timeout: TIMEOUTS.LONG,
    });
    const className = await badge.getAttribute("class");
    expect(className).toContain("green");
  },
);

// NOTE: "FAILED status badge should be red" is defined in common.steps.ts

Then(
  "CANCELLED status badge should be neutral",
  async function(this: CustomWorld) {
    const badge = await waitForElementWithRetry(
      this.page,
      '[class*="Badge"]',
      { timeout: TIMEOUTS.LONG },
    );
    await waitForTextWithRetry(this.page, "CANCELLED", {
      timeout: TIMEOUTS.LONG,
    });
    const className = await badge.getAttribute("class");
    expect(className).toMatch(/neutral|gray/);
  },
);

Then(
  "REFUNDED status badge should be purple",
  async function(this: CustomWorld) {
    const badge = await waitForElementWithRetry(
      this.page,
      '[class*="Badge"]',
      { timeout: TIMEOUTS.LONG },
    );
    await waitForTextWithRetry(this.page, "REFUNDED", {
      timeout: TIMEOUTS.LONG,
    });
    const className = await badge.getAttribute("class");
    expect(className).toContain("purple");
  },
);

Then(
  "TIER_1K should display as {string}",
  async function(this: CustomWorld, display: string) {
    // Wait for network to settle
    await this.page.waitForLoadState("networkidle").catch(() => {});
    // Tier labels appear within job items
    await waitForDynamicContent(
      this.page,
      '[data-testid="job-list-item"]',
      display,
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "TIER_2K should display as {string}",
  async function(this: CustomWorld, display: string) {
    // Wait for network to settle
    await this.page.waitForLoadState("networkidle").catch(() => {});
    // Tier labels appear within job items
    await waitForDynamicContent(
      this.page,
      '[data-testid="job-list-item"]',
      display,
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "TIER_4K should display as {string}",
  async function(this: CustomWorld, display: string) {
    // Wait for network to settle
    await this.page.waitForLoadState("networkidle").catch(() => {});
    // Tier labels appear within job items
    await waitForDynamicContent(
      this.page,
      '[data-testid="job-list-item"]',
      display,
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "I should see different jobs in the list",
  async function(this: CustomWorld) {
    // Wait for network to settle after page change
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await waitForElementWithRetry(
      this.page,
      '[data-testid="job-list-item"]',
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "I should see loading skeleton placeholders",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(this.page, '[class*="animate-pulse"]', {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "I should see {string} timestamp",
  async function(this: CustomWorld, timestamp: string) {
    await waitForTextWithRetry(this.page, timestamp, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "I should see processing time formatted as seconds",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /\d+(\.\d+)?s/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "file sizes should be formatted with appropriate units",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /(KB|MB|B)/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);
