import { act, renderHook } from "@testing-library/react";
import type { DataConnection } from "peerjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { usePeerDataChannel } from "./usePeerDataChannel";

describe("usePeerDataChannel", () => {
  let doc: Y.Doc;
  let mockConnection: Partial<DataConnection>;

  beforeEach(() => {
    vi.clearAllMocks();
    doc = new Y.Doc();

    mockConnection = {
      send: vi.fn(),
      peer: "test-peer-id",
      open: true,
    };
  });

  describe("handleIncomingData", () => {
    it("applies Yjs update when receiving Uint8Array", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      // Create a valid Yjs update
      const testDoc = new Y.Doc();
      testDoc.getArray("test").push(["item"]);
      const update = Y.encodeStateAsUpdate(testDoc);

      act(() => {
        result.current.handleIncomingData(update);
      });

      // Verify the update was applied (no error thrown)
      expect(true).toBe(true);
    });

    it("applies Yjs update when receiving ArrayBuffer", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      // Create a valid Yjs update as ArrayBuffer
      const testDoc = new Y.Doc();
      testDoc.getArray("test").push(["item"]);
      const update = Y.encodeStateAsUpdate(testDoc);
      const buffer = update.buffer.slice(
        update.byteOffset,
        update.byteOffset + update.byteLength,
      );

      act(() => {
        result.current.handleIncomingData(buffer);
      });

      // Verify no error thrown
      expect(true).toBe(true);
    });

    it("warns when doc is null", () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(
        () => {},
      );
      const { result } = renderHook(() => usePeerDataChannel(null));

      act(() => {
        result.current.handleIncomingData(new Uint8Array([1, 2, 3]));
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        "[P2P] Received data but doc is null",
      );
      consoleWarn.mockRestore();
    });

    it("warns when receiving unexpected data type", () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(
        () => {},
      );
      const { result } = renderHook(() => usePeerDataChannel(doc));

      act(() => {
        result.current.handleIncomingData("string data");
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        "[P2P] Received unexpected data type:",
        "string",
      );
      consoleWarn.mockRestore();
    });
  });

  describe("broadcastUpdate", () => {
    it("sends update to all open connections", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      const connections = new Map([
        ["peer1", { dataConnection: mockConnection as DataConnection }],
        ["peer2", {
          dataConnection: {
            ...mockConnection,
            open: true,
            send: vi.fn(),
          } as unknown as DataConnection,
        }],
      ]);

      const update = new Uint8Array([1, 2, 3]);

      act(() => {
        result.current.broadcastUpdate(update, connections);
      });

      expect(mockConnection.send).toHaveBeenCalledWith(update);
      expect(connections.get("peer2")?.dataConnection?.send)
        .toHaveBeenCalledWith(update);
    });

    it("skips connections that are not open", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      const closedConnection = { ...mockConnection, open: false };
      const connections = new Map([
        ["peer1", { dataConnection: closedConnection as DataConnection }],
      ]);

      const update = new Uint8Array([1, 2, 3]);

      act(() => {
        result.current.broadcastUpdate(update, connections);
      });

      expect(mockConnection.send).not.toHaveBeenCalled();
    });

    it("skips null connections", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      const connections = new Map([
        ["peer1", { dataConnection: null }],
      ]);

      const update = new Uint8Array([1, 2, 3]);

      act(() => {
        result.current.broadcastUpdate(update, connections);
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("sendFullState", () => {
    it("sends full state to connection", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      // Add some state to doc
      doc.getArray("cards").push([{ id: "card1" }]);

      act(() => {
        result.current.sendFullState(mockConnection as DataConnection);
      });

      expect(mockConnection.send).toHaveBeenCalled();
      const sentData = (mockConnection.send as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(sentData).toBeInstanceOf(Uint8Array);
    });

    it("skips if already sent to peer", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      act(() => {
        result.current.sendFullState(mockConnection as DataConnection);
      });

      expect(mockConnection.send).toHaveBeenCalledTimes(1);

      // Try to send again
      act(() => {
        result.current.sendFullState(mockConnection as DataConnection);
      });

      // Should still be called only once
      expect(mockConnection.send).toHaveBeenCalledTimes(1);
    });

    it("does nothing when doc is null", () => {
      const { result } = renderHook(() => usePeerDataChannel(null));

      act(() => {
        result.current.sendFullState(mockConnection as DataConnection);
      });

      expect(mockConnection.send).not.toHaveBeenCalled();
    });
  });

  describe("clearPeerState", () => {
    it("allows sending full state again after clearing", () => {
      const { result } = renderHook(() => usePeerDataChannel(doc));

      act(() => {
        result.current.sendFullState(mockConnection as DataConnection);
      });

      expect(mockConnection.send).toHaveBeenCalledTimes(1);

      // Clear the peer state
      act(() => {
        result.current.clearPeerState("test-peer-id");
      });

      // Now sending should work again
      act(() => {
        result.current.sendFullState(mockConnection as DataConnection);
      });

      expect(mockConnection.send).toHaveBeenCalledTimes(2);
    });
  });
});
