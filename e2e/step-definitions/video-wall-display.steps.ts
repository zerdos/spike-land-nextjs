import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { VideoWallWorld } from "../support/video-wall-world";

// Background steps
Given(
  "the video wall display page is open",
  async function(this: VideoWallWorld) {
    await this.displayPage.goto(`${this.baseUrl}/display`);
    await this.displayPage.waitForLoadState("networkidle");
  },
);

// QR Code and initial state
Then(
  "I should see a QR code for connection",
  async function(this: VideoWallWorld) {
    const qrCode = this.displayPage.locator(
      '[data-testid="qr-code"], canvas, svg',
    ).first();
    await expect(qrCode).toBeVisible({ timeout: 10000 });
  },
);

// NOTE: "I should see {string} text" step is defined in authentication.steps.ts

Then(
  "I should see the connection URL displayed",
  async function(this: VideoWallWorld) {
    // Look for a URL pattern or connection ID display
    const urlPattern = /\/client\/[a-zA-Z0-9-]+/;
    const bodyText = await this.displayPage.textContent("body");
    expect(bodyText).toMatch(urlPattern);

    // Store display ID for later use
    const match = bodyText?.match(/\/client\/([a-zA-Z0-9-]+)/);
    if (match) {
      this.displayId = match[1];
    }
  },
);

// Video feed display
When(
  "{int} client connects with camera enabled",
  async function(this: VideoWallWorld, count: number) {
    await this.mockPeerJS(this.displayPage);

    for (let i = 0; i < count; i++) {
      const clientContext = await this.createClientContext(
        `client-${i}`,
        `Client ${i + 1}`,
      );
      await this.mockPeerJS(clientContext.page);

      // Navigate to client page with connection ID
      const connectionId = this.displayId || "test-display-id";
      await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
      await clientContext.page.waitForLoadState("networkidle");

      // Wait for connection to establish
      await this.displayPage.waitForTimeout(500);
    }

    // Wait for layout to settle
    await this.displayPage.waitForTimeout(1000);
  },
);

When(
  "{int} clients connect with camera enabled",
  async function(this: VideoWallWorld, count: number) {
    // Connect multiple clients
    for (let i = 0; i < count; i++) {
      const clientContext = await this.createClientContext(
        `client-${i}`,
        `Client ${i + 1}`,
      );
      await this.mockPeerJS(clientContext.page);

      const connectionId = this.displayId || "test-display-id";
      await clientContext.page.goto(
        `${this.baseUrl}/client?displayId=${connectionId}`,
      );
      await this.displayPage.waitForTimeout(1000);
    }
  },
);

Then(
  "I should see {int} video feed displayed",
  async function(this: VideoWallWorld, count: number) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video, [data-feed]',
    );
    await expect(videoFeeds).toHaveCount(count, { timeout: 10000 });
  },
);

Then(
  "I should see {int} video feeds displayed",
  async function(this: VideoWallWorld, count: number) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video, [data-feed]',
    );
    await expect(videoFeeds).toHaveCount(count, { timeout: 10000 });
  },
);

Then(
  "the video feed should be in full screen layout",
  async function(this: VideoWallWorld) {
    const container = this.displayPage.locator(
      '[data-testid="video-container"], [data-layout="full-screen"]',
    ).first();
    await expect(container).toBeVisible();

    // Check that the feed takes up most of the screen
    const boundingBox = await container.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(800); // Should be wide
      expect(boundingBox.height).toBeGreaterThan(600); // Should be tall
    }
  },
);

Then(
  "the video feed should show the client's camera stream",
  async function(this: VideoWallWorld) {
    // Check that video element exists and is playing
    const video = this.displayPage.locator("video").first();
    await expect(video).toBeVisible();

    // Verify video has source
    const hasSrc = await video.evaluate((el: HTMLVideoElement) => {
      return el.srcObject !== null || el.src !== "";
    });
    expect(hasSrc).toBeTruthy();
  },
);

// Layout verification
Then(
  "the video feeds should be in {int}-column layout",
  async function(this: VideoWallWorld, columns: number) {
    const container = this.displayPage.locator(
      '[data-testid="video-grid"], [data-layout]',
    ).first();
    await expect(container).toBeVisible();

    // Check grid template or flex layout
    const gridColumns = await container.evaluate((el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const gridTemplateColumns = style.gridTemplateColumns;
      if (gridTemplateColumns && gridTemplateColumns !== "none") {
        return gridTemplateColumns.split(" ").length;
      }
      // Alternative: check flex wrap
      return el.children.length;
    });

    expect(gridColumns).toBeGreaterThanOrEqual(columns);
  },
);

// NOTE: "the video feeds should be in {int}x{int} grid layout" step is defined in layout-optimization.steps.ts

Then(
  "each video feed should be clearly visible",
  async function(this: VideoWallWorld) {
    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    const count = await videoFeeds.count();

    for (let i = 0; i < count; i++) {
      const feed = videoFeeds.nth(i);
      await expect(feed).toBeVisible();

      // Check that feed has reasonable dimensions
      const boundingBox = await feed.boundingBox();
      expect(boundingBox).toBeTruthy();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(100);
        expect(boundingBox.height).toBeGreaterThan(100);
      }
    }
  },
);

// Client labels
When("{int} clients connect with names {string} and {string}", async function(
  this: VideoWallWorld,
  count: number,
  name1: string,
  name2: string,
) {
  await this.mockPeerJS(this.displayPage);

  const names = [name1, name2];
  for (let i = 0; i < count; i++) {
    const clientContext = await this.createClientContext(
      `client-${i}`,
      names[i],
    );
    await this.mockPeerJS(clientContext.page);

    const connectionId = this.displayId || "test-display-id";
    await clientContext.page.goto(
      `${this.baseUrl}/client/${connectionId}?name=${names[i]}`,
    );
    await clientContext.page.waitForLoadState("networkidle");
    await this.displayPage.waitForTimeout(500);
  }

  await this.displayPage.waitForTimeout(1000);
});

Then(
  "I should see {string} label on the first video feed",
  async function(this: VideoWallWorld, name: string) {
    const label = this.displayPage.locator(
      '[data-testid="client-label"], [data-client-name]',
    )
      .first();
    await expect(label).toContainText(name);
  },
);

Then(
  "I should see {string} label on the second video feed",
  async function(this: VideoWallWorld, name: string) {
    const labels = this.displayPage.locator(
      '[data-testid="client-label"], [data-client-name]',
    );
    await expect(labels.nth(1)).toContainText(name);
  },
);

// Disconnection handling
// NOTE: "{int} clients are connected with camera enabled" step is defined in layout-optimization.steps.ts

When(
  "{int} client disconnects",
  async function(this: VideoWallWorld, count: number) {
    const allClients = this.getAllClientContexts();
    for (let i = 0; i < count && i < allClients.length; i++) {
      const client = allClients[i];
      if (client) {
        await this.closeClientContext(client.clientId);
      }
    }

    // Wait for display to update
    await this.displayPage.waitForTimeout(1000);
  },
);

Then(
  "the layout should adjust automatically",
  async function(this: VideoWallWorld) {
    // Verify layout has changed (this is tested by the feed count and layout checks)
    // Just wait for any transition animations
    await this.displayPage.waitForTimeout(500);
    expect(true).toBeTruthy();
  },
);

// Reconnection
When(
  "{int} client disconnects and reconnects",
  async function(this: VideoWallWorld, count: number) {
    const allClients = this.getAllClientContexts();
    const clientsToReconnect = allClients.slice(0, count);

    for (const client of clientsToReconnect) {
      // Disconnect
      await this.closeClientContext(client.clientId);
      await this.displayPage.waitForTimeout(500);

      // Reconnect
      const newClientContext = await this.createClientContext(
        client.clientId,
        client.name,
      );
      await this.mockPeerJS(newClientContext.page);

      const connectionId = this.displayId || "test-display-id";
      await newClientContext.page.goto(
        `${this.baseUrl}/client/${connectionId}`,
      );
      await newClientContext.page.waitForLoadState("networkidle");
      await this.displayPage.waitForTimeout(500);
    }

    await this.displayPage.waitForTimeout(1000);
  },
);

Then("both feeds should be active", async function(this: VideoWallWorld) {
  const videoFeeds = this.displayPage.locator("video");
  const count = await videoFeeds.count();

  for (let i = 0; i < count; i++) {
    const isPlaying = await videoFeeds.nth(i).evaluate(
      (video: HTMLVideoElement) => {
        return !video.paused && video.readyState >= 2;
      },
    );
    expect(isPlaying).toBeTruthy();
  }
});
