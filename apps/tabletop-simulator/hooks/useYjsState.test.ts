import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { Card } from "../types/card";
import { DiceState } from "../types/dice";
import { Player } from "../types/game";
import { useYjsState } from "./useYjsState";

describe("useYjsState", () => {
  it("returns empty state when doc is null", () => {
    const { result } = renderHook(() => useYjsState(null));

    expect(result.current.cards).toEqual([]);
    expect(result.current.dice).toEqual([]);
    expect(result.current.players).toEqual([]);
  });

  it("returns initial state from doc", () => {
    const doc = new Y.Doc();
    const deck = doc.getArray<Card>("deck");
    const mockCard: Card = {
      id: "c1",
      suit: "hearts",
      rank: "A",
      faceUp: false,
      ownerId: null,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      zIndex: 0,
    };
    deck.push([mockCard]);

    const { result } = renderHook(() => useYjsState(doc));

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0]!.id).toBe("c1");
  });

  it("updates when deck changes", () => {
    const doc = new Y.Doc();
    const deck = doc.getArray<Card>("deck");

    const { result } = renderHook(() => useYjsState(doc));

    expect(result.current.cards).toHaveLength(0);

    act(() => {
      const mockCard: Card = {
        id: "c1",
        suit: "hearts",
        rank: "A",
        faceUp: false,
        ownerId: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        zIndex: 0,
      };
      deck.push([mockCard]);
    });

    expect(result.current.cards).toHaveLength(1);
  });

  it("updates when dice changes", () => {
    const doc = new Y.Doc();
    const diceArray = doc.getArray<DiceState>("dice");

    const { result } = renderHook(() => useYjsState(doc));

    expect(result.current.dice).toHaveLength(0);

    act(() => {
      const mockDice: DiceState = {
        id: "d1",
        type: "d6",
        value: 0,
        position: { x: 0, y: 2, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        isRolling: true,
        seed: 12345,
        ownerId: null,
      };
      diceArray.push([mockDice]);
    });

    expect(result.current.dice).toHaveLength(1);
  });

  it("updates when players change", () => {
    const doc = new Y.Doc();
    const playersMap = doc.getMap<Player>("players");

    const { result } = renderHook(() => useYjsState(doc));

    expect(result.current.players).toHaveLength(0);

    act(() => {
      const mockPlayer: Player = {
        id: "p1",
        peerId: "peer1",
        name: "Player 1",
        hand: [],
        position: "south",
        isHost: true,
        audioEnabled: true,
        videoEnabled: true,
      };
      playersMap.set("p1", mockPlayer);
    });

    expect(result.current.players).toHaveLength(1);
  });

  it("cleans up observers on unmount", () => {
    const doc = new Y.Doc();

    const { unmount } = renderHook(() => useYjsState(doc));

    // This should not throw
    unmount();

    // Adding data after unmount should not cause issues
    const deck = doc.getArray<Card>("deck");
    deck.push([
      {
        id: "c1",
        suit: "hearts",
        rank: "A",
        faceUp: false,
        ownerId: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        zIndex: 0,
      },
    ]);
  });
});
