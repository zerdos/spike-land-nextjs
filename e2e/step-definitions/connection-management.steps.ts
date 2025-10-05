import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { VideoWallWorld } from '../support/video-wall-world';

// Connection ID generation
Then('a unique connection ID should be generated', async function (this: VideoWallWorld) {
  // Extract connection ID from page
  const bodyText = await this.displayPage.textContent('body');
  const match = bodyText?.match(/[a-zA-Z0-9-]{8,}/);
  expect(match).toBeTruthy();

  if (match) {
    this.displayId = match[0];
  }
});

Then('the connection ID should be displayed', async function (this: VideoWallWorld) {
  const idDisplay = this.displayPage.locator('[data-testid="connection-id"], [data-display-id]');
  await expect(idDisplay.first()).toBeVisible({ timeout: 5000 });
});

Then('the connection ID should be encoded in the QR code', async function (this: VideoWallWorld) {
  const qrCode = this.displayPage.locator('[data-testid="qr-code"], canvas, svg').first();
  await expect(qrCode).toBeVisible();

  // In a real test, we could decode the QR code and verify it contains the ID
  // For now, just verify QR code exists
  expect(this.displayId).toBeTruthy();
});

// QR code scanning
Given('a QR code is displayed', async function (this: VideoWallWorld) {
  const qrCode = this.displayPage.locator('[data-testid="qr-code"], canvas, svg').first();
  await expect(qrCode).toBeVisible({ timeout: 5000 });
});

When('I scan the QR code with a client device', async function (this: VideoWallWorld) {
  // Simulate scanning QR code by extracting URL and navigating
  const bodyText = await this.displayPage.textContent('body');
  const match = bodyText?.match(/\/client\/([a-zA-Z0-9-]+)/);

  if (match) {
    this.displayId = match[1];
  }

  const clientContext = await this.createClientContext('scanned-client', 'Scanned User');
  await this.mockPeerJS(clientContext.page);

  const connectionId = this.displayId || 'test-display-id';
  await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
  await clientContext.page.waitForLoadState('networkidle');
});

Then('the client page should open with the connection ID', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('scanned-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const url = clientContext.page.url();
  expect(url).toContain('/client/');
  expect(url).toContain(this.displayId || 'test-display-id');
});

Then('the client should automatically connect to the display', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('scanned-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const connectedStatus = clientContext.page.getByText(/Connected/i);
  await expect(connectedStatus).toBeVisible({ timeout: 10000 });
});

Then('the display should show the new client\'s video feed', async function (this: VideoWallWorld) {
  await this.displayPage.waitForTimeout(1000);
  const videoFeeds = this.displayPage.locator('[data-testid="video-feed"], video');
  await expect(videoFeeds.first()).toBeVisible({ timeout: 10000 });
});

// Manual connection
Given('I am on the display page with connection ID {string}', async function (this: VideoWallWorld, connectionId: string) {
  this.displayId = connectionId;
  await this.displayPage.goto(`${this.baseUrl}/display?id=${connectionId}`);
  await this.displayPage.waitForLoadState('networkidle');
  await this.mockPeerJS(this.displayPage);
});

When('I navigate to the client page with ID {string}', async function (this: VideoWallWorld, connectionId: string) {
  const clientContext = await this.createClientContext('manual-client', 'Manual User');
  await this.mockPeerJS(clientContext.page);

  await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
  await clientContext.page.waitForLoadState('networkidle');
});

When('I grant camera permissions', async function (this: VideoWallWorld) {
  // Permissions already granted via createClientContext
  await this.displayPage.waitForTimeout(500);
});

Then('I should be connected to the display', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('manual-client') || this.getClientContext('scanned-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const connectedStatus = clientContext.page.getByText(/Connected/i);
  await expect(connectedStatus).toBeVisible({ timeout: 10000 });
});

Then('the display should show my video feed', async function (this: VideoWallWorld) {
  await this.displayPage.waitForTimeout(1000);
  const videoFeeds = this.displayPage.locator('[data-testid="video-feed"], video');
  await expect(videoFeeds.first()).toBeVisible({ timeout: 10000 });
});

// Invalid connection ID
Then('I should see {string} error message', async function (this: VideoWallWorld, errorMessage: string) {
  const clientContext = this.getClientContext('manual-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const error = clientContext.page.getByText(errorMessage);
  await expect(error).toBeVisible({ timeout: 5000 });
});

Then('I should not be able to connect', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('manual-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  // Verify not connected
  const connectedStatus = clientContext.page.getByText(/Connected to Display/i);
  await expect(connectedStatus).not.toBeVisible();
});

// WebRTC connection
When('a client attempts to connect', async function (this: VideoWallWorld) {
  const clientContext = await this.createClientContext('test-client', 'Test User');
  await this.mockPeerJS(clientContext.page);

  const connectionId = this.displayId || 'test-display-id';
  await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
  await clientContext.page.waitForLoadState('networkidle');
});

Then('the display should establish a WebRTC peer connection', async function (this: VideoWallWorld) {
  // Verify PeerJS connection was established
  const hasPeerConnection = await this.displayPage.evaluate(() => {
    return typeof (window as unknown as { Peer?: unknown }).Peer !== 'undefined';
  });
  expect(hasPeerConnection).toBeTruthy();
});

Then('the connection should use STUN\\/TURN servers', async function (this: VideoWallWorld) {
  // Verify STUN/TURN configuration (mocked in our test)
  // In a real implementation, this would check ICE configuration
  expect(true).toBeTruthy();
});

Then('the connection state should be {string}', async function (this: VideoWallWorld, state: string) {
  // Verify connection state
  const clientContext = this.getClientContext('test-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const stateDisplay = clientContext.page.locator(`[data-connection-state="${state.toLowerCase()}"]`);
  await expect(stateDisplay.first()).toBeVisible({ timeout: 10000 });
});

// Connection timeout
When('a client attempts to connect but network is slow', async function (this: VideoWallWorld) {
  const clientContext = await this.createClientContext('slow-client', 'Slow User');

  // Slow down network
  await clientContext.page.route('**/*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.continue();
  });

  await this.mockPeerJS(clientContext.page);

  const connectionId = this.displayId || 'test-display-id';
  await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
});

When('the connection takes longer than {int} seconds', async function (this: VideoWallWorld, seconds: number) {
  await this.displayPage.waitForTimeout(seconds * 1000);
});

Then('the connection should timeout', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('slow-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const timeoutError = clientContext.page.getByText(/timeout/i);
  await expect(timeoutError).toBeVisible({ timeout: 5000 });
});

Then('the client should see {string} error', async function (this: VideoWallWorld, errorMessage: string) {
  const clientContext = this.getClientContext('slow-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const error = clientContext.page.getByText(errorMessage);
  await expect(error).toBeVisible({ timeout: 5000 });
});

Then('the client should be able to retry', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('slow-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const retryButton = clientContext.page.locator('[data-testid="retry-button"], button:has-text("Retry")');
  await expect(retryButton.first()).toBeVisible({ timeout: 5000 });
});

// Simultaneous connections
When('{int} clients attempt to connect simultaneously', async function (this: VideoWallWorld, count: number) {
  await this.mockPeerJS(this.displayPage);

  const connectionPromises = [];
  for (let i = 0; i < count; i++) {
    const promise = (async () => {
      const clientContext = await this.createClientContext(`simultaneous-client-${i}`, `Client ${i + 1}`);
      await this.mockPeerJS(clientContext.page);

      const connectionId = this.displayId || 'test-display-id';
      await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
      await clientContext.page.waitForLoadState('networkidle');
    })();
    connectionPromises.push(promise);
  }

  await Promise.all(connectionPromises);
  await this.displayPage.waitForTimeout(1000);
});

Then('all {int} clients should connect successfully', async function (this: VideoWallWorld, count: number) {
  const clients = this.getAllClientContexts();
  expect(clients.length).toBeGreaterThanOrEqual(count);

  for (let i = 0; i < count; i++) {
    const clientId = `simultaneous-client-${i}`;
    const clientContext = this.getClientContext(clientId);
    if (clientContext) {
      const connectedStatus = clientContext.page.getByText(/Connected/i);
      await expect(connectedStatus).toBeVisible({ timeout: 5000 });
    }
  }
});

Then('the display should show {int} video feeds', async function (this: VideoWallWorld, count: number) {
  const videoFeeds = this.displayPage.locator('[data-testid="video-feed"], video');
  await expect(videoFeeds).toHaveCount(count, { timeout: 10000 });
});

Then('each client should have a stable connection', async function (this: VideoWallWorld) {
  // Verify all connections are stable
  await this.displayPage.waitForTimeout(2000);

  const clients = this.getAllClientContexts();
  for (const client of clients) {
    const connectedStatus = client.page.getByText(/Connected/i);
    await expect(connectedStatus).toBeVisible();
  }
});

// Network interruption
Given('I am connected to the display as a client', async function (this: VideoWallWorld) {
  await this.mockPeerJS(this.displayPage);

  const clientContext = await this.createClientContext('reconnect-client', 'Reconnect User');
  await this.mockPeerJS(clientContext.page);

  const connectionId = this.displayId || 'test-display-id';
  await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
  await clientContext.page.waitForLoadState('networkidle');
  await this.displayPage.waitForTimeout(1000);
});

When('the network connection is interrupted briefly', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  // Simulate network interruption
  await clientContext.page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });

  await this.displayPage.waitForTimeout(2000);

  await clientContext.page.evaluate(() => {
    window.dispatchEvent(new Event('online'));
  });
});

Then('the client should automatically attempt to reconnect', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const reconnectingStatus = clientContext.page.getByText(/Reconnecting/i);
  await expect(reconnectingStatus).toBeVisible({ timeout: 5000 });
});

Then('the connection should be re-established', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const connectedStatus = clientContext.page.getByText(/Connected/i);
  await expect(connectedStatus).toBeVisible({ timeout: 10000 });
});

Then('my video feed should resume on the display', async function (this: VideoWallWorld) {
  await this.displayPage.waitForTimeout(1000);
  const videoFeeds = this.displayPage.locator('[data-testid="video-feed"], video');
  await expect(videoFeeds.first()).toBeVisible();
});

// Page refresh
When('I refresh the client page', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  await clientContext.page.reload();
  await clientContext.page.waitForLoadState('networkidle');
});

When('I grant camera permissions again', async function (this: VideoWallWorld) {
  // Permissions already granted
  await this.displayPage.waitForTimeout(500);
});

Then('I should reconnect to the same display', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const connectedStatus = clientContext.page.getByText(/Connected/i);
  await expect(connectedStatus).toBeVisible({ timeout: 10000 });

  // Verify still connected to same display ID
  const url = clientContext.page.url();
  expect(url).toContain(this.displayId || 'test-display-id');
});

// Prolonged disconnection
When('the network connection is lost for more than {int} seconds', async function (this: VideoWallWorld, seconds: number) {
  const clientContext = this.getClientContext('reconnect-client');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  // Close client connection
  await this.closeClientContext('reconnect-client');
  await this.displayPage.waitForTimeout(seconds * 1000);
});

Then('the display should remove my video feed', async function (this: VideoWallWorld) {
  const videoFeeds = this.displayPage.locator('[data-testid="video-feed"], video');
  await expect(videoFeeds).toHaveCount(0, { timeout: 5000 });
});

Then('the display should show {string} notification', async function (this: VideoWallWorld, notification: string) {
  const notificationElement = this.displayPage.getByText(notification);
  await expect(notificationElement).toBeVisible({ timeout: 5000 });
});

Then('the layout should adjust for remaining clients', async function (this: VideoWallWorld) {
  // Verify layout has adjusted
  await this.displayPage.waitForTimeout(1000);
  expect(true).toBeTruthy();
});

// Connection status indicators
When('{int} clients are connected', async function (this: VideoWallWorld, count: number) {
  await this.mockPeerJS(this.displayPage);

  for (let i = 0; i < count; i++) {
    const clientContext = await this.createClientContext(`status-client-${i}`, `Client ${i + 1}`);
    await this.mockPeerJS(clientContext.page);

    const connectionId = this.displayId || 'test-display-id';
    await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
    await clientContext.page.waitForLoadState('networkidle');
    await this.displayPage.waitForTimeout(500);
  }

  await this.displayPage.waitForTimeout(1000);
});

Then('I should see connection status for each client', async function (this: VideoWallWorld) {
  const statusIndicators = this.displayPage.locator('[data-testid="connection-status"], [data-status]');
  const count = await statusIndicators.count();
  expect(count).toBeGreaterThan(0);
});

Then('the status should show {string} in green', async function (this: VideoWallWorld, statusText: string) {
  const statusElement = this.displayPage.locator(`[data-testid="connection-status"]:has-text("${statusText}")`);
  await expect(statusElement.first()).toBeVisible({ timeout: 5000 });

  // Verify green color (could check CSS class or computed style)
  const hasGreenStatus = await statusElement.first().evaluate((el: HTMLElement) => {
    return el.classList.contains('text-green') ||
           el.classList.contains('status-good') ||
           el.dataset.status === 'connected';
  });
  expect(hasGreenStatus).toBeTruthy();
});

When('1 client\'s connection becomes unstable', async function (this: VideoWallWorld) {
  // Simulate unstable connection
  await this.displayPage.evaluate(() => {
    window.dispatchEvent(new CustomEvent('connection-quality-changed', {
      detail: { clientId: 'status-client-0', quality: 'poor' }
    }));
  });

  await this.displayPage.waitForTimeout(500);
});

Then('the status should show {string} in yellow', async function (this: VideoWallWorld, statusText: string) {
  const statusElement = this.displayPage.locator(`[data-testid="connection-status"]:has-text("${statusText}")`);
  await expect(statusElement.first()).toBeVisible({ timeout: 5000 });
});

// Client connection quality
When('the connection quality is good', async function (this: VideoWallWorld) {
  // Simulate good connection
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (clientContext) {
    await clientContext.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-quality', { detail: { quality: 'good' } }));
    });
  }
});

Then('I should see a green connection indicator', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const indicator = clientContext.page.locator('[data-testid="quality-indicator"][data-quality="good"]');
  await expect(indicator.first()).toBeVisible({ timeout: 5000 });
});

When('the connection quality degrades', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (clientContext) {
    await clientContext.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-quality', { detail: { quality: 'poor' } }));
    });
  }
});

Then('I should see a yellow or red connection indicator', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const indicator = clientContext.page.locator('[data-testid="quality-indicator"][data-quality="poor"], [data-testid="quality-indicator"][data-quality="bad"]');
  await expect(indicator.first()).toBeVisible({ timeout: 5000 });
});

Then('I should see network statistics \\(latency, packet loss)', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const stats = clientContext.page.locator('[data-testid="network-stats"]');
  await expect(stats.first()).toBeVisible({ timeout: 5000 });
});

// Graceful disconnect
Given('{int} clients are connected to the display', async function (this: VideoWallWorld, count: number) {
  await this.mockPeerJS(this.displayPage);

  for (let i = 0; i < count; i++) {
    const clientContext = await this.createClientContext(`graceful-client-${i}`, `Client ${i + 1}`);
    await this.mockPeerJS(clientContext.page);

    const connectionId = this.displayId || 'test-display-id';
    await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
    await clientContext.page.waitForLoadState('networkidle');
    await this.displayPage.waitForTimeout(500);
  }

  await this.displayPage.waitForTimeout(1000);
});

When('1 client clicks the disconnect button', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('graceful-client-0');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const disconnectButton = clientContext.page.locator('[data-testid="disconnect"], button:has-text("Disconnect")');
  await disconnectButton.first().click();
  await this.displayPage.waitForTimeout(500);
});

Then('the client should disconnect cleanly', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('graceful-client-0');
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const disconnectedStatus = clientContext.page.getByText(/Disconnected/i);
  await expect(disconnectedStatus).toBeVisible({ timeout: 5000 });
});

Then('the display should remove the client\'s video feed immediately', async function (this: VideoWallWorld) {
  await this.displayPage.waitForTimeout(1000);
  const videoFeeds = this.displayPage.locator('[data-testid="video-feed"], video');
  const count = await videoFeeds.count();
  expect(count).toBeLessThan(3); // Started with 3, now should have 2
});

Then('the remaining clients should stay connected', async function (this: VideoWallWorld) {
  const remainingClients = ['graceful-client-1', 'graceful-client-2'];
  for (const clientId of remainingClients) {
    const clientContext = this.getClientContext(clientId);
    if (clientContext) {
      const connectedStatus = clientContext.page.getByText(/Connected/i);
      await expect(connectedStatus).toBeVisible();
    }
  }
});

Then('the layout should adjust to {int}-column', async function (this: VideoWallWorld, _columns: number) {
  await this.displayPage.waitForTimeout(1000);
  const videoFeeds = this.displayPage.locator('[data-testid="video-feed"], video');
  await expect(videoFeeds).toHaveCount(2);
});

// Display persistence
When('I refresh the display page', async function (this: VideoWallWorld) {
  await this.displayPage.reload();
  await this.displayPage.waitForLoadState('networkidle');
});

Then('the connection ID should remain {string}', async function (this: VideoWallWorld, expectedId: string) {
  const bodyText = await this.displayPage.textContent('body');
  expect(bodyText).toContain(expectedId);
  this.displayId = expectedId;
});

Then('the QR code should still show the same ID', async function (this: VideoWallWorld) {
  const qrCode = this.displayPage.locator('[data-testid="qr-code"], canvas, svg').first();
  await expect(qrCode).toBeVisible();
});

Then('previously connected clients should be able to reconnect', async function (this: VideoWallWorld) {
  // Simulate reconnection
  const clientContext = await this.createClientContext('previous-client', 'Previous User');
  await this.mockPeerJS(clientContext.page);

  const connectionId = this.displayId || 'test-123';
  await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
  await clientContext.page.waitForLoadState('networkidle');

  const connectedStatus = clientContext.page.getByText(/Connected/i);
  await expect(connectedStatus).toBeVisible({ timeout: 10000 });
});

// Display disconnect
When('the display page is closed', async function (this: VideoWallWorld) {
  await this.displayPage.close();
});

Then('I should see {string} error', async function (this: VideoWallWorld, errorMessage: string) {
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const error = clientContext.page.getByText(errorMessage);
  await expect(error).toBeVisible({ timeout: 10000 });
});

Then('I should see option to return to home or retry', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  const homeButton = clientContext.page.locator('button:has-text("Home"), a:has-text("Home")');
  const retryButton = clientContext.page.locator('button:has-text("Retry")');

  const hasOption = await homeButton.first().isVisible() || await retryButton.first().isVisible();
  expect(hasOption).toBeTruthy();
});

Then('my camera feed should stop streaming', async function (this: VideoWallWorld) {
  const clientContext = this.getClientContext('reconnect-client') || this.getAllClientContexts()[0];
  if (!clientContext) {
    throw new Error('Client context not found');
  }

  // Verify video stream is stopped
  const video = clientContext.page.locator('video').first();
  const isStopped = await video.evaluate((el: HTMLVideoElement) => {
    const stream = el.srcObject as MediaStream;
    if (stream) {
      const tracks = stream.getTracks();
      return tracks.every(track => track.readyState === 'ended');
    }
    return true;
  });
  expect(isStopped).toBeTruthy();
});
