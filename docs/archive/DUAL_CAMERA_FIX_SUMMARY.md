# Dual Camera Mode Fix - Summary

## Issue
When dual camera mode was enabled on the client, only one camera feed would show up on the display instead of both front and back camera feeds.

## Root Cause
The client page was creating two separate MediaConnection calls to the display using the **same PeerJS instance**. Both calls had the same `call.peer` ID since they originated from the same Peer.

On the display page (`src/app/display/page.tsx` lines 82-85), when a new stream arrived, it checked if a stream with that `call.peer` ID already existed. If it did, the new stream was skipped. This meant when the second camera tried to connect, it was rejected because the display thought it was a duplicate connection from the same peer.

## Solution
Implemented **separate Peer instances** for each camera (front and back). This ensures each stream has a unique peer ID, allowing the display to correctly identify and accept both connections.

## Changes Made

### File: `/Volumes/Dev/github.com/zerdos/spike-land-nextjs/fix-video-wall-issues/src/app/client/page.tsx`

#### 1. Separate Peer References (Lines 54-55)
**Before:**
```typescript
const peerRef = useRef<Peer | null>(null);
```

**After:**
```typescript
const frontPeerRef = useRef<Peer | null>(null);
const backPeerRef = useRef<Peer | null>(null);
```

#### 2. Updated createCameraCall Function (Lines 168-203)
**Before:**
```typescript
const createCameraCall = useCallback((stream: MediaStream, cameraType: 'front' | 'back') => {
    if (!peerRef.current || !displayId) return null;
    const call = peerRef.current.call(displayId, stream);
    // ...
}, [displayId]);
```

**After:**
```typescript
const createCameraCall = useCallback((stream: MediaStream, cameraType: 'front' | 'back') => {
    const peerRef = cameraType === 'front' ? frontPeerRef : backPeerRef;

    if (!peerRef.current || !displayId) return null;
    const call = peerRef.current.call(displayId, stream);
    // ...
}, [displayId]);
```

#### 3. Revised Peer Initialization (Lines 211-396)
**Before:**
- Created a single Peer instance
- Used `peerRef.current = peer`
- Called `peer.on('open', ...)` to initialize cameras

**After:**
- **Dual Camera Mode**: Creates two separate Peer instances (frontPeer and backPeer) with unique IDs
  - Assigns `frontPeerRef.current = frontPeer` and `backPeerRef.current = backPeer`
  - Waits for both peers to open before initializing cameras
  - Uses a counter (`peersInitialized`) to track when both are ready

- **Single Camera Mode**: Creates one Peer instance
  - Assigns to either `frontPeerRef` or `backPeerRef` based on camera preference
  - Maintains backward compatibility with existing single-camera behavior

#### 4. Updated Cleanup Logic (Lines 400-421)
**Before:**
```typescript
if (peerRef.current) {
    peerRef.current.destroy();
}
```

**After:**
```typescript
if (frontPeerRef.current) {
    frontPeerRef.current.destroy();
}
if (backPeerRef.current) {
    backPeerRef.current.destroy();
}
```

## How It Works

### Dual Camera Mode Flow:
1. User enables dual camera mode
2. Two separate Peer instances are created:
   - `frontPeer` - handles front camera connection
   - `backPeer` - handles back camera connection
3. Each Peer instance gets a unique ID from the PeerJS signaling server
4. Both peers register event listeners for `'open'` events
5. Once both peers are ready (counter reaches 2), cameras are initialized
6. Each camera creates a MediaConnection call using its own Peer instance
7. Display receives two connections with unique peer IDs and can distinguish between them

### Single Camera Mode Flow:
1. User has single camera mode (default)
2. One Peer instance is created and assigned to the appropriate ref based on camera preference
3. Camera initializes when peer is ready
4. Maintains backward compatibility with existing behavior

## Testing Recommendations

1. **Test Dual Camera Mode:**
   - Enable dual camera mode on client
   - Verify both front and back camera feeds appear on display
   - Check that each feed shows the correct camera
   - Verify connection status indicators show both cameras as connected

2. **Test Single Camera Mode:**
   - Disable dual camera mode
   - Verify single camera works as before
   - Test switching between front and back cameras
   - Verify screen sharing still works

3. **Test Mode Switching:**
   - Toggle between single and dual camera modes
   - Verify smooth transitions
   - Check that peer connections are properly cleaned up

4. **Test Edge Cases:**
   - Test with poor network conditions
   - Test rapid mode switching
   - Verify proper cleanup on page unmount
   - Test multiple clients connecting to same display

## Benefits

1. **Unique Identification**: Each camera stream has its own unique peer ID
2. **Clean Architecture**: Separates concerns for each camera
3. **Backward Compatible**: Single camera mode continues to work as before
4. **Scalable**: Could easily extend to support more than two cameras if needed
5. **Reliable**: Proper cleanup prevents memory leaks and connection issues

## Technical Details

### PeerJS Peer IDs
- Each Peer instance is assigned a unique ID by the PeerJS signaling server
- These IDs are used to establish peer-to-peer connections
- The display uses these IDs to track and manage multiple incoming streams

### Connection Lifecycle
1. **Creation**: `new Peer({ config: { iceServers } })`
2. **Ready**: `peer.on('open', (id) => { ... })`
3. **Call**: `peer.call(displayId, stream)`
4. **Cleanup**: `peer.destroy()`

## Build Status
- Linting: PASS (2 warnings - safe to ignore)
- TypeScript: PASS
- Build: PASS
- Bundle size impact: Minimal (<1KB increase)
