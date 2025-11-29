# Video Wall E2E Tests - Quick Reference Card

## Run Commands

```bash
# Run all video wall tests
npm run test:e2e:local

# Run specific feature
npx cucumber-js e2e/features/video-wall-display.feature
npx cucumber-js e2e/features/client-camera-control.feature
npx cucumber-js e2e/features/layout-optimization.feature
npx cucumber-js e2e/features/connection-management.feature

# Run specific scenario
npx cucumber-js --name "Single client connects"

# Run in headed mode (see browser)
CI=false npm run test:e2e:local

# View report
open e2e/reports/cucumber-report.html
```

## Required Implementation

### Display Page: `/display`
```tsx
<div data-testid="qr-code" />
<div data-testid="connection-id">{id}</div>
<div data-testid="video-grid" data-layout="2-column">
  <video data-testid="video-feed" data-client-name="Alice" />
  <div data-testid="client-label">Alice</div>
</div>
```

### Client Page: `/client/[id]`
```tsx
<video data-testid="camera-preview" />
<button data-testid="toggle-camera">Camera</button>
<button data-testid="toggle-mic">Mic</button>
<button data-testid="switch-camera">Switch</button>
<button data-testid="share-screen">Share</button>
<input data-testid="zoom-control" type="range" />
<input data-testid="name-input" />
<button data-testid="disconnect">Disconnect</button>
<div data-testid="quality-indicator" data-quality="good" />
```

## Test Files

- **Features:** `e2e/features/video-wall-*.feature`
- **Steps:** `e2e/step-definitions/video-wall-*.steps.ts`
- **Infrastructure:** `e2e/support/video-wall-world.ts`
- **Docs:** `e2e/VIDEO_WALL_TESTING.md` (comprehensive)
- **Summary:** `docs/archive/E2E_TESTS_DELIVERY_SUMMARY.md` (full details)

## Test Coverage

- **Display:** 9 scenarios (QR code, layouts, client management)
- **Client:** 10 scenarios (camera, controls, permissions)
- **Layout:** 8+ scenarios (transitions, optimization, pinning)
- **Connection:** 15 scenarios (WebRTC, timeouts, quality)
- **Total:** 50+ scenarios

## Key Testing Features

- WebRTC mocking (no real network needed)
- Camera mocking (canvas-based fake video)
- Multi-client simulation (isolated browser contexts)
- Screenshot on failure (all pages captured)
- Comprehensive documentation

## Debugging

```typescript
// Add breakpoint
await page.pause();

// View console
page.on('console', msg => console.log(msg.text()));

// Slow motion
const browser = await chromium.launch({ slowMo: 1000 });
```

## Status

**Tests ready. Implementation needed.**

Next: Implement `/display` and `/client/[id]` with test IDs.
