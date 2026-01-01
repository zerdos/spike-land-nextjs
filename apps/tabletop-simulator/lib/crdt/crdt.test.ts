import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { Card } from "../../types/card";
import { Player } from "../../types/game";
import {
  addPlayer,
  createGameDocument,
  getDeckArray,
  getPlayersMap,
  moveCard,
} from "./game-document";

// Mock simple player
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

const mockCard: Card = {
  id: "c1",
  suit: "spades",
  rank: "A",
  faceUp: false,
  ownerId: null,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  zIndex: 0,
};

describe("Game Document CRDT", () => {
  it("creates a new document", () => {
    const doc = createGameDocument();
    expect(doc).toBeInstanceOf(Y.Doc);
  });

  it("adds a player", () => {
    const doc = createGameDocument();
    addPlayer(doc, mockPlayer);

    const players = getPlayersMap(doc);
    expect(players.get("p1")).toEqual(mockPlayer);
  });

  it("moves a card", () => {
    const doc = createGameDocument();
    const deck = getDeckArray(doc);

    doc.transact(() => {
      deck.push([mockCard]);
    });

    const newPos = { x: 10, y: 0, z: 5 };
    moveCard(doc, "c1", newPos);

    const updated = deck.get(0);
    expect(updated.position).toEqual(newPos);
  });
});
