# Smart Video Wall E2E Testing Guide

This document describes the comprehensive E2E testing approach for the Smart
Video Wall application using Playwright and Cucumber BDD framework.

## Overview

The E2E test suite covers all critical user journeys for the Smart Video Wall
system, including:

- Display page functionality (QR code generation, video feed display, layout
  optimization)
- Client page functionality (camera controls, connection management)
- Multi-client scenarios (simultaneous connections, disconnections)
- WebRTC connection management
- Error handling and edge cases

## Test Structure

### Feature Files

Located in `/home/z/spike-land-nextjs/e2e/features/`:

1. **video-wall-display.feature** - Display page scenarios
   - QR code display
   - Single and multiple client video feeds
   - Layout transitions (full screen, 2-column, grid)
   - Client labels
   - Disconnection/reconnection handling

2. **client-camera-control.feature** - Client page scenarios
   - Camera preview and permissions
   - Camera on/off toggle
   - Microphone mute/unmute
   - Zoom control
   - Camera switching
   - Screen sharing
   - Display name updates
   - Permission denial handling

3. **layout-optimization.feature** - Layout adaptation scenarios
   - Smooth transitions when clients join/leave
   - Rapid connection handling
   - Aspect ratio optimization
   - Maximum client capacity (9 clients)
   - Active speaker detection
   - Pinned video feeds

4. **connection-management.feature** - Connection scenarios
   - Connection ID generation
   - QR code scanning
   - Manual connection with ID
   - Invalid connection handling
   - WebRTC establishment
   - Connection timeout
   - Simultaneous connections
   - Network interruption and reconnection
   - Graceful disconnection
   - Connection quality indicators

### Step Definitions

Located in `/home/z/spike-land-nextjs/e2e/step-definitions/`:

1. **video-wall-display.steps.ts** - Display page step implementations
2. **client-camera-control.steps.ts** - Client page step implementations
3. **layout-optimization.steps.ts** - Layout optimization step implementations
4. **connection-management.steps.ts** - Connection management step
   implementations

## Technical Approach

### Multi-Context Architecture

The test suite uses a custom `VideoWallWorld` class that extends Cucumber's
World to support multiple browser contexts:

```typescript
export class VideoWallWorld extends World {
  browser!: Browser;
  displayContext!: BrowserContext;
  displayPage!: Page;
  clientContexts: Map<string, ClientContext> = new Map();
  baseUrl: string;
  displayId?: string;
}
```

**Key features:**

- One display context (presenter view)
- Multiple client contexts (participant views)
- Isolated browser contexts for each client
- Automatic camera/microphone permissions
- Screenshot capture for all contexts on failure

### Mocking Strategy

#### 1. getUserMedia Mock

Real camera/microphone hardware is not available in CI/CD environments, so we
mock `navigator.mediaDevices.getUserMedia`:

```typescript
await page.addInitScript(() => {
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    // Create fake MediaStream with canvas-based video
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const stream = canvas.captureStream(30);
    return stream;
  };
});
```

**What it does:**

- Creates a fake video stream using Canvas API
- Generates a test pattern (green rectangle with "Test Video" text)
- Adds fake audio track if requested
- Returns a real MediaStream object (not just a mock)

**Benefits:**

- No real camera required
- Deterministic test behavior
- Works in headless CI environments
- Faster than real camera initialization

#### 2. PeerJS Mock

WebRTC connections are complex and require network infrastructure (STUN/TURN
servers). We mock PeerJS to simplify testing:

```typescript
class MockPeer {
  id: string;

  constructor(id?: string, options?: any) {
    this.id = id || `mock-peer-${Math.random()}`;
    setTimeout(() => this.emit("open", this.id), 100);
  }

  connect(peerId: string) {
    const connection = new MockDataConnection(peerId);
    setTimeout(() => connection.emit("open"), 200);
    return connection;
  }

  call(peerId: string, stream: MediaStream) {
    const call = new MockMediaConnection(peerId, stream);
    setTimeout(() => call.emit("stream", fakeStream), 300);
    return call;
  }
}
```

**What it does:**

- Simulates PeerJS connection lifecycle
- Fires events in realistic timing
- Returns mock streams for video calls
- Handles data connections

**Benefits:**

- No STUN/TURN servers required
- Predictable connection timing
- Testable connection states
- No network dependencies

#### 3. Media Devices Enumeration

Mock `enumerateDevices` to simulate multiple cameras:

```typescript
navigator.mediaDevices.enumerateDevices = async () => [
  { deviceId: "fake-camera-1", kind: "videoinput", label: "Front Camera" },
  { deviceId: "fake-camera-2", kind: "videoinput", label: "Back Camera" },
  { deviceId: "fake-mic-1", kind: "audioinput", label: "Microphone" },
];
```

**Benefits:**

- Test camera switching functionality
- Consistent device list across environments
- No permission prompts

#### 4. Screen Sharing Mock

Mock `getDisplayMedia` for screen sharing tests:

```typescript
navigator.mediaDevices.getDisplayMedia = async (constraints) => {
  const stream = createFakeMediaStream({ video: true });
  Object.defineProperty(stream, "__isScreenShare", { value: true });
  return stream;
};
```

**Benefits:**

- Test screen sharing without user interaction
- No browser permission prompts
- Consistent behavior

### Testing Patterns

#### Simulating Multiple Clients

```typescript
// Create multiple client contexts
for (let i = 0; i < clientCount; i++) {
  const clientContext = await this.createClientContext(
    `client-${i}`,
    `Client ${i + 1}`,
  );
  await clientContext.page.goto(`${this.baseUrl}/client/${connectionId}`);
}
```

**Key points:**

- Each client gets its own browser context
- Clients are isolated from each other
- Each has its own mocked camera
- Simulates real multi-user scenario

#### Verifying Layout Changes

```typescript
// Check grid layout
const container = this.displayPage.locator('[data-testid="video-grid"]');
const videoFeeds = this.displayPage.locator('[data-testid="video-feed"]');
await expect(videoFeeds).toHaveCount(expectedCount);

// Verify bounding boxes
const boundingBox = await feed.boundingBox();
expect(boundingBox.width).toBeGreaterThan(minWidth);
```

**Strategies:**

- Use test IDs for reliable element selection
- Check element count for client tracking
- Verify bounding boxes for layout validation
- Monitor CSS transitions for smooth UX

#### Testing Connections

```typescript
// Verify connection state
const connectedStatus = clientContext.page.getByText(/Connected/i);
await expect(connectedStatus).toBeVisible({ timeout: 10000 });

// Simulate network issues
await page.evaluate(() => {
  window.dispatchEvent(new Event("offline"));
});
```

**Approaches:**

- Check connection status indicators
- Simulate network events
- Verify reconnection logic
- Test timeout scenarios

## Data-TestId Conventions

For reliable E2E tests, the implementation should use these test IDs:

### Display Page

- `[data-testid="qr-code"]` - QR code element
- `[data-testid="connection-id"]` - Connection ID display
- `[data-testid="video-grid"]` - Video grid container
- `[data-testid="video-feed"]` - Individual video feed
- `[data-testid="client-label"]` - Client name label
- `[data-testid="connection-status"]` - Connection status indicator
- `[data-testid="active-speaker-indicator"]` - Active speaker highlight
- `[data-testid="pin-button"]` - Pin video feed button
- `[data-testid="unpin-button"]` - Unpin video feed button

### Client Page

- `[data-testid="camera-preview"]` - Camera preview video element
- `[data-testid="toggle-camera"]` - Camera on/off button
- `[data-testid="toggle-mic"]` - Microphone mute button
- `[data-testid="switch-camera"]` - Switch camera button
- `[data-testid="share-screen"]` - Share screen button
- `[data-testid="stop-sharing"]` - Stop sharing button
- `[data-testid="zoom-control"]` - Zoom slider
- `[data-testid="zoom-level"]` - Zoom level display
- `[data-testid="name-input"]` - Name input field
- `[data-testid="update-name"]` - Update name button
- `[data-testid="disconnect"]` - Disconnect button
- `[data-testid="quality-indicator"]` - Connection quality indicator
- `[data-testid="network-stats"]` - Network statistics display
- `[data-testid="camera-instructions"]` - Permission instructions
- `[data-testid="retry-button"]` - Retry connection button

### Data Attributes

- `[data-layout="full-screen|2-column|3-column|grid"]` - Layout mode
- `[data-feed-disabled]` - Disabled feed indicator
- `[data-camera-state="on|off"]` - Camera state
- `[data-mic-state="active|muted"]` - Microphone state
- `[data-connection-state="connected|disconnected|connecting"]` - Connection
  state
- `[data-quality="good|poor|bad"]` - Connection quality
- `[data-client-name="..."]` - Client name
- `[data-active="true"]` - Active speaker
- `[data-pinned="true"]` - Pinned feed

## Running the Tests

### Prerequisites

1. **Implementation must be complete** with the following routes:
   - `/display` - Display page
   - `/client/[id]` - Client page

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install chromium
   ```

### Run Tests Locally

```bash
# With dev server running
npm run test:e2e:local
```

### Run Tests in CI

```bash
# Uses BASE_URL environment variable
npm run test:e2e:ci
```

### Run Specific Features

```bash
# Run only display tests
npx cucumber-js e2e/features/video-wall-display.feature

# Run only client control tests
npx cucumber-js e2e/features/client-camera-control.feature

# Run only layout tests
npx cucumber-js e2e/features/layout-optimization.feature

# Run only connection tests
npx cucumber-js e2e/features/connection-management.feature
```

### Run Specific Scenarios

```bash
# Run by scenario name
npx cucumber-js --name "Single client connects"

# Run by tags (add @tag to scenarios in .feature files)
npx cucumber-js --tags "@smoke"
```

## Test Reports

### HTML Report

After running tests, view the HTML report:

```bash
open e2e/reports/cucumber-report.html
```

### Screenshots

Failed tests automatically capture screenshots:

- `e2e/reports/screenshots/ScenarioName_display.png` - Display page
- `e2e/reports/screenshots/ScenarioName_client_0.png` - First client
- `e2e/reports/screenshots/ScenarioName_client_1.png` - Second client
- etc.

## Key Testing Challenges and Solutions

### Challenge 1: WebRTC Testing

**Problem:** WebRTC requires real network connections, STUN/TURN servers, and
peer discovery.

**Solution:** Mock the entire PeerJS API with simulated connection lifecycle:

- Emit events in realistic timing
- Return fake MediaStreams
- Simulate connection states
- No actual networking required

**Trade-off:** Not testing real WebRTC, but testing application logic around
WebRTC.

### Challenge 2: Camera Access

**Problem:** Browsers require user permission for camera access. CI environments
have no camera.

**Solution:** Mock `getUserMedia` with canvas-based fake video:

- Generate test pattern on canvas
- Use `captureStream()` to create MediaStream
- Real MediaStream object (not just a mock)
- Works in headless mode

**Trade-off:** Not testing real camera, but testing video stream handling.

### Challenge 3: Multi-Client Scenarios

**Problem:** Need to simulate multiple users connecting simultaneously.

**Solution:** Create multiple browser contexts:

- One context = one client
- Isolated cookies/storage
- Independent camera mocks
- Parallel connection simulation

**Trade-off:** All contexts run on same machine, not testing real network
diversity.

### Challenge 4: Timing and Race Conditions

**Problem:** WebRTC connections, layout changes, and UI updates are
asynchronous.

**Solution:** Strategic waiting and polling:

- Use Playwright's auto-waiting for DOM elements
- Add explicit timeouts for connection establishment
- Poll for state changes with `waitForTimeout`
- Use event listeners where possible

**Trade-off:** Tests may be slower, but more reliable.

### Challenge 5: Layout Verification

**Problem:** Hard to verify visual layout algorithmically.

**Solution:** Combination of approaches:

- Count video feeds
- Check bounding boxes
- Verify CSS grid/flex properties
- Test data attributes for layout mode
- Could add visual regression testing later

**Trade-off:** Not pixel-perfect, but validates functional layout.

### Challenge 6: Connection Quality Simulation

**Problem:** Can't easily simulate poor network conditions.

**Solution:** Use custom events and state manipulation:

- Dispatch `offline`/`online` events
- Fire custom `connection-quality-changed` events
- Manipulate DOM directly for state testing
- Use `page.route()` for network delays

**Trade-off:** Not testing real network issues, but testing application's
response to network events.

## Best Practices

### 1. Always Use Test IDs

```typescript
// Good
const button = page.locator('[data-testid="toggle-camera"]');

// Avoid
const button = page.locator("button.camera-toggle");
```

**Why:** Test IDs are stable, CSS classes change.

### 2. Wait for Network Idle

```typescript
await page.goto(url);
await page.waitForLoadState("networkidle");
```

**Why:** Ensures all initial network requests complete.

### 3. Use Generous Timeouts for Connections

```typescript
await expect(status).toBeVisible({ timeout: 10000 });
```

**Why:** WebRTC connections can take several seconds.

### 4. Clean Up Between Scenarios

The `After` hook automatically cleans up all contexts:

```typescript
After(async function(this: VideoWallWorld) {
  await this.destroy(); // Closes all contexts
});
```

**Why:** Prevents memory leaks and state pollution.

### 5. Screenshot on Failure

All pages (display + clients) are captured on failure:

```typescript
if (result?.status === Status.FAILED) {
  await this.displayPage.screenshot({ path: "..." });
  for (const client of this.getAllClientContexts()) {
    await client.page.screenshot({ path: "..." });
  }
}
```

**Why:** Multi-context failures need all perspectives.

## Debugging Tips

### Run in Headed Mode

```bash
CI=false npm run test:e2e:local
```

This shows browser windows during test execution.

### Pause Execution

Add to step definition:

```typescript
await page.pause();
```

Opens Playwright Inspector for debugging.

### Slow Down Execution

```typescript
const browser = await chromium.launch({
  headless: false,
  slowMo: 1000, // 1 second delay between actions
});
```

### View Console Logs

```typescript
page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
```

### Check Network Requests

```typescript
page.on(
  "request",
  (request) => console.log(">>", request.method(), request.url()),
);
page.on(
  "response",
  (response) => console.log("<<", response.status(), response.url()),
);
```

## Future Enhancements

### 1. Visual Regression Testing

Add screenshot comparison:

```typescript
await expect(page).toHaveScreenshot("display-4-clients.png", {
  maxDiffPixels: 100,
});
```

### 2. Real WebRTC Testing

Use Puppeteer's WebRTC support for real peer connections.

### 3. Performance Testing

Monitor FPS and layout shift:

```typescript
const metrics = await page.evaluate(() => ({
  fps: performance.getEntriesByType("measure"),
  cls: layoutShift.value,
}));
```

### 4. Accessibility Testing

Add aria-label checks and keyboard navigation tests.

### 5. Mobile Testing

Test with mobile viewports and touch events.

## Conclusion

This comprehensive E2E test suite provides:

- Full coverage of critical user journeys
- Reliable mocking of WebRTC and media devices
- Multi-client scenario support
- Detailed reporting and debugging

**Next steps:**

1. Implement the video wall application
2. Add test IDs to all components
3. Run tests and iterate on implementation
4. Add tests to CI/CD pipeline
5. Monitor test reliability and adjust timeouts as needed

**Testing Philosophy:**

- E2E tests validate user journeys, not implementation details
- Mocking is acceptable when it enables testing without sacrificing coverage
- Tests should be deterministic and fast
- When tests fail, they should provide clear debugging information
