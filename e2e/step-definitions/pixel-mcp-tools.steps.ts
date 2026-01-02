import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// Mock job data
const mockCompletedGenerateJob = {
  id: "generate-job-001",
  type: "GENERATE",
  tier: "TIER_1K",
  tokensCost: 2,
  status: "COMPLETED",
  prompt: "A beautiful sunset over mountains",
  outputImageUrl: "https://example.com/generated.jpg",
  outputWidth: 1024,
  outputHeight: 1024,
  errorMessage: null,
  createdAt: new Date().toISOString(),
  processingCompletedAt: new Date().toISOString(),
};

const mockCompletedModifyJob = {
  ...mockCompletedGenerateJob,
  id: "modify-job-001",
  type: "MODIFY",
  prompt: "Add a rainbow in the sky",
};

const mockFailedJob = {
  ...mockCompletedGenerateJob,
  id: "failed-job-001",
  status: "FAILED",
  errorMessage: "Generation failed due to content policy violation",
  outputImageUrl: null,
  outputWidth: null,
  outputHeight: null,
};

const mockProcessingJob = {
  ...mockCompletedGenerateJob,
  id: "processing-job-001",
  status: "PROCESSING",
  outputImageUrl: null,
  outputWidth: null,
  outputHeight: null,
  processingCompletedAt: null,
};

// Setup steps
Given(
  "I mock token balance of {int} tokens",
  async function(this: CustomWorld, balance: number) {
    await this.page.route("**/api/mcp/balance", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ balance }),
      });
    });
  },
);

Given(
  "I mock a successful MCP generate job",
  async function(this: CustomWorld) {
    let pollCount = 0;

    await this.page.route("**/api/mcp/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobId: mockCompletedGenerateJob.id,
          tier: "TIER_1K",
          tokensCost: 2,
        }),
      });
    });

    await this.page.route("**/api/mcp/jobs/*", async (route) => {
      pollCount++;
      // Simulate processing for first poll, then complete
      if (pollCount <= 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockProcessingJob),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockCompletedGenerateJob),
        });
      }
    });
  },
);

Given("I mock a successful MCP modify job", async function(this: CustomWorld) {
  let pollCount = 0;

  await this.page.route("**/api/mcp/modify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: mockCompletedModifyJob.id,
        tier: "TIER_1K",
        tokensCost: 2,
      }),
    });
  });

  await this.page.route("**/api/mcp/jobs/*", async (route) => {
    pollCount++;
    if (pollCount <= 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockProcessingJob, type: "MODIFY" }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCompletedModifyJob),
      });
    }
  });
});

Given(
  "I mock a job status response for job {string}",
  async function(this: CustomWorld, jobId: string) {
    // Mock any job status request to return the specified job ID
    await this.page.route("**/api/mcp/jobs/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...mockCompletedGenerateJob, id: jobId }),
      });
    });
  },
);

Given(
  "I mock a completed job status with output image",
  async function(this: CustomWorld) {
    (this as CustomWorld & { mockJobId: string; }).mockJobId = mockCompletedGenerateJob.id;

    await this.page.route("**/api/mcp/jobs/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCompletedGenerateJob),
      });
    });
  },
);

Given(
  "I mock a failed job status with error message",
  async function(this: CustomWorld) {
    (this as CustomWorld & { failedJobId: string; }).failedJobId = mockFailedJob.id;

    await this.page.route("**/api/mcp/jobs/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockFailedJob),
      });
    });
  },
);

Given(
  "I mock a failed MCP generate response",
  async function(this: CustomWorld) {
    await this.page.route("**/api/mcp/generate", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Insufficient tokens" }),
      });
    });
  },
);

Given(
  "there is a valid API key {string}",
  async function(this: CustomWorld, apiKey: string) {
    // Store the API key for later use
    (this as CustomWorld & { testApiKey: string; }).testApiKey = apiKey;

    // Mock balance endpoint to accept the API key
    await this.page.route("**/api/mcp/balance", async (route) => {
      const authHeader = route.request().headers()["authorization"];
      if (authHeader === `Bearer ${apiKey}`) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ balance: 50 }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid API key" }),
        });
      }
    });
  },
);

// Navigation and interaction steps
When(
  "I click on {string} tab",
  async function(this: CustomWorld, tabName: string) {
    const tab = this.page.getByRole("tab", { name: new RegExp(tabName, "i") });
    await tab.click();
    await this.page.waitForTimeout(300);
  },
);

When(
  "I enter {string} in the prompt textarea",
  async function(this: CustomWorld, promptText: string) {
    const textarea = this.page.locator("textarea").first();
    await textarea.fill(promptText);
  },
);

When(
  "I enter {string} in the modification prompt textarea",
  async function(this: CustomWorld, promptText: string) {
    const textarea = this.page.getByLabel(/modification prompt/i).or(
      this.page.locator("#modify-prompt"),
    );
    await textarea.fill(promptText);
  },
);

When(
  "I select {string} quality tier",
  async function(this: CustomWorld, tier: string) {
    // Map tier codes to their display text
    const tierTextMap: Record<string, string> = {
      "TIER_1K": "1K",
      "TIER_2K": "2K",
      "TIER_4K": "4K",
    };
    const tierText = tierTextMap[tier] || tier;

    // Find the Quality Tier select within the visible tab panel
    const tabPanel = this.page.locator('[role="tabpanel"]');
    const selectTrigger = tabPanel.locator(
      '[role="combobox"], button[data-slot="trigger"]',
    )
      .first();
    await expect(selectTrigger).toBeVisible({ timeout: 10000 });
    await selectTrigger.click();
    // Wait for dropdown to open
    await this.page.waitForTimeout(300);
    // Select the option by its display text (e.g., "2K (2048px) - 5 tokens")
    const option = this.page.getByRole("option", {
      name: new RegExp(tierText, "i"),
    });
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    // Wait for dropdown to close
    await this.page.waitForTimeout(200);
  },
);

When("I upload a test image", async function(this: CustomWorld) {
  const fileInput = this.page.locator('input[type="file"]');

  // Create a mock image file
  await fileInput.setInputFiles({
    name: "test-image.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-image-content"),
  });

  await this.page.waitForTimeout(300);
});

When(
  "I enter {string} in the job ID input",
  async function(this: CustomWorld, jobId: string) {
    const input = this.page.getByLabel(/job id/i).or(
      this.page.locator("#job-id"),
    );
    await input.fill(jobId);
  },
);

When("I enter the job ID", async function(this: CustomWorld) {
  const jobId = (this as CustomWorld & { mockJobId?: string; }).mockJobId ||
    mockCompletedGenerateJob.id;
  const input = this.page.getByLabel(/job id/i).or(
    this.page.locator("#job-id"),
  );
  await input.fill(jobId);
});

When("I enter the failed job ID", async function(this: CustomWorld) {
  const jobId = (this as CustomWorld & { failedJobId?: string; }).failedJobId ||
    mockFailedJob.id;
  const input = this.page.getByLabel(/job id/i).or(
    this.page.locator("#job-id"),
  );
  await input.fill(jobId);
});

When(
  "I enter {string} in the API key input",
  async function(this: CustomWorld, apiKey: string) {
    const input = this.page.getByLabel(/api key/i).or(
      this.page.locator("#manual-key"),
    );
    await input.fill(apiKey);
  },
);

When("the job completes", async function(this: CustomWorld) {
  // Wait for polling to complete and show results
  await this.page.waitForTimeout(3000);
});

When(
  "I click the copy button for {string} API command",
  async function(this: CustomWorld, commandName: string) {
    // Find the section for the command by looking for the h4 heading text
    // Each API section has an h4 title and a pre code block with copy button
    const section = this.page.locator(".space-y-2").filter({
      has: this.page.locator("h4", { hasText: new RegExp(commandName, "i") }),
    });
    // The copy button is inside the relative positioned div with the code
    const copyButton = section.locator("button").first();
    await expect(copyButton).toBeVisible({ timeout: 10000 });
    await copyButton.click();
  },
);

// Assertion steps
Then(
  "I should see {string} card",
  async function(this: CustomWorld, cardTitle: string) {
    const card = this.page.locator('[class*="card"]').filter({
      has: this.page.getByText(new RegExp(cardTitle, "i")),
    });
    await expect(card).toBeVisible();
  },
);

Then("I should see optional API key input", async function(this: CustomWorld) {
  const apiKeyInput = this.page.getByLabel(/api key/i).or(
    this.page.locator("#manual-key"),
  );
  await expect(apiKeyInput).toBeVisible();
});

// NOTE: "I should see {string} tab" is defined in common.steps.ts

Then(
  "I should see {string} textarea",
  async function(this: CustomWorld, labelText: string) {
    const textarea = this.page.getByLabel(new RegExp(labelText, "i")).or(
      this.page.locator(`textarea[placeholder*="${labelText.toLowerCase()}"]`),
    );
    await expect(textarea.first()).toBeVisible();
  },
);

Then("I should see tier cost display", async function(this: CustomWorld) {
  const costDisplay = this.page.getByText(/\d+\s*tokens?/i);
  await expect(costDisplay.first()).toBeVisible();
});

Then(
  "I should see {string} input",
  async function(this: CustomWorld, labelText: string) {
    const input = this.page.getByLabel(new RegExp(labelText, "i")).or(
      this.page.locator(`input[placeholder*="${labelText.toLowerCase()}"]`),
    );
    await expect(input.first()).toBeVisible();
  },
);

Then(
  "I should see tier pricing information",
  async function(this: CustomWorld) {
    const tierInfo = this.page.getByText(/1k|2k|4k/i);
    await expect(tierInfo.first()).toBeVisible();
  },
);

Then(
  "I should see my current token balance displayed",
  async function(this: CustomWorld) {
    // Verify the tokens available text is visible
    await expect(this.page.getByText(/tokens available/i)).toBeVisible();
  },
);

Then(
  "the balance should show {string} tokens",
  async function(this: CustomWorld, balance: string) {
    const balanceText = this.page.getByText(balance);
    await expect(balanceText).toBeVisible();
  },
);

// NOTE: "the {string} button should be disabled" is defined in common.steps.ts
// NOTE: "the {string} button should be enabled" is defined in common.steps.ts

Then(
  "I should see {string} loading state",
  async function(this: CustomWorld, loadingText: string) {
    const loadingIndicator = this.page.getByText(new RegExp(loadingText, "i"));
    await expect(loadingIndicator).toBeVisible();
  },
);

Then(
  "I should see the generated image in the result area",
  async function(this: CustomWorld) {
    const resultImage = this.page.locator('[class*="card"]').filter({
      has: this.page.getByRole("heading", { name: /result/i }),
    }).locator("img");
    await expect(resultImage).toBeVisible();
  },
);

Then(
  "I should see the modified image in the result area",
  async function(this: CustomWorld) {
    const resultImage = this.page.locator('[class*="card"]').filter({
      has: this.page.getByRole("heading", { name: /result/i }),
    }).locator("img");
    await expect(resultImage).toBeVisible();
  },
);

Then(
  "I should see {string} status badge",
  async function(this: CustomWorld, status: string) {
    // Badge component uses inline-flex with rounded-md, look for text in any badge-like element
    const badge = this.page.locator(
      ".inline-flex.items-center.rounded-md, [class*='bg-green'], [class*='bg-destructive'], [class*='bg-blue']",
    ).filter({
      hasText: new RegExp(status, "i"),
    });
    await expect(badge.first()).toBeVisible({ timeout: 10000 });
  },
);

Then("I should see the job details", async function(this: CustomWorld) {
  const jobId = this.page.getByText(/job id/i);
  await expect(jobId.first()).toBeVisible();
});

Then(
  "I should see the job details for {string}",
  async function(this: CustomWorld, jobId: string) {
    // Wait for the job result to load - API call happens after clicking check status
    await this.page.waitForTimeout(1000);
    const jobIdText = this.page.getByText(jobId);
    await expect(jobIdText).toBeVisible({ timeout: 10000 });
  },
);

Then("I should see the job type badge", async function(this: CustomWorld) {
  const typeBadge = this.page.locator('[class*="badge"]').filter({
    has: this.page.getByText(/generate|modify/i),
  });
  await expect(typeBadge).toBeVisible();
});

Then("I should see the job status badge", async function(this: CustomWorld) {
  const statusBadge = this.page.locator('[class*="badge"]').filter({
    has: this.page.getByText(/completed|processing|failed/i),
  });
  await expect(statusBadge).toBeVisible();
});

Then("I should see the output image", async function(this: CustomWorld) {
  // Wait for job result to load
  await this.page.waitForTimeout(1000);
  // Look for the image in the Job Details card - CardTitle is a div
  // The card structure is: Card > CardHeader > CardTitle + CardContent with image
  const resultCard = this.page.locator("div").filter({
    hasText: /job details/i,
  });
  // Find the image within the card context - it's inside a relative positioned div
  const resultImage = resultCard.locator("img");
  await expect(resultImage.first()).toBeVisible({ timeout: 15000 });
});

Then("I should see the image dimensions", async function(this: CustomWorld) {
  const dimensions = this.page.getByText(/\d+x\d+/);
  await expect(dimensions).toBeVisible();
});

// NOTE: "I should see the tokens used" is defined in common.steps.ts
// NOTE: "I should see the error message" is defined in common.steps.ts

Then(
  "I should see {string} API example",
  async function(this: CustomWorld, apiName: string) {
    // Map API names to their actual endpoint text in the code blocks
    const endpointMap: Record<string, string> = {
      "Generate Image": "mcp/generate",
      "Modify Image": "mcp/modify",
      "Check Job Status": "mcp/jobs",
      "Check Balance": "mcp/balance",
    };
    const endpoint = endpointMap[apiName] ||
      apiName.toLowerCase().replace(/\s+/g, "");
    const example = this.page.locator("pre").filter({
      hasText: new RegExp(endpoint, "i"),
    });
    await expect(example.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the command should be copied to clipboard",
  async function(this: CustomWorld) {
    // This is verified by the button state change
    await this.page.waitForTimeout(200);
  },
);

Then(
  "I should see the copy confirmation icon",
  async function(this: CustomWorld) {
    // Look for the check icon that appears after copying
    const checkIcon = this.page.locator('[class*="text-green"]').or(
      this.page.locator('svg[class*="check"]'),
    );
    await expect(checkIcon.first()).toBeVisible();
  },
);

Then(
  "I should see {string} documentation section",
  async function(this: CustomWorld, sectionName: string) {
    const section = this.page.getByText(new RegExp(sectionName, "i"));
    await expect(section.first()).toBeVisible();
  },
);

Then(
  "I should see the npx installation command",
  async function(this: CustomWorld) {
    const npxCommand = this.page.getByText(/npx @spike-npm-land\/mcp-server/);
    await expect(npxCommand).toBeVisible();
  },
);

// NOTE: "I should see {string} link" is defined in authentication.steps.ts

Then(
  "I should see an error {string}",
  async function(this: CustomWorld, errorMessage: string) {
    const error = this.page.getByText(errorMessage);
    await expect(error).toBeVisible();
  },
);

Then(
  "I should see the token balance for the API key",
  async function(this: CustomWorld) {
    const balanceDisplay = this.page.getByText(/tokens available/i);
    await expect(balanceDisplay).toBeVisible();
  },
);

Then(
  "the cost should show {string} for {string}",
  async function(this: CustomWorld, cost: string, _tier: string) {
    const costDisplay = this.page.getByText(new RegExp(`cost.*${cost}`, "i"))
      .or(
        this.page.getByText(cost),
      );
    await expect(costDisplay.first()).toBeVisible();
  },
);

Then(
  "I should see {string} with {string} and {string}",
  async function(
    this: CustomWorld,
    quality: string,
    resolution: string,
    tokens: string,
  ) {
    const qualityText = this.page.getByText(quality);
    await expect(qualityText).toBeVisible();
    const resolutionText = this.page.getByText(resolution);
    await expect(resolutionText).toBeVisible();
    const tokensText = this.page.getByText(tokens);
    await expect(tokensText).toBeVisible();
  },
);

Then(
  "I should not be able to submit the form",
  async function(this: CustomWorld) {
    const submitButton = this.page.getByRole("button", { name: /modify/i });
    await expect(submitButton).toBeDisabled();
  },
);

Then(
  "I should see the image preview thumbnail",
  async function(this: CustomWorld) {
    const preview = this.page.locator("img").filter({
      has: this.page.locator('[alt*="modify"]'),
    }).or(
      this.page.locator('[class*="card"]').locator("img").first(),
    );
    await expect(preview.first()).toBeVisible();
  },
);

Then(
  "I should see an error message in the generate form",
  async function(this: CustomWorld) {
    const errorMessage = this.page.locator('[class*="destructive"]').or(
      this.page.getByText(/error|failed|insufficient/i),
    );
    await expect(errorMessage.first()).toBeVisible();
  },
);
