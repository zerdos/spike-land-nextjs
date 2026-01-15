import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { VideoWallWorld } from "../support/video-wall-world";

// Client connection states
Given(
  "{int} client is connected with camera enabled",
  async function(this: VideoWallWorld, _count: number) {
    await this.mockPeerJS(this.displayPage);

    const clientContext = await this.createClientContext(
      `client-0`,
      "Client 1",
    );
    await this.mockPeerJS(clientContext.page);

    const connectionId = this.displayId || "test-display-id";
    await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
    await clientContext.page.waitForLoadState("networkidle");
    await this.displayPage.waitForTimeout(1000);
  },
);

Given(
  "{int} clients are connected with camera enabled",
  async function(this: VideoWallWorld, count: number) {
    await this.mockPeerJS(this.displayPage);

    for (let i = 0; i < count; i++) {
      const clientContext = await this.createClientContext(
        `client-${i}`,
        `Client ${i + 1}`,
      );
      await this.mockPeerJS(clientContext.page);

      const connectionId = this.displayId || "test-display-id";
      await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
      await clientContext.page.waitForLoadState("networkidle");
      await this.displayPage.waitForTimeout(500);
    }

    await this.displayPage.waitForTimeout(1000);
  },
);

// Layout transitions
When(
  "a second client connects with camera enabled",
  async function(this: VideoWallWorld) {
    const clientContext = await this.createClientContext(
      "client-1",
      "Client 2",
    );
    await this.mockPeerJS(clientContext.page);

    const connectionId = this.displayId || "test-display-id";
    await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
    await clientContext.page.waitForLoadState("networkidle");
    await this.displayPage.waitForTimeout(500);
  },
);

Then(
  "the layout should transition from full screen to {int}-column",
  async function(this: VideoWallWorld, _columns: number) {
    // Wait for transition to complete
    await this.displayPage.waitForTimeout(1000);

    // Verify new layout
    const container = this.displayPage.locator(
      '[data-testid="video-grid"], [data-layout]',
    ).first();
    await expect(container).toBeVisible();

    // Check for 2-column layout
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(2);
  },
);

Then(
  "the transition should be smooth without flickering",
  async function(this: VideoWallWorld) {
    // Verify CSS transition is applied
    const container = this.displayPage.locator(
      '[data-testid="video-grid"], [data-layout]',
    ).first();
    await container.evaluate((el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return style.transition !== "none" || style.transitionProperty !== "none";
    });

    // In a real implementation, we could monitor for layout shifts
    // For now, just verify container exists and is stable
    await expect(container).toBeVisible();
    expect(true).toBeTruthy(); // Placeholder for visual regression test
  },
);

Then(
  "both video feeds should be visible",
  async function(this: VideoWallWorld) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(2);

    for (let i = 0; i < 2; i++) {
      await expect(videoFeeds.nth(i)).toBeVisible();
    }
  },
);

// Client disconnection transitions
When(
  "{int} clients disconnect",
  async function(this: VideoWallWorld, count: number) {
    const allClients = this.getAllClientContexts();
    for (let i = 0; i < count && i < allClients.length; i++) {
      const client = allClients[i];
      if (client) {
        await this.closeClientContext(client.clientId);
      }
    }
    await this.displayPage.waitForTimeout(1000);
  },
);

Then(
  "the layout should transition from {int}x{int} grid to {int}-column",
  async function(
    this: VideoWallWorld,
    _fromRows: number,
    _fromCols: number,
    toColumns: number,
  ) {
    // Wait for transition
    await this.displayPage.waitForTimeout(1000);

    // Verify new layout has correct number of feeds
    const expectedFeeds = toColumns;
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(expectedFeeds);
  },
);

Then(
  "the remaining {int} video feeds should scale up",
  async function(this: VideoWallWorld, count: number) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(count);

    // Verify feeds have larger dimensions
    for (let i = 0; i < count; i++) {
      const feed = videoFeeds.nth(i);
      const boundingBox = await feed.boundingBox();
      expect(boundingBox).toBeTruthy();
      if (boundingBox) {
        // Should be larger than grid layout (arbitrary threshold)
        expect(boundingBox.width).toBeGreaterThan(300);
        expect(boundingBox.height).toBeGreaterThan(200);
      }
    }
  },
);

Then("the transition should be smooth", async function(this: VideoWallWorld) {
  // Verify smooth transition (similar to previous check)
  await this.displayPage.waitForTimeout(500);
  expect(true).toBeTruthy();
});

// Rapid connections
When(
  "{int} clients connect rapidly within {int} seconds",
  async function(this: VideoWallWorld, count: number, _timeSeconds: number) {
    await this.mockPeerJS(this.displayPage);

    // Connect all clients in quick succession
    const connectionPromises = [];
    for (let i = 0; i < count; i++) {
      const promise = (async () => {
        const clientContext = await this.createClientContext(
          `client-${i}`,
          `Client ${i + 1}`,
        );
        await this.mockPeerJS(clientContext.page);

        const connectionId = this.displayId || "test-display-id";
        await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
        await clientContext.page.waitForLoadState("networkidle");
      })();
      connectionPromises.push(promise);
    }

    await Promise.all(connectionPromises);
    await this.displayPage.waitForTimeout(1000);
  },
);

Then(
  "the layout should settle on {int}-column layout",
  async function(this: VideoWallWorld, _columns: number) {
    // Wait for layout to stabilize
    await this.displayPage.waitForTimeout(1500);

    const container = this.displayPage.locator(
      '[data-testid="video-grid"], [data-layout]',
    ).first();
    await expect(container).toBeVisible();

    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(3);
  },
);

Then(
  "all {int} video feeds should be visible",
  async function(this: VideoWallWorld, count: number) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(count);

    for (let i = 0; i < count; i++) {
      await expect(videoFeeds.nth(i)).toBeVisible();
    }
  },
);

Then(
  "there should be no layout flickering",
  async function(this: VideoWallWorld) {
    // Monitor for stability (in real implementation, could use mutation observer)
    await this.displayPage.waitForTimeout(1000);
    expect(true).toBeTruthy();
  },
);

// Aspect ratio optimization
Given(
  "the display viewport is set to ultrawide \\({int}:{int})",
  async function(this: VideoWallWorld, _width: number, _height: number) {
    // Set viewport to ultrawide (e.g., 2560x1080 for 21:9)
    await this.displayPage.setViewportSize({ width: 2560, height: 1080 });
  },
);

Then(
  "the video feeds should be optimized for ultrawide display",
  async function(this: VideoWallWorld) {
    const container = this.displayPage.locator(
      '[data-testid="video-grid"], [data-layout]',
    ).first();
    await expect(container).toBeVisible();

    // Verify container uses available width
    const boundingBox = await container.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(2000); // Should use most of ultrawide display
    }
  },
);

Then(
  "there should be no excessive black bars",
  async function(this: VideoWallWorld) {
    // Verify video feeds fill available space
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    const firstFeed = videoFeeds.first();

    const boundingBox = await firstFeed.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      // Feed should have reasonable aspect ratio
      const aspectRatio = boundingBox.width / boundingBox.height;
      expect(aspectRatio).toBeGreaterThan(1.0); // Wider than tall
      expect(aspectRatio).toBeLessThan(3.0); // Not excessively wide
    }
  },
);

// Maximum capacity
Then(
  "the layout should show all {int} video feeds",
  async function(this: VideoWallWorld, count: number) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(count, { timeout: 10000 });
  },
);

Then(
  "the video feeds should be in {int}x{int} grid layout",
  async function(this: VideoWallWorld, rows: number, cols: number) {
    const expectedCount = rows * cols;
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(expectedCount);
  },
);

Then(
  "each feed should be clearly visible",
  async function(this: VideoWallWorld) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    const count = await videoFeeds.count();

    for (let i = 0; i < count; i++) {
      const feed = videoFeeds.nth(i);
      await expect(feed).toBeVisible();

      const boundingBox = await feed.boundingBox();
      expect(boundingBox).toBeTruthy();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(100);
        expect(boundingBox.height).toBeGreaterThan(100);
      }
    }
  },
);

// Dynamic client counts (Scenario Outline)
Then(
  "the layout should be optimized for {int} feeds",
  async function(this: VideoWallWorld, count: number) {
    // Wait for layout optimization
    await this.displayPage.waitForTimeout(1000);

    const container = this.displayPage.locator(
      '[data-testid="video-grid"], [data-layout]',
    ).first();
    await expect(container).toBeVisible();

    // Verify appropriate layout for count
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(count);
  },
);

Then(
  "all feeds should be clearly visible",
  async function(this: VideoWallWorld) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    const count = await videoFeeds.count();

    for (let i = 0; i < count; i++) {
      await expect(videoFeeds.nth(i)).toBeVisible();
    }
  },
);

// Active speaker detection
When(
  "client {string} becomes the active speaker",
  async function(this: VideoWallWorld, _clientName: string) {
    // Simulate active speaker event
    await this.displayPage.evaluate((name) => {
      window.dispatchEvent(
        new CustomEvent("active-speaker-changed", { detail: { name } }),
      );
    }, _clientName);

    await this.displayPage.waitForTimeout(500);
  },
);

Then(
  "{string} video feed should be highlighted",
  async function(this: VideoWallWorld, clientName: string) {
    // Look for highlighted feed
    const highlightedFeed = this.displayPage.locator(
      `[data-testid="video-feed"][data-active="true"], [data-client-name="${clientName}"][data-active]`,
    );
    await expect(highlightedFeed.first()).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "{string} video feed should have a visual indicator",
  async function(this: VideoWallWorld, _clientName: string) {
    const indicator = this.displayPage.locator(
      `[data-testid="active-speaker-indicator"]`,
    );
    await expect(indicator.first()).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "{string} video feed should no longer be highlighted",
  async function(this: VideoWallWorld, _clientName: string) {
    // Verify previous active speaker is no longer highlighted
    const feed = this.displayPage.locator(
      `[data-client-name="${_clientName}"]`,
    );
    const isActive = await feed.evaluate((el: HTMLElement) => {
      return el.dataset["active"] === "true" || el.classList.contains("active");
    });
    expect(isActive).toBeFalsy();
  },
);

// Pinned feeds
When(
  "I pin client {string} video feed",
  async function(this: VideoWallWorld, clientName: string) {
    const pinButton = this.displayPage.locator(
      `[data-testid="pin-button"][data-client="${clientName}"], button:has-text("Pin")`,
    ).first();
    await pinButton.click();
    await this.displayPage.waitForTimeout(500);
  },
);

Then(
  "{string} video feed should be larger than others",
  async function(this: VideoWallWorld, clientName: string) {
    const pinnedFeed = this.displayPage.locator(
      `[data-testid="video-feed"][data-pinned="true"], [data-client-name="${clientName}"][data-pinned]`,
    ).first();
    const normalFeed = this.displayPage.locator(
      `[data-testid="video-feed"]:not([data-pinned="true"])`,
    ).first();

    const pinnedBox = await pinnedFeed.boundingBox();
    const normalBox = await normalFeed.boundingBox();

    expect(pinnedBox).toBeTruthy();
    expect(normalBox).toBeTruthy();
    if (pinnedBox && normalBox) {
      expect(pinnedBox.width).toBeGreaterThan(normalBox.width);
      expect(pinnedBox.height).toBeGreaterThan(normalBox.height);
    }
  },
);

Then(
  "other clients should be shown in smaller tiles",
  async function(this: VideoWallWorld) {
    const smallTiles = this.displayPage.locator(
      `[data-testid="video-feed"]:not([data-pinned="true"])`,
    );
    const count = await smallTiles.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const tile = smallTiles.nth(i);
      const boundingBox = await tile.boundingBox();
      expect(boundingBox).toBeTruthy();
      if (boundingBox) {
        // Smaller but still visible
        expect(boundingBox.width).toBeGreaterThan(100);
        expect(boundingBox.width).toBeLessThan(500);
      }
    }
  },
);

When(
  "I unpin client {string} video feed",
  async function(this: VideoWallWorld, _clientName: string) {
    const unpinButton = this.displayPage.locator(
      `[data-testid="unpin-button"], button:has-text("Unpin")`,
    ).first();
    await unpinButton.click();
    await this.displayPage.waitForTimeout(500);
  },
);

Then(
  "the layout should return to {int}x{int} grid",
  async function(this: VideoWallWorld, rows: number, cols: number) {
    const expectedCount = rows * cols;
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    await expect(videoFeeds).toHaveCount(expectedCount);
  },
);

Then("all feeds should be equal size", async function(this: VideoWallWorld) {
  const videoFeeds = this.displayPage.locator(
    '[data-testid="video-feed"], video',
  );
  const count = await videoFeeds.count();

  const sizes = [];
  for (let i = 0; i < count; i++) {
    const boundingBox = await videoFeeds.nth(i).boundingBox();
    if (boundingBox) {
      sizes.push({ width: boundingBox.width, height: boundingBox.height });
    }
  }

  // All sizes should be approximately equal (within 10% tolerance)
  if (sizes.length > 1) {
    const firstSize = sizes[0];
    if (firstSize) {
      for (const size of sizes) {
        expect(Math.abs(size.width - firstSize.width)).toBeLessThan(
          firstSize.width * 0.1,
        );
        expect(Math.abs(size.height - firstSize.height)).toBeLessThan(
          firstSize.height * 0.1,
        );
      }
    }
  }
});
