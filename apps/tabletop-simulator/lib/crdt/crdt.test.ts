import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import type { Card } from "../../types/card";
import type { DiceState } from "../../types/dice";
import type { Player } from "../../types/game";
import {
  addDice,
  addPlayer,
  clearDice,
  createGameDocument,
  drawCard,
  flipCard,
  getDeckArray,
  getDiceArray,
  getPlayersMap,
  initializeDeck,
  moveCard,
  playCard,
  rollDice,
  settleDice,
  updateDeck,
  updatePlayer,
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

  it("updates a player", () => {
    const doc = createGameDocument();
    addPlayer(doc, mockPlayer);

    updatePlayer(doc, "p1", { name: "New Name", audioEnabled: false });

    const players = getPlayersMap(doc);
    const updated = players.get("p1");
    expect(updated?.name).toBe("New Name");
    expect(updated?.audioEnabled).toBe(false);
  });

  it("handles updating non-existent player gracefully", () => {
    const doc = createGameDocument();
    // Should not throw
    updatePlayer(doc, "non-existent", { name: "New Name" });
    const players = getPlayersMap(doc);
    expect(players.get("non-existent")).toBeUndefined();
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

  it("moves a card with rotation", () => {
    const doc = createGameDocument();
    const deck = getDeckArray(doc);

    doc.transact(() => {
      deck.push([mockCard]);
    });

    const newPos = { x: 10, y: 0, z: 5 };
    const newRot = { x: 0, y: Math.PI, z: 0 };
    moveCard(doc, "c1", newPos, newRot);

    const updated = deck.get(0);
    expect(updated.position).toEqual(newPos);
    expect(updated.rotation).toEqual(newRot);
  });

  it("handles moving non-existent card", () => {
    const doc = createGameDocument();
    // Should not throw
    moveCard(doc, "non-existent", { x: 0, y: 0, z: 0 });
  });

  it("flips a card", () => {
    const doc = createGameDocument();
    const deck = getDeckArray(doc);

    doc.transact(() => {
      deck.push([mockCard]);
    });

    expect(deck.get(0).faceUp).toBe(false);
    flipCard(doc, "c1");
    expect(deck.get(0).faceUp).toBe(true);
    flipCard(doc, "c1");
    expect(deck.get(0).faceUp).toBe(false);
  });

  it("handles flipping non-existent card", () => {
    const doc = createGameDocument();
    // Should not throw
    flipCard(doc, "non-existent");
  });

  it("adds dice", () => {
    const doc = createGameDocument();
    addDice(doc, mockDice);

    const diceArray = getDiceArray(doc);
    expect(diceArray.length).toBe(1);
    expect(diceArray.get(0)).toEqual(mockDice);
  });

  it("rolls dice (updates isRolling and seed)", () => {
    const doc = createGameDocument();
    addDice(doc, mockDice);

    const newSeed = 99999;
    rollDice(doc, "d1", newSeed);

    const diceArray = getDiceArray(doc);
    const updated = diceArray.get(0);
    expect(updated.isRolling).toBe(true);
    expect(updated.seed).toBe(newSeed);
  });

  it("handles rolling non-existent dice", () => {
    const doc = createGameDocument();
    // Should not throw
    rollDice(doc, "non-existent", 12345);
  });

  it("settles dice", () => {
    const doc = createGameDocument();
    addDice(doc, mockDice);

    settleDice(doc, "d1", 6);

    const diceArray = getDiceArray(doc);
    const updated = diceArray.get(0);
    expect(updated.isRolling).toBe(false);
    expect(updated.value).toBe(6);
  });

  it("handles settling non-existent dice", () => {
    const doc = createGameDocument();
    // Should not throw
    settleDice(doc, "non-existent", 3);
  });

  it("clears dice", () => {
    const doc = createGameDocument();
    addDice(doc, mockDice);
    expect(getDiceArray(doc).length).toBe(1);

    clearDice(doc, "d1");
    expect(getDiceArray(doc).length).toBe(0);
  });

  it("handles clearing non-existent dice", () => {
    const doc = createGameDocument();
    // Should not throw
    clearDice(doc, "non-existent");
  });

  it("initializes deck", () => {
    const doc = createGameDocument();
    const cards = [mockCard, { ...mockCard, id: "c2" }];

    initializeDeck(doc, cards);

    const deck = getDeckArray(doc);
    expect(deck.length).toBe(2);
  });

  it("clears existing deck when initializing", () => {
    const doc = createGameDocument();
    const deck = getDeckArray(doc);
    deck.push([mockCard]);

    initializeDeck(doc, [{ ...mockCard, id: "c2" }]);

    expect(getDeckArray(doc).length).toBe(1);
    expect(getDeckArray(doc).get(0).id).toBe("c2");
  });

  it("updates deck", () => {
    const doc = createGameDocument();
    initializeDeck(doc, [mockCard]);

    const newCards = [{ ...mockCard, id: "c2" }, { ...mockCard, id: "c3" }];
    updateDeck(doc, newCards);

    const deck = getDeckArray(doc);
    expect(deck.length).toBe(2);
    expect(deck.get(0).id).toBe("c2");
  });

  it("draws a card", () => {
    const doc = createGameDocument();
    initializeDeck(doc, [mockCard, { ...mockCard, id: "c2" }]);

    const drawnCard = drawCard(doc, "player1");

    expect(drawnCard).not.toBeNull();
    expect(drawnCard?.ownerId).toBe("player1");

    // Card should still be in deck but owned by player
    const deck = getDeckArray(doc);
    const playerCards = deck.toArray().filter((c) => c.ownerId === "player1");
    expect(playerCards.length).toBe(1);
  });

  it("returns null when drawing from empty deck", () => {
    const doc = createGameDocument();
    // Deck is empty

    const drawnCard = drawCard(doc, "player1");
    expect(drawnCard).toBeNull();
  });

  it("plays a card to table", () => {
    const doc = createGameDocument();
    const cardInHand = { ...mockCard, ownerId: "player1" };
    initializeDeck(doc, [cardInHand]);

    const position = { x: 2, y: 0.1, z: 3 };
    playCard(doc, "c1", position);

    const deck = getDeckArray(doc);
    const playedCard = deck.get(0);
    expect(playedCard.ownerId).toBeNull();
    expect(playedCard.position).toEqual(position);
    expect(playedCard.faceUp).toBe(true);
  });

  it("handles playing non-existent card", () => {
    const doc = createGameDocument();
    // Should not throw
    playCard(doc, "non-existent", { x: 0, y: 0, z: 0 });
  });
});
