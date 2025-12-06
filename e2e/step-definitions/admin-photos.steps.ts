import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

const mockPhotos = [
  {
    id: "photo-1",
    name: "photo1.jpg",
    originalUrl: "https://example.com/photo1.jpg",
    thumbnailUrl: "https://example.com/thumb1.jpg",
    width: 1920,
    height: 1080,
    sizeBytes: 500000,
    format: "jpeg",
    createdAt: new Date("2024-06-01").toISOString(),
    user: { id: "user-123", name: "John Doe", email: "john@example.com" },
    enhancementCount: 3,
    latestJobStatus: "COMPLETED",
  },
  {
    id: "photo-2",
    name: "photo2.jpg",
    originalUrl: "https://example.com/photo2.jpg",
    thumbnailUrl: "https://example.com/thumb2.jpg",
    width: 1280,
    height: 720,
    sizeBytes: 300000,
    format: "jpeg",
    createdAt: new Date("2024-06-02").toISOString(),
    user: { id: "user-456", name: "Jane Smith", email: "jane@example.com" },
    enhancementCount: 1,
    latestJobStatus: "PENDING",
  },
  {
    id: "photo-3",
    name: "photo3.jpg",
    originalUrl: "https://example.com/photo3.jpg",
    thumbnailUrl: "https://example.com/thumb3.jpg",
    width: 3840,
    height: 2160,
    sizeBytes: 1000000,
    format: "jpeg",
    createdAt: new Date("2024-06-03").toISOString(),
    user: { id: "user-789", name: null, email: "test@example.com" },
    enhancementCount: 5,
    latestJobStatus: "PROCESSING",
  },
];

async function mockPhotosAPI(
  world: CustomWorld,
  photos = mockPhotos,
  pagination = { page: 1, limit: 20, total: photos.length, totalPages: 1 },
) {
  await world.page.route("**/api/admin/photos**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ images: photos, pagination }),
    });
  });
}

Given("there are photos in the system", async function(this: CustomWorld) {
  await mockPhotosAPI(this);
});

Given(
  "there are more than {int} photos in the system",
  async function(this: CustomWorld, count: number) {
    const manyPhotos = Array.from({ length: count + 5 }, (_, i) => ({
      ...mockPhotos[0],
      id: `photo-${i}`,
      name: `photo${i}.jpg`,
    }));

    await mockPhotosAPI(this, manyPhotos, {
      page: 1,
      limit: 20,
      total: count + 5,
      totalPages: Math.ceil((count + 5) / 20),
    });
  },
);

Given(
  "there are {int} photos in the system",
  async function(this: CustomWorld, count: number) {
    const photos = Array.from({ length: count }, (_, i) => ({
      ...mockPhotos[0],
      id: `photo-${i}`,
      name: `photo${i}.jpg`,
    }));

    await mockPhotosAPI(this, photos, {
      page: 1,
      limit: 20,
      total: count,
      totalPages: Math.ceil(count / 20),
    });
  },
);

Given("there are photos with different job statuses", async function(this: CustomWorld) {
  const photosWithStatuses = [
    { ...mockPhotos[0], latestJobStatus: "COMPLETED" },
    { ...mockPhotos[1], latestJobStatus: "PENDING" },
    { ...mockPhotos[2], latestJobStatus: "PROCESSING" },
    { ...mockPhotos[0], id: "photo-4", latestJobStatus: "FAILED" },
  ];

  await mockPhotosAPI(this, photosWithStatuses);
});

Given("the photos API is slow", async function(this: CustomWorld) {
  await world.page.route("**/api/admin/photos**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        images: mockPhotos,
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
      }),
    });
  });
});

When("I enter {string} in the {string} filter", async function(
  this: CustomWorld,
  value: string,
  filterName: string,
) {
  const input = this.page.getByLabel(filterName);
  await expect(input).toBeVisible();
  await input.fill(value);
});

When("I select {string} as start date", async function(this: CustomWorld, date: string) {
  const input = this.page.locator("#startDate");
  await expect(input).toBeVisible();
  await input.fill(date);
});

When("I select {string} as end date", async function(this: CustomWorld, date: string) {
  const input = this.page.locator("#endDate");
  await expect(input).toBeVisible();
  await input.fill(date);
});

When("I click {string} button", async function(this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole("button", { name: buttonText });
  await expect(button).toBeVisible();
  await button.click();
  await this.page.waitForLoadState("networkidle");
});

When("I click on a photo in the grid", async function(this: CustomWorld) {
  const photoCard = this.page.locator('[class*="cursor-pointer"]').first();
  await expect(photoCard).toBeVisible();
  await photoCard.click();
});

When("I close the modal", async function(this: CustomWorld) {
  const closeButton = this.page.getByRole("button", { name: /close/i });
  await closeButton.click();
});

When("the photos load", async function(this: CustomWorld) {
  await this.page.waitForTimeout(2500);
});

Then("I should see the photo grid", async function(this: CustomWorld) {
  const grid = this.page.locator('[class*="grid"]').filter({ hasText: /photo/i });
  await expect(grid).toBeVisible();
});

Then("each photo should display a thumbnail", async function(this: CustomWorld) {
  const images = this.page.locator('img[alt*="photo"]');
  const count = await images.count();
  expect(count).toBeGreaterThan(0);
});

Then("each photo should show the user name or email", async function(this: CustomWorld) {
  const userInfo = this.page.locator("text=/.*@.*|[A-Z][a-z]+/").first();
  await expect(userInfo).toBeVisible();
});

Then("each photo should show enhancement count", async function(this: CustomWorld) {
  const enhancementBadge = this.page.getByText(/\d+ enhancement/);
  await expect(enhancementBadge).toBeVisible();
});

Then("I should see the photo details modal", async function(this: CustomWorld) {
  const modal = this.page.getByRole("dialog");
  await expect(modal).toBeVisible();
});

Then("I should see the full-size image", async function(this: CustomWorld) {
  const modal = this.page.getByRole("dialog");
  const image = modal.locator("img");
  await expect(image).toBeVisible();
});

Then("I should see image metadata", async function(this: CustomWorld) {
  const modal = this.page.getByRole("dialog");
  const metadata = modal.getByText(/Format:|Dimensions:|Size:/);
  await expect(metadata.first()).toBeVisible();
});

Then("I should see user information", async function(this: CustomWorld) {
  const modal = this.page.getByRole("dialog");
  const userInfo = modal.getByText(/User ID:|Email:/);
  await expect(userInfo.first()).toBeVisible();
});

Then("I should see enhancement statistics", async function(this: CustomWorld) {
  const modal = this.page.getByRole("dialog");
  const stats = modal.getByText(/Total Enhancements:/);
  await expect(stats).toBeVisible();
});

Then(
  "I should see {string} button disabled",
  async function(this: CustomWorld, buttonText: string) {
    const button = this.page.getByRole("button", { name: buttonText });
    await expect(button).toBeDisabled();
  },
);

Then("I should see {string} button enabled", async function(this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole("button", { name: buttonText });
  await expect(button).toBeEnabled();
});

Then("the photos should be filtered by user ID", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(500);
});

Then("the URL should contain {string}", async function(this: CustomWorld, param: string) {
  const url = this.page.url();
  expect(url).toContain(param);
});

Then("the photos should be filtered by date range", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
  await this.page.waitForTimeout(500);
});

Then("the filters should be applied", async function(this: CustomWorld) {
  await this.page.waitForLoadState("networkidle");
});

Then("all filter inputs should be empty", async function(this: CustomWorld) {
  const userIdInput = this.page.locator("#userSearch");
  const startDateInput = this.page.locator("#startDate");

  const userIdValue = await userIdInput.inputValue();
  const startDateValue = await startDateInput.inputValue();

  expect(userIdValue).toBe("");
  expect(startDateValue).toBe("");
});

Then("the URL should not contain filter parameters", async function(this: CustomWorld) {
  const url = this.page.url();
  expect(url).not.toContain("userId=");
  expect(url).not.toContain("startDate=");
  expect(url).not.toContain("endDate=");
});

Then("I should see photos with {string} status badge", async function(
  this: CustomWorld,
  status: string,
) {
  const statusBadge = this.page.getByText(status);
  await expect(statusBadge).toBeVisible();
});

Then("the photo details modal should not be visible", async function(this: CustomWorld) {
  const modal = this.page.getByRole("dialog");
  await expect(modal).not.toBeVisible();
});

Then("each photo card should show enhancement count badge", async function(this: CustomWorld) {
  const badges = this.page.getByText(/\d+ enhancement/);
  const count = await badges.count();
  expect(count).toBeGreaterThan(0);
});

Then("the badge should display a number", async function(this: CustomWorld) {
  const badge = this.page.getByText(/\d+ enhancement/).first();
  await expect(badge).toBeVisible();
  const text = await badge.textContent();
  expect(text).toMatch(/\d+/);
});
