import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePeerDiscovery } from "./usePeerDiscovery";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("usePeerDiscovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should not register if peerId is null", async () => {
    const onPeerDiscovered = vi.fn();

    renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: null,
        connectedPeers: new Set(),
        onPeerDiscovered,
      })
    );

    // Advance timers a small amount - no interval should be set
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(onPeerDiscovered).not.toHaveBeenCalled();
  });

  it("should not register if not enabled", async () => {
    const onPeerDiscovered = vi.fn();

    renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered,
        enabled: false,
      })
    );

    // Advance timers a small amount - no interval should be set
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(onPeerDiscovered).not.toHaveBeenCalled();
  });

  it("should register with server and discover peers", async () => {
    const onPeerDiscovered = vi.fn();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ peers: ["peer-2", "peer-3"], roomId: "test-room" }),
    });

    const { unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered,
        enabled: true,
      })
    );

    // Wait for initial registration (immediate effect)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tabletop/rooms/test-room/peers",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: "peer-1" }),
      }),
    );

    expect(onPeerDiscovered).toHaveBeenCalledTimes(2);
    expect(onPeerDiscovered).toHaveBeenCalledWith("peer-2");
    expect(onPeerDiscovered).toHaveBeenCalledWith("peer-3");

    // Clean up to prevent interval from continuing
    unmount();
  });

  it("should not call onPeerDiscovered for own peer ID", async () => {
    const onPeerDiscovered = vi.fn();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ peers: ["peer-1", "peer-2"], roomId: "test-room" }),
    });

    const { unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered,
        enabled: true,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onPeerDiscovered).toHaveBeenCalledTimes(1);
    expect(onPeerDiscovered).toHaveBeenCalledWith("peer-2");

    unmount();
  });

  it("should not call onPeerDiscovered for already connected peers", async () => {
    const onPeerDiscovered = vi.fn();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ peers: ["peer-2", "peer-3"], roomId: "test-room" }),
    });

    const { unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(["peer-2"]),
        onPeerDiscovered,
        enabled: true,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onPeerDiscovered).toHaveBeenCalledTimes(1);
    expect(onPeerDiscovered).toHaveBeenCalledWith("peer-3");

    unmount();
  });

  it("should set up heartbeat interval", async () => {
    const onPeerDiscovered = vi.fn();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ peers: [], roomId: "test-room" }),
    });

    const { unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered,
        enabled: true,
      })
    );

    // Initial call
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Wait for heartbeat (10 seconds)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("should unregister on unmount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ peers: [], roomId: "test-room" }),
    });

    const { unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered: vi.fn(),
        enabled: true,
      })
    );

    // Initial registration
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Reset mock to track unregister call
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({ ok: true });

    // Unmount triggers cleanup synchronously
    unmount();

    // Check that DELETE was called
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tabletop/rooms/test-room/peers?peerId=peer-1",
      { method: "DELETE" },
    );
  });

  it("should handle API errors gracefully", async () => {
    const onPeerDiscovered = vi.fn();
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered,
        enabled: true,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(consoleSpy).toHaveBeenCalledWith("[Discovery] Failed to register with server");
    expect(onPeerDiscovered).not.toHaveBeenCalled();

    unmount();
  });

  it("should not retry failed peers within cooldown period", async () => {
    const onPeerDiscovered = vi.fn();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ peers: ["peer-2"], roomId: "test-room" }),
    });

    const { result, unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered,
        enabled: true,
      })
    );

    // Initial registration
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onPeerDiscovered).toHaveBeenCalledTimes(1);

    // Mark peer as failed
    act(() => {
      result.current.markPeerFailed("peer-2");
    });

    // Wait for heartbeat (10 seconds) - should not retry failed peer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    // Should not call onPeerDiscovered again for failed peer
    expect(onPeerDiscovered).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("should retry failed peers after cooldown period", async () => {
    const onPeerDiscovered = vi.fn();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ peers: ["peer-2"], roomId: "test-room" }),
    });

    const { result, unmount } = renderHook(() =>
      usePeerDiscovery({
        roomId: "test-room",
        peerId: "peer-1",
        connectedPeers: new Set(),
        onPeerDiscovered,
        enabled: true,
      })
    );

    // Initial registration
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onPeerDiscovered).toHaveBeenCalledTimes(1);

    // Mark peer as failed
    act(() => {
      result.current.markPeerFailed("peer-2");
    });

    // Wait for cooldown period (60 seconds) + next heartbeat (70 seconds total)
    // This will trigger 7 heartbeats (at 10s, 20s, 30s, 40s, 50s, 60s, 70s)
    // But only the one after 60s cooldown should discover peer-2 again
    await act(async () => {
      await vi.advanceTimersByTimeAsync(70000);
    });

    // Should retry after cooldown
    expect(onPeerDiscovered).toHaveBeenCalledTimes(2);

    unmount();
  });
});
