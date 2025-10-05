import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMediaStream } from './useMediaStream';

// Mock WebRTC utilities
const mockGetUserMediaStream = vi.fn();
const mockGetDisplayMediaStream = vi.fn();
const mockStopMediaStream = vi.fn();
const mockGetStreamMetadata = vi.fn();
const mockMonitorStreamHealth = vi.fn();

vi.mock('@/lib/webrtc/utils', () => ({
  getUserMediaStream: mockGetUserMediaStream,
  getDisplayMediaStream: mockGetDisplayMediaStream,
  stopMediaStream: mockStopMediaStream,
  getStreamMetadata: mockGetStreamMetadata,
  monitorStreamHealth: mockMonitorStreamHealth,
}));

describe('useMediaStream', () => {
  const mockStream = {
    getTracks: vi.fn(() => []),
    getVideoTracks: vi.fn(() => []),
    getAudioTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
  } as unknown as MediaStream;

  const mockMetadata = {
    peerId: 'test-peer',
    streamType: 'video' as const,
    isActive: true,
    videoSettings: {
      width: 1280,
      height: 720,
      frameRate: 30,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMediaStream.mockResolvedValue(mockStream);
    mockGetDisplayMediaStream.mockResolvedValue(mockStream);
    mockGetStreamMetadata.mockReturnValue(mockMetadata);
    mockMonitorStreamHealth.mockReturnValue(vi.fn()); // Cleanup function
  });

  it('should initialize with null stream', () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    expect(result.current.stream).toBeNull();
    expect(result.current.metadata).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should start camera stream successfully', async () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    const stream = await result.current.startStream('camera');

    expect(stream).toBe(mockStream);
    expect(mockGetUserMediaStream).toHaveBeenCalledWith(undefined);
    expect(result.current.stream).toBe(mockStream);
    expect(result.current.isActive).toBe(true);
  });

  it('should start camera stream with custom constraints', async () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    const constraints = {
      video: { width: { ideal: 1920 } },
      audio: false,
    };

    await result.current.startStream('camera', constraints);

    expect(mockGetUserMediaStream).toHaveBeenCalledWith(constraints);
  });

  it('should start screen stream successfully', async () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    const stream = await result.current.startStream('screen');

    expect(stream).toBe(mockStream);
    expect(mockGetDisplayMediaStream).toHaveBeenCalled();
    expect(result.current.stream).toBe(mockStream);
    expect(result.current.isActive).toBe(true);
  });

  it('should get stream metadata after starting stream', async () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    expect(mockGetStreamMetadata).toHaveBeenCalledWith(mockStream, 'peer-123', 'video');
    expect(result.current.metadata).toEqual(mockMetadata);
  });

  it('should monitor stream health after starting', async () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    expect(mockMonitorStreamHealth).toHaveBeenCalledWith(
      mockStream,
      expect.any(Function)
    );
  });

  it('should call onInactive when stream becomes inactive', async () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    // Get the onInactive callback
    const onInactive = mockMonitorStreamHealth.mock.calls[0][1];
    onInactive();

    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });
  });

  it('should stop existing stream before starting new one', async () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');
    mockStopMediaStream.mockClear();

    await result.current.startStream('screen');

    expect(mockStopMediaStream).toHaveBeenCalledWith(mockStream);
  });

  it('should handle stream start error', async () => {
    const error = new Error('Permission denied');
    mockGetUserMediaStream.mockRejectedValue(error);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await expect(result.current.startStream('camera')).rejects.toThrow('Permission denied');

    await waitFor(() => {
      expect(result.current.error).toBe('Permission denied');
      expect(result.current.stream).toBeNull();
    });
  });

  it('should handle non-Error object in catch', async () => {
    mockGetUserMediaStream.mockRejectedValue('String error');

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await expect(result.current.startStream('camera')).rejects.toBe('String error');

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to start media stream');
    });
  });

  it('should stop stream and cleanup', async () => {
    const mockCleanup = vi.fn();
    mockMonitorStreamHealth.mockReturnValue(mockCleanup);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');
    result.current.stopStream();

    expect(mockCleanup).toHaveBeenCalled();
    expect(mockStopMediaStream).toHaveBeenCalledWith(mockStream);
    expect(result.current.stream).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it('should toggle audio track', async () => {
    const audioTrack = { enabled: true };
    mockStream.getAudioTracks.mockReturnValue([audioTrack]);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    result.current.toggleTrack('audio', false);
    expect(audioTrack.enabled).toBe(false);

    result.current.toggleTrack('audio', true);
    expect(audioTrack.enabled).toBe(true);
  });

  it('should toggle audio track without explicit enabled value', async () => {
    const audioTrack = { enabled: true };
    mockStream.getAudioTracks.mockReturnValue([audioTrack]);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    result.current.toggleTrack('audio');
    expect(audioTrack.enabled).toBe(false);

    result.current.toggleTrack('audio');
    expect(audioTrack.enabled).toBe(true);
  });

  it('should toggle video track', async () => {
    const videoTrack = { enabled: true };
    mockStream.getVideoTracks.mockReturnValue([videoTrack]);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    result.current.toggleTrack('video', false);
    expect(videoTrack.enabled).toBe(false);
  });

  it('should handle toggle track when no stream exists', () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    expect(() => result.current.toggleTrack('audio')).not.toThrow();
  });

  it('should check if audio track is enabled', async () => {
    const audioTrack = { enabled: true };
    mockStream.getAudioTracks.mockReturnValue([audioTrack]);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    expect(result.current.isTrackEnabled('audio')).toBe(true);

    audioTrack.enabled = false;
    expect(result.current.isTrackEnabled('audio')).toBe(false);
  });

  it('should check if video track is enabled', async () => {
    const videoTrack = { enabled: false };
    mockStream.getVideoTracks.mockReturnValue([videoTrack]);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    expect(result.current.isTrackEnabled('video')).toBe(false);
  });

  it('should return false for isTrackEnabled when no stream', () => {
    const { result } = renderHook(() => useMediaStream('peer-123'));

    expect(result.current.isTrackEnabled('audio')).toBe(false);
    expect(result.current.isTrackEnabled('video')).toBe(false);
  });

  it('should replace video track from camera to screen', async () => {
    const newStream = {
      getVideoTracks: vi.fn(() => [{ id: 'new-track' }]),
    } as unknown as MediaStream;
    mockGetDisplayMediaStream.mockResolvedValue(newStream);

    const oldVideoTrack = { stop: vi.fn() };
    mockStream.getVideoTracks.mockReturnValue([oldVideoTrack]);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');
    await result.current.replaceVideoTrack('screen');

    expect(mockGetDisplayMediaStream).toHaveBeenCalled();
    expect(mockStream.removeTrack).toHaveBeenCalledWith(oldVideoTrack);
    expect(oldVideoTrack.stop).toHaveBeenCalled();
    expect(mockStream.addTrack).toHaveBeenCalledWith({ id: 'new-track' });
  });

  it('should replace video track from screen to camera', async () => {
    const newStream = {
      getVideoTracks: vi.fn(() => [{ id: 'camera-track' }]),
    } as unknown as MediaStream;
    mockGetUserMediaStream.mockResolvedValue(newStream);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('screen');
    await result.current.replaceVideoTrack('camera');

    expect(mockGetUserMediaStream).toHaveBeenCalled();
  });

  it('should set stream when replacing track without existing stream', async () => {
    const newStream = {
      getVideoTracks: vi.fn(() => [{ id: 'new-track' }]),
    } as unknown as MediaStream;
    mockGetUserMediaStream.mockResolvedValue(newStream);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.replaceVideoTrack('camera');

    await waitFor(() => {
      expect(result.current.stream).toBe(newStream);
      expect(result.current.isActive).toBe(true);
    });
  });

  it('should handle replace video track error', async () => {
    const error = new Error('Failed to get media');
    mockGetUserMediaStream.mockRejectedValue(error);

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('screen');

    await expect(result.current.replaceVideoTrack('camera')).rejects.toThrow('Failed to get media');

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to get media');
    });
  });

  it('should handle non-Error in replaceVideoTrack catch', async () => {
    mockGetUserMediaStream.mockRejectedValue('String error');

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await expect(result.current.replaceVideoTrack('camera')).rejects.toBe('String error');

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to replace video track');
    });
  });

  it('should cleanup on unmount', async () => {
    const mockCleanup = vi.fn();
    mockMonitorStreamHealth.mockReturnValue(mockCleanup);

    const { result, unmount } = renderHook(() => useMediaStream('peer-123'));

    await result.current.startStream('camera');

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
    expect(mockStopMediaStream).toHaveBeenCalledWith(mockStream);
  });

  it('should handle cleanup on unmount with no stream', () => {
    const { unmount } = renderHook(() => useMediaStream('peer-123'));

    expect(() => unmount()).not.toThrow();
  });

  it('should clear error when starting new stream', async () => {
    mockGetUserMediaStream.mockRejectedValueOnce(new Error('First error'));

    const { result } = renderHook(() => useMediaStream('peer-123'));

    await expect(result.current.startStream('camera')).rejects.toThrow('First error');

    await waitFor(() => {
      expect(result.current.error).toBe('First error');
    });

    mockGetUserMediaStream.mockResolvedValue(mockStream);
    await result.current.startStream('camera');

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
