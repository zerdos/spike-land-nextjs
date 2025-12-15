# Dual Camera Streaming Feature - Implementation Summary

## Overview

Successfully implemented dual camera streaming feature that allows clients to
stream both front and back cameras simultaneously to the display.

## Implementation Details

### 1. New State Architecture

#### Camera Stream Interface

```typescript
interface CameraStream {
  stream: MediaStream;
  call: MediaConnection | null;
  facingMode: CameraFacingMode;
  isConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  zoom: number;
  zoomSupported: boolean;
  zoomRange: { min: number; max: number; };
}
```

#### State Variables

- **`frontCamera`**: Manages front camera ('user' facing mode) state
- **`backCamera`**: Manages back camera ('environment' facing mode) state
- **`isDualCameraMode`**: Boolean flag to toggle dual camera mode
- **`frontVideoRef` / `backVideoRef`**: Separate video element refs for each
  camera

### 2. Core Functionality

#### Dual Camera Mode Toggle

- **Button**: "Dual Camera Mode: ON/OFF" in controls panel
- **Icon**: Camera icon from lucide-react
- **Storage**: Preference saved to `localStorage` with key `dualCameraMode`
- **Behavior**:
  - When enabled: Starts both front and back cameras simultaneously
  - When disabled: Switches back to single camera mode (respects previous
    `preferredCamera` setting)

#### Multiple Stream Management

- Each camera creates its own `MediaStream` via `getUserMedia()`
- Each stream creates a separate `PeerJS` call to the display
- Connection status tracked independently for each camera

#### Independent Camera Controls (Dual Mode)

When dual camera mode is enabled, UI shows separate control sections:

**Front Camera Section:**

- Zoom slider (if supported)
- Enable/Disable video toggle
- Mute/Unmute audio toggle

**Back Camera Section:**

- Zoom slider (if supported)
- Enable/Disable video toggle
- Mute/Unmute audio toggle

### 3. UI Changes

#### Video Display Layout

**Single Camera Mode (Default):**

- Full-screen video preview
- Same as original implementation

**Dual Camera Mode:**

- Split-screen layout using CSS Grid (`grid-cols-2`)
- Left panel: Front camera with "Front Camera" label
- Right panel: Back camera with "Back Camera" label
- Each panel shows video disabled overlay when video track is disabled

#### Connection Status Indicators

**Main Status Badge:**

- Green "Connected" when at least one camera is connected
- Yellow "Connecting..." otherwise

**Dual Mode Status (when enabled):**

- Individual status indicators for each camera:
  - "Front: ✓" (green) when front camera connected
  - "Back: ✓" (green) when back camera connected
  - Shows "○" (gray) when disconnected

#### Controls Panel

- Added "Dual Camera Mode" toggle button at the top
- Dynamically shows either:
  - Single camera controls (zoom, switch, video, mute, screen share)
  - OR dual camera controls (separate sections for front and back)
- Scroll enabled for overflow content

### 4. Connection Handling

#### PeerJS Call Creation

```typescript
const createCameraCall = (
  stream: MediaStream,
  cameraType: "front" | "back",
) => {
  const call = peerRef.current.call(displayId, stream);

  call.on("close", () => {
    // Update connection status for specific camera
  });

  call.on("error", () => {
    // Show error for specific camera
  });

  // Set connected immediately (display doesn't send stream back)
  return call;
};
```

#### Camera Initialization

- **Dual Mode**: `Promise.all()` starts both cameras in parallel
- **Single Mode**: Starts one camera based on device type or saved preference
- Each camera's zoom capabilities detected independently

### 5. Backward Compatibility

#### Preserved Features

- Single camera mode works exactly as before
- Screen sharing still functional (disables dual camera mode)
- Switch camera button (only in single mode)
- All zoom, mute, video toggle features preserved
- Error handling maintains same UX
- localStorage preferences respected

#### Migration Path

- Existing users: Default to single camera mode
- No breaking changes to API or display page
- Display page already supports multiple clients, so dual streams work
  seamlessly

### 6. Error Handling

#### Camera-Specific Errors

- Connection failures show which camera failed: "Front camera connection failed"
  / "Back camera connection failed"
- Graceful degradation: If one camera fails, the other continues working
- Permission errors detected and displayed to user

#### Error States

- No cameras available: Shows full-screen error
- One camera fails in dual mode: Error banner with dismiss option, other camera
  continues
- Screen share fails: Error banner, returns to previous mode

### 7. localStorage Keys Used

| Key               | Value                      | Purpose                                        |
| ----------------- | -------------------------- | ---------------------------------------------- |
| `dualCameraMode`  | `'true'` / `'false'`       | Persist dual camera preference                 |
| `preferredCamera` | `'user'` / `'environment'` | Single camera preference (backward compatible) |

### 8. New Icons Added

- **Camera** icon from `lucide-react` for dual camera mode toggle

### 9. Display Page Compatibility

The display page (`/display`) already supports multiple concurrent client
connections. Each camera stream from a client is treated as a separate
connection:

- Display shows each stream in the optimized grid layout
- Peer IDs are used to track connections
- When dual camera mode is enabled, one client sends two streams (appearing as
  two separate videos on display)
- The display page requires **no changes** to support this feature

## Usage Instructions

### For End Users

1. **Enable Dual Camera Mode:**
   - Open the hamburger menu (top-right)
   - Click "Dual Camera Mode: OFF" button
   - Both cameras will start simultaneously
   - View switches to split-screen layout

2. **Control Individual Cameras:**
   - Scroll in controls panel to see front/back camera sections
   - Each camera has independent:
     - Zoom control
     - Video enable/disable
     - Audio mute/unmute

3. **Disable Dual Camera Mode:**
   - Click "Dual Camera Mode: ON" button
   - Returns to single camera based on previous preference
   - Full-screen view restored

### For Developers

#### Testing Dual Camera Mode

```bash
# Start dev server
npm run dev

# Navigate to display page
open http://localhost:3000/display

# Scan QR code with mobile device
# Or manually navigate to: http://localhost:3000/client?displayId=<DISPLAY_ID>

# Enable dual camera mode in controls
```

#### Debugging

- Check browser console for PeerJS connection logs
- Verify camera permissions granted for both cameras
- Check network tab for TURN server requests

## Known Limitations

1. **Device Support**:
   - Devices must have both front and back cameras
   - Some devices may only have one camera (falls back gracefully)

2. **Browser Support**:
   - Requires browser support for multiple concurrent `getUserMedia()` calls
   - Some browsers may limit simultaneous camera access

3. **Screen Share**:
   - Screen sharing automatically disables dual camera mode
   - Returns to previous mode after screen share ends

4. **Performance**:
   - Dual streams require more bandwidth
   - Older devices may struggle with dual 1920x1080 streams
   - Consider implementing quality adaptation in future

## Testing Status

### ✅ Completed

- Core implementation
- UI/UX design
- Connection management
- Error handling
- localStorage persistence
- Build successful

### ⏳ Pending

- Unit test updates for new dual camera functionality
- E2E tests for dual camera mode
- Performance testing
- Cross-browser compatibility testing

## Files Modified

| File                        | Changes                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `/src/app/client/page.tsx`  | Complete rewrite with dual camera support                       |
| `/src/app/display/page.tsx` | Enhanced cleanup for tracks (already supports multiple streams) |

## Next Steps

1. **Update Unit Tests**: Rewrite tests in `src/app/client/page.test.tsx` to
   cover:
   - Dual camera mode toggle
   - Independent camera controls
   - Multiple PeerJS calls
   - Connection status for each camera
   - Error scenarios for individual cameras

2. **Create E2E Tests**: Add Cucumber scenarios for:
   - Enabling/disabling dual camera mode
   - Verifying both streams appear on display
   - Testing individual camera controls

3. **Performance Optimization**:
   - Add adaptive bitrate based on network conditions
   - Implement quality presets (low/medium/high)
   - Consider H.264 hardware encoding if available

4. **Additional Features**:
   - Picture-in-picture mode (one camera overlays the other)
   - Swap camera positions in dual view
   - Record both streams simultaneously
   - Synchronized playback controls

## Breaking Changes

**None** - This is a fully backward-compatible addition. Existing single-camera
functionality is preserved.

## API Changes

**None** - No changes to display page API or PeerJS communication protocol.
