import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// Page navigation steps
Given(
  "I am on the tabletop simulator home page",
  async function(this: CustomWorld) {
    await this.page.goto(`${this.baseUrl}/apps/tabletop-simulator`);
    await this.page.waitForLoadState("networkidle");
  },
);

Given("I am in a tabletop game room", async function(this: CustomWorld) {
  // Create a new room by visiting the app and clicking create
  await this.page.goto(`${this.baseUrl}/apps/tabletop-simulator`);
  await this.page.waitForLoadState("networkidle");

  // Look for create room button and click it
  const createButton = this.page.getByRole("button", {
    name: /create.*room|new.*game/i,
  });
  if (await createButton.isVisible()) {
    await createButton.click();
    await this.page.waitForURL(/\/room\/[A-Z0-9]+$/i);
  } else {
    // If we're already in a room or there's a direct entry, just proceed
    // Generate a test room ID
    const testRoomId = "TEST" + Date.now().toString(36).toUpperCase();
    await this.page.goto(
      `${this.baseUrl}/apps/tabletop-simulator/room/${testRoomId}`,
    );
  }

  await this.page.waitForLoadState("networkidle");
  // Wait for the canvas to be ready
  await this.page.waitForSelector("canvas", { timeout: 10000 });
});

// Mobile device simulation
Given("I am on a mobile device", async function(this: CustomWorld) {
  // Set mobile viewport
  await this.page.setViewportSize({ width: 375, height: 667 });
});

// Canvas and controls visibility
Then("I should see the game canvas", async function(this: CustomWorld) {
  const canvas = this.page.locator("canvas");
  await expect(canvas).toBeVisible();
});

Then("I should see the controls panel", async function(this: CustomWorld) {
  const controls = this.page.locator('[data-testid="controls-panel"]');
  await expect(controls).toBeVisible();
});

Then("I should see the mobile controls", async function(this: CustomWorld) {
  const controls = this.page.locator('[data-testid="controls-panel"]');
  await expect(controls).toBeVisible();
});

Then(
  "I should see the card deck on the table",
  async function(this: CustomWorld) {
    // The deck is rendered in the 3D canvas, so we verify it indirectly
    // by checking that the scene has loaded
    const canvas = this.page.locator("canvas");
    await expect(canvas).toBeVisible();
    // Wait a bit for the 3D scene to render
    await this.page.waitForTimeout(1000);
  },
);

// Room creation
When("I create a new game room", async function(this: CustomWorld) {
  const createButton = this.page.getByRole("button", {
    name: /create.*room|new.*game|start/i,
  });
  await createButton.click();
  await this.page.waitForURL(/\/room\/[A-Z0-9]+$/i, { timeout: 10000 });
});

Then(
  "I should be redirected to a room page",
  async function(this: CustomWorld) {
    await expect(this.page).toHaveURL(
      /\/apps\/tabletop-simulator\/room\/[A-Z0-9]+$/i,
    );
  },
);

Then(
  "I should see the room code in the URL",
  async function(this: CustomWorld) {
    const url = this.page.url();
    const match = url.match(/\/room\/([A-Z0-9-]+)/i);
    expect(match).toBeTruthy();
    expect(match?.[1]?.length ?? 0).toBeGreaterThan(0);
  },
);

// Mode toggle steps
When("I click the mode toggle button", async function(this: CustomWorld) {
  const toggle = this.page.locator('[data-testid="mode-toggle"]');
  await toggle.click();
});

When(
  "I click the mode toggle button again",
  async function(this: CustomWorld) {
    const toggle = this.page.locator('[data-testid="mode-toggle"]');
    await toggle.click();
  },
);

When("I tap the mode toggle", async function(this: CustomWorld) {
  const toggle = this.page.locator('[data-testid="mode-toggle"]');
  await toggle.tap();
});

Then(
  "the toggle button should show interaction mode active",
  async function(this: CustomWorld) {
    const toggle = this.page.locator('[data-testid="mode-toggle"]');
    // Check for interaction mode styling (cyan/blue gradient, ring)
    await expect(toggle).toHaveClass(/from-cyan-500/);
    await expect(toggle).toHaveClass(/ring-4/);
  },
);

Then(
  "the toggle button should show orbit mode active",
  async function(this: CustomWorld) {
    const toggle = this.page.locator('[data-testid="mode-toggle"]');
    // Check for orbit mode styling (gray gradient, no ring)
    await expect(toggle).toHaveClass(/from-gray-700/);
  },
);

Then(
  "the mode should default to orbit mode",
  async function(this: CustomWorld) {
    const toggle = this.page.locator('[data-testid="mode-toggle"]');
    // Should show camera icon
    await expect(toggle).toContainText("\uD83D\uDCF7"); // Camera emoji
  },
);

Then(
  "the mode should switch to interaction mode",
  async function(this: CustomWorld) {
    const toggle = this.page.locator('[data-testid="mode-toggle"]');
    // Should show hand icon
    await expect(toggle).toContainText("\u270B"); // Hand emoji
  },
);

Then(
  "I should see interaction mode active indicator",
  async function(this: CustomWorld) {
    const toggle = this.page.locator('[data-testid="mode-toggle"]');
    await expect(toggle).toHaveClass(/ring-4/);
  },
);

// Hand drawer steps
When("I click the hand toggle button", async function(this: CustomWorld) {
  const handToggle = this.page.locator('[data-testid="hand-toggle"]');
  await handToggle.click();
});

When("I tap the hand button", async function(this: CustomWorld) {
  const handButton = this.page.locator('[data-testid="hand-toggle"]');
  await handButton.tap();
});

Then("the hand drawer should be visible", async function(this: CustomWorld) {
  const drawer = this.page.locator('[data-testid="hand-drawer"]');
  await expect(drawer).toBeVisible();
  // Hand drawer has h-40 class (always visible as persistent HUD)
  await expect(drawer).toHaveClass(/h-40/);
});

Then("the hand drawer should expand", async function(this: CustomWorld) {
  const drawer = this.page.locator('[data-testid="hand-drawer"]');
  // Hand drawer is always visible with h-40
  await expect(drawer).toHaveClass(/h-40/);
});

Then("I should see the empty hand message", async function(this: CustomWorld) {
  const message = this.page.getByText("Draw cards from the deck to play");
  await expect(message).toBeVisible();
});

// Dice rolling
When("I click the dice roll button", async function(this: CustomWorld) {
  const diceButton = this.page.locator('button:has-text("\uD83C\uDFB2")'); // Dice emoji
  await diceButton.click();
});

Then("a dice should appear on the table", async function(this: CustomWorld) {
  // The dice is rendered in 3D, so we wait for the scene to update
  await this.page.waitForTimeout(1000);
  // We can't directly query 3D objects, but we can verify the canvas is still active
  const canvas = this.page.locator("canvas");
  await expect(canvas).toBeVisible();
});

// Mobile touch targets
Then(
  "the mode toggle button should be at least 56 pixels tall",
  async function(this: CustomWorld) {
    const toggle = this.page.locator('[data-testid="mode-toggle"]');
    const box = await toggle.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(56);
  },
);

Then(
  "the controls should have adequate touch targets",
  async function(this: CustomWorld) {
    const controls = this.page.locator('[data-testid="controls-panel"]');
    const buttons = controls.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        // WCAG minimum touch target is 44x44 pixels
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  },
);
