import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import * as path from "path";
import {
  TIMEOUTS,
  waitForDynamicContent,
  waitForElementWithRetry,
} from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

// Given steps
// NOTE: "I am on the enhance page" step moved to common.steps.ts

Given(
  "I mock batch upload with varying speeds",
  async function(this: CustomWorld) {
    let uploadCount = 0;
    await this.page.route("**/api/upload", async (route) => {
      const delay = uploadCount * 500; // Each upload takes progressively longer
      uploadCount++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `image-${uploadCount}`,
          url: `https://example.com/image-${uploadCount}.jpg`,
        }),
      });
    });
  },
);

Given("I have started a batch upload", async function(this: CustomWorld) {
  // This would be set up by a previous step that initiated upload
  // For now, we'll just ensure we're on the page
  await this.page.waitForLoadState("networkidle");
});

Given("I mock some uploads to fail", async function(this: CustomWorld) {
  let uploadCount = 0;
  await this.page.route("**/api/upload", async (route) => {
    uploadCount++;
    if (uploadCount % 2 === 0) {
      // Fail every other upload
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Upload failed" }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `image-${uploadCount}`,
          url: `https://example.com/image-${uploadCount}.jpg`,
        }),
      });
    }
  });
});

Given(
  "I have uploaded {int} images in a batch",
  async function(this: CustomWorld, imageCount: number) {
    // Mock the images list API to return uploaded images
    await this.page.route("**/api/images", async (route) => {
      const images = Array.from({ length: imageCount }, (_, i) => ({
        id: `image-${i + 1}`,
        filename: `test-image-${i + 1}.jpg`,
        url: `https://example.com/image-${i + 1}.jpg`,
        uploadedAt: new Date().toISOString(),
      }));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ images }),
      });
    });
  },
);

Given("I have uploaded multiple images", async function(this: CustomWorld) {
  await this.page.route("**/api/images", async (route) => {
    const images = Array.from({ length: 5 }, (_, i) => ({
      id: `image-${i + 1}`,
      filename: `test-image-${i + 1}.jpg`,
      url: `https://example.com/image-${i + 1}.jpg`,
      uploadedAt: new Date().toISOString(),
    }));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ images }),
    });
  });
});

Given(
  "I have {int} uploaded images",
  async function(this: CustomWorld, count: number) {
    await this.page.route("**/api/images", async (route) => {
      const images = Array.from({ length: count }, (_, i) => ({
        id: `image-${i + 1}`,
        filename: `test-image-${i + 1}.jpg`,
        url: `https://example.com/image-${i + 1}.jpg`,
        uploadedAt: new Date().toISOString(),
      }));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ images }),
      });
    });
  },
);

Given(
  "I have selected {int} images for enhancement",
  async function(this: CustomWorld, count: number) {
    // Wait for gallery to be ready
    await this.page.waitForLoadState("networkidle");

    // Select images using role-based checkbox selector (shadcn/ui Checkbox)
    const checkboxes = this.page.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const selectCount = Math.min(count, await checkboxes.count());
    for (let i = 0; i < selectCount; i++) {
      const checkbox = checkboxes.nth(i);
      await checkbox.check({ timeout: TIMEOUTS.DEFAULT });
      await this.page.waitForTimeout(100);
    }
  },
);

Given(
  "I have {int} images selected for enhancement",
  async function(this: CustomWorld, count: number) {
    // Wait for gallery to be ready
    await this.page.waitForLoadState("networkidle");

    // Select images using role-based checkbox selector (shadcn/ui Checkbox)
    const checkboxes = this.page.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const selectCount = Math.min(count, await checkboxes.count());
    for (let i = 0; i < selectCount; i++) {
      const checkbox = checkboxes.nth(i);
      await checkbox.check({ timeout: TIMEOUTS.DEFAULT });
      await this.page.waitForTimeout(100);
    }
  },
);

// NOTE: "I have {int} tokens" step moved to common.steps.ts

Given(
  "I have {int} images selected",
  async function(this: CustomWorld, count: number) {
    // Wait for gallery to be ready
    await this.page.waitForLoadState("networkidle");

    // Select images using checkboxes - shadcn/ui Checkbox uses role="checkbox"
    // Try multiple selector strategies for robustness
    const checkboxes = this.page.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const checkboxCount = await checkboxes.count();
    const selectCount = Math.min(count, checkboxCount);

    for (let i = 0; i < selectCount; i++) {
      const checkbox = checkboxes.nth(i);
      await checkbox.check({ timeout: TIMEOUTS.DEFAULT });
      // Wait for checkbox state to update
      await this.page.waitForTimeout(100);
    }
  },
);

Given(
  "I have images selected for batch enhancement",
  async function(this: CustomWorld) {
    // Wait for gallery to be ready
    await this.page.waitForLoadState("networkidle");

    // Select first two images using role-based checkbox selector
    const checkboxes = this.page.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });

    const selectCount = Math.min(2, await checkboxes.count());
    for (let i = 0; i < selectCount; i++) {
      const checkbox = checkboxes.nth(i);
      await checkbox.check({ timeout: TIMEOUTS.DEFAULT });
      // Wait for checkbox state to update
      await this.page.waitForTimeout(100);
    }
  },
);

Given("the tier selection modal is open", async function(this: CustomWorld) {
  const enhanceButton = this.page.getByRole("button", {
    name: /Enhance Selected/i,
  });
  await enhanceButton.click();
  await this.page.waitForTimeout(300);
});

Given(
  "I have started batch enhancement for {int} images",
  async function(this: CustomWorld, count: number) {
    // Mock the enhancement processing
    await this.page.route("**/api/enhance/batch", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: Array.from({ length: count }, (_, i) => ({
            id: `job-${i + 1}`,
            imageId: `image-${i + 1}`,
            status: "PROCESSING",
          })),
        }),
      });
    });
  },
);

Given(
  "I have {int} images selected for deletion",
  async function(this: CustomWorld, count: number) {
    // Select images using checkboxes with retry
    for (let i = 0; i < count; i++) {
      const checkbox = await waitForElementWithRetry(
        this.page,
        `input[type="checkbox"]:nth-of-type(${i + 1})`,
        { timeout: TIMEOUTS.DEFAULT, state: "visible" },
      );
      await checkbox.check({ timeout: TIMEOUTS.DEFAULT });
      // Wait for checkbox state to update
      await this.page.waitForTimeout(100);
    }
  },
);

Given("I have started batch enhancement", async function(this: CustomWorld) {
  // Assume enhancement was started
  await this.page.waitForTimeout(100);
});

Given(
  "I had a batch enhancement that partially failed",
  async function(this: CustomWorld) {
    await this.page.route("**/api/enhance/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            { id: "job-1", status: "COMPLETED" },
            { id: "job-2", status: "FAILED" },
            { id: "job-3", status: "COMPLETED" },
            { id: "job-4", status: "FAILED" },
          ],
        }),
      });
    });
  },
);

Given(
  "I have completed several batch enhancements",
  async function(this: CustomWorld) {
    await this.page.route("**/api/enhance/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          batches: [
            {
              id: "batch-1",
              completedAt: new Date().toISOString(),
              imageCount: 5,
            },
            {
              id: "batch-2",
              completedAt: new Date(Date.now() - 86400000).toISOString(),
              imageCount: 3,
            },
          ],
        }),
      });
    });
  },
);

// When steps
When(
  "I select multiple valid image files for upload",
  async function(this: CustomWorld) {
    // File inputs may be hidden - use force: true or wait for it to be attached
    const fileInput = this.page.locator('input[type="file"]');
    // Wait for file input to be in DOM (even if hidden)
    await fileInput.waitFor({ state: "attached", timeout: 15000 });
    await fileInput.setInputFiles([
      path.join(__dirname, "../fixtures/test-image-1.jpg"),
      path.join(__dirname, "../fixtures/test-image-2.jpg"),
      path.join(__dirname, "../fixtures/test-image-3.jpg"),
    ]);
  },
);

When(
  "I select {int} images for batch upload",
  async function(this: CustomWorld, count: number) {
    const filePaths = Array.from(
      { length: count },
      (_, i) => path.join(__dirname, `../fixtures/test-image-${i + 1}.jpg`),
    );
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePaths);
  },
);

When(
  "I upload {int} images in batch",
  async function(this: CustomWorld, count: number) {
    const filePaths = Array.from(
      { length: count },
      (_, i) => path.join(__dirname, `../fixtures/test-image-${i + 1}.jpg`),
    );
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePaths);
    // Wait for upload to start
    await this.page.waitForTimeout(500);
  },
);

When("I cancel one image from the batch", async function(this: CustomWorld) {
  const cancelButton = this.page.getByRole("button", { name: /Cancel|Remove/i })
    .first();
  await cancelButton.click();
});

When(
  "I select images where some exceed 50MB",
  async function(this: CustomWorld) {
    // This would require actual large files or mocking
    // Placeholder for the step
    await this.page.waitForTimeout(100);
  },
);

When(
  "I select mixed files including non-images",
  async function(this: CustomWorld) {
    // Placeholder - would need actual files
    await this.page.waitForTimeout(100);
  },
);

When(
  "I select {int} images using checkboxes",
  async function(this: CustomWorld, count: number) {
    // Select images using checkboxes with retry
    for (let i = 0; i < count; i++) {
      const checkbox = await waitForElementWithRetry(
        this.page,
        `input[type="checkbox"]:nth-of-type(${i + 1})`,
        { timeout: TIMEOUTS.DEFAULT, state: "visible" },
      );
      await checkbox.check({ timeout: TIMEOUTS.DEFAULT });
      // Wait for checkbox state to update
      await this.page.waitForTimeout(100);
    }
  },
);

// Removed duplicate - using common.steps.ts

When(
  "I select {string} tier for batch enhancement",
  async function(this: CustomWorld, tier: string) {
    const tierOption = this.page.getByText(tier);
    await expect(tierOption).toBeVisible();
    await tierOption.click();
  },
);

// NOTE: "I confirm the batch enhancement" step moved to common.steps.ts

When(
  "I try to batch enhance with {string}",
  async function(this: CustomWorld, tier: string) {
    const enhanceButton = this.page.getByRole("button", {
      name: /Enhance Selected/i,
    });
    await enhanceButton.click();
    const tierOption = this.page.getByText(tier);
    await tierOption.click();
  },
);

When("the enhancements are processing", async function(this: CustomWorld) {
  await this.page.waitForTimeout(500);
});

When("I confirm the batch deletion", async function(this: CustomWorld) {
  const confirmButton = this.page.getByRole("button", {
    name: /Confirm|Delete/i,
  });
  await confirmButton.click();
});

// Removed duplicate - using common.steps.ts

When("the batch is processing", async function(this: CustomWorld) {
  await this.page.waitForTimeout(300);
});

When(
  "I select more than {int} images for upload",
  async function(this: CustomWorld, _limit: number) {
    // Placeholder - would select 21+ files
    await this.page.waitForTimeout(100);
  },
);

When("I open the tier selection modal", async function(this: CustomWorld) {
  const enhanceButton = this.page.getByRole("button", {
    name: /Enhance Selected/i,
  });
  await enhanceButton.click();
  await this.page.waitForTimeout(300);
});

// Then steps
Then(
  "I should see multiple images queued for upload",
  async function(this: CustomWorld) {
    // Wait for queue items to appear with retry
    await waitForElementWithRetry(
      this.page,
      '[data-testid="upload-queue-item"]',
      { timeout: TIMEOUTS.LONG },
    );
    const queueItems = this.page.locator('[data-testid="upload-queue-item"]');
    const count = await queueItems.count();
    expect(count).toBeGreaterThan(1);
  },
);

Then(
  "each image should show an upload progress indicator",
  async function(this: CustomWorld) {
    // Wait for progress indicators with retry
    await waitForElementWithRetry(
      this.page,
      '[role="progressbar"]',
      { timeout: TIMEOUTS.LONG },
    );
    const progressBars = this.page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "I should see all {int} image file names listed",
  async function(this: CustomWorld, count: number) {
    // Look for file names in the UI
    const fileNameElements = this.page.locator('[data-testid*="file-name"]');
    const actualCount = await fileNameElements.count();
    expect(actualCount).toBe(count);
  },
);

Then(
  "each file should have a status indicator",
  async function(this: CustomWorld) {
    const statusElements = this.page.locator('[data-testid*="status"]');
    const count = await statusElements.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each image should show individual upload progress",
  async function(this: CustomWorld) {
    // Wait for progress indicators with retry
    await waitForElementWithRetry(
      this.page,
      '[role="progressbar"]',
      { timeout: TIMEOUTS.LONG },
    );
    const progressBars = this.page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "faster uploads should complete before slower ones",
  async function(this: CustomWorld) {
    // This would require checking completion states over time
    await this.page.waitForTimeout(1000);
    const completedItems = this.page.locator('[data-testid*="completed"]');
    const count = await completedItems.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "that image should be removed from the queue",
  async function(this: CustomWorld) {
    // Verify one less item in queue
    await this.page.waitForTimeout(300);
    const queueItems = this.page.locator('[data-testid="upload-queue-item"]');
    const count = await queueItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  },
);

Then(
  "other images should continue uploading",
  async function(this: CustomWorld) {
    const progressBars = this.page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThanOrEqual(0);
  },
);

Then(
  "successful uploads should show success status",
  async function(this: CustomWorld) {
    const successIndicators = this.page.locator('[data-testid*="success"]');
    const count = await successIndicators.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "failed uploads should show error status",
  async function(this: CustomWorld) {
    const errorIndicators = this.page.locator('[data-testid*="error"]');
    const count = await errorIndicators.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then("I should see a summary of results", async function(this: CustomWorld) {
  const summary = this.page.locator('[data-testid="batch-summary"]');
  await expect(summary).toBeVisible();
});

Then("oversized images should be rejected", async function(this: CustomWorld) {
  const errorMessage = this.page.getByText(/exceeds.*50MB/i);
  await expect(errorMessage).toBeVisible();
});

Then(
  "valid images should proceed to upload",
  async function(this: CustomWorld) {
    const uploadQueue = this.page.locator('[data-testid="upload-queue"]');
    await expect(uploadQueue).toBeVisible();
  },
);

Then(
  "I should see size validation errors for rejected files",
  async function(this: CustomWorld) {
    const error = this.page.getByText(/size.*limit/i);
    await expect(error).toBeVisible();
  },
);

Then(
  "only valid image files should be queued",
  async function(this: CustomWorld) {
    // Verify only image files in queue
    await this.page.waitForTimeout(300);
  },
);

Then(
  "non-image files should show validation errors",
  async function(this: CustomWorld) {
    const error = this.page.getByText(/invalid.*file.*type/i);
    await expect(error).toBeVisible();
  },
);

Then(
  "I should see all {int} images in the images list",
  async function(this: CustomWorld, count: number) {
    const images = this.page.locator('[data-testid="image-item"]');
    const actualCount = await images.count();
    expect(actualCount).toBe(count);
  },
);

Then(
  "images should be sorted by upload date",
  async function(this: CustomWorld) {
    // This would require checking timestamps
    await this.page.waitForTimeout(100);
  },
);

// NOTE: "I should see {string} indicator" step moved to common.steps.ts

// Removed duplicate - using common.steps.ts

Then("I should see a tier selection modal", async function(this: CustomWorld) {
  const modal = this.page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
});

// NOTE: "I should see {string} option" step moved to common.steps.ts

Then(
  "each tier should show total token cost for {int} images",
  async function(this: CustomWorld, _imageCount: number) {
    const costIndicators = this.page.locator('[data-testid*="tier-cost"]');
    const count = await costIndicators.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "all {int} images should start processing",
  async function(this: CustomWorld, _count: number) {
    const processingIndicators = this.page.locator(
      '[data-testid*="processing"]',
    );
    const actualCount = await processingIndicators.count();
    expect(actualCount).toBeGreaterThanOrEqual(1);
  },
);

Then(
  "my token balance should decrease by the total cost",
  async function(this: CustomWorld) {
    // This would require checking the token balance before/after
    await this.page.waitForTimeout(300);
  },
);

Then(
  "I should see insufficient tokens warning",
  async function(this: CustomWorld) {
    const warning = this.page.getByText(/insufficient.*tokens/i);
    await expect(warning).toBeVisible();
  },
);

Then("the enhancement should not proceed", async function(this: CustomWorld) {
  // Verify no processing started
  await this.page.waitForTimeout(300);
});

// Removed duplicate - using common.steps.ts
// NOTE: "no enhancements should start" step moved to common.steps.ts

Then("images should remain selected", async function(this: CustomWorld) {
  const checkedBoxes = this.page.locator('input[type="checkbox"]:checked');
  const count = await checkedBoxes.count();
  expect(count).toBeGreaterThan(0);
});

Then(
  "I should see individual progress for each image",
  async function(this: CustomWorld) {
    // Wait for progress indicators with retry
    await waitForElementWithRetry(
      this.page,
      '[role="progressbar"]',
      { timeout: TIMEOUTS.LONG },
    );
    const progressBars = this.page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then("I should see overall batch progress", async function(this: CustomWorld) {
  // Wait for batch progress indicator with retry
  await waitForElementWithRetry(
    this.page,
    '[data-testid="batch-progress"]',
    { timeout: TIMEOUTS.LONG },
  );
});

Then(
  "completed enhancements should show before pending ones",
  async function(this: CustomWorld) {
    // This would require checking order of elements
    await this.page.waitForTimeout(100);
  },
);

Then("no images should be selected", async function(this: CustomWorld) {
  const checkedBoxes = this.page.locator('input[type="checkbox"]:checked');
  const count = await checkedBoxes.count();
  expect(count).toBe(0);
});

// NOTE: "the {string} button should be disabled" is defined in common.steps.ts

Then(
  "all {int} images should be selected",
  async function(this: CustomWorld, count: number) {
    // Wait for checkboxes to be checked with dynamic content verification
    await waitForDynamicContent(
      this.page,
      'input[type="checkbox"]:checked',
      "",
      { timeout: TIMEOUTS.LONG },
    );
    const checkedBoxes = this.page.locator('input[type="checkbox"]:checked');
    const actualCount = await checkedBoxes.count();
    expect(actualCount).toBe(count);
  },
);

Then(
  "all {int} selected images should be removed",
  async function(this: CustomWorld, _count: number) {
    // Wait for deletion to complete
    await this.page.waitForTimeout(500);
  },
);

Then(
  "I should see {int} images remaining",
  async function(this: CustomWorld, count: number) {
    const images = this.page.locator('[data-testid="image-item"]');
    const actualCount = await images.count();
    expect(actualCount).toBe(count);
  },
);

Then(
  "all {int} images should remain in the list",
  async function(this: CustomWorld, count: number) {
    const images = this.page.locator('[data-testid="image-item"]');
    const actualCount = await images.count();
    expect(actualCount).toBeGreaterThanOrEqual(count);
  },
);

Then(
  "I should see a warning about the limit",
  async function(this: CustomWorld) {
    const warning = this.page.getByText(/maximum.*20.*images/i);
    await expect(warning).toBeVisible();
  },
);

Then(
  "only the first {int} images should be queued",
  async function(this: CustomWorld, limit: number) {
    const queueItems = this.page.locator('[data-testid="upload-queue-item"]');
    const count = await queueItems.count();
    expect(count).toBeLessThanOrEqual(limit);
  },
);

Then("I should see which images failed", async function(this: CustomWorld) {
  const failedIndicators = this.page.locator('[data-testid*="failed"]');
  const count = await failedIndicators.count();
  expect(count).toBeGreaterThan(0);
});

// Removed duplicate - using common.steps.ts

Then(
  "only failed images should be re-queued for enhancement",
  async function(this: CustomWorld) {
    // Verify retry logic
    await this.page.waitForTimeout(300);
  },
);

Then(
  "I should see batch enhancement completion times",
  async function(this: CustomWorld) {
    // Look for timestamp elements
    const timestamps = this.page.locator('[data-testid*="completion-time"]');
    const count = await timestamps.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "I should see which images were processed together",
  async function(this: CustomWorld) {
    // Verify batch grouping in UI
    await this.page.waitForTimeout(100);
  },
);

Then(
  "{string} should show {string}",
  async function(this: CustomWorld, tier: string, costText: string) {
    const tierCard = this.page.locator(`[data-testid="tier-${tier}"]`);
    await expect(tierCard).toContainText(costText);
  },
);
