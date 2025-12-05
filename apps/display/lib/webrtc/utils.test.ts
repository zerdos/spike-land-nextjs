import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateVideoLayout,
  createConnectionUrl,
  createWebRTCError,
  DEFAULT_VIDEO_CONSTRAINTS,
  generatePeerId,
  getDisplayMediaStream,
  getStreamMetadata,
  getUserMediaStream,
  isValidPeerId,
  isWebRTCSupported,
  monitorStreamHealth,
  parseConnectionUrl,
  stopMediaStream,
} from "./utils";

describe("DEFAULT_VIDEO_CONSTRAINTS", () => {
  it("should have correct default video constraints", () => {
    expect(DEFAULT_VIDEO_CONSTRAINTS).toEqual({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: true,
    });
  });
});

describe("getUserMediaStream", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should request user media with default constraints", async () => {
    const mockStream = {} as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(mockStream);
    global.navigator.mediaDevices = {
      getUserMedia,
    } as unknown as MediaDevices;

    const stream = await getUserMediaStream();
    expect(stream).toBe(mockStream);
    expect(getUserMedia).toHaveBeenCalledWith(DEFAULT_VIDEO_CONSTRAINTS);
  });

  it("should request user media with custom constraints", async () => {
    const mockStream = {} as MediaStream;
    const customConstraints = {
      video: { width: { ideal: 1920 } },
      audio: false,
    };
    const getUserMedia = vi.fn().mockResolvedValue(mockStream);
    global.navigator.mediaDevices = {
      getUserMedia,
    } as unknown as MediaDevices;

    const stream = await getUserMediaStream(customConstraints);
    expect(stream).toBe(mockStream);
    expect(getUserMedia).toHaveBeenCalledWith(customConstraints);
  });

  it("should throw WebRTC error on failure", async () => {
    const error = new Error("Permission denied");
    const getUserMedia = vi.fn().mockRejectedValue(error);
    global.navigator.mediaDevices = {
      getUserMedia,
    } as unknown as MediaDevices;

    await expect(getUserMediaStream()).rejects.toMatchObject({
      type: "permission-denied",
      message: "Failed to access media devices",
      originalError: error,
    });
  });
});

describe("getDisplayMediaStream", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should request display media", async () => {
    const mockStream = {} as MediaStream;
    const getDisplayMedia = vi.fn().mockResolvedValue(mockStream);
    global.navigator.mediaDevices = {
      getDisplayMedia,
    } as unknown as MediaDevices;

    const stream = await getDisplayMediaStream();
    expect(stream).toBe(mockStream);
    expect(getDisplayMedia).toHaveBeenCalledWith({
      video: true,
      audio: false,
    });
  });

  it("should throw WebRTC error on failure", async () => {
    const error = new Error("Screen sharing denied");
    const getDisplayMedia = vi.fn().mockRejectedValue(error);
    global.navigator.mediaDevices = {
      getDisplayMedia,
    } as unknown as MediaDevices;

    await expect(getDisplayMediaStream()).rejects.toMatchObject({
      type: "permission-denied",
      message: "Failed to access screen sharing",
      originalError: error,
    });
  });
});

describe("stopMediaStream", () => {
  it("should stop all tracks in a stream", () => {
    const track1 = { stop: vi.fn() };
    const track2 = { stop: vi.fn() };
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([track1, track2]),
    } as unknown as MediaStream;

    stopMediaStream(mockStream);

    expect(track1.stop).toHaveBeenCalled();
    expect(track2.stop).toHaveBeenCalled();
  });

  it("should handle null stream gracefully", () => {
    expect(() => stopMediaStream(null)).not.toThrow();
  });
});

describe("getStreamMetadata", () => {
  it("should extract metadata from stream with video track", () => {
    const mockSettings = {
      width: 1920,
      height: 1080,
      frameRate: 30,
    };
    const mockTrack = {
      getSettings: vi.fn().mockReturnValue(mockSettings),
    };
    const mockStream = {
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const metadata = getStreamMetadata(mockStream, "peer-123", "video");

    expect(metadata).toEqual({
      peerId: "peer-123",
      streamType: "video",
      isActive: true,
      videoSettings: {
        width: 1920,
        height: 1080,
        frameRate: 30,
      },
    });
  });

  it("should handle stream without video tracks", () => {
    const mockStream = {
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([]),
    } as unknown as MediaStream;

    const metadata = getStreamMetadata(mockStream, "peer-123", "audio");

    expect(metadata).toEqual({
      peerId: "peer-123",
      streamType: "audio",
      isActive: true,
      videoSettings: undefined,
    });
  });

  it("should use default streamType when not provided", () => {
    const mockStream = {
      active: false,
      getVideoTracks: vi.fn().mockReturnValue([]),
    } as unknown as MediaStream;

    const metadata = getStreamMetadata(mockStream, "peer-456");

    expect(metadata.streamType).toBe("video");
  });

  it("should handle settings with missing properties", () => {
    const mockSettings = {
      width: undefined,
      height: 720,
    };
    const mockTrack = {
      getSettings: vi.fn().mockReturnValue(mockSettings),
    };
    const mockStream = {
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const metadata = getStreamMetadata(mockStream, "peer-123", "screen");

    expect(metadata.videoSettings).toEqual({
      width: 0,
      height: 720,
      frameRate: 0,
    });
  });

  it("should handle settings with missing height property", () => {
    const mockSettings = {
      width: 1920,
      height: undefined,
      frameRate: 60,
    };
    const mockTrack = {
      getSettings: vi.fn().mockReturnValue(mockSettings),
    };
    const mockStream = {
      active: true,
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const metadata = getStreamMetadata(mockStream, "peer-123", "video");

    expect(metadata.videoSettings).toEqual({
      width: 1920,
      height: 0,
      frameRate: 60,
    });
  });
});

describe("isWebRTCSupported", () => {
  it("should return true when WebRTC is supported", () => {
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn(),
    } as unknown as MediaDevices;
    global.RTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;

    expect(isWebRTCSupported()).toBe(true);
  });

  it("should return false when mediaDevices is missing", () => {
    // @ts-expect-error - Testing missing mediaDevices
    delete global.navigator.mediaDevices;
    global.RTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;

    expect(isWebRTCSupported()).toBe(false);
  });

  it("should return false when getUserMedia is missing", () => {
    global.navigator.mediaDevices = {} as MediaDevices;
    global.RTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;

    expect(isWebRTCSupported()).toBe(false);
  });

  it("should return false when RTCPeerConnection is missing", () => {
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn(),
    } as unknown as MediaDevices;
    // @ts-expect-error - Testing missing RTCPeerConnection
    delete global.RTCPeerConnection;

    expect(isWebRTCSupported()).toBe(false);
  });
});

describe("createWebRTCError", () => {
  it("should create error without original error", () => {
    const error = createWebRTCError("network-error", "Connection failed");
    expect(error).toEqual({
      type: "network-error",
      message: "Connection failed",
      originalError: undefined,
    });
  });

  it("should create error with original error", () => {
    const originalError = new Error("Original error");
    const error = createWebRTCError("peer-unavailable", "Peer not found", originalError);
    expect(error).toEqual({
      type: "peer-unavailable",
      message: "Peer not found",
      originalError,
    });
  });
});

describe("generatePeerId", () => {
  it("should generate peer ID with default prefix", () => {
    const peerId = generatePeerId();
    expect(peerId).toMatch(/^peer-[a-z0-9]+$/);
  });

  it("should generate peer ID with custom prefix", () => {
    const peerId = generatePeerId("custom");
    expect(peerId).toMatch(/^custom-[a-z0-9]+$/);
  });

  it("should generate unique IDs", () => {
    const id1 = generatePeerId();
    const id2 = generatePeerId();
    expect(id1).not.toBe(id2);
  });
});

describe("isValidPeerId", () => {
  it("should return true for valid peer IDs", () => {
    expect(isValidPeerId("peer-123")).toBe(true);
    expect(isValidPeerId("host-abc")).toBe(true);
    expect(isValidPeerId("my_peer_id")).toBe(true);
    expect(isValidPeerId("PeerID123")).toBe(true);
    expect(isValidPeerId("a-b-c-1-2-3")).toBe(true);
  });

  it("should return false for invalid peer IDs", () => {
    expect(isValidPeerId("peer id")).toBe(false); // Contains space
    expect(isValidPeerId("peer@123")).toBe(false); // Contains @
    expect(isValidPeerId("peer.123")).toBe(false); // Contains .
    expect(isValidPeerId("")).toBe(false); // Empty string
  });

  it("should return false for null", () => {
    expect(isValidPeerId(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isValidPeerId(undefined)).toBe(false);
  });
});

describe("createConnectionUrl", () => {
  it("should create URL with baseUrl parameter", () => {
    const url = createConnectionUrl("peer-123", "https://example.com");
    expect(url).toBe("https://example.com/client?hostId=peer-123");
  });

  it("should create URL with window.location.origin in browser", () => {
    global.window = {
      location: {
        origin: "https://myapp.com",
      },
    } as unknown as Window & typeof globalThis;

    const url = createConnectionUrl("peer-456");
    expect(url).toBe("https://myapp.com/client?hostId=peer-456");
  });

  it("should handle empty baseUrl in SSR", () => {
    // @ts-expect-error - Testing SSR scenario
    delete global.window;

    const url = createConnectionUrl("peer-789", "");
    expect(url).toBe("/client?hostId=peer-789");
  });
});

describe("parseConnectionUrl", () => {
  it("should extract hostId from valid URL", () => {
    const hostId = parseConnectionUrl("https://example.com/client?hostId=peer-123");
    expect(hostId).toBe("peer-123");
  });

  it("should return null for URL without hostId", () => {
    const hostId = parseConnectionUrl("https://example.com/client");
    expect(hostId).toBeNull();
  });

  it("should return null for invalid URL", () => {
    const hostId = parseConnectionUrl("not-a-url");
    expect(hostId).toBeNull();
  });

  it("should handle URL with multiple query parameters", () => {
    const hostId = parseConnectionUrl("https://example.com/client?foo=bar&hostId=peer-456&baz=qux");
    expect(hostId).toBe("peer-456");
  });
});

describe("calculateVideoLayout", () => {
  it("should constrain by height when container is wider", () => {
    const layout = calculateVideoLayout(1920, 1080, 1280, 720);
    expect(layout.height).toBe(1080);
    expect(layout.width).toBe(1080 * (1280 / 720));
  });

  it("should constrain by width when container is taller", () => {
    const layout = calculateVideoLayout(1080, 1920, 1280, 720);
    expect(layout.width).toBe(1080);
    expect(layout.height).toBe(1080 / (1280 / 720));
  });

  it("should handle square containers", () => {
    const layout = calculateVideoLayout(1000, 1000, 1920, 1080);
    expect(layout.width).toBe(1000);
    expect(layout.height).toBeCloseTo(1000 / (1920 / 1080), 5);
  });

  it("should handle square videos", () => {
    const layout = calculateVideoLayout(1920, 1080, 1000, 1000);
    expect(layout.height).toBe(1080);
    expect(layout.width).toBeCloseTo(1080, 5);
  });
});

describe("monitorStreamHealth", () => {
  it("should call onInactive when track ends", () => {
    const track = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockStream = {
      active: false,
      getTracks: vi.fn().mockReturnValue([track]),
    } as unknown as MediaStream;
    const onInactive = vi.fn();

    monitorStreamHealth(mockStream, onInactive);

    // Get the event handler that was registered
    const addEventListenerCall = track.addEventListener.mock.calls[0];
    expect(addEventListenerCall[0]).toBe("ended");
    const handler = addEventListenerCall[1];

    // Trigger the handler
    handler();

    expect(onInactive).toHaveBeenCalled();
  });

  it("should not call onInactive when stream is still active", () => {
    const track = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockStream = {
      active: true,
      getTracks: vi.fn().mockReturnValue([track]),
    } as unknown as MediaStream;
    const onInactive = vi.fn();

    monitorStreamHealth(mockStream, onInactive);

    // Get the event handler
    const handler = track.addEventListener.mock.calls[0][1];

    // Trigger the handler
    handler();

    expect(onInactive).not.toHaveBeenCalled();
  });

  it("should return cleanup function that removes event listeners", () => {
    const track = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockStream = {
      active: true,
      getTracks: vi.fn().mockReturnValue([track]),
    } as unknown as MediaStream;
    const onInactive = vi.fn();

    const cleanup = monitorStreamHealth(mockStream, onInactive);
    cleanup();

    expect(track.removeEventListener).toHaveBeenCalledWith("ended", expect.any(Function));
  });

  it("should handle multiple tracks", () => {
    const track1 = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const track2 = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockStream = {
      active: false,
      getTracks: vi.fn().mockReturnValue([track1, track2]),
    } as unknown as MediaStream;
    const onInactive = vi.fn();

    const cleanup = monitorStreamHealth(mockStream, onInactive);

    expect(track1.addEventListener).toHaveBeenCalled();
    expect(track2.addEventListener).toHaveBeenCalled();

    cleanup();

    expect(track1.removeEventListener).toHaveBeenCalled();
    expect(track2.removeEventListener).toHaveBeenCalled();
  });
});
