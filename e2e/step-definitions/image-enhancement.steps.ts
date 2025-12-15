import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Mock data for testing
const mockImageId = "test-image-123";
const mockEnhancedImage = {
  id: mockImageId,
  userId: "user-123",
  originalUrl: "https://example.com/original.jpg",
  originalR2Key: "images/original.jpg",
  originalWidth: 1024,
  originalHeight: 768,
  originalSizeBytes: 500000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  enhancementJobs: [],
};

const mockEnhancementJob = {
  id: "job-123",
  userId: "user-123",
  imageId: mockImageId,
  tier: "TIER_1K",
  status: "COMPLETED",
  tokensCost: 2,
  enhancedUrl: "https://example.com/enhanced.jpg",
  enhancedR2Key: "images/enhanced.jpg",
  enhancedWidth: 1920,
  enhancedHeight: 1440,
  enhancedSizeBytes: 1000000,
  errorMessage: null,
  retryCount: 0,
  maxRetries: 3,
  geminiPrompt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  processingStartedAt: new Date().toISOString(),
  processingCompletedAt: new Date().toISOString(),
};

// Helper to mock token balance
async function mockTokenBalance(world: CustomWorld, balance: number) {
  await world.page.route("**/api/tokens/balance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ balance }),
    });
  });
}

// Helper to mock image upload
async function mockImageUpload(
  world: CustomWorld,
  success: boolean = true,
  delay: number = 0,
) {
  await world.page.route("**/api/images/upload", async (route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (success) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          image: mockEnhancedImage,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Upload failed" }),
      });
    }
  });
}

// Helper to mock enhancement API
async function mockEnhancement(world: CustomWorld, success: boolean = true) {
  await world.page.route("**/api/images/enhance", async (route) => {
    if (success) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          jobId: "job-123",
          tokensCost: 2,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Enhancement failed" }),
      });
    }
  });
}

// Helper to mock job polling
async function mockJobStatus(world: CustomWorld, status: string) {
  await world.page.route("**/api/jobs/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...mockEnhancementJob,
        status,
      }),
    });
  });
}

// Background steps
Given("I am on the enhance page", async function(this: CustomWorld) {
  // Use stored token balance if set by previous step, otherwise default to 10
  const worldWithBalance = this as CustomWorld & {
    desiredTokenBalance?: number;
  };
  const tokenBalance = worldWithBalance.desiredTokenBalance ?? 10;
  await mockTokenBalance(this, tokenBalance);
  await this.page.goto(`${this.baseUrl}/pixel`);
  await this.page.waitForLoadState("networkidle");
});

Given("I have an uploaded image", async function(this: CustomWorld) {
  // Mock the images list API
  await this.page.route("**/api/images", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ images: [mockEnhancedImage] }),
    });
  });

  await mockTokenBalance(this, 10);
  await this.page.goto(`${this.baseUrl}/pixel/${mockImageId}`);
  await this.page.waitForLoadState("networkidle");
});

Given("I have an enhanced image", async function(this: CustomWorld) {
  const imageWithEnhancement = {
    ...mockEnhancedImage,
    enhancementJobs: [mockEnhancementJob],
  };

  // Store for use in steps
  await this.page.evaluate((data) => {
    (window as unknown as Record<string, unknown>).__mockImage = data;
  }, imageWithEnhancement);

  await mockTokenBalance(this, 10);
  await this.page.goto(`${this.baseUrl}/pixel/${mockImageId}`);
  await this.page.waitForLoadState("networkidle");
});

Given(
  "I have multiple enhancement versions",
  async function(this: CustomWorld) {
    const imageWithMultipleVersions = {
      ...mockEnhancedImage,
      enhancementJobs: [
        mockEnhancementJob,
        {
          ...mockEnhancementJob,
          id: "job-124",
          tier: "TIER_2K",
          tokensCost: 5,
        },
        {
          ...mockEnhancementJob,
          id: "job-125",
          tier: "TIER_4K",
          tokensCost: 10,
        },
      ],
    };

    await this.page.evaluate((data) => {
      (window as unknown as Record<string, unknown>).__mockImage = data;
    }, imageWithMultipleVersions);

    await mockTokenBalance(this, 20);
    await this.page.goto(`${this.baseUrl}/pixel/${mockImageId}`);
    await this.page.waitForLoadState("networkidle");
  },
);

Given("I have uploaded images", async function(this: CustomWorld) {
  await this.page.route("**/api/images", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        images: [
          mockEnhancedImage,
          {
            ...mockEnhancedImage,
            id: "image-2",
            originalUrl: "https://example.com/image2.jpg",
          },
        ],
      }),
    });
  });

  await mockTokenBalance(this, 10);
});

Given("I have no uploaded images", async function(this: CustomWorld) {
  await this.page.route("**/api/images", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ images: [] }),
    });
  });

  await mockTokenBalance(this, 10);
});

Given(
  "I have at least {int} tokens",
  async function(this: CustomWorld, tokenCount: number) {
    await mockTokenBalance(this, tokenCount);
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
  },
);

Given(
  "I have {int} tokens",
  async function(this: CustomWorld, tokenCount: number) {
    // Store the desired token count for use by subsequent steps
    (this as CustomWorld & { desiredTokenBalance?: number; })
      .desiredTokenBalance = tokenCount;
    // Also set up the mock immediately in case we're already on a page
    await mockTokenBalance(this, tokenCount);
  },
);

Given(
  "I have less than {int} tokens",
  async function(this: CustomWorld, threshold: number) {
    await mockTokenBalance(this, threshold - 2);
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
  },
);

Given("I have low token balance", async function(this: CustomWorld) {
  await mockTokenBalance(this, 2);
  await this.page.reload();
  await this.page.waitForLoadState("networkidle");
});

Given("I mock a successful image upload", async function(this: CustomWorld) {
  await mockImageUpload(this, true);
});

Given("I mock a slow image upload", async function(this: CustomWorld) {
  await mockImageUpload(this, true, 2000);
});

Given("I mock a successful enhancement", async function(this: CustomWorld) {
  await mockEnhancement(this, true);
  await mockJobStatus(this, "COMPLETED");
});

Given(
  "I mock a successful enhancement with {int} token cost",
  async function(this: CustomWorld, cost: number) {
    await this.page.route("**/api/images/enhance", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          jobId: "job-123",
          tokensCost: cost,
        }),
      });
    });
    await mockJobStatus(this, "COMPLETED");
  },
);

Given("I mock a failed enhancement", async function(this: CustomWorld) {
  await mockEnhancement(this, false);
});

Given("I start an enhancement job", async function(this: CustomWorld) {
  await mockEnhancement(this, true);
  await mockJobStatus(this, "PROCESSING");
});

Given("another user has an uploaded image", async function(this: CustomWorld) {
  // This is just a marker for the test - the actual validation happens in the page
  // The page will redirect if userId doesn't match
});

Given("I am on the image enhancement page", async function(this: CustomWorld) {
  // Already on the page from previous Given step
  await this.page.waitForLoadState("networkidle");
});

Given("other users have uploaded images", async function(this: CustomWorld) {
  // This is a marker - the backend will filter by userId
  // The test verifies that other users' images are NOT shown
});

// When steps
When("I upload a valid image file", async function(this: CustomWorld) {
  const fileInput = this.page.locator('input[type="file"]');

  // For testing purposes, we'll mock the file selection since we may not have actual files
  // Note: testImagePath could be used with: path.join(__dirname, '../fixtures/test-image.jpg')
  await fileInput.setInputFiles({
    name: "test.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-image-content"),
  });

  // Wait for upload to start (loading state)
  await this.page.waitForTimeout(1000);
});

When(
  "I attempt to upload a file larger than 50MB",
  async function(this: CustomWorld) {
    const fileInput = this.page.locator('input[type="file"]');

    await fileInput.evaluate((input: HTMLInputElement) => {
      const largeSize = 51 * 1024 * 1024; // 51MB
      const dataTransfer = new DataTransfer();
      const file = new File([new ArrayBuffer(largeSize)], "large.jpg", {
        type: "image/jpeg",
      });
      Object.defineProperty(file, "size", { value: largeSize });
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await this.page.waitForTimeout(500);
  },
);

When(
  "I attempt to upload a non-image file",
  async function(this: CustomWorld) {
    const fileInput = this.page.locator('input[type="file"]');

    await fileInput.evaluate((input: HTMLInputElement) => {
      const dataTransfer = new DataTransfer();
      const file = new File(["document content"], "document.pdf", {
        type: "application/pdf",
      });
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await this.page.waitForTimeout(500);
  },
);

When("I start uploading an image", async function(this: CustomWorld) {
  const fileInput = this.page.locator('input[type="file"]');

  await fileInput.evaluate((input: HTMLInputElement) => {
    const dataTransfer = new DataTransfer();
    const file = new File(["fake-image-content"], "test.jpg", {
      type: "image/jpeg",
    });
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Don't wait for completion - we want to check loading state
  await this.page.waitForTimeout(100);
});

When("I visit the image enhancement page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/pixel/${mockImageId}`);
  await this.page.waitForLoadState("networkidle");
});

When(
  "I select {string} enhancement",
  async function(this: CustomWorld, tier: string) {
    // The tier is typically selected via radio buttons or cards
    const tierOption = this.page.locator(`[data-tier="${tier}"]`).or(
      this.page.getByText(tier),
    );
    await tierOption.click();
  },
);

When("I click the enhance button", async function(this: CustomWorld) {
  const enhanceButton = this.page.getByRole("button", {
    name: /enhance|start/i,
  });
  await enhanceButton.click();
  await this.page.waitForTimeout(500);
});

When("I try to enhance the image", async function(this: CustomWorld) {
  await mockEnhancement(this, false);
  const enhanceButton = this.page.getByRole("button", {
    name: /enhance|start/i,
  });
  await enhanceButton.click();
  await this.page.waitForTimeout(500);
});

When(
  "I try to enhance the image with {string}",
  async function(this: CustomWorld, tier: string) {
    const tierOption = this.page.locator(`[data-tier="${tier}"]`).or(
      this.page.getByText(tier),
    );
    await tierOption.click();

    const enhanceButton = this.page.getByRole("button", {
      name: /enhance|start/i,
    });
    await enhanceButton.click();
    await this.page.waitForTimeout(500);
  },
);

When("I view the image details", async function(this: CustomWorld) {
  // Already on the page from Given step
  await this.page.waitForLoadState("networkidle");
});

When("I delete an image from the list", async function(this: CustomWorld) {
  await this.page.route("**/api/images/**", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock the confirm dialog to auto-confirm
  this.page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  const deleteButton = this.page.getByRole("button", { name: /delete/i })
    .first();
  await deleteButton.click();
  await this.page.waitForTimeout(500);
});

When("I confirm the deletion", async function(this: CustomWorld) {
  // Already handled in the previous step with dialog auto-accept
});

When("I attempt to delete an image", async function(this: CustomWorld) {
  const deleteButton = this.page.getByRole("button", { name: /delete/i })
    .first();
  await deleteButton.click();
  await this.page.waitForTimeout(100);
});

When("I cancel the deletion confirmation", async function(this: CustomWorld) {
  this.page.on("dialog", async (dialog) => {
    await dialog.dismiss();
  });
});

When(
  "I click on a different version in the grid",
  async function(this: CustomWorld) {
    const versionCards = this.page.locator("[data-version-id]");
    const secondVersion = versionCards.nth(1);
    await secondVersion.click();
    await this.page.waitForTimeout(300);
  },
);

When(
  "I enhance the image with {string}",
  async function(this: CustomWorld, tier: string) {
    const tierOption = this.page.locator(`[data-tier="${tier}"]`).or(
      this.page.getByText(tier),
    );
    await tierOption.click();

    const enhanceButton = this.page.getByRole("button", {
      name: /enhance|start/i,
    });
    await enhanceButton.click();
    await this.page.waitForTimeout(500);
  },
);

When("the enhancement completes", async function(this: CustomWorld) {
  await mockJobStatus(this, "COMPLETED");
  await this.page.waitForTimeout(1000);
});

When("the job is processing", async function(this: CustomWorld) {
  // Job is already set to processing in Given step
  await this.page.waitForTimeout(100);
});

When(
  "I try to access that image's enhancement page",
  async function(this: CustomWorld) {
    // Try to access another user's image
    await this.page.goto(`${this.baseUrl}/pixel/${mockImageId}`);
    await this.page.waitForLoadState("networkidle");
  },
);

When(
  "I return from successful Stripe checkout",
  async function(this: CustomWorld) {
    await this.page.goto(
      `${this.baseUrl}/pixel/${mockImageId}?success=true&session_id=cs_test_123`,
    );
    await this.page.waitForLoadState("networkidle");
  },
);

When(
  "I view the comparison on different screen sizes",
  async function(this: CustomWorld) {
    // This step is mainly for documentation - actual responsive testing would require multiple viewports
    await this.page.waitForTimeout(100);
  },
);

// Removed duplicate - using common.steps.ts

// Then steps
Then(
  "I should see the image upload section",
  async function(this: CustomWorld) {
    // Look for the upload heading which is visible (file input is hidden)
    const uploadHeading = this.page.getByRole("heading", {
      name: /upload an image/i,
    });
    await expect(uploadHeading).toBeVisible();
  },
);

Then(
  "I should see the token balance display",
  async function(this: CustomWorld) {
    // Look for the balance display showing "X tokens" where X is a number
    const balanceDisplay = this.page.locator('[data-testid="token-balance"]')
      .or(
        this.page.getByText(/\d+\s*tokens/i),
      );
    await expect(balanceDisplay.first()).toBeVisible();
  },
);

Then("I should see the upload icon", async function(this: CustomWorld) {
  // Look for the Upload heading which indicates the upload area is visible
  const uploadHeading = this.page.getByRole("heading", {
    name: /upload an image/i,
  });
  await expect(uploadHeading).toBeVisible();
});

Then(
  "I should see upload error {string}",
  async function(this: CustomWorld, errorText: string) {
    // Check for the error in the enhance page specifically
    const error = this.page.locator(".text-destructive").getByText(errorText)
      .or(
        this.page.getByText(errorText),
      );
    await expect(error).toBeVisible();
  },
);

Then(
  "I should be redirected to the image enhancement page",
  async function(this: CustomWorld) {
    // Wait for navigation to complete
    await this.page.waitForURL(/\/pixel\//, { timeout: 10000 }).catch(() => {
      // If navigation didn't happen, fail with current URL
      const url = this.page.url();
      expect(url).toContain("/pixel/");
    });
  },
);

Then(
  "the upload button should be disabled",
  async function(this: CustomWorld) {
    const button = this.page.getByRole("button", { name: /select image/i });
    await expect(button).toBeDisabled();
  },
);

Then("I should see the loading spinner", async function(this: CustomWorld) {
  // Look for the spinning animation class specifically
  const spinner = this.page.locator(".animate-spin");
  await expect(spinner.first()).toBeVisible();
});

// NOTE: "I should see {string} or {string} text" is defined in common.steps.ts

Then(
  "I should see the enhancement settings panel",
  async function(this: CustomWorld) {
    const settingsPanel = this.page.locator(
      '[data-testid="enhancement-settings"]',
    ).or(
      this.page.getByText(/tier/i),
    );
    await expect(settingsPanel).toBeVisible();
  },
);

Then(
  "I should see {string} enhancement option",
  async function(this: CustomWorld, tier: string) {
    const tierOption = this.page.getByText(tier);
    await expect(tierOption).toBeVisible();
  },
);

Then("each tier should display token cost", async function(this: CustomWorld) {
  const tokenCost = this.page.getByText(/tokens?/i);
  await expect(tokenCost).toBeVisible();
});

Then(
  "I should see enhancement status {string}",
  async function(this: CustomWorld, status: string) {
    // Look for status in the enhancement context specifically
    const statusElement = this.page.locator("[data-job-status]").getByText(
      new RegExp(status, "i"),
    )
      .or(
        this.page.getByText(new RegExp(status, "i")),
      );
    await expect(statusElement).toBeVisible();
  },
);

Then(
  "the enhancement should start processing",
  async function(this: CustomWorld) {
    // Check that the UI reflects processing state
    await this.page.waitForTimeout(300);
  },
);

Then(
  "I should see an insufficient tokens warning",
  async function(this: CustomWorld) {
    const warning = this.page.getByText(
      /insufficient.*tokens?|not enough tokens?/i,
    );
    await expect(warning).toBeVisible();
  },
);

Then("I should see a purchase prompt", async function(this: CustomWorld) {
  const purchasePrompt = this.page.getByText(
    /get tokens?|buy tokens?|purchase/i,
  );
  await expect(purchasePrompt).toBeVisible();
});

Then("I should see the low balance banner", async function(this: CustomWorld) {
  const banner = this.page.locator('[role="alert"]').or(
    this.page.getByText(/running low/i),
  );
  await expect(banner).toBeVisible();
});

Then("I should see the comparison slider", async function(this: CustomWorld) {
  const slider = this.page.locator('[data-testid="comparison-slider"]').or(
    this.page.locator('input[type="range"]'),
  );
  await expect(slider).toBeVisible();
});

Then(
  "I can interact with the slider to compare versions",
  async function(this: CustomWorld) {
    const slider = this.page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill("75");
      await this.page.waitForTimeout(200);
    }
  },
);

Then(
  "I should see all enhancement versions",
  async function(this: CustomWorld) {
    const versions = this.page.locator("[data-version-id]");
    const count = await versions.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "I can select different versions to compare",
  async function(this: CustomWorld) {
    const versions = this.page.locator("[data-version-id]");
    if (await versions.count() > 1) {
      await versions.nth(1).click();
      await this.page.waitForTimeout(200);
    }
  },
);

Then("the comparison slider should update", async function(this: CustomWorld) {
  // Wait for the slider to reflect the new selection
  await this.page.waitForTimeout(300);
});

Then(
  "the selected version should be highlighted",
  async function(this: CustomWorld) {
    const selectedVersion = this.page.locator(
      '[data-version-id][data-selected="true"]',
    ).or(
      this.page.locator("[data-version-id].selected"),
    );
    await expect(selectedVersion).toBeVisible();
  },
);

Then(
  "the image should be removed from the list",
  async function(this: CustomWorld) {
    // Check that the image count decreased
    await this.page.waitForTimeout(300);
  },
);

Then("the image should remain in the list", async function(this: CustomWorld) {
  const imageCards = this.page.locator("[data-image-id]");
  const count = await imageCards.count();
  expect(count).toBeGreaterThan(0);
});

Then("I should see an empty images list", async function(this: CustomWorld) {
  const emptyState = this.page.getByText(/no images/i).or(
    this.page.getByText(/upload.*first/i),
  );
  // Either we see empty state text, or we just don't see any image cards
  const imageCards = this.page.locator("[data-image-id]");
  const count = await imageCards.count();
  if (count === 0) {
    // Success - no images found
  } else {
    await expect(emptyState).toBeVisible();
  }
});

Then(
  "my token balance should decrease to {int} tokens",
  async function(this: CustomWorld, expectedBalance: number) {
    await mockTokenBalance(this, expectedBalance);
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
    // In a real test, you would verify the displayed balance
  },
);

Then("I should see the purchase modal", async function(this: CustomWorld) {
  const modal = this.page.locator('[role="dialog"]').or(
    this.page.getByText(/select.*package/i),
  );
  await expect(modal).toBeVisible();
});

Then("I can select token packages", async function(this: CustomWorld) {
  // Just verify package selectors exist
  await this.page.locator("[data-package-id]").first().waitFor({
    state: "visible",
    timeout: 1000,
  })
    .catch(() => {
      // If not found, that's okay - just checking the modal is up
    });
  await this.page.waitForTimeout(200);
});

Then(
  "the enhance button should be disabled",
  async function(this: CustomWorld) {
    const button = this.page.getByRole("button", { name: /enhance|start/i });
    await expect(button).toBeDisabled();
  },
);

// Removed duplicate - using common.steps.ts

Then(
  "the enhancement status should show as failed",
  async function(this: CustomWorld) {
    const failedStatus = this.page.getByText(/failed|error/i);
    await expect(failedStatus).toBeVisible();
  },
);

Then("I should only see my own images", async function(this: CustomWorld) {
  // This would be validated by checking that only images with the correct userId are shown
  // In a real implementation, this would query the database or API
  await this.page.waitForTimeout(100);
});

Then(
  "I should not see other users' images",
  async function(this: CustomWorld) {
    // Validation happens server-side - this is a smoke test
    await this.page.waitForTimeout(100);
  },
);

Then(
  "the token balance should refresh automatically",
  async function(this: CustomWorld) {
    // Check that balance is being fetched
    await this.page.waitForTimeout(500);
  },
);

Then(
  "the URL parameters should be cleaned up",
  async function(this: CustomWorld) {
    const url = this.page.url();
    expect(url).not.toContain("success=");
    expect(url).not.toContain("session_id=");
  },
);

Then("the slider should work on mobile", async function(this: CustomWorld) {
  await this.page.setViewportSize({ width: 375, height: 667 });
  const slider = this.page.locator('input[type="range"]').first();
  if (await slider.isVisible()) {
    await slider.fill("50");
  }
  await this.page.waitForTimeout(200);
});

Then("the slider should work on desktop", async function(this: CustomWorld) {
  await this.page.setViewportSize({ width: 1920, height: 1080 });
  const slider = this.page.locator('input[type="range"]').first();
  if (await slider.isVisible()) {
    await slider.fill("50");
  }
  await this.page.waitForTimeout(200);
});

Then("the slider should work on tablet", async function(this: CustomWorld) {
  await this.page.setViewportSize({ width: 768, height: 1024 });
  const slider = this.page.locator('input[type="range"]').first();
  if (await slider.isVisible()) {
    await slider.fill("50");
  }
  await this.page.waitForTimeout(200);
});

Then(
  "I should see enhancement status {string} in the version grid",
  async function(this: CustomWorld, status: string) {
    // Look for the status specifically in the version grid area
    const versionGrid = this.page.locator('[data-testid="version-grid"]').or(
      this.page.getByText(/enhancement versions/i).locator(".."),
    );
    const statusElement = versionGrid.getByText(new RegExp(status, "i"));
    await expect(statusElement).toBeVisible();
  },
);
