import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page object for the App Workspace page (/my-apps/[codeSpace])
 * Encapsulates interactions with the chat interface, preview, and agent controls
 */
export class AppWorkspacePage {
  constructor(
    private page: Page,
    private codespaceId: string,
  ) {}

  /**
   * Get the chat input textarea element
   */
  getChatInput(): Locator {
    return this.page.getByTestId("chat-input");
  }

  /**
   * Get the agent working indicator badge
   */
  getAgentWorkingIndicator(): Locator {
    return this.page.getByTestId("agent-working");
  }

  /**
   * Get all user message bubbles
   */
  getUserMessages(): Locator {
    return this.page.getByTestId("user-message");
  }

  /**
   * Get all agent message bubbles
   */
  getAgentMessages(): Locator {
    return this.page.getByTestId("agent-message");
  }

  /**
   * Get the Start/Send button for submitting prompts
   */
  getStartButton(): Locator {
    return this.page.getByRole("button", { name: /Start|Send/i });
  }

  /**
   * Get the preview iframe element
   */
  getPreviewIframe(): Locator {
    return this.page.locator(
      `iframe[src*="testing.spike.land/live/${this.codespaceId}"]`,
    );
  }

  /**
   * Get the preview area container
   */
  getPreviewArea(): Locator {
    // The preview could be an iframe or a container with the preview content
    return this.page.locator('[data-testid="preview-area"], iframe[src*="testing.spike.land"]');
  }

  /**
   * Get the Move to Bin button
   */
  getMoveToBinButton(): Locator {
    return this.page.getByRole("button", { name: /Move to Bin/i });
  }

  /**
   * Type a message in the chat input and submit
   */
  async sendMessage(message: string): Promise<void> {
    const input = this.getChatInput();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(message);
    const sendButton = this.getStartButton();
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();
  }

  /**
   * Wait for the agent to start working (agent working indicator appears)
   */
  async waitForAgentWorking(timeoutMs = 15000): Promise<void> {
    await expect(this.getAgentWorkingIndicator()).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Wait for the agent to finish (agent working indicator disappears)
   */
  async waitForAgentFinished(timeoutMs = 120000): Promise<void> {
    // First wait for agent to start if not already started
    try {
      await expect(this.getAgentWorkingIndicator()).toBeVisible({ timeout: 5000 });
    } catch {
      // Agent may have already finished or not started
    }
    // Then wait for it to disappear
    await expect(this.getAgentWorkingIndicator()).not.toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Wait for an agent response message to appear
   */
  async waitForAgentResponse(timeoutMs = 120000): Promise<void> {
    await expect(this.getAgentMessages().first()).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Check if the agent is currently working
   */
  async isAgentWorking(): Promise<boolean> {
    return this.getAgentWorkingIndicator().isVisible();
  }

  /**
   * Wait for the chat input to be visible and ready
   */
  async waitForChatReady(timeoutMs = 30000): Promise<void> {
    await expect(this.getChatInput()).toBeVisible({ timeout: timeoutMs });
    await expect(this.getStartButton()).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Wait for the preview iframe to load
   */
  async waitForPreviewLoaded(timeoutMs = 30000): Promise<void> {
    const iframe = this.getPreviewIframe();
    await expect(iframe).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Move the current app to bin
   */
  async moveToBin(): Promise<void> {
    // Click the Move to Bin button
    const moveToBinButton = this.getMoveToBinButton();
    await expect(moveToBinButton).toBeVisible();
    await moveToBinButton.click();

    // Confirm in the alert dialog
    const confirmButton = this.page
      .locator('[role="alertdialog"]')
      .getByRole("button", { name: /Move to Bin/i });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for navigation or confirmation
    await this.page.waitForURL(/\/my-apps$/, { timeout: 10000 });
  }

  /**
   * Verify that we're on the workspace page
   */
  async verifyOnWorkspacePage(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/my-apps/${this.codespaceId}`));
  }

  /**
   * Get the count of agent messages
   */
  async getAgentMessageCount(): Promise<number> {
    return this.getAgentMessages().count();
  }

  /**
   * Get the text content of the last agent message
   */
  async getLastAgentMessageText(): Promise<string | null> {
    const messages = this.getAgentMessages();
    const count = await messages.count();
    if (count === 0) return null;
    return messages.nth(count - 1).textContent();
  }

  /**
   * Check if the streaming cursor indicator is visible
   */
  getStreamingIndicator(): Locator {
    // Look for common streaming indicators (blinking cursor, typing indicator, etc.)
    return this.page.locator(
      '[data-testid="streaming-cursor"], .typing-indicator, .streaming-indicator',
    );
  }

  /**
   * Navigate directly to this workspace
   */
  async navigate(): Promise<void> {
    await this.page.goto(`/my-apps/${this.codespaceId}`);
    await this.page.waitForLoadState("networkidle");
  }
}
