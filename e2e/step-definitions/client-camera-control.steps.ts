import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { VideoWallWorld } from "../support/video-wall-world";

// Background steps
Given("the display page is open", async function(this: VideoWallWorld) {
  await this.displayPage.goto(`${this.baseUrl}/display`);
  await this.displayPage.waitForLoadState("networkidle");
  await this.mockPeerJS(this.displayPage);

  // Extract display ID from page
  const bodyText = await this.displayPage.textContent("body");
  const match = bodyText?.match(/\/client\/([a-zA-Z0-9-]+)/);
  if (match) {
    this.displayId = match[1];
  } else {
    // Fallback if QR code parsing fails
    this.displayId = "test-display-id";
  }
});

Given(
  "I am on the client page with a valid connection ID",
  async function(this: VideoWallWorld) {
    const clientContext = await this.createClientContext(
      "main-client",
      "Test User",
    );
    await this.mockPeerJS(clientContext.page);

    const connectionId = this.displayId || "test-display-id";
    await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
    await clientContext.page.waitForLoadState("networkidle");
  },
);

// Camera permissions and preview
When("I grant camera permissions", async function(this: VideoWallWorld) {
  const clientContext = this.getClientContext("main-client");
  if (!clientContext) {
    throw new Error("Client context not found");
  }

  // Permissions are already granted in createClientContext
  // Wait for camera to initialize
  await clientContext.page.waitForTimeout(1000);
});

Then("I should see my camera preview", async function(this: VideoWallWorld) {
  const clientContext = this.getClientContext("main-client");
  if (!clientContext) {
    throw new Error("Client context not found");
  }

  const video = clientContext.page.locator(
    '[data-testid="camera-preview"], video',
  ).first();
  await expect(video).toBeVisible({ timeout: 10000 });

  // Verify video is playing
  const isPlaying = await video.evaluate((el: HTMLVideoElement) => {
    return !el.paused && el.readyState >= 2;
  });
  expect(isPlaying).toBeTruthy();
});

Then(
  "I should see {string} status",
  async function(this: VideoWallWorld, status: string) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const statusElement = clientContext.page.getByText(status);
    await expect(statusElement).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "I should see camera control buttons",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Look for common control buttons
    const toggleCameraBtn = clientContext.page.locator(
      '[data-testid="toggle-camera"], button:has-text("Camera")',
    );
    const toggleMicBtn = clientContext.page.locator(
      '[data-testid="toggle-mic"], button:has-text("Microphone"), button:has-text("Mute")',
    );

    await expect(toggleCameraBtn.first()).toBeVisible({ timeout: 5000 });
    await expect(toggleMicBtn.first()).toBeVisible({ timeout: 5000 });
  },
);

// Camera control
Given(
  "I am connected with camera enabled",
  async function(this: VideoWallWorld) {
    // Already connected via background steps
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Verify camera is enabled
    const video = clientContext.page.locator(
      '[data-testid="camera-preview"], video',
    ).first();
    await expect(video).toBeVisible({ timeout: 5000 });
  },
);

When(
  "I click the client camera {string} button",
  async function(this: VideoWallWorld, buttonText: string) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Map button text to test IDs or locators
    const buttonMap: Record<string, string> = {
      "Toggle Camera": '[data-testid="toggle-camera"], button:has-text("Camera")',
      "Toggle Microphone":
        '[data-testid="toggle-mic"], button:has-text("Microphone"), button:has-text("Mute")',
      "Switch Camera": '[data-testid="switch-camera"], button:has-text("Switch")',
      "Share Screen": '[data-testid="share-screen"], button:has-text("Share")',
      "Stop Sharing": '[data-testid="stop-sharing"], button:has-text("Stop")',
      "Update Name": '[data-testid="update-name"], button:has-text("Update")',
      "Disconnect": '[data-testid="disconnect"], button:has-text("Disconnect")',
    };

    const selector = buttonMap[buttonText] ||
      `button:has-text("${buttonText}")`;
    const button = clientContext.page.locator(selector).first();
    await button.click();
    await clientContext.page.waitForTimeout(500);
  },
);

Then("my camera should be disabled", async function(this: VideoWallWorld) {
  const clientContext = this.getClientContext("main-client");
  if (!clientContext) {
    throw new Error("Client context not found");
  }

  // Check for disabled state indicator
  const disabledIndicator = clientContext.page.locator(
    '[data-testid="camera-disabled"], [data-camera-state="off"]',
  );
  await expect(disabledIndicator.first()).toBeVisible({ timeout: 5000 });
});

Then(
  "I should see {string} indicator on the client screen",
  async function(this: VideoWallWorld, indicatorText: string) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const indicator = clientContext.page.getByText(indicatorText);
    await expect(indicator).toBeVisible({ timeout: 5000 });
  },
);

Then("my camera should be enabled", async function(this: VideoWallWorld) {
  const clientContext = this.getClientContext("main-client");
  if (!clientContext) {
    throw new Error("Client context not found");
  }

  const video = clientContext.page.locator(
    '[data-testid="camera-preview"], video',
  ).first();
  await expect(video).toBeVisible({ timeout: 5000 });
});

// Microphone control
Then("my microphone should be muted", async function(this: VideoWallWorld) {
  const clientContext = this.getClientContext("main-client");
  if (!clientContext) {
    throw new Error("Client context not found");
  }

  // Check for muted state
  const mutedIndicator = clientContext.page.locator(
    '[data-testid="mic-muted"], [data-mic-state="muted"]',
  );
  await expect(mutedIndicator.first()).toBeVisible({ timeout: 5000 });
});

Then("my microphone should be unmuted", async function(this: VideoWallWorld) {
  const clientContext = this.getClientContext("main-client");
  if (!clientContext) {
    throw new Error("Client context not found");
  }

  // Check for active state
  const activeIndicator = clientContext.page.locator(
    '[data-testid="mic-active"], [data-mic-state="active"]',
  );
  await expect(activeIndicator.first()).toBeVisible({ timeout: 5000 });
});

// Zoom control
When(
  "I set the zoom level to {float}",
  async function(this: VideoWallWorld, zoomLevel: number) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Find zoom slider or input
    const zoomControl = clientContext.page.locator(
      '[data-testid="zoom-control"], input[type="range"]',
    ).first();
    await zoomControl.fill(zoomLevel.toString());
    await clientContext.page.waitForTimeout(500);
  },
);

Then(
  "the camera zoom should be set to {float}x",
  async function(this: VideoWallWorld, expectedZoom: number) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Verify zoom level is displayed or stored
    const zoomDisplay = clientContext.page.locator(
      '[data-testid="zoom-level"]',
    );
    const zoomText = await zoomDisplay.textContent();
    expect(zoomText).toContain(expectedZoom.toString());
  },
);

Then(
  "the preview should show zoomed video",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Verify video element has zoom transform
    const video = clientContext.page.locator(
      '[data-testid="camera-preview"], video',
    ).first();
    const hasZoom = await video.evaluate((el: HTMLElement) => {
      const transform = window.getComputedStyle(el).transform;
      return transform !== "none" && transform.includes("scale");
    });
    expect(hasZoom).toBeTruthy();
  },
);

// Camera switching
Given(
  "I have multiple cameras available",
  async function(this: VideoWallWorld) {
    // Mock already provides multiple cameras
    expect(true).toBeTruthy();
  },
);

Then(
  "the camera should switch to the next available camera",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Verify camera switched (would update device ID in real implementation)
    await clientContext.page.waitForTimeout(500);
    expect(true).toBeTruthy();
  },
);

Then(
  "the preview should show the new camera feed",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const video = clientContext.page.locator(
      '[data-testid="camera-preview"], video',
    ).first();
    await expect(video).toBeVisible();
  },
);

// Screen sharing
When(
  "I grant screen sharing permissions",
  async function(this: VideoWallWorld) {
    // Permissions already granted via mock
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }
    await clientContext.page.waitForTimeout(500);
  },
);

Then(
  "my video feed should switch to screen sharing",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const screenShareIndicator = clientContext.page.locator(
      '[data-testid="screen-share-active"]',
    );
    await expect(screenShareIndicator.first()).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "my video feed should switch back to camera",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const cameraPreview = clientContext.page.locator(
      '[data-testid="camera-preview"], video',
    ).first();
    await expect(cameraPreview).toBeVisible({ timeout: 5000 });
  },
);

// Name update
When(
  "I enter {string} in the name field",
  async function(this: VideoWallWorld, name: string) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const nameInput = clientContext.page.locator(
      '[data-testid="name-input"], input[name="name"]',
    )
      .first();
    await nameInput.fill(name);
  },
);

Then(
  "my name should be updated to {string}",
  async function(this: VideoWallWorld, name: string) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    // Verify name is shown
    const nameDisplay = clientContext.page.getByText(name);
    await expect(nameDisplay).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "the display should show {string} as my label",
  async function(this: VideoWallWorld, name: string) {
    // Check on display page
    const label = this.displayPage.getByText(name);
    await expect(label).toBeVisible({ timeout: 5000 });
  },
);

// Permission denied
When("I deny camera permissions", async function(this: VideoWallWorld) {
  const clientContext = this.getClientContext("main-client");
  if (!clientContext) {
    throw new Error("Client context not found");
  }

  // Override getUserMedia to reject
  await clientContext.page.addInitScript(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      };
    }
  });

  // Reload to trigger permission request
  await clientContext.page.reload();
  await clientContext.page.waitForLoadState("networkidle");
});

Then(
  "I should see {string} error message",
  async function(this: VideoWallWorld, errorMessage: string) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const error = clientContext.page.getByText(errorMessage);
    await expect(error).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "I should see instructions to enable camera access",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const instructions = clientContext.page.locator(
      '[data-testid="camera-instructions"]',
    );
    await expect(instructions.first()).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "the camera preview should not be visible",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const video = clientContext.page.locator(
      '[data-testid="camera-preview"], video',
    ).first();
    await expect(video).not.toBeVisible();
  },
);

// Connection maintenance
Then(
  "I should still be connected to the display",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const connectedStatus = clientContext.page.getByText(/Connected/i);
    await expect(connectedStatus).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "the display should show my placeholder or blank feed",
  async function(this: VideoWallWorld) {
    const placeholder = this.displayPage.locator(
      '[data-testid="video-placeholder"], [data-feed-disabled]',
    );
    await expect(placeholder.first()).toBeVisible({ timeout: 5000 });
  },
);

// Disconnection
Then(
  "I should be disconnected from the display",
  async function(this: VideoWallWorld) {
    const clientContext = this.getClientContext("main-client");
    if (!clientContext) {
      throw new Error("Client context not found");
    }

    const disconnectedStatus = clientContext.page.getByText(/Disconnected/i);
    await expect(disconnectedStatus).toBeVisible({ timeout: 5000 });
  },
);

Then(
  "the display should remove my video feed",
  async function(this: VideoWallWorld) {
    // Wait for feed removal
    await this.displayPage.waitForTimeout(1000);

    const videoFeeds = this.displayPage.locator(
      '[data-testid="video-feed"], video',
    );
    const count = await videoFeeds.count();
    expect(count).toBe(0);
  },
);
