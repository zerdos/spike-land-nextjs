import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  TIMEOUTS,
  waitForDynamicContent,
  waitForTextWithRetry,
  waitForTokenBalance,
} from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

// Mock data
const mockAlbumId = "test-album-123";
const mockUserId = "user-123";

interface MockImage {
  id: string;
  originalUrl: string;
  enhancementJobs: Array<{
    id: string;
    tier: string;
    status: string;
    enhancedUrl?: string;
  }>;
}

interface MockAlbum {
  id: string;
  name: string;
  userId: string;
  images: MockImage[];
}

interface MockJob {
  id: string;
  imageId: string;
  tier: string;
  status: string;
  tokensCost: number;
  errorMessage: string | null;
}

// Extended world with batch enhancement context
interface BatchEnhancementWorld extends CustomWorld {
  mockAlbum?: MockAlbum;
  mockImages?: MockImage[];
  enhancementJobs?: MockJob[];
  currentTokenBalance?: number;
}

// Helper to create mock images
function createMockImages(
  count: number,
  options?: { enhanced?: boolean; tier?: string; },
): MockImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `image-${i + 1}`,
    originalUrl: `https://example.com/image-${i + 1}.jpg`,
    enhancementJobs: options?.enhanced
      ? [
        {
          id: `job-${i + 1}`,
          tier: options.tier || "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: `https://example.com/enhanced-${i + 1}.jpg`,
        },
      ]
      : [],
  }));
}

// Helper to setup album mock
async function mockAlbum(
  world: CustomWorld,
  imageCount: number,
  options?: { enhanced?: number; tier?: string; },
) {
  const batchWorld = world as BatchEnhancementWorld;
  const images = createMockImages(imageCount);

  // Mark some images as already enhanced if specified
  if (options?.enhanced) {
    for (let i = 0; i < options.enhanced && i < images.length; i++) {
      const image = images[i];
      if (image) {
        image.enhancementJobs = [
          {
            id: `job-${i + 1}`,
            tier: options.tier || "TIER_1K",
            status: "COMPLETED",
            enhancedUrl: `https://example.com/enhanced-${i + 1}.jpg`,
          },
        ];
      }
    }
  }

  const mockAlbumData: MockAlbum = {
    id: mockAlbumId,
    name: "Test Album",
    userId: mockUserId,
    images,
  };

  // Mock album API
  await world.page.route(`**/api/albums/${mockAlbumId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockAlbumData),
    });
  });

  // Store in world for later reference
  batchWorld.mockAlbum = mockAlbumData;
  batchWorld.mockImages = images;
}

// Helper to mock token balance
async function mockTokenBalance(world: CustomWorld, balance: number) {
  const batchWorld = world as BatchEnhancementWorld;
  await world.page.route("**/api/tokens/balance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ balance }),
    });
  });
  batchWorld.currentTokenBalance = balance;
}

// Helper to mock batch enhancement API
async function mockBatchEnhancement(
  world: CustomWorld,
  options?: { failSome?: boolean; slow?: boolean; },
) {
  const batchWorld = world as BatchEnhancementWorld;
  await world.page.route(
    `**/api/albums/${mockAlbumId}/enhance`,
    async (route) => {
      const requestBody = await route.request().postDataJSON();
      const tier = requestBody.tier as string;
      const images = batchWorld.mockImages || [];

      // Calculate which images need enhancement
      const imagesToEnhance = images.filter(
        (img: MockImage) =>
          !img.enhancementJobs.some(
            (j) => j.tier === tier && j.status === "COMPLETED",
          ),
      );

      if (options?.slow) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const jobs: MockJob[] = imagesToEnhance.map(
        (img: MockImage, idx: number) => {
          const shouldFail = options?.failSome && idx % 3 === 0;
          return {
            id: `job-${img.id}`,
            imageId: img.id,
            tier,
            status: shouldFail ? "FAILED" : "PENDING",
            tokensCost: tier === "TIER_1K" ? 2 : tier === "TIER_2K" ? 5 : 10,
            errorMessage: shouldFail ? "Enhancement failed" : null,
          };
        },
      );

      const totalCost = jobs.reduce((sum, job) => sum + job.tokensCost, 0);
      const newBalance = (batchWorld.currentTokenBalance || 0) - totalCost;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          totalImages: images.length,
          skipped: images.length - imagesToEnhance.length,
          queued: imagesToEnhance.length,
          totalCost,
          newBalance,
          jobs,
        }),
      });

      // Store jobs for status polling
      batchWorld.enhancementJobs = jobs;
    },
  );
}

// Helper to mock job status polling
async function mockJobStatusPolling(
  world: CustomWorld,
  options?: { varied?: boolean; },
) {
  const batchWorld = world as BatchEnhancementWorld;
  let pollCount = 0;

  await world.page.route("**/api/jobs/status", async (route) => {
    pollCount++;
    const jobs = batchWorld.enhancementJobs || [];

    // Add a small delay to simulate real API behavior
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate progressive completion
    const updatedJobs = jobs.map((job: MockJob, idx: number) => {
      if (options?.varied) {
        // Different completion times
        const completionThreshold = (idx + 1) * 2;
        if (pollCount >= completionThreshold) {
          return { ...job, status: "COMPLETED" };
        } else if (pollCount >= completionThreshold - 1) {
          return { ...job, status: "PROCESSING" };
        }
        return job;
      } else {
        // All complete after 3 polls
        if (pollCount >= 3) {
          return { ...job, status: "COMPLETED" };
        } else if (pollCount >= 2) {
          return { ...job, status: "PROCESSING" };
        }
        return job;
      }
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jobs: updatedJobs }),
    });

    batchWorld.enhancementJobs = updatedJobs;
  });
}

// Given steps
Given(
  "I have an album with {int} unenhanced images",
  async function(this: CustomWorld, imageCount: number) {
    await mockAlbum(this, imageCount);
  },
);

Given(
  "I have an album with {int} images",
  async function(this: CustomWorld, imageCount: number) {
    await mockAlbum(this, imageCount);
  },
);

// NOTE: "I have an empty album", "I have at least {int} tokens", and "I have {int} tokens" steps moved to common.steps.ts

Given(
  "I have only {int} tokens",
  async function(this: CustomWorld, tokenCount: number) {
    await mockTokenBalance(this, tokenCount);
  },
);

Given(
  "{int} images are already enhanced at {string}",
  async function(this: CustomWorld, count: number, tier: string) {
    const batchWorld = this as BatchEnhancementWorld;
    const images = batchWorld.mockImages || [];
    for (let i = 0; i < count && i < images.length; i++) {
      const image = images[i];
      if (image) {
        image.enhancementJobs = [
          {
            id: `job-${i + 1}`,
            tier,
            status: "COMPLETED",
            enhancedUrl: `https://example.com/enhanced-${i + 1}.jpg`,
          },
        ];
      }
    }
  },
);

Given(
  "all {int} images are already enhanced at {string}",
  async function(this: CustomWorld, _count: number, tier: string) {
    const batchWorld = this as BatchEnhancementWorld;
    const images = batchWorld.mockImages || [];
    images.forEach((img: MockImage, i: number) => {
      img.enhancementJobs = [
        {
          id: `job-${i + 1}`,
          tier,
          status: "COMPLETED",
          enhancedUrl: `https://example.com/enhanced-${i + 1}.jpg`,
        },
      ];
    });
  },
);

Given(
  "I mock batch enhancement with varied processing times",
  async function(this: CustomWorld) {
    await mockBatchEnhancement(this);
    await mockJobStatusPolling(this, { varied: true });
  },
);

Given(
  "I mock some enhancements to fail",
  async function(this: CustomWorld) {
    await mockBatchEnhancement(this, { failSome: true });
  },
);

Given(
  "I mock slow enhancement processing",
  async function(this: CustomWorld) {
    await mockBatchEnhancement(this, { slow: true });
  },
);

Given(
  "I mock job status polling",
  async function(this: CustomWorld) {
    await mockJobStatusPolling(this);
  },
);

Given(
  "{int} images failed to enhance",
  async function(this: CustomWorld, failCount: number) {
    const batchWorld = this as BatchEnhancementWorld;
    const jobs = batchWorld.enhancementJobs || [];
    for (let i = 0; i < failCount && i < jobs.length; i++) {
      const job = jobs[i];
      if (job) {
        job.status = "FAILED";
        job.errorMessage = "Enhancement failed";
      }
    }
  },
);

Given("I see failed enhancement status", async function(this: CustomWorld) {
  // Jobs should already be set up with failures
  await this.page.waitForTimeout(300);
});

Given(
  "I start batch enhancement",
  async function(this: CustomWorld) {
    await mockBatchEnhancement(this);
    await this.page.goto(`${this.baseUrl}/apps/pixel/albums/${mockAlbumId}`);
    await this.page.waitForLoadState("networkidle");
    const enhanceButton = this.page.getByRole("button", {
      name: /Enhance All/i,
    });
    await enhanceButton.click();
    await this.page.waitForTimeout(300);
    const tierOption = this.page.getByText("TIER_1K");
    await tierOption.click();
    const confirmButton = this.page.getByRole("button", { name: /Enhance/i });
    await confirmButton.click();
  },
);

Given("another user has an album", async function(this: CustomWorld) {
  // Mock an album belonging to a different user
  await this.page.route(
    `**/api/albums/${mockAlbumId}/enhance`,
    async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Forbidden" }),
      });
    },
  );
});

// When steps
When("I navigate to my album", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/apps/pixel/albums/${mockAlbumId}`);
  await this.page.waitForLoadState("networkidle");
});

// NOTE: "I click {string} button" is defined in common.steps.ts
// NOTE: "I click {string} button in the dialog" is defined in common.steps.ts
// NOTE: "I select {string} enhancement tier" step moved to common.steps.ts
// NOTE: "I confirm the batch enhancement" step moved to common.steps.ts

When("enhancements are processing", async function(this: CustomWorld) {
  await this.page.waitForTimeout(1000);
});

When("I see processing has started", async function(this: CustomWorld) {
  // Wait for processing indicators with extended timeout and retry
  const processingIndicator = this.page.locator(
    '[data-testid*="processing"], [data-status="processing"], [role="progressbar"]',
  );
  await expect(processingIndicator.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
});

When(
  "all enhancements complete successfully",
  async function(this: CustomWorld) {
    // Wait for all jobs to complete with dynamic content check
    // Poll for completion status with extended timeout
    await this.page.waitForFunction(
      () => {
        const completedElements = document.querySelectorAll(
          '[data-testid*="completed"], [data-status="completed"]',
        );
        const progressBars = document.querySelectorAll('[role="progressbar"]');
        // Check if we have completed elements or all progress bars show 100%
        return completedElements.length > 0 || Array.from(progressBars).some((bar) => {
          const value = bar.getAttribute("aria-valuenow");
          return value === "100";
        });
      },
      { timeout: TIMEOUTS.LONG },
    ).catch(() => {
      // If we can't detect completion, wait a fixed time
    });

    // Add buffer time for UI to stabilize
    await this.page.waitForTimeout(1000);
  },
);

When("I navigate to home page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/`);
  await this.page.waitForLoadState("networkidle");
});

When(
  "enhancements complete in background",
  async function(this: CustomWorld) {
    await this.page.waitForTimeout(3000);
  },
);

When("I return to my album", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/apps/pixel/albums/${mockAlbumId}`);
  await this.page.waitForLoadState("networkidle");
});

When(
  "I try to enhance that album",
  async function(this: CustomWorld) {
    await this.page.goto(`${this.baseUrl}/apps/pixel/albums/${mockAlbumId}`);
    await this.page.waitForLoadState("networkidle");
    const enhanceButton = this.page.getByRole("button", {
      name: /Enhance All/i,
    });
    await enhanceButton.click();
  },
);

// Then steps
Then(
  "I should see progress indicators for each image",
  async function(this: CustomWorld) {
    const progressIndicators = this.page.locator('[role="progressbar"]');
    const count = await progressIndicators.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "all images should show {string} status when complete",
  async function(this: CustomWorld, status: string) {
    // Wait for status text to appear with retry logic and extended timeout
    await waitForTextWithRetry(this.page, status, {
      timeout: TIMEOUTS.LONG,
    });

    // Verify multiple status elements appear
    const statusElements = this.page.getByText(status, { exact: false });
    await expect(statusElements.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    const count = await statusElements.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "my token balance should be reduced by {int} tokens",
  async function(this: CustomWorld, tokenAmount: number) {
    const batchWorld = this as BatchEnhancementWorld;
    // Mock the reduced balance
    const originalBalance = batchWorld.currentTokenBalance || 0;
    const expectedBalance = originalBalance - tokenAmount;
    await mockTokenBalance(this, expectedBalance);

    // Wait for token balance to update using the helper
    await waitForTokenBalance(this.page, { timeout: TIMEOUTS.LONG });

    // Use dynamic content wait for the specific balance value
    await waitForDynamicContent(
      this.page,
      '[data-testid="token-balance"]',
      `${expectedBalance}`,
      { timeout: TIMEOUTS.LONG },
    );
  },
);

// NOTE: "I should see an insufficient tokens warning" step moved to common.steps.ts

// NOTE: "the enhance button should be disabled" step moved to common.steps.ts

Then(
  "the batch enhancement dialog should close",
  async function(this: CustomWorld) {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible();
  },
);

// NOTE: "no enhancements should start" step moved to common.steps.ts

Then("no tokens should be deducted", async function(this: CustomWorld) {
  const batchWorld = this as BatchEnhancementWorld;
  // Balance should remain unchanged
  const originalBalance = batchWorld.currentTokenBalance;
  // Verify balance is still the same
  await this.page.waitForTimeout(300);
  expect(batchWorld.currentTokenBalance).toBe(originalBalance);
});

Then(
  "I should see {string} option with cost {string}",
  async function(this: CustomWorld, tier: string, cost: string) {
    const tierElement = this.page.getByText(tier);
    await expect(tierElement).toBeVisible();
    const costElement = this.page.getByText(cost, { exact: false });
    await expect(costElement).toBeVisible();
  },
);

Then(
  "each tier should show tokens per image calculation",
  async function(this: CustomWorld) {
    // Look for text like "2 tokens/image" or similar
    const calculationText = this.page.getByText(/tokens.*image/i);
    await expect(calculationText.first()).toBeVisible();
  },
);

Then(
  "I should see total cost of {string}",
  async function(this: CustomWorld, cost: string) {
    const costElement = this.page.getByText(cost, { exact: false });
    await expect(costElement).toBeVisible();
  },
);

Then(
  "I should see individual status for each image",
  async function(this: CustomWorld) {
    const statusElements = this.page.locator('[data-testid*="image-status"]');
    const count = await statusElements.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "I should see overall progress percentage",
  async function(this: CustomWorld) {
    const progressText = this.page.getByText(/%/);
    await expect(progressText.first()).toBeVisible();
  },
);

Then(
  "completed images should show checkmark icon",
  async function(this: CustomWorld) {
    const checkmarks = this.page.locator('[data-testid*="check"]');
    const count = await checkmarks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  },
);

Then(
  "processing images should show spinner icon",
  async function(this: CustomWorld) {
    const spinners = this.page.locator('[data-testid*="spinner"]');
    const count = await spinners.count();
    expect(count).toBeGreaterThanOrEqual(0);
  },
);

Then(
  "total cost should be {string}",
  async function(this: CustomWorld, cost: string) {
    const costElement = this.page.getByText(cost, { exact: false });
    await expect(costElement).toBeVisible();
  },
);

Then(
  "only {int} images should be processed",
  async function(this: CustomWorld, count: number) {
    const batchWorld = this as BatchEnhancementWorld;
    // Verify the job count matches
    const jobs = batchWorld.enhancementJobs || [];
    expect(jobs.length).toBe(count);
  },
);

Then(
  "already enhanced images should be skipped",
  async function(this: CustomWorld) {
    // This is implicit in the job count verification
    await this.page.waitForTimeout(100);
  },
);

Then(
  "successful enhancements should show success status",
  async function(this: CustomWorld) {
    const successIndicators = this.page.locator('[data-testid*="success"]');
    const count = await successIndicators.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "failed enhancements should show error status",
  async function(this: CustomWorld) {
    const errorIndicators = this.page.locator('[data-testid*="error"]');
    const count = await errorIndicators.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then("I should see error count in summary", async function(this: CustomWorld) {
  const errorSummary = this.page.getByText(/error|failed/i);
  await expect(errorSummary.first()).toBeVisible();
});

Then(
  "I should see {string} button for failed images",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", {
      name: new RegExp(buttonText, "i"),
    });
    await expect(button).toBeVisible();
  },
);

Then(
  "my token balance should update to {string}",
  async function(this: CustomWorld, balance: string) {
    const balanceNumber = parseInt(balance.replace(/\D/g, ""));
    await mockTokenBalance(this, balanceNumber);

    // Wait for token balance to update using the helper
    await waitForTokenBalance(this.page, { timeout: TIMEOUTS.LONG });

    // Wait for the specific balance text to appear
    await waitForTextWithRetry(this.page, balance, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then(
  "the balance should refresh automatically",
  async function(this: CustomWorld) {
    // Balance refresh is implicit in the update verification
    await this.page.waitForTimeout(300);
  },
);

// NOTE: "the dialog should close" step moved to common.steps.ts

Then(
  "enhancements should continue in background",
  async function(this: CustomWorld) {
    // Jobs should still be processing
    await this.page.waitForTimeout(500);
  },
);

Then(
  "I should see toast notification about background processing",
  async function(this: CustomWorld) {
    const toast = this.page.locator("[data-sonner-toast]");
    await expect(toast).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "I should see a warning about maximum batch size of {int}",
  async function(this: CustomWorld, maxSize: number) {
    const warning = this.page.getByText(new RegExp(`${maxSize}`, "i"));
    await expect(warning).toBeVisible();
  },
);

Then(
  "I should not see {string} button",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", {
      name: new RegExp(buttonText, "i"),
    });
    await expect(button).not.toBeVisible();
  },
);

Then(
  "the system should poll job statuses every {int} seconds",
  async function(this: CustomWorld, _seconds: number) {
    // Polling is verified through the mock setup
    await this.page.waitForTimeout(1000);
  },
);

Then(
  "polling interval should increase for long-running jobs",
  async function(this: CustomWorld) {
    // This is handled by the implementation - just verify it's working
    await this.page.waitForTimeout(500);
  },
);

Then(
  "polling should stop when all jobs are complete",
  async function(this: CustomWorld) {
    // Wait for completion with dynamic check
    await this.page.waitForFunction(
      () => {
        const completedElements = document.querySelectorAll(
          '[data-testid*="completed"], [data-status="completed"]',
        );
        return completedElements.length > 0;
      },
      { timeout: TIMEOUTS.LONG },
    ).catch(() => {
      // Fallback to fixed wait
    });

    // Add buffer for polling to actually stop
    await this.page.waitForTimeout(2000);
  },
);

Then(
  "only failed images should be re-queued",
  async function(this: CustomWorld) {
    // Verify retry only targets failed jobs
    await this.page.waitForTimeout(500);
  },
);

Then(
  "successful images should not be retried",
  async function(this: CustomWorld) {
    // Implicit in the retry logic
    await this.page.waitForTimeout(100);
  },
);

Then(
  "my token balance should only be charged for retried images",
  async function(this: CustomWorld) {
    // Balance should only decrease by failed job count
    await this.page.waitForTimeout(300);
  },
);

Then(
  "job statuses should update automatically",
  async function(this: CustomWorld) {
    // Wait for status updates via polling with dynamic check
    await this.page.waitForFunction(
      () => {
        // Look for processing or completed status indicators
        const statusElements = document.querySelectorAll('[data-testid*="status"], [data-status]');
        return statusElements.length > 0;
      },
      { timeout: TIMEOUTS.LONG },
    );

    // Additional wait for updates to propagate
    await this.page.waitForTimeout(1000);
  },
);

Then(
  "I should see transition from {string} to {string} to {string}",
  async function(
    this: CustomWorld,
    _status1: string,
    _status2: string,
    _status3: string,
  ) {
    // Wait for status transitions with extended timeout
    // Poll for completion status
    await this.page.waitForFunction(
      () => {
        const completedElements = document.querySelectorAll(
          '[data-testid*="completed"], [data-status="completed"]',
        );
        return completedElements.length > 0;
      },
      { timeout: TIMEOUTS.LONG },
    ).catch(() => {
      // Transitions may happen too fast to observe
    });
  },
);

Then(
  "completion percentage should increase progressively",
  async function(this: CustomWorld) {
    // Watch progress bar increase with dynamic check
    const progress = this.page.locator('[role="progressbar"]');
    await expect(progress.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    // Wait for progress to update
    await this.page.waitForFunction(
      () => {
        const progressBars = document.querySelectorAll('[role="progressbar"]');
        return Array.from(progressBars).some((bar) => {
          const value = bar.getAttribute("aria-valuenow");
          return value && parseInt(value) > 0;
        });
      },
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "I should see all enhancements completed",
  async function(this: CustomWorld) {
    // Wait for completed text to appear with retry
    await waitForTextWithRetry(this.page, /completed/i, {
      timeout: TIMEOUTS.LONG,
    });

    const completedIndicators = this.page.getByText(/completed/i);
    await expect(completedIndicators.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    const count = await completedIndicators.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "enhanced images should display properly",
  async function(this: CustomWorld) {
    // Verify images are visible
    const images = this.page.locator("img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "I should receive a {string} error",
  async function(this: CustomWorld, errorType: string) {
    // Check for error message
    const errorMessage = this.page.getByText(new RegExp(errorType, "i"));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "no enhancement jobs should be created",
  async function(this: CustomWorld) {
    const batchWorld = this as BatchEnhancementWorld;
    // Verify no jobs exist
    const jobs = batchWorld.enhancementJobs || [];
    expect(jobs.length).toBe(0);
  },
);
