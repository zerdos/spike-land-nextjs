import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { TIMEOUTS, waitForApiResponse, waitForModalState } from "../support/helpers/retry-helper";
import { BoxesPage } from "../support/page-objects/BoxesPage";
import type { CustomWorld } from "../support/world";

// Helper to get or create page object
function getBoxesPage(world: CustomWorld): BoxesPage {
  if (!world.boxesPage) {
    world.boxesPage = new BoxesPage(world.page);
  }
  return world.boxesPage;
}

// Extend CustomWorld
declare module "../support/world" {
  interface CustomWorld {
    boxesPage?: BoxesPage;
    createdBoxes?: Array<
      { id: string; name: string; tier: string; status: string; }
    >;
    serverErrorMode?: boolean;
  }
}

// Setup steps
Given("I have no boxes created", async function(this: CustomWorld) {
  // Navigate to a valid page first to enable localStorage access
  // This prevents SecurityError on about:blank
  await this.page.goto(`${this.baseUrl}/boxes`);
  await this.page.waitForLoadState("domcontentloaded");

  const boxesPage = getBoxesPage(this);
  await boxesPage.clearBoxes();
  this.createdBoxes = [];
});

Given(
  "I have created a box named {string}",
  async function(this: CustomWorld, boxName: string) {
    // Navigate to a valid page first to enable localStorage access
    // This prevents SecurityError on about:blank
    const currentUrl = this.page.url();
    if (!currentUrl || currentUrl === "about:blank" || !currentUrl.startsWith("http")) {
      await this.page.goto(`${this.baseUrl}/boxes`);
      await this.page.waitForLoadState("domcontentloaded");
    }

    const boxesPage = getBoxesPage(this);
    const boxData = {
      id: `box-${Date.now()}`,
      name: boxName,
      tier: "Standard",
      status: "Stopped",
    };
    await boxesPage.seedBox(boxData);
    this.createdBoxes = this.createdBoxes || [];
    this.createdBoxes.push(boxData);
  },
);

Given(
  "I have created a {string} box named {string}",
  async function(this: CustomWorld, tier: string, boxName: string) {
    // Navigate to a valid page first to enable localStorage access
    const currentUrl = this.page.url();
    if (!currentUrl || currentUrl === "about:blank" || !currentUrl.startsWith("http")) {
      await this.page.goto(`${this.baseUrl}/boxes`);
      await this.page.waitForLoadState("domcontentloaded");
    }

    const boxesPage = getBoxesPage(this);
    const boxData = {
      id: `box-${Date.now()}`,
      name: boxName,
      tier: tier,
      status: "Stopped",
    };
    await boxesPage.seedBox(boxData);
    this.createdBoxes = this.createdBoxes || [];
    this.createdBoxes.push(boxData);
  },
);

Given("I have created multiple boxes", async function(this: CustomWorld) {
  // Navigate to a valid page first to enable localStorage access
  const currentUrl = this.page.url();
  if (!currentUrl || currentUrl === "about:blank" || !currentUrl.startsWith("http")) {
    await this.page.goto(`${this.baseUrl}/boxes`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  const boxesPage = getBoxesPage(this);
  const boxes = [
    { id: "box-1", name: "Test Agent 1", tier: "Standard", status: "Stopped" },
    {
      id: "box-2",
      name: "Test Agent 2",
      tier: "Professional",
      status: "Running",
    },
    {
      id: "box-3",
      name: "Production Agent",
      tier: "Enterprise",
      status: "Stopped",
    },
  ];
  for (const box of boxes) {
    await boxesPage.seedBox(box);
  }
  this.createdBoxes = boxes;
});

Given(
  "I have boxes with different statuses",
  async function(this: CustomWorld) {
    // Navigate to a valid page first to enable localStorage access
    const currentUrl = this.page.url();
    if (!currentUrl || currentUrl === "about:blank" || !currentUrl.startsWith("http")) {
      await this.page.goto(`${this.baseUrl}/boxes`);
      await this.page.waitForLoadState("domcontentloaded");
    }

    const boxesPage = getBoxesPage(this);
    const boxes = [
      { id: "box-1", name: "Running Box", tier: "Standard", status: "Running" },
      { id: "box-2", name: "Stopped Box", tier: "Standard", status: "Stopped" },
      {
        id: "box-3",
        name: "Starting Box",
        tier: "Standard",
        status: "Starting",
      },
    ];
    for (const box of boxes) {
      await boxesPage.seedBox(box);
    }
    this.createdBoxes = boxes;
  },
);

Given("the server will return an error", async function(this: CustomWorld) {
  this.serverErrorMode = true;
  // Mock API to return error
  await this.page.route("**/api/boxes", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    } else {
      await route.continue();
    }
  });
});

// Navigation steps
When(
  "I navigate to the box detail page for {string}",
  async function(this: CustomWorld, boxName: string) {
    const box = this.createdBoxes?.find((b) => b.name === boxName);
    if (box) {
      const boxesPage = getBoxesPage(this);
      await boxesPage.navigateToBox(box.id);
    } else {
      // Navigate through the list
      const boxesPage = getBoxesPage(this);
      await boxesPage.navigateToList();
      await boxesPage.clickBoxCard(boxName);
    }
  },
);

// Tier selection steps
Then(
  "I should see the tier selection cards",
  async function(this: CustomWorld) {
    const boxesPage = getBoxesPage(this);
    const tierCards = await boxesPage.getTierSelectionCards();
    await expect(tierCards).toHaveCount(3, { timeout: TIMEOUTS.LONG });
  },
);

Then(
  "I should see the {string} tier card",
  async function(this: CustomWorld, tierName: string) {
    const boxesPage = getBoxesPage(this);
    const tierCard = await boxesPage.getTierCard(tierName);
    await expect(tierCard).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "each tier card should display pricing information",
  async function(this: CustomWorld) {
    const tierCards = this.page.locator('[data-testid="tier-card"]');
    const count = await tierCards.count();
    for (let i = 0; i < count; i++) {
      const card = tierCards.nth(i);
      const priceElement = card.locator('[data-testid="tier-price"], .price');
      await expect(priceElement).toBeVisible({ timeout: TIMEOUTS.LONG });
    }
  },
);

Then(
  "the {string} tier should be highlighted",
  async function(this: CustomWorld, tierName: string) {
    const boxesPage = getBoxesPage(this);
    await boxesPage.verifyTierIsHighlighted(tierName);
  },
);

Then(
  "I should see the box configuration form",
  async function(this: CustomWorld) {
    const boxesPage = getBoxesPage(this);
    const form = await boxesPage.getBoxConfigurationForm();
    await expect(form).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "the {string} input field should be visible",
  async function(this: CustomWorld, fieldName: string) {
    const input = this.page.getByLabel(new RegExp(fieldName, "i"));
    await expect(input).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

// Form interaction steps
When(
  "I select the {string} tier",
  async function(this: CustomWorld, tierName: string) {
    const boxesPage = getBoxesPage(this);
    const tierCard = await boxesPage.getTierCard(tierName);
    await tierCard.click();
  },
);

When(
  "I enter {string} into the box name field",
  async function(this: CustomWorld, text: string) {
    const boxesPage = getBoxesPage(this);
    const input = await boxesPage.getBoxNameInput();
    await input.fill(text);
  },
);

When("I leave the box name empty", async function(this: CustomWorld) {
  const boxesPage = getBoxesPage(this);
  const input = await boxesPage.getBoxNameInput();
  await input.clear();
});

Then(
  "I should see the validation error {string}",
  async function(this: CustomWorld, errorMessage: string) {
    const boxesPage = getBoxesPage(this);
    await boxesPage.verifyValidationError(errorMessage);
  },
);

// Box list verification steps
Then(
  "I should see the empty state message for boxes",
  async function(this: CustomWorld) {
    const boxesPage = getBoxesPage(this);
    await boxesPage.verifyEmptyState();
  },
);

Then(
  "I should see {string} in the boxes list",
  async function(this: CustomWorld, boxName: string) {
    const boxesPage = getBoxesPage(this);
    await boxesPage.verifyBoxInList(boxName);
  },
);

Then(
  "I should not see {string} in the boxes list",
  async function(this: CustomWorld, boxName: string) {
    const boxesPage = getBoxesPage(this);
    await boxesPage.verifyBoxNotInList(boxName);
  },
);

Then(
  "I should see the box status indicator",
  async function(this: CustomWorld) {
    const boxesPage = getBoxesPage(this);
    const statusIndicator = await boxesPage.getStatusIndicator();
    await expect(statusIndicator).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then("I should see the box tier badge", async function(this: CustomWorld) {
  const tierBadge = this.page.locator(
    '[data-testid="tier-badge"], .tier-badge',
  );
  await expect(tierBadge).toBeVisible({ timeout: TIMEOUTS.LONG });
});

// Box control steps
Then("I should see the box control panel", async function(this: CustomWorld) {
  const boxesPage = getBoxesPage(this);
  const controlPanel = await boxesPage.getControlPanel();
  await expect(controlPanel).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then(
  "I should see the {string} button appear",
  async function(this: CustomWorld, buttonName: string) {
    const button = this.page.getByRole("button", {
      name: new RegExp(buttonName, "i"),
    });
    await expect(button).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

Then(
  "I should see the box status change to {string}",
  async function(this: CustomWorld, status: string) {
    // Wait for any API response that might update box status
    const apiPromise = waitForApiResponse(this.page, /\/api\/boxes/, {
      timeout: TIMEOUTS.LONG,
    }).catch(() => null); // Don't fail if no API call

    await Promise.race([
      apiPromise,
      this.page.waitForTimeout(TIMEOUTS.SHORT),
    ]);

    const boxesPage = getBoxesPage(this);
    await boxesPage.verifyBoxStatus(status);
  },
);

// Connection details steps
Then("I should see the connection URL", async function(this: CustomWorld) {
  const boxesPage = getBoxesPage(this);
  const connectionUrl = await boxesPage.getConnectionUrl();
  await expect(connectionUrl).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then(
  "I should see the authentication token",
  async function(this: CustomWorld) {
    const boxesPage = getBoxesPage(this);
    const authToken = await boxesPage.getAuthToken();
    await expect(authToken).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

// Delete box steps
// NOTE: "I should see the delete confirmation dialog" is defined in common.steps.ts
// NOTE: "I confirm the deletion" is defined in common.steps.ts

Then(
  "I should still be on the box detail page",
  async function(this: CustomWorld) {
    await expect(this.page).toHaveURL(/\/boxes\/[^/]+$/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

// Settings steps
When(
  "I change the box name to {string}",
  async function(this: CustomWorld, newName: string) {
    const boxesPage = getBoxesPage(this);
    await boxesPage.changeBoxName(newName);
  },
);

// NOTE: "I click the {string} tab" is defined in common.steps.ts

// Upgrade flow steps
Then("I should see the tier upgrade modal", async function(this: CustomWorld) {
  // Wait for modal to be visible with animation
  await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.LONG });

  const boxesPage = getBoxesPage(this);
  const modal = await boxesPage.getTierUpgradeModal();
  await expect(modal).toBeVisible({ timeout: TIMEOUTS.LONG });
});

Then(
  "I should see the {string} upgrade option",
  async function(this: CustomWorld, tierName: string) {
    const option = this.page.locator('[data-testid="upgrade-option"]', {
      hasText: tierName,
    });
    await expect(option).toBeVisible({ timeout: TIMEOUTS.LONG });
  },
);

// Search and filter steps
When(
  "I type {string} in the search box",
  async function(this: CustomWorld, query: string) {
    const boxesPage = getBoxesPage(this);
    await boxesPage.searchBoxes(query);
  },
);

Then(
  "I should only see boxes containing {string} in the name",
  async function(this: CustomWorld, searchTerm: string) {
    const boxCards = this.page.locator('[data-testid="box-card"]');
    const count = await boxCards.count();
    for (let i = 0; i < count; i++) {
      const cardText = await boxCards.nth(i).textContent();
      expect(cardText?.toLowerCase()).toContain(searchTerm.toLowerCase());
    }
  },
);

Then(
  "I should only see boxes with {string} status",
  async function(this: CustomWorld, status: string) {
    // Wait for filter to be applied
    await this.page.waitForTimeout(500);

    const boxCards = this.page.locator('[data-testid="box-card"]');
    const count = await boxCards.count();
    for (let i = 0; i < count; i++) {
      const statusElement = boxCards.nth(i).locator(
        '[data-testid="box-status"]',
      );
      await expect(statusElement).toContainText(status, {
        timeout: TIMEOUTS.LONG,
      });
    }
  },
);

// Error handling steps
Then(
  "I should remain on the creation page",
  async function(this: CustomWorld) {
    await expect(this.page).toHaveURL(/\/boxes\/new/, {
      timeout: TIMEOUTS.LONG,
    });
  },
);

// NOTE: "I should see {string} text" is defined in authentication.steps.ts

// Cleanup after scenarios that create boxes
Given("I navigate to the box list page", async function(this: CustomWorld) {
  const boxesPage = getBoxesPage(this);
  await boxesPage.navigateToList();
});
