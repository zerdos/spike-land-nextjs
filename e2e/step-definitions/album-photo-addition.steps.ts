import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Mock data
const mockImage = {
  id: "test-image-123",
  name: "Test Image",
  userId: "user-123",
  originalUrl: "https://example.com/original.jpg",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  enhancementJobs: [
    {
      id: "job-123",
      imageId: "test-image-123",
      tier: "TIER_1K",
      status: "COMPLETED",
      enhancedUrl: "https://example.com/enhanced.jpg",
      width: 1920,
      height: 1080,
      fileSize: 500000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: null,
    },
  ],
};

const mockAlbums = [
  { id: "album-1", name: "Vacation Photos", imageCount: 5 },
  { id: "album-2", name: "Work Screenshots", imageCount: 12 },
];

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

// Helper to mock images list
async function mockImagesList(world: CustomWorld) {
  await world.page.route("**/api/images", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ images: [mockImage] }),
      });
    } else {
      await route.continue();
    }
  });
}

// Helper to mock albums list
async function mockAlbumsList(world: CustomWorld, albums: typeof mockAlbums = mockAlbums) {
  await world.page.route("**/api/albums", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ albums }),
      });
    } else {
      await route.continue();
    }
  });
}

// Given steps
Given("I have uploaded images with enhancement jobs", async function(this: CustomWorld) {
  await mockImagesList(this);
  await mockTokenBalance(this, 10);
});

Given("I have albums", async function(this: CustomWorld) {
  await mockAlbumsList(this, mockAlbums);
});

Given("I have no albums", async function(this: CustomWorld) {
  await mockAlbumsList(this, []);
});

Given("I mock successful album image addition", async function(this: CustomWorld) {
  await this.page.route("**/api/albums/*/images", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          added: 1,
          results: [{ imageId: mockImage.id, success: true, albumImageId: "album-image-1" }],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

Given("I mock album addition returns already exists", async function(this: CustomWorld) {
  await this.page.route("**/api/albums/*/images", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          added: 0,
          results: [{ imageId: mockImage.id, success: false, reason: "already_in_album" }],
        }),
      });
    } else {
      await route.continue();
    }
  });
});

// When steps
When("I click the Add to Album button on an image", async function(this: CustomWorld) {
  const addToAlbumButton = this.page.getByRole("button", { name: /add to album/i }).first();
  await expect(addToAlbumButton).toBeVisible();
  await addToAlbumButton.click();
  await this.page.waitForTimeout(300);
});

When("I select an album from the dropdown", async function(this: CustomWorld) {
  // Wait for the dropdown to be ready
  const selectTrigger = this.page.getByText("Select an album");
  await expect(selectTrigger).toBeVisible();
  await selectTrigger.click();

  // Wait for dropdown to open and select an album
  await this.page.waitForTimeout(200);
  const albumOption = this.page.getByText("Vacation Photos");
  await expect(albumOption).toBeVisible();
  await albumOption.click();
  await this.page.waitForTimeout(200);
});

When("I click the Add to Album confirm button", async function(this: CustomWorld) {
  // Find the Add to Album button inside the dialog
  const dialog = this.page.getByRole("dialog");
  const confirmButton = dialog.getByRole("button", { name: /add to album/i });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await this.page.waitForTimeout(500);
});

When("I click the Cancel button in the modal", async function(this: CustomWorld) {
  const cancelButton = this.page.getByRole("button", { name: /cancel/i });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();
  await this.page.waitForTimeout(200);
});

// Then steps
Then("I should see the Add to Album button for each image", async function(this: CustomWorld) {
  const addToAlbumButtons = this.page.getByRole("button", { name: /add to album/i });
  await expect(addToAlbumButtons.first()).toBeVisible();
});

Then("I should see the Add to Album modal", async function(this: CustomWorld) {
  const dialog = this.page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const title = dialog.getByRole("heading", { name: /add to album/i });
  await expect(title).toBeVisible();
});

Then("I should see the album selection dropdown", async function(this: CustomWorld) {
  const selectTrigger = this.page.getByText("Select an album");
  await expect(selectTrigger).toBeVisible();
});

Then("I should see a success toast notification", async function(this: CustomWorld) {
  // Look for the toast container/message
  const toast = this.page.getByText(/added to/i).or(this.page.locator("[data-sonner-toast]"));
  await expect(toast.first()).toBeVisible({ timeout: 5000 });
});

Then("the modal should close", async function(this: CustomWorld) {
  const dialog = this.page.getByRole("dialog");
  await expect(dialog).not.toBeVisible();
});

Then("I should see the empty albums message", async function(this: CustomWorld) {
  const emptyMessage = this.page.getByText(/you don't have any albums yet/i);
  await expect(emptyMessage).toBeVisible();
});

Then("I should see a link to create an album", async function(this: CustomWorld) {
  const createLink = this.page.getByRole("link", { name: /create album/i });
  await expect(createLink).toBeVisible();
});

Then("I should see an info toast about image already in album", async function(this: CustomWorld) {
  const toast = this.page.getByText(/already in this album/i).or(
    this.page.locator("[data-sonner-toast]"),
  );
  await expect(toast.first()).toBeVisible({ timeout: 5000 });
});
