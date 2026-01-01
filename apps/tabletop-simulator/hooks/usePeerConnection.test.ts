"use client";
import { act, renderHook, waitFor } from "@testing-library/react";
import type Peer from "peerjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePeerConnection } from "./usePeerConnection";

describe("usePeerConnection", () => {
  let mockPeer: Partial<Peer>;
  let connectionHandlers: Map<string, (...args: unknown[]) => void>;
  let mockDataConnection: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    peer: string;
    send: ReturnType<typeof vi.fn>;
    open: boolean;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connectionHandlers = new Map();

    mockDataConnection = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        connectionHandlers.set(event, handler);
      }),
      off: vi.fn(),
      peer: "remote-peer-id",
      send: vi.fn(),
      open: true,
    };

    const peer = {
      on: vi.fn(),
      off: vi.fn(),
      connect: vi.fn().mockReturnValue(mockDataConnection),
    };
    // Mock on() to store handlers and return the peer for chaining
    peer.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === "connection") {
        connectionHandlers.set("peer-connection", handler);
      }
      return peer;
    });
    mockPeer = peer;
  });

  it("returns empty connections initially", () => {
    const { result } = renderHook(() => usePeerConnection(null));

    expect(result.current.connections.size).toBe(0);
  });

  it("provides connectData function", () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    expect(typeof result.current.connectData).toBe("function");
  });

  it("initiates connection when connectData is called", () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.connectData("remote-peer-id");
    });

    expect(mockPeer.connect).toHaveBeenCalledWith("remote-peer-id", { reliable: true });
  });

  it("adds connection to map when connection opens", async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.connectData("remote-peer-id");
    });

    // Simulate connection open
    act(() => {
      const openHandler = connectionHandlers.get("open");
      openHandler?.();
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
      expect(result.current.connections.has("remote-peer-id")).toBe(true);
    });
  });

  it("calls onData handler when data is received", async () => {
    const onData = vi.fn();
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer, onData));

    act(() => {
      result.current.connectData("remote-peer-id");
    });

    // Simulate connection open
    act(() => {
      const openHandler = connectionHandlers.get("open");
      openHandler?.();
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
    });

    // Simulate data received
    act(() => {
      const dataHandler = connectionHandlers.get("data");
      dataHandler?.(new Uint8Array([1, 2, 3]));
    });

    expect(onData).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), "remote-peer-id");
  });

  it("removes connection from map when connection closes", async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.connectData("remote-peer-id");
    });

    // Simulate connection open
    act(() => {
      const openHandler = connectionHandlers.get("open");
      openHandler?.();
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
    });

    // Simulate connection close
    act(() => {
      const closeHandler = connectionHandlers.get("close");
      closeHandler?.();
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(0);
    });
  });

  it("handles incoming connections", async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    // Trigger incoming connection handler
    act(() => {
      const peerConnectionHandler = connectionHandlers.get("peer-connection");
      peerConnectionHandler?.(mockDataConnection);
    });

    // Simulate connection open
    act(() => {
      const openHandler = connectionHandlers.get("open");
      openHandler?.();
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
    });
  });

  it("does not connect when peer is null", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => usePeerConnection(null));

    act(() => {
      result.current.connectData("remote-peer-id");
    });

    expect(consoleWarn).toHaveBeenCalledWith("[P2P] Cannot connect - peer not initialized");
    consoleWarn.mockRestore();
  });
});
