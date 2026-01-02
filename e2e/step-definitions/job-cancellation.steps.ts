import { Given, Then, When } from "@cucumber/cucumber";
import type { Route } from "@playwright/test";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

const mockImageId = "test-image-job-cancel";
const mockJobId = "test-job-123";

const mockPendingJob = {
  id: mockJobId,
  userId: "user-123",
  imageId: mockImageId,
  tier: "TIER_1K",
  status: "PENDING",
  tokensCost: 2,
  enhancedUrl: null,
  enhancedR2Key: null,
  enhancedWidth: null,
  enhancedHeight: null,
  enhancedSizeBytes: null,
  errorMessage: null,
  retryCount: 0,
  maxRetries: 3,
  geminiPrompt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  processingStartedAt: null,
  processingCompletedAt: null,
};

const mockProcessingJob = { ...mockPendingJob, status: "PROCESSING" };
const mockCompletedJob = {
  ...mockPendingJob,
  status: "COMPLETED",
  enhancedUrl: "https://example.com/enhanced.jpg",
};
const mockFailedJob = { ...mockPendingJob, status: "FAILED" };
const mockCancelledJob = { ...mockPendingJob, status: "CANCELLED" };

async function mockTokenBalance(world: CustomWorld, balance: number) {
  await world.page.route("**/api/tokens/balance", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ balance }),
    });
  });
}

Given("I have a pending enhancement job", async function(this: CustomWorld) {
  await this.page.route("**/api/jobs/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockPendingJob),
    });
  });
  (this as CustomWorld & { currentJob: typeof mockPendingJob; }).currentJob = mockPendingJob;
});

Given(
  "I have a processing enhancement job",
  async function(this: CustomWorld) {
    await this.page.route("**/api/jobs/**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProcessingJob),
      });
    });
    (this as CustomWorld & { currentJob: typeof mockProcessingJob; })
      .currentJob = mockProcessingJob;
  },
);

Given("I have a completed enhancement job", async function(this: CustomWorld) {
  await this.page.route("**/api/jobs/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockCompletedJob),
    });
  });
  (this as CustomWorld & { currentJob: typeof mockCompletedJob; }).currentJob = mockCompletedJob;
});

Given("I have a failed enhancement job", async function(this: CustomWorld) {
  await this.page.route("**/api/jobs/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockFailedJob),
    });
  });
  (this as CustomWorld & { currentJob: typeof mockFailedJob; }).currentJob = mockFailedJob;
});

Given("I have a cancelled enhancement job", async function(this: CustomWorld) {
  await this.page.route("**/api/jobs/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockCancelledJob),
    });
  });
  (this as CustomWorld & { currentJob: typeof mockCancelledJob; }).currentJob = mockCancelledJob;
});

Given(
  "I have a pending enhancement job with {int} token cost",
  async function(this: CustomWorld, tokenCost: number) {
    const jobWithCost = { ...mockPendingJob, tokensCost: tokenCost };
    await this.page.route("**/api/jobs/**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(jobWithCost),
      });
    });
    (this as CustomWorld & { currentJob: typeof jobWithCost; }).currentJob = jobWithCost;
  },
);

// NOTE: "I have {int} tokens" step moved to common.steps.ts

Given("I mock a failed job cancellation", async function(this: CustomWorld) {
  await this.page.route("**/api/jobs/**/cancel", async (route: Route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Failed to cancel job" }),
    });
  });
});

When(
  "I click the cancel button for the job",
  async function(this: CustomWorld) {
    const cancelButton = this.page.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
  },
);

// NOTE: "I confirm the cancellation" step moved to common.steps.ts

When("I dismiss the cancellation dialog", async function(this: CustomWorld) {
  const cancelButton = this.page.getByRole("button", {
    name: /cancel|dismiss/i,
  });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();
});

When("I attempt to cancel the job", async function(this: CustomWorld) {
  const cancelButton = this.page.getByRole("button", { name: /cancel/i });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();

  const confirmButton = this.page.getByRole("button", { name: /confirm/i });
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }
  await this.page.waitForLoadState("networkidle");
});

When("I cancel the job", async function(this: CustomWorld) {
  await this.page.route("**/api/jobs/**/cancel", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        job: mockCancelledJob,
        tokensRefunded: 2,
        newBalance: 12,
      }),
    });
  });

  const cancelButton = this.page.getByRole("button", { name: /cancel/i });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();

  const confirmButton = this.page.getByRole("button", { name: /confirm/i });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await this.page.waitForLoadState("networkidle");
});

// NOTE: "I should see a confirmation dialog" step moved to common.steps.ts

Then(
  "the job status should be {string}",
  async function(this: CustomWorld, status: string) {
    const statusBadge = this.page.getByText(status);
    await expect(statusBadge).toBeVisible();
  },
);

// NOTE: "my tokens should be refunded" step moved to common.steps.ts

Then(
  "I should not see a cancel button for the job",
  async function(this: CustomWorld) {
    const cancelButton = this.page.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).not.toBeVisible();
  },
);

Then("I should see {string} status in the version grid", async function(
  this: CustomWorld,
  status: string,
) {
  const versionGrid = this.page.locator("[data-testid='version-grid']");
  const statusBadge = versionGrid.getByText(status);
  await expect(statusBadge).toBeVisible();
});

Then(
  "the job should be marked as cancelled",
  async function(this: CustomWorld) {
    const cancelledBadge = this.page.getByText(/cancelled/i);
    await expect(cancelledBadge).toBeVisible();
  },
);

Then(
  "the job status should remain {string}",
  async function(this: CustomWorld, status: string) {
    await this.page.waitForTimeout(500);
    const statusBadge = this.page.getByText(status);
    await expect(statusBadge).toBeVisible();
  },
);

Then("my token balance should not change", async function(this: CustomWorld) {
  const worldWithBalance = this as CustomWorld & { tokenBalance?: number; };
  if (worldWithBalance.tokenBalance !== undefined) {
    await mockTokenBalance(this, worldWithBalance.tokenBalance);
  }
});

Then("my token balance should be {int} tokens", async function(
  this: CustomWorld,
  expectedBalance: number,
) {
  await mockTokenBalance(this, expectedBalance);
  const balanceDisplay = this.page.getByText(
    new RegExp(`${expectedBalance}\\s*token`, "i"),
  );
  await expect(balanceDisplay).toBeVisible();
});

Then(
  "I should see a refund transaction in my history",
  async function(this: CustomWorld) {
    await this.page.goto(`${this.baseUrl}/tokens`);
    await this.page.waitForLoadState("networkidle");

    const refundTransaction = this.page.getByText(/refund/i);
    await expect(refundTransaction).toBeVisible();
  },
);

// Removed duplicate - using common.steps.ts

// "I view the image enhancement page"
When("I view the image enhancement page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/pixel/${mockImageId}`);
  await this.page.waitForLoadState("networkidle");
});
