"use client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock functions need to be defined BEFORE vi.mock
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockDestroy = vi.fn();
const mockConnect = vi.fn();
const mockCall = vi.fn();

// Mock PeerJS with factory function
vi.mock("peerjs", () => {
  return {
    default: class MockPeer {
      on = mockOn;
      off = mockOff;
      destroy = mockDestroy;
      connect = mockConnect;
      call = mockCall;
    },
  };
});

// Import after mock
import { usePeer } from "./usePeer";

describe("usePeer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockImplementation((event: string, callback: (id: string) => void) => {
      if (event === "open") {
        // Simulate peer opening
        setTimeout(() => callback("test-peer-id"), 0);
      }
    });
  });

  it("initializes peer and returns null initially", () => {
    // Prevent the timeout from firing during this test
    mockOn.mockImplementation(() => {});

    const { result } = renderHook(() => usePeer());

    expect(result.current.peer).toBeNull();
    expect(result.current.peerId).toBeNull();
  });

  it("sets peer and peerId after open event", async () => {
    const { result } = renderHook(() => usePeer());

    await waitFor(() => {
      expect(result.current.peer).not.toBeNull();
      expect(result.current.peerId).toBe("test-peer-id");
    });
  });

  it("destroys peer on unmount", async () => {
    const { unmount } = renderHook(() => usePeer());

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith("open", expect.any(Function));
    });

    act(() => {
      unmount();
    });

    expect(mockDestroy).toHaveBeenCalled();
  });
});
