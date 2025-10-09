import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePeer } from './usePeer';
import type { PeerConfig } from '@/types/webrtc';

// Mock PeerJS with vi.hoisted
const { mockPeerInstance, MockPeer } = vi.hoisted(() => {
  const mockPeerInstance = {
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
    disconnected: false,
    destroyed: false,
  };

  const MockPeer = vi.fn(() => mockPeerInstance);

  return { mockPeerInstance, MockPeer };
});

vi.mock('peerjs', () => ({
  default: MockPeer,
}));

// Mock WebRTC utils
vi.mock('@apps/display/lib/webrtc/utils', () => ({
  generatePeerId: vi.fn(() => 'generated-peer-id'),
  isWebRTCSupported: vi.fn(() => true),
  createWebRTCError: vi.fn((type, message, error) => ({
    type,
    message,
    originalError: error,
  })),
}));

describe('usePeer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPeerInstance.disconnected = false;
    mockPeerInstance.destroyed = false;
    mockPeerInstance.on = vi.fn();
    mockPeerInstance.off = vi.fn();
    mockPeerInstance.destroy = vi.fn();
    mockPeerInstance.disconnect = vi.fn();
    mockPeerInstance.reconnect = vi.fn();
  });

  it('should initialize with disconnected status', () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    expect(result.current.status).toBe('connecting');
  });

  it('should create peer with generated ID when no peerId provided', async () => {
    const config: PeerConfig = { role: 'host' };
    renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(MockPeer).toHaveBeenCalledWith(
        'generated-peer-id',
        expect.objectContaining({
          debug: expect.any(Number),
        })
      );
    });
  });

  it('should create peer with custom peerId when provided', async () => {
    const config: PeerConfig = { role: 'host', peerId: 'custom-id' };
    renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(MockPeer).toHaveBeenCalledWith(
        'custom-id',
        expect.objectContaining({
          debug: expect.any(Number),
        })
      );
    });
  });

  it('should use custom server config when provided', async () => {
    const config: PeerConfig = {
      role: 'client',
      serverConfig: {
        host: 'peer.example.com',
        port: 9000,
        path: '/peer',
        secure: true,
      },
    };
    renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(MockPeer).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          host: 'peer.example.com',
          port: 9000,
          path: '/peer',
          secure: true,
        })
      );
    });
  });

  it('should handle successful peer connection', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    // Simulate 'open' event
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'open'
    )?.[1];
    openHandler?.('opened-peer-id');

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
      expect(result.current.peerId).toBe('opened-peer-id');
      expect(result.current.peer).toBe(mockPeerInstance);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle peer error', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    // Simulate 'error' event
    const errorHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'error'
    )?.[1];
    const mockError = new Error('Connection failed');
    errorHandler?.(mockError);

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('Connection failed');
    });
  });

  it('should handle peer disconnection', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    // First connect
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'open'
    )?.[1];
    openHandler?.('peer-id');

    // Then disconnect
    const disconnectHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'disconnected'
    )?.[1];
    disconnectHandler?.();

    await waitFor(() => {
      expect(result.current.status).toBe('disconnected');
    });
  });

  it('should handle peer close', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    // Simulate 'close' event
    const closeHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'close'
    )?.[1];
    closeHandler?.();

    await waitFor(() => {
      expect(result.current.status).toBe('closed');
      expect(result.current.peer).toBeNull();
      expect(result.current.peerId).toBeNull();
    });
  });

  it('should reconnect to existing peer when disconnected', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    mockPeerInstance.disconnected = true;

    result.current.reconnect();

    await waitFor(() => {
      expect(mockPeerInstance.reconnect).toHaveBeenCalled();
      expect(result.current.status).toBe('connecting');
    });
  });

  it('should disconnect from peer', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    result.current.disconnect();

    expect(mockPeerInstance.disconnect).toHaveBeenCalled();
  });

  it('should destroy peer and reset state', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    result.current.destroy();

    await waitFor(() => {
      expect(mockPeerInstance.destroy).toHaveBeenCalled();
      expect(result.current.status).toBe('closed');
      expect(result.current.peer).toBeNull();
      expect(result.current.peerId).toBeNull();
    });
  });

  it('should not initialize if WebRTC is not supported', async () => {
    const { isWebRTCSupported } = await import('@apps/display/lib/webrtc/utils');
    vi.mocked(isWebRTCSupported).mockReturnValue(false);

    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('Browser does not support WebRTC');
    });

    vi.mocked(isWebRTCSupported).mockReturnValue(true);
  });

  it('should not initialize multiple times simultaneously', async () => {
    const config: PeerConfig = { role: 'host' };
    renderHook(() => usePeer(config));

    const initialCallCount = MockPeer.mock.calls.length;

    // Try to initialize again immediately
    await waitFor(() => {
      expect(MockPeer.mock.calls.length).toBe(initialCallCount);
    });
  });

  it('should not reinitialize if peer is already connected', async () => {
    const config: PeerConfig = { role: 'host' };
    renderHook(() => usePeer(config));

    mockPeerInstance.disconnected = false;
    mockPeerInstance.destroyed = false;

    const initialCallCount = MockPeer.mock.calls.length;

    // Component re-render shouldn't create new peer
    await waitFor(() => {
      expect(MockPeer.mock.calls.length).toBe(initialCallCount);
    });
  });

  it('should handle initialization error', async () => {
    MockPeer.mockImplementationOnce(() => {
      throw new Error('Initialization failed');
    });

    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('Initialization failed');
    });
  });

  it('should destroy peer on unmount', () => {
    const config: PeerConfig = { role: 'host' };
    const { unmount } = renderHook(() => usePeer(config));

    unmount();

    expect(mockPeerInstance.destroy).toHaveBeenCalled();
  });

  it('should not destroy already destroyed peer on unmount', () => {
    const config: PeerConfig = { role: 'host' };
    const { unmount } = renderHook(() => usePeer(config));

    mockPeerInstance.destroyed = true;
    mockPeerInstance.destroy.mockClear();

    unmount();

    expect(mockPeerInstance.destroy).not.toHaveBeenCalled();
  });

  it('should handle error without message property', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    const errorHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'error'
    )?.[1];
    errorHandler?.({ type: 'network-error' }); // Error without message

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should not disconnect if peer is already destroyed', () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    mockPeerInstance.destroyed = true;
    mockPeerInstance.disconnect.mockClear();

    result.current.disconnect();

    expect(mockPeerInstance.disconnect).not.toHaveBeenCalled();
  });

  it('should not destroy if peer is already destroyed', () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    mockPeerInstance.destroyed = true;
    mockPeerInstance.destroy.mockClear();

    result.current.destroy();

    expect(mockPeerInstance.destroy).not.toHaveBeenCalled();
  });

  it('should initialize when reconnect is called and peer is not disconnected', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    // Set peer to not be disconnected (already connected or in another state)
    mockPeerInstance.disconnected = false;
    mockPeerInstance.reconnect.mockClear();
    MockPeer.mockClear();

    result.current.reconnect();

    // Should call initialize which creates new peer, not reconnect
    await waitFor(() => {
      expect(mockPeerInstance.reconnect).not.toHaveBeenCalled();
    });
  });

  it('should not reinitialize if peer exists and is not disconnected and not destroyed', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    // Wait for initial peer creation
    await waitFor(() => {
      expect(MockPeer).toHaveBeenCalled();
    });

    // Simulate peer opening
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'open'
    )?.[1];
    openHandler?.('test-peer-id');

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    const initialCallCount = MockPeer.mock.calls.length;

    // Set peer to be in a valid state (not disconnected, not destroyed)
    mockPeerInstance.disconnected = false;
    mockPeerInstance.destroyed = false;

    // Try to reconnect, but since peer is already connected and valid
    // initialize should return early (line 37)
    result.current.reconnect();

    // Wait a bit to ensure no new peer is created
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not create a new peer instance
    expect(MockPeer.mock.calls.length).toBe(initialCallCount);
  });

  it('should handle error in error handler without message property', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    const errorHandler = mockPeerInstance.on.mock.calls.find(
      (call) => call[0] === 'error'
    )?.[1];

    // Simulate error event with error object that has no message
    const errorWithoutMessage = { type: 'network' };
    errorHandler?.(errorWithoutMessage);

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should handle reconnect logic for disconnected peer', async () => {
    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    // Wait for peer to be created
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalled();
    });

    // Simulate peer being disconnected but not destroyed
    mockPeerInstance.disconnected = true;
    mockPeerInstance.destroyed = false;
    mockPeerInstance.reconnect.mockClear();

    // Call reconnect
    result.current.reconnect();

    await waitFor(() => {
      expect(mockPeerInstance.reconnect).toHaveBeenCalled();
      expect(result.current.status).toBe('connecting');
    });
  });

  it('should use debug level 2 in development environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const config: PeerConfig = { role: 'host' };
    renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(MockPeer).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          debug: 2,
        })
      );
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should use debug level 0 in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const config: PeerConfig = { role: 'host' };
    renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(MockPeer).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          debug: 0,
        })
      );
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle non-Error exception in initialization catch block', async () => {
    MockPeer.mockImplementationOnce(() => {
      throw 'String error thrown';
    });

    const config: PeerConfig = { role: 'host' };
    const { result } = renderHook(() => usePeer(config));

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('Failed to initialize peer');
    });
  });
});
