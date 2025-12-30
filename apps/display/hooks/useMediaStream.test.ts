import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaStream } from "./useMediaStream";

// Mock WebRTC utilities
vi.mock("@apps/display/lib/webrtc/utils", () => ({
  getUserMediaStream: vi.fn(),
  getDisplayMediaStream: vi.fn(),
  stopMediaStream: vi.fn(),
  getStreamMetadata: vi.fn(),
  monitorStreamHealth: vi.fn(),
}));

describe("useMediaStream", () => {
  const mockGetTracks = vi.fn(() => [] as MediaStreamTrack[]);
  const mockGetVideoTracks = vi.fn(() => [] as MediaStreamTrack[]);
  const mockGetAudioTracks = vi.fn(() => [] as MediaStreamTrack[]);
  const mockAddTrack = vi.fn();
  const mockRemoveTrack = vi.fn();

  const mockStream = {
    getTracks: mockGetTracks,
    getVideoTracks: mockGetVideoTracks,
    getAudioTracks: mockGetAudioTracks,
    addTrack: mockAddTrack,
    removeTrack: mockRemoveTrack,
  } as unknown as MediaStream;

  const mockMetadata = {
    peerId: "test-peer",
    streamType: "video" as const,
    isActive: true,
    videoSettings: {
      width: 1280,
      height: 720,
      frameRate: 30,
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const {
      getUserMediaStream,
      getDisplayMediaStream,
      getStreamMetadata,
      monitorStreamHealth,
    } = await import("@apps/display/lib/webrtc/utils");
    vi.mocked(getUserMediaStream).mockResolvedValue(mockStream);
    vi.mocked(getDisplayMediaStream).mockResolvedValue(mockStream);
    vi.mocked(getStreamMetadata).mockReturnValue(mockMetadata);
    vi.mocked(monitorStreamHealth).mockReturnValue(vi.fn()); // Cleanup function
  });

  it("should initialize with null stream", () => {
    const { result } = renderHook(() => useMediaStream("peer-123"));

    expect(result.current.stream).toBeNull();
    expect(result.current.metadata).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should start camera stream successfully", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const { result } = renderHook(() => useMediaStream("peer-123"));

    const stream = await result.current.startStream("camera");

    expect(stream).toBe(mockStream);
    expect(vi.mocked(getUserMediaStream)).toHaveBeenCalledWith(undefined);

    await waitFor(() => {
      expect(result.current.stream).toBe(mockStream);
      expect(result.current.isActive).toBe(true);
    });
  });

  it("should start camera stream with custom constraints", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const { result } = renderHook(() => useMediaStream("peer-123"));

    const constraints = {
      video: { width: { ideal: 1920 } },
      audio: false,
    };

    await result.current.startStream("camera", constraints);

    expect(vi.mocked(getUserMediaStream)).toHaveBeenCalledWith(constraints);
  });

  it("should start screen stream successfully", async () => {
    const { getDisplayMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const { result } = renderHook(() => useMediaStream("peer-123"));

    const stream = await result.current.startStream("screen");

    expect(stream).toBe(mockStream);
    expect(vi.mocked(getDisplayMediaStream)).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.stream).toBe(mockStream);
      expect(result.current.isActive).toBe(true);
    });
  });

  it("should get stream metadata after starting stream", async () => {
    const { getStreamMetadata } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    expect(vi.mocked(getStreamMetadata)).toHaveBeenCalledWith(
      mockStream,
      "peer-123",
      "video",
    );

    await waitFor(() => {
      expect(result.current.metadata).toEqual(mockMetadata);
    });
  });

  it("should monitor stream health after starting", async () => {
    const { monitorStreamHealth } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    expect(vi.mocked(monitorStreamHealth)).toHaveBeenCalledWith(
      mockStream,
      expect.any(Function),
    );
  });

  it("should call onInactive when stream becomes inactive", async () => {
    const { monitorStreamHealth } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    // Get the onInactive callback
    const onInactive = vi.mocked(monitorStreamHealth).mock.calls[0]![1];
    onInactive();

    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });
  });

  it("should stop existing stream before starting new one", async () => {
    const { stopMediaStream } = await import("@apps/display/lib/webrtc/utils");
    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");
    vi.mocked(stopMediaStream).mockClear();

    await result.current.startStream("screen");

    expect(vi.mocked(stopMediaStream)).toHaveBeenCalledWith(mockStream);
  });

  it("should handle stream start error", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const error = new Error("Permission denied");
    vi.mocked(getUserMediaStream).mockRejectedValue(error);

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await expect(result.current.startStream("camera")).rejects.toThrow(
      "Permission denied",
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Permission denied");
      expect(result.current.stream).toBeNull();
    });
  });

  it("should handle non-Error object in catch", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    vi.mocked(getUserMediaStream).mockRejectedValue("String error");

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await expect(result.current.startStream("camera")).rejects.toBe(
      "String error",
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to start media stream");
    });
  });

  it("should stop stream and cleanup", async () => {
    const { monitorStreamHealth, stopMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const mockCleanup = vi.fn();
    vi.mocked(monitorStreamHealth).mockReturnValue(mockCleanup);

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");
    result.current.stopStream();

    expect(mockCleanup).toHaveBeenCalled();
    expect(vi.mocked(stopMediaStream)).toHaveBeenCalledWith(mockStream);
    expect(result.current.stream).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it("should toggle audio track", async () => {
    const audioTrack = { enabled: true };
    mockGetAudioTracks.mockReturnValue(
      [audioTrack] as unknown as MediaStreamTrack[],
    );

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    result.current.toggleTrack("audio", false);
    expect(audioTrack.enabled).toBe(false);

    result.current.toggleTrack("audio", true);
    expect(audioTrack.enabled).toBe(true);
  });

  it("should toggle audio track without explicit enabled value", async () => {
    const audioTrack = { enabled: true };
    mockGetAudioTracks.mockReturnValue(
      [audioTrack] as unknown as MediaStreamTrack[],
    );

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    result.current.toggleTrack("audio");
    expect(audioTrack.enabled).toBe(false);

    result.current.toggleTrack("audio");
    expect(audioTrack.enabled).toBe(true);
  });

  it("should toggle video track", async () => {
    const videoTrack = { enabled: true };
    mockGetVideoTracks.mockReturnValue(
      [videoTrack] as unknown as MediaStreamTrack[],
    );

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    result.current.toggleTrack("video", false);
    expect(videoTrack.enabled).toBe(false);
  });

  it("should handle toggle track when no stream exists", () => {
    const { result } = renderHook(() => useMediaStream("peer-123"));

    expect(() => result.current.toggleTrack("audio")).not.toThrow();
  });

  it("should check if audio track is enabled", async () => {
    const audioTrack = { enabled: true };
    mockGetAudioTracks.mockReturnValue(
      [audioTrack] as unknown as MediaStreamTrack[],
    );

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    expect(result.current.isTrackEnabled("audio")).toBe(true);

    audioTrack.enabled = false;
    expect(result.current.isTrackEnabled("audio")).toBe(false);
  });

  it("should check if video track is enabled", async () => {
    const videoTrack = { enabled: false };
    mockGetVideoTracks.mockReturnValue(
      [videoTrack] as unknown as MediaStreamTrack[],
    );

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    expect(result.current.isTrackEnabled("video")).toBe(false);
  });

  it("should return false for isTrackEnabled when no stream", () => {
    const { result } = renderHook(() => useMediaStream("peer-123"));

    expect(result.current.isTrackEnabled("audio")).toBe(false);
    expect(result.current.isTrackEnabled("video")).toBe(false);
  });

  it("should replace video track from camera to screen", async () => {
    const { getDisplayMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const newStream = {
      getVideoTracks: vi.fn(() => [{ id: "new-track" }]),
    } as unknown as MediaStream;
    vi.mocked(getDisplayMediaStream).mockResolvedValue(newStream);

    const oldVideoTrack = { stop: vi.fn() };
    mockGetVideoTracks.mockReturnValue(
      [oldVideoTrack] as unknown as MediaStreamTrack[],
    );

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");
    await result.current.replaceVideoTrack("screen");

    expect(vi.mocked(getDisplayMediaStream)).toHaveBeenCalled();
    expect(mockRemoveTrack).toHaveBeenCalledWith(oldVideoTrack);
    expect(oldVideoTrack.stop).toHaveBeenCalled();
    expect(mockAddTrack).toHaveBeenCalledWith({ id: "new-track" });
  });

  it("should replace video track from screen to camera", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const newStream = {
      getVideoTracks: vi.fn(() => [{ id: "camera-track" }]),
    } as unknown as MediaStream;
    vi.mocked(getUserMediaStream).mockResolvedValue(newStream);

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("screen");
    await result.current.replaceVideoTrack("camera");

    expect(vi.mocked(getUserMediaStream)).toHaveBeenCalled();
  });

  it("should set stream when replacing track without existing stream", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const newStream = {
      getVideoTracks: vi.fn(() => [{ id: "new-track" }]),
    } as unknown as MediaStream;
    vi.mocked(getUserMediaStream).mockResolvedValue(newStream);

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.replaceVideoTrack("camera");

    await waitFor(() => {
      expect(result.current.stream).toBe(newStream);
      expect(result.current.isActive).toBe(true);
    });
  });

  it("should handle replace video track error", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const error = new Error("Failed to get media");
    vi.mocked(getUserMediaStream).mockRejectedValue(error);

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("screen");

    await expect(result.current.replaceVideoTrack("camera")).rejects.toThrow(
      "Failed to get media",
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to get media");
    });
  });

  it("should handle non-Error in replaceVideoTrack catch", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    vi.mocked(getUserMediaStream).mockRejectedValue("String error");

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await expect(result.current.replaceVideoTrack("camera")).rejects.toBe(
      "String error",
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to replace video track");
    });
  });

  it("should cleanup on unmount", async () => {
    const { monitorStreamHealth, stopMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const mockCleanup = vi.fn();
    vi.mocked(monitorStreamHealth).mockReturnValue(mockCleanup);

    const { result, unmount } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
    expect(vi.mocked(stopMediaStream)).toHaveBeenCalledWith(mockStream);
  });

  it("should handle cleanup on unmount with no stream", () => {
    const { unmount } = renderHook(() => useMediaStream("peer-123"));

    expect(() => unmount()).not.toThrow();
  });

  it("should clear error when starting new stream", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    vi.mocked(getUserMediaStream).mockRejectedValueOnce(
      new Error("First error"),
    );

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await expect(result.current.startStream("camera")).rejects.toThrow(
      "First error",
    );

    await waitFor(() => {
      expect(result.current.error).toBe("First error");
    });

    vi.mocked(getUserMediaStream).mockResolvedValue(mockStream);
    await result.current.startStream("camera");

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it("should handle replaceVideoTrack when no new video track exists", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );
    const newStream = {
      getVideoTracks: vi.fn(() => []), // No video tracks
    } as unknown as MediaStream;

    const oldVideoTrack = { stop: vi.fn(), enabled: true };
    const streamWithVideo = {
      getTracks: vi.fn(() => [oldVideoTrack]),
      getVideoTracks: vi.fn(() => [oldVideoTrack]),
      getAudioTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as unknown as MediaStream;

    // Mock initial stream with video track
    vi.mocked(getUserMediaStream).mockResolvedValueOnce(streamWithVideo);

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    // Now mock the new stream without video tracks
    vi.mocked(getUserMediaStream).mockResolvedValueOnce(newStream);

    await result.current.replaceVideoTrack("camera");

    // Old track should be removed and stopped
    expect(streamWithVideo.removeTrack).toHaveBeenCalledWith(oldVideoTrack);
    expect(oldVideoTrack.stop).toHaveBeenCalled();
    // addTrack should not be called when there's no new video track (because newVideoTrack is undefined)
  });

  it("should update state with streamRef.current when replacing video track with existing stream", async () => {
    const { getUserMediaStream } = await import(
      "@apps/display/lib/webrtc/utils"
    );

    const oldVideoTrack = { stop: vi.fn(), enabled: true };
    const newVideoTrack = { id: "new-track", enabled: true };

    const existingStream = {
      getTracks: vi.fn(() => [oldVideoTrack]),
      getVideoTracks: vi.fn(() => [oldVideoTrack]),
      getAudioTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as unknown as MediaStream;

    const newStream = {
      getVideoTracks: vi.fn(() => [newVideoTrack]),
    } as unknown as MediaStream;

    // Mock initial stream
    vi.mocked(getUserMediaStream).mockResolvedValueOnce(existingStream);

    const { result } = renderHook(() => useMediaStream("peer-123"));

    await result.current.startStream("camera");

    // Verify initial state
    await waitFor(() => {
      expect(result.current.stream).toBe(existingStream);
    });

    // Mock the new stream for replacement
    vi.mocked(getUserMediaStream).mockResolvedValueOnce(newStream);

    await result.current.replaceVideoTrack("camera");

    // Verify setState was called with streamRef.current (lines 198-199)
    await waitFor(() => {
      expect(result.current.stream).toBe(existingStream);
      expect(existingStream.addTrack).toHaveBeenCalledWith(newVideoTrack);
      expect(existingStream.removeTrack).toHaveBeenCalledWith(oldVideoTrack);
    });
  });
});
