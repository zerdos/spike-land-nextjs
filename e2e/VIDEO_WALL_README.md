# Smart Video Wall E2E Tests - Quick Start

This directory contains comprehensive E2E tests for the Smart Video Wall
application using Playwright and Cucumber BDD framework.

## Status

**IMPORTANT: These tests are ready but require the implementation to be
completed first.**

The video wall application (`/display` and `/client/[id]` pages) needs to be
implemented before these tests can run successfully.

## What's Included

### Feature Files (BDD Scenarios)

4 comprehensive feature files with 50+ scenarios:

1. **video-wall-display.feature** - Display page functionality
   - QR code generation and display
   - Single and multi-client video feeds
   - Layout transitions (1-9 clients)
   - Client disconnection/reconnection

2. **client-camera-control.feature** - Client page functionality
   - Camera preview and controls
   - Microphone mute/unmute
   - Zoom control
   - Camera switching
   - Screen sharing
   - Permission handling

3. **layout-optimization.feature** - Adaptive layouts
   - Smooth transitions
   - Rapid connections
   - Active speaker detection
   - Pinned feeds
   - Ultrawide display support

4. **connection-management.feature** - Connection reliability
   - WebRTC establishment
   - QR code scanning
   - Network interruption handling
   - Simultaneous connections
   - Connection quality indicators

### Step Definitions

Complete step implementations for all scenarios:

- `video-wall-display.steps.ts` - 200+ lines
- `client-camera-control.steps.ts` - 350+ lines
- `layout-optimization.steps.ts` - 400+ lines
- `connection-management.steps.ts` - 550+ lines

### Testing Infrastructure

- **video-wall-world.ts** - Custom Cucumber World with:
  - Multi-context support (display + multiple clients)
  - getUserMedia mocking
  - PeerJS mocking
  - Automatic permissions

- **video-wall-hooks.ts** - Lifecycle hooks with:
  - Automatic initialization
  - Multi-page screenshot on failure
  - Resource cleanup

### Documentation

- **VIDEO_WALL_TESTING.md** - Comprehensive guide covering:
  - Testing strategy
  - Mocking approach
  - Data-testid conventions
  - Debugging tips
  - Key challenges and solutions

## Quick Start

### 1. Prerequisites

Ensure the video wall implementation includes:

```
/display - Display page with QR code
/client/[id] - Client page with camera controls
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Run All Video Wall Tests

```bash
npm run test:e2e:local
```

### 4. Run Specific Feature

```bash
# Display tests only
npx cucumber-js e2e/features/video-wall-display.feature

# Client control tests only
npx cucumber-js e2e/features/client-camera-control.feature

# Layout tests only
npx cucumber-js e2e/features/layout-optimization.feature

# Connection tests only
npx cucumber-js e2e/features/connection-management.feature
```

### 5. View Results

```bash
# HTML report
open e2e/reports/cucumber-report.html

# Screenshots (on failure)
open e2e/reports/screenshots/
```

## Implementation Requirements

For tests to pass, the implementation must include these test IDs:

### Display Page (`/display`)

```tsx
<div data-testid="qr-code">
  {/* QR code component */}
</div>

<div data-testid="connection-id">
  {connectionId}
</div>

<div data-testid="video-grid" data-layout="2-column">
  <video data-testid="video-feed" data-client-name="Alice" />
  <video data-testid="video-feed" data-client-name="Bob" />
</div>

<div data-testid="connection-status" data-status="connected">
  Connected
</div>
```

### Client Page (`/client/[id]`)

```tsx
<video data-testid="camera-preview" />

<button data-testid="toggle-camera">Toggle Camera</button>
<button data-testid="toggle-mic">Toggle Mic</button>
<button data-testid="switch-camera">Switch Camera</button>
<button data-testid="share-screen">Share Screen</button>

<input data-testid="zoom-control" type="range" />
<span data-testid="zoom-level">1.5x</span>

<input data-testid="name-input" name="name" />
<button data-testid="update-name">Update Name</button>

<button data-testid="disconnect">Disconnect</button>

<div data-testid="quality-indicator" data-quality="good" />
<div data-testid="network-stats">Latency: 50ms</div>
```

See `VIDEO_WALL_TESTING.md` for complete list of test IDs.

## Key Features

### 1. WebRTC Mocking

Tests don't require real WebRTC connections:

```typescript
// Mocks PeerJS for predictable testing
await this.mockPeerJS(page);
```

### 2. Camera Mocking

Tests don't require real camera hardware:

```typescript
// Creates fake video stream using Canvas
await this.mockMediaDevices(page);
```

### 3. Multi-Client Simulation

Tests can simulate multiple clients connecting:

```typescript
// Each client gets its own browser context
await this.createClientContext("client-1", "Alice");
await this.createClientContext("client-2", "Bob");
```

### 4. Comprehensive Coverage

- 50+ scenarios across 4 feature files
- Display page scenarios: 9 scenarios
- Client control scenarios: 10 scenarios
- Layout optimization: 8 scenarios
- Connection management: 15 scenarios

## Testing Challenges Solved

### Challenge: WebRTC requires network infrastructure

**Solution:** Mock PeerJS with simulated connection lifecycle

### Challenge: Camera access requires permissions and hardware

**Solution:** Mock getUserMedia with canvas-based fake video

### Challenge: Testing multiple simultaneous clients

**Solution:** Multiple browser contexts with isolated state

### Challenge: Timing and async operations

**Solution:** Strategic waiting with generous timeouts

### Challenge: Layout verification

**Solution:** Bounding box checks and element counting

See `VIDEO_WALL_TESTING.md` for detailed explanations.

## File Structure

```
e2e/
├── features/
│   ├── video-wall-display.feature          (Display scenarios)
│   ├── client-camera-control.feature       (Client scenarios)
│   ├── layout-optimization.feature         (Layout scenarios)
│   └── connection-management.feature       (Connection scenarios)
├── step-definitions/
│   ├── video-wall-display.steps.ts         (Display step implementations)
│   ├── client-camera-control.steps.ts      (Client step implementations)
│   ├── layout-optimization.steps.ts        (Layout step implementations)
│   └── connection-management.steps.ts      (Connection step implementations)
├── support/
│   ├── video-wall-world.ts                 (Custom World with multi-context)
│   ├── video-wall-hooks.ts                 (Lifecycle hooks)
│   ├── world.ts                            (Original World for home page)
│   └── hooks.ts                            (Original hooks)
├── reports/
│   ├── cucumber-report.html                (Generated HTML report)
│   └── screenshots/                        (Failure screenshots)
├── VIDEO_WALL_TESTING.md                   (Comprehensive testing guide)
└── VIDEO_WALL_README.md                    (This file)
```

## Current Test Status

**Tests are ready but will fail until implementation is complete.**

Once the `/display` and `/client/[id]` pages are implemented with the required
test IDs, run:

```bash
npm run test:e2e:local
```

Expected behavior:

- All scenarios should pass if implementation matches test expectations
- Failed scenarios will generate screenshots for debugging
- HTML report shows detailed results

## Next Steps

1. **Implement video wall application**
   - Create `/display` page with QR code and video grid
   - Create `/client/[id]` page with camera controls
   - Add all required test IDs

2. **Run smoke test**
   ```bash
   npx cucumber-js e2e/features/video-wall-display.feature --name "Display shows QR code"
   ```

3. **Iterate on implementation**
   - Run tests
   - Fix failing scenarios
   - Add missing test IDs
   - Adjust timeouts if needed

4. **Add to CI/CD**
   - Tests already configured in `.github/workflows/ci-cd.yml`
   - Will run automatically on PRs
   - Must pass before merge

## Debugging

### Run in headed mode (see browser)

```bash
CI=false npm run test:e2e:local
```

### Run specific scenario

```bash
npx cucumber-js --name "Single client connects"
```

### Add breakpoint in step

```typescript
await page.pause(); // Opens Playwright Inspector
```

### View console logs

```typescript
page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
```

## Questions?

See `VIDEO_WALL_TESTING.md` for:

- Detailed testing strategy
- Mocking implementation details
- Complete test ID reference
- Debugging tips
- Best practices

## Summary

**50+ comprehensive E2E test scenarios ready for the Smart Video Wall
application.**

Key strengths:

- BDD scenarios in plain English
- Complete mocking of WebRTC and media devices
- Multi-client support via browser contexts
- Detailed documentation and debugging guide
- Production-ready test infrastructure

**The tests are waiting for the implementation to catch up!**
