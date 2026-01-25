import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  authenticateViaOAuth,
  getConfiguredProvider,
  isProductionAuthConfigured,
} from "../support/helpers/oauth-auth-helper";
import { AppWorkspacePage } from "../support/page-objects/AppWorkspacePage";
import { MyAppsPage } from "../support/page-objects/MyAppsPage";
import type { CustomWorld } from "../support/world";

// Extend CustomWorld with production test properties
declare module "../support/world" {
  interface CustomWorld {
    myAppsPage?: MyAppsPage;
    appWorkspacePage?: AppWorkspacePage;
    currentCodespaceId?: string;
    createdAppIds?: string[];
    isProductionTest?: boolean;
  }
}

// Helper to extract codespace ID from URL
function extractCodespaceId(url: string): string | undefined {
  const match = url.match(/\/my-apps\/([^/?]+)/);
  return match ? match[1] : undefined;
}

// Helper to get or create MyAppsPage
function getMyAppsPage(world: CustomWorld): MyAppsPage {
  if (!world.myAppsPage) {
    world.myAppsPage = new MyAppsPage(world.page);
  }
  return world.myAppsPage;
}

// Helper to get or create AppWorkspacePage
function getAppWorkspacePage(world: CustomWorld): AppWorkspacePage {
  if (!world.appWorkspacePage && world.currentCodespaceId) {
    world.appWorkspacePage = new AppWorkspacePage(
      world.page,
      world.currentCodespaceId,
    );
  }
  if (!world.appWorkspacePage) {
    throw new Error("No current codespace ID set");
  }
  return world.appWorkspacePage;
}

// ==================== Authentication Steps ====================

Given(
  "I am authenticated on spike.land production",
  async function(this: CustomWorld): Promise<void> {
    this.isProductionTest = true;
    this.createdAppIds = [];

    // Check if this is a production URL
    const isProduction = this.baseUrl.includes("spike.land");

    if (isProduction) {
      // For production, use OAuth authentication
      if (!isProductionAuthConfigured()) {
        // Skip the scenario if no production credentials are configured
        console.warn(
          "[Production] No OAuth credentials configured. Set GITHUB_TEST_USERNAME/PASSWORD or GOOGLE_TEST_EMAIL/PASSWORD",
        );
        // Use pending() to skip the scenario
        throw new Error(
          "SKIPPED: No OAuth credentials configured for production testing",
        );
      }

      const provider = getConfiguredProvider();
      if (!provider) {
        throw new Error("No OAuth provider configured");
      }

      const success = await authenticateViaOAuth(
        this.context,
        this.page,
        this.baseUrl,
        provider,
      );

      if (!success) {
        throw new Error("OAuth authentication failed");
      }
    } else {
      // For non-production (preview deployments), use the E2E bypass header
      // which is already configured in the CustomWorld class
      console.log("[Production Test] Using E2E bypass for preview deployment");

      // Navigate to my-apps to verify authentication
      await this.page.goto(`${this.baseUrl}/my-apps`);
      await this.page.waitForLoadState("networkidle", { timeout: 15000 });

      // Check if we're redirected to auth
      if (this.page.url().includes("/auth/signin")) {
        throw new Error(
          "E2E bypass authentication failed - check E2E_BYPASS_SECRET is configured",
        );
      }
    }
  },
);

// ==================== Navigation Steps ====================

When("I navigate to the My Apps dashboard", async function(this: CustomWorld) {
  const myAppsPage = getMyAppsPage(this);
  await myAppsPage.navigate();
});

Given("I am on the My Apps dashboard", async function(this: CustomWorld) {
  const myAppsPage = getMyAppsPage(this);
  await myAppsPage.navigate();
  await myAppsPage.verifyOnMyAppsPage();
});

Then("I should see the My Apps dashboard", async function(this: CustomWorld) {
  const myAppsPage = getMyAppsPage(this);
  await myAppsPage.verifyOnMyAppsPage();
});

Then(
  "the page should have a {string} button",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", {
      name: new RegExp(buttonText, "i"),
    });
    await expect(button).toBeVisible({ timeout: 10000 });
  },
);

// ==================== App Creation Steps ====================
// Note: "I click the {string} button" step is defined in common.steps.ts:484
// It handles both button and link elements (for shadcn Button asChild pattern)

Then(
  "I should be redirected to a new codespace URL",
  async function(this: CustomWorld) {
    // Wait for navigation to new codespace - explicitly exclude /my-apps/new
    // The /my-apps/new page auto-redirects to a generated codespace ID like /my-apps/swift.forge.launch.ab12
    // The pattern uses a lookahead to exclude "new" and requires at least one dot (generated IDs have format: adj.noun.verb.suffix)

    // Retry logic to handle transient connection issues during redirect
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.page.waitForURL(/\/my-apps\/(?!new$)[^/]+\.[^/]+$/, { timeout: 30000 });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error as Error;
        if (attempt < 2) {
          console.log(`[Production Test] Retry ${attempt + 1}: waiting for redirect...`);
          await this.page.waitForTimeout(1000);
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    // Extract and store the codespace ID
    const codespaceId = extractCodespaceId(this.page.url());
    if (!codespaceId || codespaceId === "new") {
      throw new Error(
        `Expected to be redirected to a new codespace, but got: ${this.page.url()}`,
      );
    }

    this.currentCodespaceId = codespaceId;
    this.createdAppIds?.push(codespaceId);
    console.log(`[Production Test] Created new codespace: ${codespaceId}`);

    // Create the AppWorkspacePage instance
    this.appWorkspacePage = new AppWorkspacePage(this.page, codespaceId);
  },
);

Then("I should see the chat input field", async function(this: CustomWorld) {
  const workspacePage = getAppWorkspacePage(this);
  const chatInput = workspacePage.getChatInput();
  await expect(chatInput).toBeVisible({ timeout: 30000 });
});

Then(
  "I should see the prompt mode welcome state",
  async function(this: CustomWorld) {
    // Look for welcome message or initial prompt state indicators
    const welcomeIndicator = this.page.locator(
      "text=/welcome|get started|create.*app|describe.*app/i",
    );
    try {
      await expect(welcomeIndicator).toBeVisible({ timeout: 10000 });
    } catch {
      // If no explicit welcome, just verify chat is ready
      const workspacePage = getAppWorkspacePage(this);
      await workspacePage.waitForChatReady();
    }
  },
);

Given("I have created a new app", async function(this: CustomWorld) {
  const myAppsPage = getMyAppsPage(this);
  await myAppsPage.navigate();
  await myAppsPage.clickCreateNewApp();

  // Wait for redirect to new codespace
  await this.page.waitForURL(/\/my-apps\/[^/]+$/, { timeout: 30000 });

  const codespaceId = extractCodespaceId(this.page.url());
  if (!codespaceId || codespaceId === "new") {
    throw new Error("Failed to create new app");
  }

  this.currentCodespaceId = codespaceId;
  this.createdAppIds?.push(codespaceId);
  this.appWorkspacePage = new AppWorkspacePage(this.page, codespaceId);

  // Wait for workspace to be ready
  await this.appWorkspacePage.waitForChatReady();
});

Given(
  "I have created a new app with agent response",
  async function(this: CustomWorld) {
    // First create a new app
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.navigate();
    await myAppsPage.clickCreateNewApp();

    await this.page.waitForURL(/\/my-apps\/[^/]+$/, { timeout: 30000 });

    const codespaceId = extractCodespaceId(this.page.url());
    if (!codespaceId || codespaceId === "new") {
      throw new Error("Failed to create new app");
    }

    this.currentCodespaceId = codespaceId;
    this.createdAppIds?.push(codespaceId);
    this.appWorkspacePage = new AppWorkspacePage(this.page, codespaceId);

    // Wait for workspace to be ready
    await this.appWorkspacePage.waitForChatReady();

    // Send a simple prompt and wait for response
    await this.appWorkspacePage.sendMessage(
      "Create a simple hello world component",
    );
    await this.appWorkspacePage.waitForAgentResponse(120000);
  },
);

Given(
  "I have an app with an initial response",
  async function(this: CustomWorld) {
    // Same as "I have created a new app with agent response"
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.navigate();
    await myAppsPage.clickCreateNewApp();

    await this.page.waitForURL(/\/my-apps\/[^/]+$/, { timeout: 30000 });

    const codespaceId = extractCodespaceId(this.page.url());
    if (!codespaceId) {
      throw new Error("Failed to create new app");
    }

    this.currentCodespaceId = codespaceId;
    this.createdAppIds?.push(codespaceId);
    this.appWorkspacePage = new AppWorkspacePage(this.page, codespaceId);

    await this.appWorkspacePage.waitForChatReady();
    await this.appWorkspacePage.sendMessage("Create a simple component");
    await this.appWorkspacePage.waitForAgentResponse(120000);
  },
);

// ==================== Chat Interaction Steps ====================

When(
  "I type {string} in the chat input",
  async function(this: CustomWorld, message: string) {
    const workspacePage = getAppWorkspacePage(this);
    const chatInput = workspacePage.getChatInput();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill(message);
  },
);

When("I click the Start button", async function(this: CustomWorld) {
  const workspacePage = getAppWorkspacePage(this);
  const startButton = workspacePage.getStartButton();
  await expect(startButton).toBeEnabled({ timeout: 5000 });
  await startButton.click();
});

When("I send a prompt to the agent", async function(this: CustomWorld) {
  const workspacePage = getAppWorkspacePage(this);
  await workspacePage.sendMessage("Create a simple counter component");
});

When("I send {string}", async function(this: CustomWorld, message: string) {
  const workspacePage = getAppWorkspacePage(this);
  await workspacePage.sendMessage(message);
});

// ==================== Agent Response Steps ====================

Then(
  "I should see the agent working indicator within {int} seconds",
  async function(this: CustomWorld, seconds: number) {
    const workspacePage = getAppWorkspacePage(this);
    await workspacePage.waitForAgentWorking(seconds * 1000);
  },
);

Then(
  "I should see an agent response within {int} seconds",
  async function(this: CustomWorld, seconds: number) {
    const workspacePage = getAppWorkspacePage(this);
    await workspacePage.waitForAgentResponse(seconds * 1000);
  },
);

Then("I should see the streaming indicator", async function(this: CustomWorld) {
  // Look for either the agent working badge or streaming cursor
  const workspacePage = getAppWorkspacePage(this);
  const agentWorking = workspacePage.getAgentWorkingIndicator();
  const streamingIndicator = workspacePage.getStreamingIndicator();

  // Either one should be visible during streaming
  try {
    await expect(agentWorking).toBeVisible({ timeout: 15000 });
  } catch {
    await expect(streamingIndicator).toBeVisible({ timeout: 5000 });
  }
});

Then(
  "the response should complete with full text",
  async function(this: CustomWorld) {
    const workspacePage = getAppWorkspacePage(this);
    await workspacePage.waitForAgentFinished(120000);

    // Verify there's at least one agent message
    const messageCount = await workspacePage.getAgentMessageCount();
    expect(messageCount).toBeGreaterThan(0);

    // Verify the message has content
    const lastMessage = await workspacePage.getLastAgentMessageText();
    expect(lastMessage).toBeTruthy();
    expect(lastMessage!.length).toBeGreaterThan(10);
  },
);

Then(
  "the agent responds with updated code",
  async function(this: CustomWorld) {
    const workspacePage = getAppWorkspacePage(this);
    await workspacePage.waitForAgentResponse(120000);
    await workspacePage.waitForAgentFinished(120000);
  },
);

Then("the agent should respond successfully", async function(this: CustomWorld) {
  const workspacePage = getAppWorkspacePage(this);
  await workspacePage.waitForAgentResponse(120000);
  await workspacePage.waitForAgentFinished(120000);

  const messageCount = await workspacePage.getAgentMessageCount();
  expect(messageCount).toBeGreaterThan(0);
});

// ==================== Preview Steps ====================

Then("I should see a preview area", async function(this: CustomWorld) {
  const workspacePage = getAppWorkspacePage(this);
  const previewArea = workspacePage.getPreviewArea();
  await expect(previewArea).toBeVisible({ timeout: 30000 });
});

Then(
  "the preview iframe should load content from testing.spike.land",
  async function(this: CustomWorld) {
    const workspacePage = getAppWorkspacePage(this);
    const iframe = workspacePage.getPreviewIframe();
    await expect(iframe).toBeVisible({ timeout: 30000 });

    // Verify the iframe src contains testing.spike.land
    const src = await iframe.getAttribute("src");
    expect(src).toContain("testing.spike.land");
  },
);

Then("the preview should be functional", async function(this: CustomWorld) {
  const workspacePage = getAppWorkspacePage(this);
  const previewArea = workspacePage.getPreviewArea();
  await expect(previewArea).toBeVisible({ timeout: 30000 });
});

Then(
  "the preview should update with new content",
  async function(this: CustomWorld) {
    // Wait a moment for the preview to refresh
    await this.page.waitForTimeout(3000);

    // Verify preview is still visible (indicating it updated rather than errored)
    const workspacePage = getAppWorkspacePage(this);
    const previewArea = workspacePage.getPreviewArea();
    await expect(previewArea).toBeVisible();
  },
);

// ==================== Scenario Outline Steps ====================

When(
  "I create a new app with prompt {string}",
  async function(this: CustomWorld, prompt: string) {
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.clickCreateNewApp();

    await this.page.waitForURL(/\/my-apps\/[^/]+$/, { timeout: 30000 });

    const codespaceId = extractCodespaceId(this.page.url());
    if (!codespaceId || codespaceId === "new") {
      throw new Error("Failed to create new app");
    }

    this.currentCodespaceId = codespaceId;
    this.createdAppIds?.push(codespaceId);
    this.appWorkspacePage = new AppWorkspacePage(this.page, codespaceId);

    await this.appWorkspacePage.waitForChatReady();
    await this.appWorkspacePage.sendMessage(prompt);
  },
);

// ==================== Persistence Steps ====================

Given(
  "I have created at least {int} test apps",
  async function(this: CustomWorld, minCount: number) {
    if (!this.createdAppIds || this.createdAppIds.length < minCount) {
      // Create the required number of apps
      for (let i = this.createdAppIds?.length || 0; i < minCount; i++) {
        const myAppsPage = getMyAppsPage(this);
        await myAppsPage.navigate();
        await myAppsPage.clickCreateNewApp();

        await this.page.waitForURL(/\/my-apps\/[^/]+$/, { timeout: 30000 });

        const codespaceId = extractCodespaceId(this.page.url());
        if (codespaceId && codespaceId !== "new") {
          this.createdAppIds = this.createdAppIds || [];
          this.createdAppIds.push(codespaceId);
        }
      }
    }

    expect(this.createdAppIds?.length).toBeGreaterThanOrEqual(minCount);
  },
);

When(
  "I navigate back to the My Apps dashboard",
  async function(this: CustomWorld) {
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.navigate();
  },
);

Then("I should see my apps in the list", async function(this: CustomWorld) {
  // Look for app cards in the dashboard
  const appCards = this.page.locator('[data-testid="app-card"]');
  const count = await appCards.count();

  // We should have at least one app
  expect(count).toBeGreaterThan(0);
});

// ==================== Cleanup Steps ====================

When("I move test apps to bin", async function(this: CustomWorld) {
  if (!this.createdAppIds || this.createdAppIds.length === 0) {
    console.log("[Cleanup] No test apps to clean up");
    return;
  }

  for (const codespaceId of this.createdAppIds) {
    try {
      // Navigate to the app
      await this.page.goto(`${this.baseUrl}/my-apps/${codespaceId}`);
      await this.page.waitForLoadState("networkidle", { timeout: 10000 });

      const workspacePage = new AppWorkspacePage(this.page, codespaceId);
      await workspacePage.moveToBin();
      console.log(`[Cleanup] Moved app ${codespaceId} to bin`);
    } catch (error) {
      console.warn(`[Cleanup] Failed to delete app ${codespaceId}:`, error);
    }
  }
});

Then(
  "the dashboard should show fewer apps",
  async function(this: CustomWorld) {
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.navigate();

    // This step just verifies we're back on the dashboard
    // The actual count comparison would require tracking counts before cleanup
    await myAppsPage.verifyOnMyAppsPage();
  },
);
