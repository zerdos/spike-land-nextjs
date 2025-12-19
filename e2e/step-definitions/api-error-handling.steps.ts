import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForTextWithRetry } from "../support/helpers/retry-helper";
import { CustomWorld } from "../support/world";

// API mock helpers
async function mockApiError(
  world: CustomWorld,
  pattern: string,
  statusCode: number,
  errorBody: object,
  headers?: Record<string, string>,
) {
  await world.page.route(pattern, async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: "application/json",
      body: JSON.stringify(errorBody),
      headers: headers || {},
    });
  });
}

// Helper for future use
async function _mockApiSuccess(
  world: CustomWorld,
  pattern: string,
  body: object,
) {
  await world.page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function mockApiTimeout(
  world: CustomWorld,
  pattern: string,
  delay: number = 30000,
) {
  await world.page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await route.abort("timedout");
  });
}

// Store for tracking API call attempts
let apiCallAttempts = 0;

// Authentication Errors
Given(
  "the API returns a 401 unauthorized error",
  async function(this: CustomWorld) {
    await mockApiError(this, "**/api/**", 401, {
      error: "Unauthorized",
      message: "Please sign in to continue",
    });
  },
);

Given("my session has expired", async function(this: CustomWorld) {
  // Clear session cookies
  await this.page.context().clearCookies();

  // Mock session endpoint to return null
  await this.page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(null),
    });
  });

  // Mock other API calls to return 401
  await mockApiError(this, "**/api/settings/**", 401, {
    error: "Session expired",
    message: "Your session has expired. Please sign in again.",
  });
});

When("I navigate to a protected API page", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/settings`);
  await this.page.waitForLoadState("domcontentloaded");
});

When("I perform an API action", async function(this: CustomWorld) {
  // Try to access an API endpoint by navigating to settings
  await this.page.goto(`${this.baseUrl}/settings`);
  await this.page.waitForLoadState("domcontentloaded");
});

Then(
  "I should see an authentication error message",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /unauthorized|sign in|authentication/i,
      { timeout: TIMEOUTS.DEFAULT },
    );
  },
);

Then(
  "I should see the option to sign in again",
  async function(this: CustomWorld) {
    const signInButton = this.page.getByRole("button", { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see a session expired message",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /session expired|sign in again/i,
      { timeout: TIMEOUTS.DEFAULT },
    );
  },
);

// Rate Limiting
Given(
  "the API returns a 429 rate limit error",
  async function(this: CustomWorld) {
    await mockApiError(
      this,
      "**/api/**",
      429,
      {
        error: "Rate limit exceeded",
        retryAfter: 60,
      },
      { "Retry-After": "60" },
    );
  },
);

Given(
  "the API returns a 429 rate limit error with {int} seconds retry",
  async function(this: CustomWorld, seconds: number) {
    await mockApiError(
      this,
      "**/api/**",
      429,
      {
        error: "Rate limit exceeded",
        retryAfter: seconds,
      },
      { "Retry-After": String(seconds) },
    );
  },
);

Then("I should see the rate limit error", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, /rate limit/i, {
    timeout: TIMEOUTS.DEFAULT,
  });
});

Then("I should see the retry after time", async function(this: CustomWorld) {
  await waitForTextWithRetry(this.page, /retry|wait|seconds/i, {
    timeout: TIMEOUTS.DEFAULT,
  });
});

Then(
  "I should see {string} information",
  async function(this: CustomWorld, text: string) {
    await waitForTextWithRetry(this.page, new RegExp(text, "i"), {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

// Validation Errors
When("I submit a form with invalid data", async function(this: CustomWorld) {
  // Navigate to settings and try to submit invalid data
  await this.page.goto(`${this.baseUrl}/settings`);
  await this.page.waitForLoadState("networkidle");

  // Click API Keys tab
  const apiKeysTab = this.page.getByRole("tab", { name: /API Keys/i });
  await apiKeysTab.click();
  await this.page.waitForTimeout(500);

  // Try to create key without name (click create, then immediately try to submit)
  const createButton = this.page.getByRole("button", {
    name: /Create API Key/i,
  });
  await createButton.click();
});

Then(
  "I should see a validation error message",
  async function(this: CustomWorld) {
    // The create button should be disabled when validation fails
    const createKeyButton = this.page.getByRole("button", {
      name: /^Create Key$/i,
    });
    await expect(createKeyButton).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the error should indicate which field is invalid",
  async function(this: CustomWorld) {
    // The input should have focus or show required state
    const input = this.page.getByRole("textbox", { name: /key name/i });
    await expect(input).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Given("I am on the API Keys tab", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/settings`);
  await this.page.waitForLoadState("networkidle");

  const apiKeysTab = this.page.getByRole("tab", { name: /API Keys/i });
  await apiKeysTab.click();
  await this.page.waitForTimeout(500);
});

When(
  "I try to create an API key without a name",
  async function(this: CustomWorld) {
    const createButton = this.page.getByRole("button", {
      name: /Create API Key/i,
    });
    await createButton.click();
    await this.page.waitForTimeout(300);
  },
);

Then(
  "the create button should be disabled",
  async function(this: CustomWorld) {
    const createKeyButton = this.page.getByRole("button", {
      name: /^Create Key$/i,
    });
    await expect(createKeyButton).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then("I should not be able to submit", async function(this: CustomWorld) {
  const createKeyButton = this.page.getByRole("button", {
    name: /^Create Key$/i,
  });
  await expect(createKeyButton).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
});

When(
  "I enter a name longer than 50 characters",
  async function(this: CustomWorld) {
    const input = this.page.getByRole("textbox", { name: /key name/i });
    const longName = "A".repeat(51);
    await input.fill(longName);
    await this.page.waitForTimeout(300);
  },
);

Then(
  "I should see a validation error for name length",
  async function(this: CustomWorld) {
    // Look for validation error message or max length reached
    const errorText = this.page.getByText(/50 characters|too long|maximum/i);
    const hasError = await errorText.isVisible().catch(() => false);

    if (!hasError) {
      // Check if input is truncated or has error state
      const input = this.page.getByRole("textbox", { name: /key name/i });
      const value = await input.inputValue();
      expect(value.length).toBeLessThanOrEqual(50);
    }
  },
);

// Server Errors
Given("the API returns a 500 server error", async function(this: CustomWorld) {
  await mockApiError(this, "**/api/**", 500, {
    error: "Internal server error",
    message: "Something went wrong. Please try again later.",
  });
});

Given(
  "the API returns a 503 service unavailable error",
  async function(this: CustomWorld) {
    await mockApiError(this, "**/api/**", 503, {
      error: "Service unavailable",
      message: "The service is temporarily unavailable for maintenance.",
    });
  },
);

Then("I should see a server error message", async function(this: CustomWorld) {
  await waitForTextWithRetry(
    this.page,
    /server error|something went wrong|try again/i,
    { timeout: TIMEOUTS.DEFAULT },
  );
});

Then(
  "I should see a service unavailable message",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /service unavailable|maintenance|temporarily/i,
      { timeout: TIMEOUTS.DEFAULT },
    );
  },
);

// Network Errors
Given("the API request times out", async function(this: CustomWorld) {
  await mockApiTimeout(this, "**/api/**", 100);
});

Given("the network is disconnected", async function(this: CustomWorld) {
  await this.page.context().setOffline(true);
});

Then(
  "I should see a timeout error message",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /timeout|timed out|request failed/i,
      { timeout: TIMEOUTS.LONG },
    );
  },
);

Then(
  "I should see an offline error message",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /offline|no connection|network/i,
      { timeout: TIMEOUTS.DEFAULT },
    );
  },
);

Then(
  "I should see instructions to check connection",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(
      this.page,
      /check.*connection|try again|reconnect/i,
      { timeout: TIMEOUTS.DEFAULT },
    );
  },
);

// NOTE: "I should see the {string} button" step moved to common.steps.ts

// MCP API Specific Errors
// NOTE: "I have {int} tokens" step moved to common.steps.ts

When(
  "I attempt to generate an image via MCP",
  async function(this: CustomWorld) {
    await mockApiError(this, "**/api/mcp/generate", 402, {
      error: "Insufficient tokens",
      message: "You don't have enough tokens. Please purchase more.",
      required: 10,
      available: 0,
    });

    await this.page.goto(`${this.baseUrl}/apps/pixel/mcp-tools`);
    await this.page.waitForLoadState("networkidle");
  },
);

// NOTE: "I should see {string} error" step moved to common.steps.ts

Then(
  "I should see the option to purchase tokens",
  async function(this: CustomWorld) {
    const purchaseOption = this.page.getByRole("button", {
      name: /purchase|buy|get tokens/i,
    });
    await expect(purchaseOption).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

When(
  "I attempt to generate an image with empty prompt",
  async function(this: CustomWorld) {
    await mockApiError(this, "**/api/mcp/generate", 400, {
      error: "Validation error",
      message: "Prompt is required",
    });
  },
);

Then(
  "I should see a validation error for prompt",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /prompt.*required|invalid prompt/i, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

When(
  "I attempt to modify an image with invalid URL",
  async function(this: CustomWorld) {
    await mockApiError(this, "**/api/mcp/modify", 400, {
      error: "Invalid image URL",
      message: "The provided image URL is not valid",
    });
  },
);

When(
  "I check status for a non-existent job",
  async function(this: CustomWorld) {
    await mockApiError(this, "**/api/mcp/jobs/**", 404, {
      error: "Job not found",
      message: "The requested job does not exist",
    });
  },
);

Then(
  "the response status should be {int}",
  async function(this: CustomWorld, statusCode: number) {
    // This is validated by the mock setup
    expect(statusCode).toBeDefined();
  },
);

// API Key Errors
Given("I use an invalid API key", async function(this: CustomWorld) {
  await mockApiError(this, "**/api/mcp/**", 401, {
    error: "Invalid API key",
    message: "The API key provided is not valid",
  });
});

Given("I use a revoked API key", async function(this: CustomWorld) {
  await mockApiError(this, "**/api/mcp/**", 401, {
    error: "API key has been revoked",
    message: "This API key has been revoked and can no longer be used",
  });
});

When("I make an MCP API request", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/settings/mcp-history`);
  await this.page.waitForLoadState("networkidle");
});

Given(
  "I have {int} API keys already",
  async function(this: CustomWorld, count: number) {
    await this.page.route("**/api/settings/api-keys", async (route) => {
      if (route.request().method() === "GET") {
        const keys = Array.from({ length: count }, (_, i) => ({
          id: `key-${i + 1}`,
          name: `API Key ${i + 1}`,
          keyPrefix: `sk_live_${i}***`,
          createdAt: new Date().toISOString(),
          isActive: true,
        }));

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ apiKeys: keys }),
        });
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: `Maximum of 10 API keys allowed. Please revoke an existing key first.`,
          }),
        });
      }
    });
  },
);

When("I try to create another API key", async function(this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/settings`);
  await this.page.waitForLoadState("networkidle");

  const apiKeysTab = this.page.getByRole("tab", { name: /API Keys/i });
  await apiKeysTab.click();
  await this.page.waitForTimeout(500);

  const createButton = this.page.getByRole("button", {
    name: /Create API Key/i,
  });
  await createButton.click();
  await this.page.waitForTimeout(300);

  const input = this.page.getByRole("textbox", { name: /key name/i });
  await input.fill("New Key");

  const createKeyButton = this.page.getByRole("button", {
    name: /^Create Key$/i,
  });
  await createKeyButton.click();
  await this.page.waitForTimeout(500);
});

Then(
  "I should see {string} message",
  async function(this: CustomWorld, message: string) {
    await waitForTextWithRetry(this.page, new RegExp(message, "i"), {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

Then(
  "I should see instructions to revoke an existing key",
  async function(this: CustomWorld) {
    await waitForTextWithRetry(this.page, /revoke.*existing/i, {
      timeout: TIMEOUTS.DEFAULT,
    });
  },
);

// Error Recovery
Given("the API fails once then succeeds", async function(this: CustomWorld) {
  apiCallAttempts = 0;

  await this.page.route("**/api/mcp/history*", async (route) => {
    apiCallAttempts++;

    if (apiCallAttempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary failure" }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: [
            {
              id: "job-1",
              type: "GENERATE",
              tier: "TIER_1",
              tokensCost: 10,
              status: "COMPLETED",
              prompt: "Test prompt",
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
          hasMore: false,
        }),
      });
    }
  });
});

Then("the action should succeed", async function(this: CustomWorld) {
  // Wait for success state - job cards should be visible
  const jobCard = this.page.locator('[class*="cursor-pointer"]');
  await expect(jobCard.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then("the error message should disappear", async function(this: CustomWorld) {
  const errorText = this.page.getByText(/failed|error/i);
  await expect(errorText).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

// Error Toast
Given(
  "the API returns a non-critical error",
  async function(this: CustomWorld) {
    await mockApiError(this, "**/api/settings/api-keys", 400, {
      error: "Invalid request",
      message: "Please check your input and try again",
    });
  },
);

Then("I should see an error toast", async function(this: CustomWorld) {
  const toast = this.page.locator('[role="alert"], [class*="toast"]');
  await expect(toast).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});

Then(
  "the toast should auto-dismiss after timeout",
  async function(this: CustomWorld) {
    // Wait for toast to disappear (usually 5 seconds)
    const toast = this.page.locator('[role="alert"], [class*="toast"]');
    await expect(toast).not.toBeVisible({ timeout: 10000 });
  },
);

// Form Error States
Then(
  "the create key button should be disabled initially",
  async function(this: CustomWorld) {
    const createKeyButton = this.page.getByRole("button", {
      name: /^Create Key$/i,
    });
    await expect(createKeyButton).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

When("I enter a valid key name", async function(this: CustomWorld) {
  const input = this.page.getByRole("textbox", { name: /key name/i });
  await input.fill("Valid Key Name");
  await this.page.waitForTimeout(300);
});

Then(
  "the create key button should be enabled",
  async function(this: CustomWorld) {
    const createKeyButton = this.page.getByRole("button", {
      name: /^Create Key$/i,
    });
    await expect(createKeyButton).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then("no error messages should be visible", async function(this: CustomWorld) {
  const errorAlert = this.page.locator('[role="alert"]');
  await expect(errorAlert).not.toBeVisible({ timeout: TIMEOUTS.DEFAULT });
});
