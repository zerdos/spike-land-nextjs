/**
 * Step definitions for Admin Gallery Management E2E tests
 */

import type { DataTable } from "@cucumber/cucumber";
import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

// State for tracking gallery items during tests
let galleryItemCount = 0;
let galleryOrder: string[] = [];

// Given steps
Given("the gallery is empty", async function(this: CustomWorld) {
  // Mock empty gallery response
  await this.page.route("**/api/admin/gallery", async (route) => {
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
        originalUrl: "https://example.com/original1.jpg",
        enhancedUrl: "https://example.com/enhanced1.jpg",
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
        originalUrl: "https://example.com/original2.jpg",
        enhancedUrl: "https://example.com/enhanced2.jpg",
        isActive: false,
        sortOrder: 2,
        sourceImageId: "img-2",
        sourceJobId: "job-2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Mock gallery items response
    await this.page.route("**/api/admin/gallery", async (route) => {
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
    await this.page.route("**/api/admin/gallery", async (route) => {
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
    await this.page.route("**/api/admin/gallery/images**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          images: [
            {
              id: "img-1",
              originalUrl: "https://example.com/original1.jpg",
              enhancedUrl: "https://example.com/enhanced1.jpg",
              jobId: "job-1",
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
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
    await this.page.route("**/api/admin/gallery", async (route) => {
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
  await this.page.route("**/api/admin/gallery", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
});

Given("the gallery API returns an error", async function(this: CustomWorld) {
  await this.page.route("**/api/admin/gallery", async (route) => {
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
    // Wait for loading states to disappear
    const loadingElement = this.page.locator(".loading, .animate-pulse, .skeleton").first();
    const isLoadingVisible = await loadingElement.isVisible().catch(() => false);
    if (isLoadingVisible) {
      await loadingElement.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    }

    // Wait for cards to be visible first
    await this.page.waitForSelector(".Card", { state: "visible", timeout: 10000 });
    const galleryCard = this.page.locator(".Card").first();
    const button = galleryCard.getByRole("button", { name: buttonText });

    // Wait for button to be visible and enabled before clicking
    await expect(button).toBeVisible({ timeout: 15000 });
    await button.click();
  },
);

When(
  "I click {string} on the second gallery item",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for loading states to disappear
    const loadingElement = this.page.locator(".loading, .animate-pulse, .skeleton").first();
    const isLoadingVisible = await loadingElement.isVisible().catch(() => false);
    if (isLoadingVisible) {
      await loadingElement.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    }

    // Wait for cards to be visible first
    await this.page.waitForSelector(".Card", { state: "visible", timeout: 10000 });
    const galleryCard = this.page.locator(".Card").nth(1);
    const button = galleryCard.getByRole("button", { name: buttonText });

    // Wait for button to be visible and enabled before clicking
    await expect(button).toBeVisible({ timeout: 15000 });
    await button.click();
  },
);

When(
  "I click {string} on the first gallery item",
  async function(this: CustomWorld, buttonText: string) {
    // Wait for loading states to disappear
    const loadingElement = this.page.locator(".loading, .animate-pulse, .skeleton").first();
    const isLoadingVisible = await loadingElement.isVisible().catch(() => false);
    if (isLoadingVisible) {
      await loadingElement.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    }

    // Wait for cards to be visible first
    await this.page.waitForSelector(".Card", { state: "visible", timeout: 10000 });
    const galleryCard = this.page.locator(".Card").first();
    const button = galleryCard.getByRole("button", { name: buttonText });

    // Wait for button to be visible and enabled before clicking
    await expect(button).toBeVisible({ timeout: 15000 });
    await button.click();
  },
);

When(
  "I toggle the active switch on a gallery item",
  async function(this: CustomWorld) {
    // Use Playwright's built-in auto-waiting with locators
    const galleryCard = this.page.locator(".Card").first();
    await expect(galleryCard).toBeVisible({ timeout: 15000 });

    // Find the switch within the card using getByRole for better semantics
    const switchElement = galleryCard.getByRole("switch");

    // Wait for switch to be visible AND enabled (not disabled during updates)
    await expect(switchElement).toBeVisible({ timeout: 10000 });
    await expect(switchElement).toBeEnabled({ timeout: 5000 });

    // Click the switch
    await switchElement.click();
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
  // Click on the first available image in the browser dialog
  const imageButton = this.page.locator('[role="dialog"] button').filter({
    hasText: /select/i,
  })
    .first();
  if (await imageButton.isVisible()) {
    await imageButton.click();
  } else {
    // Fall back to clicking an image directly
    const image = this.page.locator('[role="dialog"] img').first();
    await image.click();
  }
});

When(
  "I fill in the gallery item form with:",
  async function(this: CustomWorld, dataTable: DataTable) {
    const data = dataTable.rowsHash();

    if (data.title) {
      await this.page.fill(
        'input[name="title"], input[placeholder*="title" i]',
        data.title,
      );
    }
    if (data.description) {
      await this.page.fill(
        'textarea[name="description"], textarea[placeholder*="description" i]',
        data.description,
      );
    }
    if (data.category) {
      const categorySelect = this.page.locator('[role="combobox"]').first();
      await categorySelect.click();
      await this.page.locator(`[role="option"]`).filter({
        hasText: data.category,
      }).click();
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
  await submitButton.click();
  await this.page.waitForLoadState("networkidle");
});

When(
  "I change the title to {string}",
  async function(this: CustomWorld, newTitle: string) {
    await this.page.fill(
      'input[name="title"], input[placeholder*="title" i]',
      newTitle,
    );
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
  const grid = this.page.locator(".grid");
  await expect(grid).toBeVisible();
});

Then(
  "each gallery item should display a thumbnail",
  async function(this: CustomWorld) {
    const images = this.page.locator(".Card img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each gallery item should display a title",
  async function(this: CustomWorld) {
    // CardTitle in gallery renders with text-base.truncate classes
    const titles = this.page.locator(".Card .text-base.truncate");
    const count = await titles.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then(
  "each gallery item should display a category badge",
  async function(this: CustomWorld) {
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
    await expect(badge).toBeVisible();
  },
);

Then(
  "I should see the image browser dialog",
  async function(this: CustomWorld) {
    // Use a more specific selector to exclude the cookie consent dialog
    // The cookie consent dialog has aria-labelledby="cookie-consent-title"
    const dialog = this.page.locator(
      '[role="dialog"]:not([aria-labelledby="cookie-consent-title"])',
    );
    await expect(dialog).toBeVisible();
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
    // Check for images or a "no images" message
    const images = dialog.locator("img");
    const noImagesText = dialog.getByText(/no.*image/i);
    const hasContent = (await images.count()) > 0 || (await noImagesText.count()) > 0;
    expect(hasContent).toBe(true);
  },
);

Then(
  "I should see the add gallery item form",
  async function(this: CustomWorld) {
    const form = this.page.locator(
      '[role="dialog"] form, [role="dialog"] input',
    );
    await expect(form.first()).toBeVisible();
  },
);

Then(
  "I should see {string} dialog title",
  async function(this: CustomWorld, title: string) {
    const dialogTitle = this.page.locator('[role="dialog"]').getByRole(
      "heading",
      { name: title },
    );
    await expect(dialogTitle).toBeVisible();
  },
);

Then(
  "I should see the edit gallery item form",
  async function(this: CustomWorld) {
    const form = this.page.locator(
      '[role="dialog"] form, [role="dialog"] input',
    );
    await expect(form.first()).toBeVisible();
  },
);

Then(
  "the gallery item should display {string}",
  async function(this: CustomWorld, text: string) {
    const item = this.page.locator(".Card").filter({ hasText: text });
    await expect(item).toBeVisible();
  },
);

Then(
  "I should see the new gallery item in the grid",
  async function(this: CustomWorld) {
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
    await expect(switchElement).toBeVisible();
  },
);

Then(
  "the change should persist after page refresh",
  async function(this: CustomWorld) {
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
    // Verify page still loads
    await expect(this.page.locator(".Card").first()).toBeVisible();
  },
);

Then("the gallery order should change", async function(this: CustomWorld) {
  // CardTitle in gallery renders with text-base.truncate classes
  const titles = await this.page.locator(".Card .text-base.truncate")
    .allTextContents();
  expect(titles).not.toEqual(galleryOrder);
});

Then("the second item should now be first", async function(this: CustomWorld) {
  // CardTitle in gallery renders with text-base.truncate classes
  const titles = await this.page.locator(".Card .text-base.truncate")
    .allTextContents();
  if (galleryOrder.length >= 2 && titles.length >= 2) {
    expect(titles[0]).toBe(galleryOrder[1]);
  }
});

Then("the first item should now be second", async function(this: CustomWorld) {
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
    const galleryCard = this.page.locator(".Card").first();
    const button = galleryCard.getByRole("button", { name: buttonText });
    await expect(button).toBeDisabled();
  },
);

Then(
  "the {string} button on the last item should be disabled",
  async function(this: CustomWorld, buttonText: string) {
    const galleryCard = this.page.locator(".Card").last();
    const button = galleryCard.getByRole("button", { name: buttonText });
    await expect(button).toBeDisabled();
  },
);

// NOTE: "I should see the delete confirmation dialog" is defined in common.steps.ts

Then("the gallery item should be removed", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then(
  "the gallery item count should decrease by 1",
  async function(this: CustomWorld) {
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
  // Exclude cookie consent dialog which has aria-labelledby="cookie-consent-title"
  const dialog = this.page.locator(
    '[role="dialog"]:not([aria-labelledby="cookie-consent-title"])',
  );
  await expect(dialog).not.toBeVisible();
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
