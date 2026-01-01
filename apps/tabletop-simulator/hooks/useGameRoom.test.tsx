import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { useGameRoom } from "./useGameRoom";

// Mocks
vi.mock("./useYjsSync", () => ({
  useYjsSync: () => ({ doc: new Y.Doc(), isSynced: true }),
}));
vi.mock("./usePeer", () => ({
  usePeer: () => ({ peer: {}, peerId: "me", status: "connected" }),
}));
vi.mock("./usePeerConnection", () => ({
  usePeerConnection: () => ({ connections: new Map(), connectData: vi.fn() }),
}));
vi.mock("./usePeerDataChannel", () => ({
  usePeerDataChannel: () => ({ handleIncomingData: vi.fn() }),
}));
vi.mock("../lib/crdt/game-document", () => ({
  addPlayer: vi.fn(),
}));

describe("useGameRoom", () => {
  it("initializes correctly", () => {
    const { result } = renderHook(() => useGameRoom("room1"));

    expect(result.current.doc).toBeDefined();
    expect(result.current.peerId).toBe("me");
    expect(result.current.isSynced).toBe(true);
  });
});
