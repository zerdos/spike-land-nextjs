import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// ============================================================================
// TYPES AND MOCK DATA
// ============================================================================

interface MockAlbum {
  id: string;
  name: string;
  description: string | null;
  privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
  shareToken: string | null;
  imageCount: number;
  previewImages: Array<{ id: string; url: string; name: string; }>;
  createdAt: string;
  updatedAt: string;
}

interface MockImage {
  id: string;
  name: string;
  description: string | null;
  originalUrl: string;
  enhancedUrl: string | null;
  enhancementTier: string | null;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
}

// Storage for test state
interface TestState {
  albums: MockAlbum[];
  images: MockImage[];
  currentAlbum?: MockAlbum;
  shareToken?: string;
  isApiAvailable: boolean;
  validationError?: string;
  lastCreatedAlbumName?: string;
}

// Initialize test state in world
declare module "../support/world" {
  interface CustomWorld {
    testState?: TestState;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function initTestState(world: CustomWorld): TestState {
  if (!world.testState) {
    world.testState = {
      albums: [],
      images: [],
      isApiAvailable: true,
    };
  }
  return world.testState;
}

function createMockAlbum(
  name: string,
  imageCount = 0,
  privacy: "PRIVATE" | "UNLISTED" | "PUBLIC" = "PRIVATE",
): MockAlbum {
  const id = `album-${Date.now()}-${Math.random()}`;
  return {
    id,
    name,
    description: null,
    privacy,
    shareToken: privacy !== "PRIVATE" ? `share-${id}` : null,
    imageCount,
    previewImages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createMockImage(_albumId?: string): MockImage {
  const id = `image-${Date.now()}-${Math.random()}`;
  return {
    id,
    name: `photo-${id}.jpg`,
    description: null,
    originalUrl: `https://example.com/original-${id}.jpg`,
    enhancedUrl: `https://example.com/enhanced-${id}.jpg`,
    enhancementTier: "TIER_1K",
    width: 1920,
    height: 1080,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  };
}

async function mockAlbumsAPI(world: CustomWorld) {
  const state = initTestState(world);

  // Mock GET /api/albums - List albums
  await world.page.route("**/api/albums", async (route) => {
    if (!state.isApiAvailable) {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Service unavailable" }),
      });
      return;
    }

    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ albums: state.albums }),
      });
    } else if (route.request().method() === "POST") {
      const body = await route.request().postDataJSON();

      // Validation
      if (!body.name || body.name.trim().length === 0) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Album name is required" }),
        });
        return;
      }

      if (body.name.length > 100) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Album name must be 100 characters or less",
          }),
        });
        return;
      }

      // Create album
      const newAlbum = createMockAlbum(body.name, 0, body.privacy || "PRIVATE");
      newAlbum.description = body.description || null;
      state.albums.push(newAlbum);
      state.lastCreatedAlbumName = newAlbum.name;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          album: {
            id: newAlbum.id,
            name: newAlbum.name,
            description: newAlbum.description,
            privacy: newAlbum.privacy,
            shareToken: newAlbum.shareToken,
            createdAt: newAlbum.createdAt,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/albums/[id] - Get album details
  await world.page.route("**/api/albums/*", async (route) => {
    if (!state.isApiAvailable) {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Service unavailable" }),
      });
      return;
    }

    const url = route.request().url();
    const albumId = url.split("/albums/")[1]?.split("?")[0]?.split("/")[0];
    if (!albumId) {
      await route.continue();
      return;
    }
    const album = state.albums.find((a) => a.id === albumId);

    if (route.request().method() === "GET") {
      if (!album) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Album not found" }),
        });
        return;
      }

      const albumImages = state.images
        .filter((img) => img.id.includes(albumId))
        .map((img, index) => ({ ...img, sortOrder: index }));

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          album: {
            ...album,
            images: albumImages,
            isOwner: true,
          },
        }),
      });
    } else if (route.request().method() === "PATCH") {
      if (!album) {
        await route.fulfill({
          status: 404,
          body: JSON.stringify({ error: "Album not found" }),
        });
        return;
      }

      const body = await route.request().postDataJSON();

      // Update album
      if (body.name !== undefined) {
        if (!body.name || body.name.trim().length === 0) {
          await route.fulfill({
            status: 400,
            body: JSON.stringify({ error: "Album name is required" }),
          });
          return;
        }
        album.name = body.name;
      }

      if (body.description !== undefined) {
        album.description = body.description || null;
      }

      if (body.privacy !== undefined) {
        album.privacy = body.privacy;
        if (body.privacy !== "PRIVATE" && !album.shareToken) {
          album.shareToken = `share-${album.id}`;
        }
        if (body.privacy === "PRIVATE") {
          album.shareToken = null;
        }
      }

      album.updatedAt = new Date().toISOString();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          album: {
            id: album.id,
            name: album.name,
            description: album.description,
            privacy: album.privacy,
            shareToken: album.shareToken,
            updatedAt: album.updatedAt,
          },
        }),
      });
    } else if (route.request().method() === "DELETE") {
      if (!album) {
        await route.fulfill({
          status: 404,
          body: JSON.stringify({ error: "Album not found" }),
        });
        return;
      }

      state.albums = state.albums.filter((a) => a.id !== albumId);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET /api/images - List user images
  await world.page.route("**/api/images", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ images: state.images }),
      });
    } else {
      await route.continue();
    }
  });
}

// ============================================================================
// GIVEN STEPS - Setup test state
// ============================================================================

Given(
  "I have an album named {string}",
  async function(this: CustomWorld, albumName: string) {
    const state = initTestState(this);
    await mockAlbumsAPI(this);

    const album = createMockAlbum(albumName);
    state.albums.push(album);
    state.currentAlbum = album;
  },
);

Given(
  "I have an album named {string} with {int} images",
  async function(this: CustomWorld, albumName: string, imageCount: number) {
    const state = initTestState(this);
    await mockAlbumsAPI(this);

    const album = createMockAlbum(albumName, imageCount);
    state.albums.push(album);
    state.currentAlbum = album;

    // Create mock images for this album
    for (let i = 0; i < imageCount; i++) {
      const image = createMockImage(album.id);
      state.images.push(image);
    }
  },
);

Given(
  "I have a private album named {string}",
  async function(this: CustomWorld, albumName: string) {
    const state = initTestState(this);
    await mockAlbumsAPI(this);

    const album = createMockAlbum(albumName, 0, "PRIVATE");
    state.albums.push(album);
    state.currentAlbum = album;
  },
);

Given(
  "I have an unlisted album named {string} with images",
  async function(this: CustomWorld, albumName: string) {
    const state = initTestState(this);
    await mockAlbumsAPI(this);

    const album = createMockAlbum(albumName, 3, "UNLISTED");
    state.albums.push(album);
    state.currentAlbum = album;

    // Create mock images
    for (let i = 0; i < 3; i++) {
      state.images.push(createMockImage(album.id));
    }
  },
);

Given(
  "I have {int} enhanced images not in any album",
  async function(this: CustomWorld, imageCount: number) {
    const state = initTestState(this);

    for (let i = 0; i < imageCount; i++) {
      state.images.push(createMockImage());
    }
  },
);

Given("the album has been shared via URL", async function(this: CustomWorld) {
  const state = initTestState(this);
  if (state.currentAlbum && state.currentAlbum.shareToken) {
    state.shareToken = state.currentAlbum.shareToken;
  }
});

Given("another user has a private album", async function(this: CustomWorld) {
  // This album won't be in the user's list, so when accessed it will return 404
  initTestState(this);
  await mockAlbumsAPI(this);
});

Given("another user has a public album", async function(this: CustomWorld) {
  // Mock a public album but as read-only (isOwner: false)
  initTestState(this);
  await mockAlbumsAPI(this);

  await this.page.route("**/api/albums/other-user-album", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          album: {
            id: "other-user-album",
            name: "Other User's Album",
            privacy: "PUBLIC",
            images: [],
            imageCount: 0,
            isOwner: false,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 403,
        body: JSON.stringify({ error: "Forbidden" }),
      });
    }
  });
});

Given("the API is temporarily unavailable", async function(this: CustomWorld) {
  const state = initTestState(this);
  state.isApiAvailable = false;
  await mockAlbumsAPI(this);
});

// ============================================================================
// WHEN STEPS - User actions
// ============================================================================

When(
  "I navigate to {string} page",
  async function(this: CustomWorld, path: string) {
    await mockAlbumsAPI(this);
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  },
);

When("I navigate to the album", async function(this: CustomWorld) {
  const state = initTestState(this);
  if (!state.currentAlbum) {
    throw new Error("No current album set in test state");
  }

  await this.page.goto(`/albums/${state.currentAlbum.id}`);
  await this.page.waitForLoadState("networkidle");
});

When(
  "I navigate to the album using share token",
  async function(this: CustomWorld) {
    const state = initTestState(this);
    if (!state.currentAlbum?.shareToken) {
      throw new Error("No share token available");
    }

    await this.page.goto(
      `/albums/${state.currentAlbum.id}?token=${state.currentAlbum.shareToken}`,
    );
    await this.page.waitForLoadState("networkidle");
  },
);

When(
  "I enter {string} as the album name",
  async function(this: CustomWorld, name: string) {
    const nameInput = this.page.locator(
      'input[name="name"], input[placeholder*="name" i]',
    ).first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);
  },
);

When(
  "I enter {string} as the album description",
  async function(this: CustomWorld, description: string) {
    const descInput = this.page.locator(
      'textarea[name="description"], input[name="description"], textarea[placeholder*="description" i]',
    ).first();
    await expect(descInput).toBeVisible();
    await descInput.fill(description);
  },
);

When("I leave the album name empty", async function(this: CustomWorld) {
  const nameInput = this.page.locator(
    'input[name="name"], input[placeholder*="name" i]',
  ).first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill("");
});

When(
  "I enter a name longer than 100 characters",
  async function(this: CustomWorld) {
    const longName = "a".repeat(101);
    const nameInput = this.page.locator(
      'input[name="name"], input[placeholder*="name" i]',
    ).first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(longName);
  },
);

When("I confirm album creation", async function(this: CustomWorld) {
  const createButton = this.page.getByRole("button", {
    name: /create|save|confirm/i,
  });
  await expect(createButton).toBeVisible();
  await createButton.click();
  await this.page.waitForTimeout(500);
});

When("I open album settings", async function(this: CustomWorld) {
  const settingsButton = this.page.getByRole("button", {
    name: /settings|edit|manage/i,
  }).first();
  await expect(settingsButton).toBeVisible();
  await settingsButton.click();
  await this.page.waitForTimeout(300);
});

When(
  "I change the album name to {string}",
  async function(this: CustomWorld, newName: string) {
    const nameInput = this.page.locator(
      'input[name="name"], input[placeholder*="name" i]',
    ).first();
    await expect(nameInput).toBeVisible();
    await nameInput.clear();
    await nameInput.fill(newName);
  },
);

When(
  "I change the description to {string}",
  async function(this: CustomWorld, newDesc: string) {
    const descInput = this.page.locator(
      'textarea[name="description"], input[name="description"]',
    ).first();
    await expect(descInput).toBeVisible();
    await descInput.clear();
    await descInput.fill(newDesc);
  },
);

When(
  "I change privacy to {string}",
  async function(this: CustomWorld, privacy: string) {
    // Look for radio buttons, select dropdown, or privacy toggle
    const privacyControl = this.page.locator(
      `input[type="radio"][value="${privacy.toUpperCase()}"], select[name="privacy"]`,
    ).first();

    if (await privacyControl.isVisible()) {
      await privacyControl.click();
    } else {
      // Try finding a button or label with the privacy level
      const privacyOption = this.page.getByText(new RegExp(privacy, "i"))
        .first();
      await privacyOption.click();
    }

    await this.page.waitForTimeout(300);
  },
);

When("I save the changes", async function(this: CustomWorld) {
  const saveButton = this.page.getByRole("button", {
    name: /save|update|confirm/i,
  });
  await expect(saveButton).toBeVisible();
  await saveButton.click();
  await this.page.waitForTimeout(500);
});

// NOTE: "I confirm the deletion" is defined in common.steps.ts

When("I copy the shareable URL", async function(this: CustomWorld) {
  const state = initTestState(this);
  const shareUrlElement = this.page.locator("input[readonly], code, pre")
    .filter({
      hasText: /albums\//,
    }).first();

  if (await shareUrlElement.isVisible()) {
    const shareUrl = await shareUrlElement.textContent();
    state.shareToken = shareUrl || undefined;
  }
});

When(
  "I open the URL in an incognito window",
  async function(this: CustomWorld) {
    const state = initTestState(this);

    // Create a new incognito context
    const incognitoContext = await this.browser.newContext({
      baseURL: this.baseUrl,
    });

    const incognitoPage = await incognitoContext.newPage();

    if (state.currentAlbum) {
      await incognitoPage.goto(`/albums/${state.currentAlbum.id}`);
      await incognitoPage.waitForLoadState("networkidle");
    }

    // Store for verification
    this.page = incognitoPage;
  },
);

When(
  "I attempt to access the album via share URL as anonymous user",
  async function(this: CustomWorld) {
    const state = initTestState(this);

    // Clear authentication
    await this.page.context().clearCookies();

    if (state.currentAlbum) {
      await this.page.goto(`/albums/${state.currentAlbum.id}`);
      await this.page.waitForLoadState("networkidle");
    }
  },
);

When(
  "someone tries to access the old share URL",
  async function(this: CustomWorld) {
    const state = initTestState(this);

    if (state.currentAlbum) {
      await this.page.goto(`/albums/${state.currentAlbum.id}`);
      await this.page.waitForLoadState("networkidle");
    }
  },
);

When(
  "I select {int} image from my library",
  async function(this: CustomWorld, count: number) {
    await this.page.waitForTimeout(300);
    const imageCheckboxes = this.page.locator('input[type="checkbox"]').or(
      this.page.locator('[role="checkbox"]'),
    );

    const visibleCount = await imageCheckboxes.count();
    const selectCount = Math.min(count, visibleCount);

    for (let i = 0; i < selectCount; i++) {
      await imageCheckboxes.nth(i).click();
    }
  },
);

When(
  "I select {int} images from my library",
  async function(this: CustomWorld, count: number) {
    await this.page.waitForTimeout(300);
    const imageCheckboxes = this.page.locator('input[type="checkbox"]').or(
      this.page.locator('[role="checkbox"]'),
    );

    const visibleCount = await imageCheckboxes.count();
    const selectCount = Math.min(count, visibleCount);

    for (let i = 0; i < selectCount; i++) {
      await imageCheckboxes.nth(i).click();
    }
  },
);

When("I confirm the selection", async function(this: CustomWorld) {
  const confirmButton = this.page.getByRole("button", {
    name: /add|confirm|save/i,
  });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await this.page.waitForTimeout(500);
});

When(
  "I select the image that is already in the album",
  async function(this: CustomWorld) {
    await this.page.waitForTimeout(300);
    const firstImage = this.page.locator('input[type="checkbox"]').or(
      this.page.locator('[role="checkbox"]'),
    ).first();
    await firstImage.click();
  },
);

When("I select an image", async function(this: CustomWorld) {
  const imageCard = this.page.locator('[data-testid="album-image"], img')
    .first();
  await expect(imageCard).toBeVisible();
  await imageCard.click();
  await this.page.waitForTimeout(300);
});

// NOTE: "I click {string} button" is defined in common.steps.ts

When("I confirm removal", async function(this: CustomWorld) {
  const confirmButton = this.page.getByRole("button", {
    name: /remove|confirm|yes/i,
  });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await this.page.waitForTimeout(500);
});

When("I try to navigate to that album", async function(this: CustomWorld) {
  await this.page.goto("/albums/other-user-album");
  await this.page.waitForLoadState("networkidle");
});

When("I try to access the album settings", async function(this: CustomWorld) {
  await this.page.goto("/albums/other-user-album");
  await this.page.waitForLoadState("networkidle");
});

When("I try to create a new album", async function(this: CustomWorld) {
  await mockAlbumsAPI(this);
  await this.page.goto("/albums");
  await this.page.waitForLoadState("networkidle");

  const createButton = this.page.getByRole("button", { name: /create album/i });
  if (await createButton.isVisible()) {
    await createButton.click();
    await this.page.waitForTimeout(300);
  }
});

When("I try to delete the album", async function(this: CustomWorld) {
  const state = initTestState(this);

  if (state.currentAlbum) {
    await this.page.goto(`/albums/${state.currentAlbum.id}`);
    await this.page.waitForLoadState("networkidle");

    const settingsButton = this.page.getByRole("button", { name: /settings/i })
      .first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await this.page.waitForTimeout(300);

      const deleteButton = this.page.getByRole("button", { name: /delete/i });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await this.page.waitForTimeout(300);
      }
    }
  }
});

// ============================================================================
// THEN STEPS - Assertions
// ============================================================================

Then(
  "I should see the new album {string} in my albums list",
  async function(this: CustomWorld, albumName: string) {
    initTestState(this);

    // Navigate to albums list if not already there
    if (!this.page.url().includes("/albums")) {
      await this.page.goto("/albums");
      await this.page.waitForLoadState("networkidle");
    }

    const albumCard = this.page.getByText(albumName);
    await expect(albumCard).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "the album should show {int} images",
  async function(this: CustomWorld, count: number) {
    const imageCountText = this.page.getByText(
      new RegExp(`${count}\\s*(image|photo)`),
    );
    await expect(imageCountText).toBeVisible();
  },
);

Then(
  "the album description should be {string}",
  async function(this: CustomWorld, description: string) {
    const descElement = this.page.getByText(description);
    await expect(descElement).toBeVisible();
  },
);

Then(
  "I should see a validation error for album name",
  async function(this: CustomWorld) {
    const errorMessage = this.page.locator(
      '[role="alert"], .error, [class*="error"]',
    ).filter({
      hasText: /name.*required|required.*name/i,
    });
    await expect(errorMessage).toBeVisible();
  },
);

Then("the album should not be created", async function(this: CustomWorld) {
  initTestState(this);

  // If we tried to navigate, check we're still on the same page
  await this.page.waitForTimeout(500);

  // The modal/form should still be visible
  const form = this.page.locator('[role="dialog"], form');
  await expect(form).toBeVisible();
});

Then(
  "I should see a validation error for album name length",
  async function(this: CustomWorld) {
    const errorMessage = this.page.locator(
      '[role="alert"], .error, [class*="error"]',
    ).filter({
      hasText: /100 character|too long/i,
    });
    await expect(errorMessage).toBeVisible();
  },
);

Then(
  "the album name should be updated to {string}",
  async function(this: CustomWorld, newName: string) {
    initTestState(this);

    // Wait for update to complete
    await this.page.waitForTimeout(500);

    // Check the page shows the new name
    const nameElement = this.page.getByRole("heading", { name: newName }).or(
      this.page.getByText(newName),
    );
    await expect(nameElement.first()).toBeVisible();
  },
);

Then(
  "the album description should be updated to {string}",
  async function(this: CustomWorld, newDesc: string) {
    await this.page.waitForTimeout(500);
    const descElement = this.page.getByText(newDesc);
    await expect(descElement).toBeVisible();
  },
);

Then(
  "the album privacy should be {string}",
  async function(this: CustomWorld, privacy: string) {
    await this.page.waitForTimeout(500);
    // Check for privacy indicator
    const privacyBadge = this.page.getByText(new RegExp(privacy, "i"));
    await expect(privacyBadge).toBeVisible();
  },
);

Then("I should receive a shareable URL", async function(this: CustomWorld) {
  const shareUrlElement = this.page.locator("input[readonly], code, pre")
    .filter({
      hasText: /albums\//,
    });
  await expect(shareUrlElement.first()).toBeVisible();
});

Then(
  "the album should be removed from my list",
  async function(this: CustomWorld) {
    const state = initTestState(this);

    await this.page.waitForTimeout(500);

    if (state.currentAlbum) {
      const albumCard = this.page.getByText(state.currentAlbum.name);
      await expect(albumCard).not.toBeVisible();
    }
  },
);

// NOTE: "I should be redirected to {string}" step moved to common.steps.ts

Then(
  "the images should still exist in my library",
  async function(this: CustomWorld) {
    // Navigate to main images page
    await this.page.goto("/apps/pixel");
    await this.page.waitForLoadState("networkidle");

    // Check that images are still visible
    const images = this.page.locator('img[alt*="photo"], img[alt*="image"]');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  },
);

Then("the album should still exist", async function(this: CustomWorld) {
  const state = initTestState(this);

  await this.page.waitForTimeout(500);

  if (state.currentAlbum) {
    // Navigate back to albums list
    await this.page.goto("/albums");
    await this.page.waitForLoadState("networkidle");

    const albumCard = this.page.getByText(state.currentAlbum.name);
    await expect(albumCard).toBeVisible();
  }
});

Then("I should see a shareable URL", async function(this: CustomWorld) {
  const shareUrlElement = this.page.locator("input[readonly], code, pre")
    .filter({
      hasText: /albums\//,
    });
  await expect(shareUrlElement.first()).toBeVisible();
});

Then(
  "I should see the album contents without logging in",
  async function(this: CustomWorld) {
    // Check we can see the album name/images without auth UI
    const albumContent = this.page.locator('img, [data-testid="album-image"]');
    await expect(albumContent.first()).toBeVisible({ timeout: 5000 });
  },
);

Then("I should not see edit controls", async function(this: CustomWorld) {
  const editButton = this.page.getByRole("button", {
    name: /edit|settings|delete/i,
  });
  await expect(editButton.first()).not.toBeVisible();
});

Then("I should see the album contents", async function(this: CustomWorld) {
  const albumContent = this.page.locator('img, [data-testid="album-image"]');
  await expect(albumContent.first()).toBeVisible();
});

Then(
  "the page title should show {string}",
  async function(this: CustomWorld, title: string) {
    const heading = this.page.getByRole("heading", { name: title }).or(
      this.page.getByText(title),
    );
    await expect(heading.first()).toBeVisible();
  },
);

// NOTE: "I should see {string} error" step moved to common.steps.ts

Then("the shareable URL should be removed", async function(this: CustomWorld) {
  await this.page.waitForTimeout(500);

  // The share URL field should either be hidden or show "No share link"
  const noShareMessage = this.page.getByText(/no share|private/i);
  const shareUrlElement = this.page.locator("input[readonly]").filter({
    hasText: /albums\//,
  });

  const isNoShareVisible = await noShareMessage.isVisible().catch(() => false);
  const isShareUrlHidden = !(await shareUrlElement.isVisible().catch(() => false));

  expect(isNoShareVisible || isShareUrlHidden).toBe(true);
});

Then(
  "they should see {string} error",
  async function(this: CustomWorld, errorText: string) {
    const errorMessage = this.page.getByText(new RegExp(errorText, "i"));
    await expect(errorMessage).toBeVisible();
  },
);

Then(
  "I should see an info message about duplicate image",
  async function(this: CustomWorld) {
    const infoMessage = this.page.getByText(/already in|duplicate/i);
    await expect(infoMessage.first()).toBeVisible({ timeout: 5000 });
  },
);

Then("I should see empty state message", async function(this: CustomWorld) {
  const emptyMessage = this.page.getByText(/no images|empty album|add images/i);
  await expect(emptyMessage.first()).toBeVisible();
});

Then(
  "I should see {int} images in the album",
  async function(this: CustomWorld, count: number) {
    const images = this.page.locator(
      'img[alt*="photo"], img[alt*="image"], [data-testid="album-image"]',
    );
    await expect(images).toHaveCount(count, { timeout: 5000 });
  },
);

Then("each image should display properly", async function(this: CustomWorld) {
  const images = this.page.locator('img[alt*="photo"], img[alt*="image"]');
  const count = await images.count();

  expect(count).toBeGreaterThan(0);

  // Check first image is loaded
  const firstImage = images.first();
  await expect(firstImage).toBeVisible();
});

Then(
  "the album card should show up to {int} preview images",
  async function(this: CustomWorld, maxCount: number) {
    const previewImages = this.page.locator(
      '[data-testid="album-preview-image"], .preview-image',
    );
    const count = await previewImages.count();

    expect(count).toBeLessThanOrEqual(maxCount);
  },
);

Then(
  "the image count should display {string}",
  async function(this: CustomWorld, count: string) {
    const countElement = this.page.getByText(
      new RegExp(`${count}\\s*(image|photo)`),
    );
    await expect(countElement).toBeVisible();
  },
);

// NOTE: "I should see an error message" is defined in common.steps.ts
// NOTE: "I should see a success message" is defined in common.steps.ts
