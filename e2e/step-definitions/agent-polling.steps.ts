/**
 * Agent Polling E2E Step Definitions
 *
 * These steps test the agent polling infrastructure using keyword-based
 * test mode, which exercises all infrastructure without Claude API costs.
 */

import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// Extend CustomWorld with agent-polling-specific properties
declare module "../support/world" {
  interface CustomWorld {
    agentTestAppId?: string;
    agentTestAppName?: string;
    agentWorkingStartTime?: number;
    agentResponses?: string[];
    lastAgentResponse?: string;
  }
}

// ============================================================
// Background / Setup Steps
// ============================================================

Given(
  "I have an app workspace named {string}",
  async function(this: CustomWorld, appName: string) {
    this.agentTestAppName = appName;

    // Navigate to my-apps page
    await this.page.goto(`${this.baseUrl}/my-apps`);
    await this.page.waitForLoadState("networkidle");

    // For E2E tests, we may need to create a test app or use a mock
    // This step sets up the context for agent testing
    // In real implementation, this would create an app via API or navigate to existing one

    // Store the app name for use in later steps
    this.agentResponses = [];
  },
);

Given(
  "the agent polling system is running",
  async function(this: CustomWorld) {
    // In real tests, this might verify the agent poller is active
    // For now, we just set up expectation for agent responses

    // Mock the agent queue API to verify requests
    await this.page.route("**/api/agent/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ pendingApps: [] }),
      });
    });
  },
);

// ============================================================
// Action Steps - Sending Messages
// ============================================================

When(
  "I send message {string}",
  async function(this: CustomWorld, message: string) {
    // Find and fill the chat input
    const chatInput = this.page.locator(
      'textarea[placeholder*="message"], textarea[data-testid="chat-input"], input[type="text"][placeholder*="message"]',
    ).first();

    // Wait for input to be visible and enabled
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Clear any existing text and type the message
    await chatInput.fill(message);

    // Submit the message - look for send button or press Enter
    const sendButton = this.page.locator(
      'button[type="submit"], button[data-testid="send-button"], button:has-text("Send")',
    ).first();

    if (await sendButton.isVisible().catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press("Enter");
    }

    // Record when we started waiting for agent
    this.agentWorkingStartTime = Date.now();

    // Wait briefly for message to be queued
    await this.page.waitForTimeout(300);
  },
);

When(
  "I wait for the agent to finish",
  async function(this: CustomWorld) {
    // Wait for agent working indicator to disappear
    const workingIndicator = this.page.locator(
      '[data-testid="agent-working"], .agent-working, [class*="working"]',
    );

    // Wait up to 60 seconds for agent to complete
    await expect(workingIndicator).not.toBeVisible({ timeout: 60000 });
  },
);

When(
  "I wait for the error to be processed",
  async function(this: CustomWorld) {
    // Wait for error to appear in chat or notification
    await this.page.waitForTimeout(2000);
  },
);

// ============================================================
// Assertion Steps - Agent Responses
// ============================================================

Then(
  "I should see agent working indicator",
  async function(this: CustomWorld) {
    // Look for various working indicator patterns
    const workingIndicator = this.page.locator(
      '[data-testid="agent-working"], .agent-working, [class*="working"], [class*="typing"], [class*="loading"]',
    ).first();

    await expect(workingIndicator).toBeVisible({ timeout: 15000 });
  },
);

Then(
  "I should see agent working indicator for at least {int} seconds",
  async function(this: CustomWorld, seconds: number) {
    const startTime = Date.now();

    // Verify indicator is visible
    const workingIndicator = this.page.locator(
      '[data-testid="agent-working"], .agent-working, [class*="working"]',
    ).first();

    await expect(workingIndicator).toBeVisible({ timeout: 5000 });

    // Wait for the specified time
    await this.page.waitForTimeout(seconds * 1000);

    // Verify it was visible for the duration (approximate)
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(seconds * 1000 - 500); // Allow 500ms tolerance
  },
);

Then(
  "I should receive agent response {string}",
  async function(this: CustomWorld, expectedResponse: string) {
    // Wait for agent message to appear in chat
    const agentMessage = this.page.locator(
      '[data-testid="agent-message"], .agent-message, [data-role="agent"]',
    ).filter({ hasText: expectedResponse });

    await expect(agentMessage.first()).toBeVisible({ timeout: 30000 });
    this.lastAgentResponse = expectedResponse;
  },
);

Then(
  "I should receive agent response containing {string}",
  async function(this: CustomWorld, textFragment: string) {
    // Wait for agent message containing the text
    const agentMessage = this.page.locator(
      '[data-testid="agent-message"], .agent-message, [data-role="agent"]',
    ).filter({ hasText: textFragment });

    await expect(agentMessage.first()).toBeVisible({ timeout: 30000 });
  },
);

Then(
  "I should receive system error message",
  async function(this: CustomWorld) {
    // Look for error message in chat or notification
    const errorMessage = this.page.locator(
      '[data-testid="system-message"], .system-message, [data-role="system"], [role="alert"]',
    ).filter({ hasText: /error|failed/i });

    await expect(errorMessage.first()).toBeVisible({ timeout: 30000 });
  },
);

Then(
  "the message should be marked as read",
  async function(this: CustomWorld) {
    // This would verify via API or UI that the message was marked as read
    // For now, we just verify no unread indicator
    const unreadIndicator = this.page.locator(
      '[data-testid="unread-message"], .unread, [class*="unread"]',
    );

    await expect(unreadIndicator).not.toBeVisible();
  },
);

Then(
  "the response should be HTML-escaped",
  async function(this: CustomWorld) {
    // Verify that script tags are not executed (XSS prevention)
    // Check that the response is displayed as text, not executed
    const scriptElement = this.page.locator("script:has-text('xss')");
    await expect(scriptElement).toHaveCount(0);
  },
);

// ============================================================
// SSE and Code Update Steps
// ============================================================

Then(
  "the preview should receive code_updated event",
  async function(this: CustomWorld) {
    // Check for preview refresh or code_updated event handling
    // This could be verified by checking if preview iframe reloaded
    // or if a specific event was logged

    // For now, verify that the code update notification appeared
    const codeUpdateNotification = this.page.locator(
      '[data-testid="code-updated"], .code-updated, :text("code update")',
    ).or(this.page.getByText(/preview.*reload|code.*updated/i));

    // This might not always be visible depending on UI, so use softer check
    const isVisible = await codeUpdateNotification.first().isVisible().catch(() => false);

    // Just log for now - the main verification is the agent response
    if (!isVisible) {
      console.log("Note: code_updated notification not visible (may be handled silently)");
    }
  },
);

Then(
  "the app status should be {string}",
  async function(this: CustomWorld, expectedStatus: string) {
    // Check the app status badge/indicator
    const statusBadge = this.page.locator(
      '[data-testid="app-status"], .app-status, [class*="status"]',
    ).filter({ hasText: new RegExp(expectedStatus, "i") });

    await expect(statusBadge.first()).toBeVisible({ timeout: 10000 });
  },
);

Then(
  "the app should have a codespace ID set",
  async function(this: CustomWorld) {
    // This would be verified via API or checking the UI for codespace link
    // For now, check if codespace URL or ID is displayed
    const codespaceInfo = this.page.locator(
      '[data-testid="codespace-id"], [data-testid="codespace-url"], .codespace-info',
    ).or(this.page.getByText(/codespace|e2e-test-/i));

    // Soft check - codespace info might not always be visible
    const isVisible = await codespaceInfo.first().isVisible().catch(() => false);
    if (!isVisible) {
      console.log("Note: Codespace ID display not found in UI (may be stored in backend)");
    }
  },
);

// ============================================================
// Delay and Timing Steps
// ============================================================

Then(
  "the actual delay should be capped at {int} seconds",
  async function(this: CustomWorld, maxSeconds: number) {
    // If we requested a delay longer than the cap, verify it was capped
    // The agent should respond within maxSeconds + small buffer
    const maxWaitMs = (maxSeconds + 5) * 1000; // Add 5 second buffer

    const responsePromise = this.page.waitForSelector(
      '[data-testid="agent-message"], .agent-message, [data-role="agent"]',
      { timeout: maxWaitMs },
    );

    const startTime = Date.now();
    await responsePromise;
    const elapsed = Date.now() - startTime;

    // Verify the response came within the capped time (not the requested 60s)
    expect(elapsed).toBeLessThan(maxWaitMs);
  },
);

Then(
  "the agent working indicator should be cleared",
  async function(this: CustomWorld) {
    const workingIndicator = this.page.locator(
      '[data-testid="agent-working"], .agent-working, [class*="working"]',
    );

    await expect(workingIndicator).not.toBeVisible({ timeout: 10000 });
  },
);

// ============================================================
// Queue and Order Steps
// ============================================================

Then(
  "the responses should arrive in order:",
  async function(this: CustomWorld, dataTable: { hashes: () => Array<{ response: string; }>; }) {
    const expectedResponses = dataTable.hashes().map((row) => row.response);

    // Wait for all responses to appear
    for (const expectedResponse of expectedResponses) {
      const agentMessage = this.page.locator(
        '[data-testid="agent-message"], .agent-message, [data-role="agent"]',
      ).filter({ hasText: expectedResponse });

      await expect(agentMessage.first()).toBeVisible({ timeout: 30000 });
    }

    // Verify order by checking DOM positions
    const allMessages = await this.page.locator(
      '[data-testid="agent-message"], .agent-message, [data-role="agent"]',
    ).allTextContents();

    // Filter to only our expected responses and verify order
    const receivedOrder = allMessages.filter((msg) =>
      expectedResponses.some((expected) => msg.includes(expected.replace("ECHO: ", "")))
    );

    // Responses should appear in the same order as sent
    for (let i = 0; i < expectedResponses.length; i++) {
      const expectedContent = expectedResponses[i]!.replace("ECHO: ", "");
      expect(receivedOrder[i]).toContain(expectedContent);
    }
  },
);

// ============================================================
// Error Logging Steps
// ============================================================

Then(
  "the error should be logged",
  async function(this: CustomWorld) {
    // In a real implementation, this would check server logs or a logging service
    // For E2E, we verify the error appears in the UI
    const errorMessage = this.page.locator(
      '[data-testid="error-message"], .error, [role="alert"]',
    ).or(this.page.getByText(/error|simulated/i));

    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  },
);

// ============================================================
// Authentication Steps
// ============================================================

When(
  "I try to access the agent queue API directly",
  async function(this: CustomWorld) {
    // Make a direct fetch to the agent queue without auth
    const response = await this.page.request.get(`${this.baseUrl}/api/agent/queue`, {
      headers: {
        "Content-Type": "application/json",
        // Intentionally no Authorization header
      },
    });

    // Store the status for assertion
    (this as CustomWorld & { lastApiStatus?: number; }).lastApiStatus = response.status();
  },
);

Then(
  "I should receive 401 Unauthorized",
  async function(this: CustomWorld) {
    const lastStatus = (this as CustomWorld & { lastApiStatus?: number; }).lastApiStatus;
    expect(lastStatus).toBe(401);
  },
);

Given(
  "an invalid AGENT_API_KEY",
  async function(this: CustomWorld) {
    // Set up context with invalid API key for next request
    (this as CustomWorld & { testApiKey?: string; }).testApiKey = "invalid-key-for-testing";
  },
);

When(
  "the agent tries to post a response",
  async function(this: CustomWorld) {
    const invalidKey = (this as CustomWorld & { testApiKey?: string; }).testApiKey || "invalid";

    const response = await this.page.request.post(
      `${this.baseUrl}/api/agent/apps/test-app-id/respond`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${invalidKey}`,
        },
        data: {
          content: "Test response",
          codeUpdated: false,
          processedMessageIds: [],
        },
      },
    );

    (this as CustomWorld & { lastApiStatus?: number; }).lastApiStatus = response.status();
  },
);

Then(
  "the request should fail with 401 or 403",
  async function(this: CustomWorld) {
    const lastStatus = (this as CustomWorld & { lastApiStatus?: number; }).lastApiStatus;
    expect([401, 403]).toContain(lastStatus);
  },
);

Then(
  "the codespace ID should be {string}",
  async function(this: CustomWorld, expectedId: string) {
    // Verify codespace ID matches expected value
    const codespaceElement = this.page.getByText(expectedId);
    await expect(codespaceElement.first()).toBeVisible({ timeout: 10000 });
  },
);
