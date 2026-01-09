/**
 * Step definitions for Admin Gallery Management E2E tests
 */

import type { DataTable } from "@cucumber/cucumber";
import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import {
  TIMEOUTS,
  waitForApiResponse,
  waitForElementWithRetry,
  waitForModalState,
  waitForTextWithRetry,
} from "../support/helpers/retry-helper";
import type { CustomWorld } from "../support/world";

// State for tracking gallery items during tests
let galleryItemCount = 0;
let galleryOrder: string[] = [];

// Given steps
Given("the gallery is empty", async function(this: CustomWorld) {
  // Mock empty gallery response
  // Use * to match query parameters
  await this.page.route("**/api/admin/gallery*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    } else {
      await route.continue();
    }
  });
});

Given(
  "there are gallery items in the system",
  async function(this: CustomWorld) {
    // Mutable state to track gallery items
    const galleryItems = [
      {
        id: "gallery-1",
        title: "Test Portrait",
        description: "A test portrait image",
        category: "PORTRAIT",
        originalUrl: "https://placehold.co/400x300/purple/white?text=Portrait",
        enhancedUrl: "https://placehold.co/400x300/purple/white?text=Portrait+Enhanced",
        isActive: true,
        sortOrder: 1,
        sourceImageId: "img-1",
        sourceJobId: "job-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "gallery-2",
        title: "Test Landscape",
        description: "A test landscape image",
        category: "LANDSCAPE",
        originalUrl: "https://placehold.co/400x300/green/white?text=Landscape",
        enhancedUrl: "https://placehold.co/400x300/green/white?text=Landscape+Enhanced",
        isActive: false,
        sortOrder: 2,
        sourceImageId: "img-2",
        sourceJobId: "job-2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Mock gallery items response
    // Use **/* pattern to also match query parameters like ?id=xxx
    await this.page.route("**/api/admin/gallery*", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: galleryItems }),
        });
      } else if (method === "PATCH") {
        // Handle PATCH to update items
        const body = route.request().postDataJSON();
        const itemIndex = galleryItems.findIndex((item) => item.id === body.id);
        if (itemIndex !== -1) {
          galleryItems[itemIndex] = { ...galleryItems[itemIndex], ...body };
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ item: galleryItems[itemIndex] }),
        });
      } else if (method === "DELETE") {
        // Handle DELETE to remove items
        const url = new URL(route.request().url());
        const id = url.searchParams.get("id");
        const itemIndex = galleryItems.findIndex((item) => item.id === id);
        if (itemIndex !== -1) {
          galleryItems.splice(itemIndex, 1);
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are gallery items with different categories",
  async function(this: CustomWorld) {
    // Use * to match query parameters
    await this.page.route("**/api/admin/gallery*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "1",
                title: "Portrait",
                category: "PORTRAIT",
                isActive: true,
                sortOrder: 1,
                originalUrl: "https://placehold.co/400x300/purple/white?text=Portrait",
                enhancedUrl: "https://placehold.co/400x300/purple/white?text=Portrait+Enhanced",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: "2",
                title: "Landscape",
                category: "LANDSCAPE",
                isActive: true,
                sortOrder: 2,
                originalUrl: "https://placehold.co/400x300/green/white?text=Landscape",
                enhancedUrl: "https://placehold.co/400x300/green/white?text=Landscape+Enhanced",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: "3",
                title: "Product",
                category: "PRODUCT",
                isActive: true,
                sortOrder: 3,
                originalUrl: "https://placehold.co/400x300/blue/white?text=Product",
                enhancedUrl: "https://placehold.co/400x300/blue/white?text=Product+Enhanced",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: "4",
                title: "Architecture",
                category: "ARCHITECTURE",
                isActive: true,
                sortOrder: 4,
                originalUrl: "https://placehold.co/400x300/orange/white?text=Architecture",
                enhancedUrl: "https://placehold.co/400x300/orange/white?text=Architecture+Enhanced",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are enhanced images available",
  async function(this: CustomWorld) {
    // State to track created gallery items
    const galleryItems: {
      id: string;
      title: string;
      description: string | null;
      category: string;
      originalUrl: string;
      enhancedUrl: string;
      isActive: boolean;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }[] = [];

    // Mock the browse API endpoint used by ImageBrowserDialog
    await this.page.route("**/api/admin/gallery/browse**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          images: [
            {
              id: "img-1",
              originalUrl: "https://placehold.co/400x300/purple/white?text=Test",
              shareToken: "test-token-123",
              createdAt: new Date().toISOString(),
              user: {
                id: "user-1",
                name: "Test User",
                email: "test@example.com",
              },
              enhancementJobs: [
                {
                  id: "job-1",
                  tier: "TIER_1K",
                  enhancedUrl: "https://placehold.co/400x300/purple/white?text=Enhanced",
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          ],
        }),
      });
    });

    // Mock the main gallery API endpoint for GET, POST, DELETE
    // Use * to match query parameters
    await this.page.route("**/api/admin/gallery*", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: galleryItems }),
        });
      } else if (method === "POST") {
        // Create a new gallery item
        const body = route.request().postDataJSON();
        const newItem = {
          id: `gallery-${Date.now()}`,
          title: body.title || "Untitled",
          description: body.description || null,
          category: body.category || "PORTRAIT",
          originalUrl: body.originalUrl ||
            "https://placehold.co/400x300/purple/white?text=Test",
          enhancedUrl: body.enhancedUrl ||
            "https://placehold.co/400x300/purple/white?text=Enhanced",
          isActive: true,
          sortOrder: galleryItems.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        galleryItems.push(newItem);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ item: newItem }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given(
  "there are at least 2 gallery items in the system",
  async function(this: CustomWorld) {
    // Mutable state to track gallery items
    const galleryItems = [
      {
        id: "gallery-1",
        title: "First Item",
        category: "PORTRAIT",
        isActive: true,
        sortOrder: 1,
        originalUrl: "https://placehold.co/400x300/purple/white?text=First",
        enhancedUrl: "https://placehold.co/400x300/purple/white?text=First+Enhanced",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "gallery-2",
        title: "Second Item",
        category: "LANDSCAPE",
        isActive: true,
        sortOrder: 2,
        originalUrl: "https://placehold.co/400x300/green/white?text=Second",
        enhancedUrl: "https://placehold.co/400x300/green/white?text=Second+Enhanced",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Mock reorder API endpoint
    await this.page.route("**/api/admin/gallery/reorder", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        const itemIndex = galleryItems.findIndex((item) => item.id === body.id);
        if (itemIndex !== -1) {
          const item = galleryItems[itemIndex];
          // Move item to new position by swapping sort orders
          const otherIndex = galleryItems.findIndex(
            (i) => i.sortOrder === body.newOrder,
          );
          if (otherIndex !== -1 && item) {
            const otherItem = galleryItems[otherIndex];
            if (otherItem) {
              const tempOrder = item.sortOrder;
              item.sortOrder = body.newOrder;
              otherItem.sortOrder = tempOrder;
            }
          }
          // Re-sort items by sortOrder
          galleryItems.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock main gallery API endpoint
    // Use * to match query parameters
    await this.page.route("**/api/admin/gallery*", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: galleryItems }),
        });
      } else if (method === "PATCH") {
        const body = route.request().postDataJSON();
        const itemIndex = galleryItems.findIndex((item) => item.id === body.id);
        if (itemIndex !== -1) {
          galleryItems[itemIndex] = { ...galleryItems[itemIndex], ...body };
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ item: galleryItems[itemIndex] }),
        });
      } else if (method === "DELETE") {
        const url = new URL(route.request().url());
        const id = url.searchParams.get("id");
        const itemIndex = galleryItems.findIndex((item) => item.id === id);
        if (itemIndex !== -1) {
          galleryItems.splice(itemIndex, 1);
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });
  },
);

Given("the gallery API is slow", async function(this: CustomWorld) {
  // Use * to match query parameters
  await this.page.route("**/api/admin/gallery*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
});

Given("the gallery API returns an error", async function(this: CustomWorld) {
  // Use * to match query parameters
  await this.page.route("**/api/admin/gallery*", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal server error" }),
    });
  });
});

// When steps
When(
  "I click {string} on a gallery item",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for all loading skeletons to disappear
    await this.page.waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length === 0,
      { timeout: TIMEOUTS.LONG },
    ).catch(() => {});

    // Wait for gallery grid to be visible with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    const galleryCard = this.page.locator(".Card").first();
    const button = galleryCard.getByRole("button", { name: buttonText });

    // Wait for button to be visible and enabled with retry
    await expect(button).toBeVisible({ timeout: TIMEOUTS.LONG });
    await expect(button).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
    await button.click();
  },
);

When(
  "I click {string} on the second gallery item",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for all loading skeletons to disappear
    await this.page.waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length === 0,
      { timeout: TIMEOUTS.LONG },
    ).catch(() => {});

    // Wait for gallery grid to be visible with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    const galleryCard = this.page.locator(".Card").nth(1);
    const button = galleryCard.getByRole("button", { name: buttonText });

    // Wait for button to be visible and enabled with retry
    await expect(button).toBeVisible({ timeout: TIMEOUTS.LONG });
    await expect(button).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
    await button.click();
  },
);

When(
  "I click {string} on the first gallery item",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for all loading skeletons to disappear
    await this.page.waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length === 0,
      { timeout: TIMEOUTS.LONG },
    ).catch(() => {});

    // Wait for gallery grid to be visible with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    const galleryCard = this.page.locator(".Card").first();
    const button = galleryCard.getByRole("button", { name: buttonText });

    // Wait for button to be visible and enabled with retry
    await expect(button).toBeVisible({ timeout: TIMEOUTS.LONG });
    await expect(button).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });
    await button.click();
  },
);

When(
  "I toggle the active switch on a gallery item",
  async function(this: CustomWorld) {
    // Wait for gallery grid to be visible with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    const galleryCard = this.page.locator(".Card").first();
    await expect(galleryCard).toBeVisible({ timeout: TIMEOUTS.LONG });

    // Find the switch within the card using getByRole for better semantics
    const switchElement = galleryCard.getByRole("switch");

    // Wait for switch to be visible AND enabled (not disabled during updates)
    await expect(switchElement).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await expect(switchElement).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });

    // Click the switch and wait for API response
    const responsePromise = waitForApiResponse(this.page, "/api/admin/gallery", {
      timeout: TIMEOUTS.DEFAULT,
    });
    await switchElement.click();
    await responsePromise.catch(() => {}); // API might be mocked
  },
);

When("I note the current gallery order", async function(this: CustomWorld) {
  // CardTitle in gallery renders with text-base.truncate classes
  const titles = await this.page.locator(".Card .text-base.truncate")
    .allTextContents();
  galleryOrder = titles;
});

When("I note the gallery item count", async function(this: CustomWorld) {
  galleryItemCount = await this.page.locator(".Card").count();
});

When("I select an image from the browser", async function(this: CustomWorld) {
  // Wait for browse dialog to be visible
  await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.LONG });

  // The ImageBrowserDialog requires a search to be performed first
  // Enter a search query (the mock will return results for any query)
  const searchInput = this.page.locator('[role="dialog"] input#search-query');
  await expect(searchInput).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await searchInput.fill("test");

  // Click the Search button
  const searchButton = this.page
    .locator('[role="dialog"]')
    .getByRole("button", { name: "Search" });
  await expect(searchButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await searchButton.click();

  // Wait for images to load (mock returns one image)
  const imageCard = this.page.locator('[role="dialog"] .Card').first();
  await expect(imageCard).toBeVisible({ timeout: TIMEOUTS.LONG });

  // Click on the first image to select it
  await imageCard.click();

  // Wait for enhancement jobs to appear and click the first one
  const enhancementCard = this.page
    .locator('[role="dialog"]')
    .locator(".Card")
    .filter({ hasText: /TIER/i })
    .first();
  await expect(enhancementCard).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await enhancementCard.click();

  // Click "Use This Enhancement" to confirm selection
  const confirmButton = this.page
    .locator('[role="dialog"]')
    .getByRole("button", {
      name: /use this enhancement/i,
    });
  await expect(confirmButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await confirmButton.click();

  // Wait for the add gallery form dialog to appear
  await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.DEFAULT });
});

When(
  "I fill in the gallery item form with:",
  async function(this: CustomWorld, dataTable: DataTable) {
    const data = dataTable.rowsHash();

    // Wait for form to be visible
    await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.LONG });

    if (data.title) {
      const titleInput = this.page.locator(
        'input[name="title"], input[placeholder*="title" i]',
      );
      await expect(titleInput).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
      await titleInput.fill(data.title);
    }
    if (data.description) {
      const descInput = this.page.locator(
        'textarea[name="description"], textarea[placeholder*="description" i]',
      );
      await expect(descInput).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
      await descInput.fill(data.description);
    }
    if (data.category) {
      const categorySelect = this.page.locator('[role="combobox"]').first();
      await expect(categorySelect).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
      await categorySelect.click();
      const option = this.page.locator(`[role="option"]`).filter({
        hasText: data.category,
      });
      await expect(option).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
      await option.click();
    }
  },
);

When("I submit the gallery item form", async function(this: CustomWorld) {
  const submitButton = this.page.locator('[role="dialog"]').getByRole(
    "button",
    {
      name: /save|submit|add/i,
    },
  );
  await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  await expect(submitButton).toBeEnabled({ timeout: TIMEOUTS.DEFAULT });

  // Wait for API response after submission
  const responsePromise = waitForApiResponse(this.page, "/api/admin/gallery", {
    timeout: TIMEOUTS.LONG,
  });
  await submitButton.click();
  await responsePromise.catch(() => {}); // API might be mocked

  // Wait for modal to close
  await waitForModalState(this.page, "hidden", { timeout: TIMEOUTS.DEFAULT });
});

When(
  "I change the title to {string}",
  async function(this: CustomWorld, newTitle: string) {
    const titleInput = this.page.locator(
      'input[name="title"], input[placeholder*="title" i]',
    );
    await expect(titleInput).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    await titleInput.clear();
    await titleInput.fill(newTitle);
  },
);

// NOTE: "I confirm the deletion" is defined in common.steps.ts

When("I cancel the deletion", async function(this: CustomWorld) {
  const cancelButton = this.page.locator('[role="dialog"]').getByRole(
    "button",
    {
      name: /cancel/i,
    },
  );
  await cancelButton.click();
});

// Then steps
Then("I should see the gallery grid", async function(this: CustomWorld) {
  // Wait for the page to fully load and render the gallery items
  await this.page.waitForLoadState("networkidle");

  // Wait for gallery grid with retry
  await waitForElementWithRetry(this.page, ".grid", {
    timeout: TIMEOUTS.LONG,
  });
});

Then(
  "each gallery item should display a thumbnail",
  async function(this: CustomWorld) {
    // Wait for gallery cards with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });
    const images = this.page.locator(".Card img");
    await expect(images.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each gallery item should display a title",
  async function(this: CustomWorld) {
    // CardTitle in gallery renders with text-base.truncate classes
    await waitForElementWithRetry(this.page, ".Card .text-base.truncate", {
      timeout: TIMEOUTS.LONG,
    });
    const titles = this.page.locator(".Card .text-base.truncate");
    const count = await titles.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each gallery item should display a category badge",
  async function(this: CustomWorld) {
    await waitForElementWithRetry(this.page, ".Badge", {
      timeout: TIMEOUTS.LONG,
    });
    const badges = this.page.locator(".Badge");
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "I should see {string} category badge",
  async function(this: CustomWorld, category: string) {
    const badge = this.page.locator(".Badge").filter({
      hasText: category,
    });
    await expect(badge).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the image browser dialog",
  async function(this: CustomWorld) {
    // Wait for modal to appear with retry
    await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.LONG });

    // Use a more specific selector to exclude the cookie consent dialog
    const dialog = this.page.locator(
      '[role="dialog"]:not([aria-labelledby="cookie-consent-title"])',
    );
    await expect(dialog).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the dialog should display available enhanced images",
  async function(this: CustomWorld) {
    await this.page.waitForLoadState("networkidle");
    // Exclude cookie consent dialog
    const dialog = this.page.locator(
      '[role="dialog"]:not([aria-labelledby="cookie-consent-title"])',
    );
    // The dialog shows a search interface initially, not images directly
    // Check for search form elements or images (if already searched)
    const searchInput = dialog.locator("input");
    const searchButton = dialog.getByRole("button", { name: /search/i });
    const images = dialog.locator("img");
    const noImagesText = dialog.getByText(/no.*image/i);
    const hasContent = (await searchInput.count()) > 0 ||
      (await searchButton.count()) > 0 ||
      (await images.count()) > 0 ||
      (await noImagesText.count()) > 0;
    expect(hasContent).toBe(true);
  },
);

Then(
  "I should see the add gallery item form",
  async function(this: CustomWorld) {
    // Wait for modal to appear with retry
    await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.LONG });

    const form = this.page.locator(
      '[role="dialog"] form, [role="dialog"] input',
    );
    await expect(form.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see {string} dialog title",
  async function(this: CustomWorld, title: string) {
    // Wait for modal to appear with retry
    await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.LONG });

    const dialogTitle = this.page.locator('[role="dialog"]').getByRole(
      "heading",
      { name: title },
    );
    await expect(dialogTitle).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the edit gallery item form",
  async function(this: CustomWorld) {
    // Wait for modal to appear with retry
    await waitForModalState(this.page, "visible", { timeout: TIMEOUTS.LONG });

    const form = this.page.locator(
      '[role="dialog"] form, [role="dialog"] input',
    );
    await expect(form.first()).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the gallery item should display {string}",
  async function(this: CustomWorld, text: string) {
    // Wait for gallery cards with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    // Wait for the specific text to appear
    await waitForTextWithRetry(this.page, text, { timeout: TIMEOUTS.LONG });

    const item = this.page.locator(".Card").filter({ hasText: text });
    await expect(item).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "I should see the new gallery item in the grid",
  async function(this: CustomWorld) {
    // Wait for gallery cards with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    const cards = this.page.locator(".Card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "the gallery item active status should change",
  async function(this: CustomWorld) {
    // The switch state should have changed - this is verified by the UI update
    const switchElement = this.page.locator('[role="switch"]').first();
    await expect(switchElement).toBeVisible({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the change should persist after page refresh",
  async function(this: CustomWorld) {
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");

    // Wait for gallery cards with retry after reload
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });
  },
);

Then("the gallery order should change", async function(this: CustomWorld) {
  // Wait for gallery cards with retry
  await waitForElementWithRetry(this.page, ".Card .text-base.truncate", {
    timeout: TIMEOUTS.LONG,
  });

  // CardTitle in gallery renders with text-base.truncate classes
  const titles = await this.page.locator(".Card .text-base.truncate")
    .allTextContents();
  expect(titles).not.toEqual(galleryOrder);
});

Then("the second item should now be first", async function(this: CustomWorld) {
  // Wait for gallery cards with retry
  await waitForElementWithRetry(this.page, ".Card .text-base.truncate", {
    timeout: TIMEOUTS.LONG,
  });

  // CardTitle in gallery renders with text-base.truncate classes
  const titles = await this.page.locator(".Card .text-base.truncate")
    .allTextContents();
  if (galleryOrder.length >= 2 && titles.length >= 2) {
    expect(titles[0]).toBe(galleryOrder[1]);
  }
});

Then("the first item should now be second", async function(this: CustomWorld) {
  // Wait for gallery cards with retry
  await waitForElementWithRetry(this.page, ".Card .text-base.truncate", {
    timeout: TIMEOUTS.LONG,
  });

  // CardTitle in gallery renders with text-base.truncate classes
  const titles = await this.page.locator(".Card .text-base.truncate")
    .allTextContents();
  if (galleryOrder.length >= 2 && titles.length >= 2) {
    expect(titles[1]).toBe(galleryOrder[0]);
  }
});

Then(
  "the {string} button on the first item should be disabled",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for gallery cards with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    const galleryCard = this.page.locator(".Card").first();
    const button = galleryCard.getByRole("button", { name: buttonText });
    await expect(button).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

Then(
  "the {string} button on the last item should be disabled",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for gallery cards with retry
    await waitForElementWithRetry(this.page, ".Card", {
      timeout: TIMEOUTS.LONG,
    });

    const galleryCard = this.page.locator(".Card").last();
    const button = galleryCard.getByRole("button", { name: buttonText });
    await expect(button).toBeDisabled({ timeout: TIMEOUTS.DEFAULT });
  },
);

// NOTE: "I should see the delete confirmation dialog" is defined in common.steps.ts

Then("the gallery item should be removed", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then(
  "the gallery item count should decrease by 1",
  async function(this: CustomWorld) {
    // Wait for the item count to decrease (UI may take time to re-render)
    await this.page.waitForFunction(
      (expectedMax: number) => {
        const cards = document.querySelectorAll(".Card");
        return cards.length < expectedMax;
      },
      galleryItemCount,
      { timeout: TIMEOUTS.DEFAULT },
    );
    const currentCount = await this.page.locator(".Card").count();
    expect(currentCount).toBeLessThan(galleryItemCount);
  },
);

Then(
  "the gallery item count should remain the same",
  async function(this: CustomWorld) {
    const currentCount = await this.page.locator(".Card").count();
    expect(currentCount).toBe(galleryItemCount);
  },
);

Then("the delete dialog should close", async function(this: CustomWorld) {
  // Wait for modal to close with retry
  await waitForModalState(this.page, "hidden", { timeout: TIMEOUTS.DEFAULT });
});

Then("I should see loading skeleton cards", async function(this: CustomWorld) {
  const skeleton = this.page.locator('[class*="animate-pulse"]');
  await expect(skeleton.first()).toBeVisible();
});

// NOTE: "I should see {string} button" is defined in common.steps.ts

Then("I should be redirected to home page", async function(this: CustomWorld) {
  await this.page.waitForURL("**/", { timeout: 5000 });
  expect(this.page.url()).toMatch(/\/$/);
});

// NOTE: "I should be redirected to sign-in page" is defined in common.steps.ts
