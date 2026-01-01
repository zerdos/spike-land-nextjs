import { beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  addDice,
  addMessage,
  clearMessages,
  drawCard,
  flipCard,
  getDeckArray,
  getDiceArray,
  getMessagesArray,
  grabCard,
  initializeDeck,
  moveCard,
  playCard,
  releaseCard,
  settleDice,
  updateDeck,
} from "../../../lib/crdt/game-document";
import type { Card } from "../../../types/card";
import type { DiceState } from "../../../types/dice";
import type { GameMessage } from "../../../types/message";

describe("game-document CRDT operations", () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
  });

  describe("deck operations", () => {
    const createTestCards = (): Card[] => [
      {
        id: "card-1",
        suit: "hearts",
        rank: "A",
        faceUp: false,
        ownerId: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        zIndex: 0,
      },
      {
        id: "card-2",
        suit: "spades",
        rank: "K",
        faceUp: false,
        ownerId: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        zIndex: 1,
      },
    ];

    it("should initialize deck with cards", () => {
      const cards = createTestCards();
      initializeDeck(doc, cards);

      const deck = getDeckArray(doc);
      expect(deck.length).toBe(2);
      expect(deck.get(0).id).toBe("card-1");
      expect(deck.get(1).id).toBe("card-2");
    });

    it("should move a card to new position", () => {
      const cards = createTestCards();
      initializeDeck(doc, cards);

      const newPosition = { x: 5, y: 0.1, z: 3 };
      moveCard(doc, "card-1", newPosition);

      const deck = getDeckArray(doc);
      const movedCard = deck.toArray().find(c => c.id === "card-1");
      expect(movedCard?.position).toEqual(newPosition);
    });

    it("should flip a card", () => {
      const cards = createTestCards();
      initializeDeck(doc, cards);

      flipCard(doc, "card-1");

      const deck = getDeckArray(doc);
      const flippedCard = deck.toArray().find(c => c.id === "card-1");
      expect(flippedCard?.faceUp).toBe(true);

      // Flip again
      flipCard(doc, "card-1");
      const reflippedCard = getDeckArray(doc).toArray().find(c => c.id === "card-1");
      expect(reflippedCard?.faceUp).toBe(false);
    });

    it("should draw a card to player hand", () => {
      const cards = createTestCards();
      initializeDeck(doc, cards);

      const playerId = "player-123";
      drawCard(doc, playerId);

      const deck = getDeckArray(doc);
      const drawnCards = deck.toArray().filter(c => c.ownerId === playerId);
      expect(drawnCards.length).toBe(1);
      expect(drawnCards[0]?.ownerId).toBe(playerId);
      // faceUp remains false - visibility is handled by client based on ownerId
    });

    it("should play a card from hand to table", () => {
      const cards = createTestCards();
      initializeDeck(doc, cards);

      // First draw a card
      drawCard(doc, "player-123");

      // Play it to table
      const tablePosition = { x: 2, y: 0.1, z: 1 };
      playCard(doc, "card-1", tablePosition);

      const deck = getDeckArray(doc);
      const playedCard = deck.toArray().find(c => c.id === "card-1");
      expect(playedCard?.ownerId).toBeNull();
      expect(playedCard?.position).toEqual(tablePosition);
    });

    it("should update entire deck", () => {
      const cards = createTestCards();
      initializeDeck(doc, cards);

      const newCards: Card[] = [
        {
          id: "card-new",
          suit: "diamonds",
          rank: "Q",
          faceUp: true,
          ownerId: null,
          position: { x: 1, y: 0, z: 1 },
          rotation: { x: 0, y: 0, z: 0 },
          zIndex: 0,
        },
      ];

      updateDeck(doc, newCards);

      const deck = getDeckArray(doc);
      expect(deck.length).toBe(1);
      expect(deck.get(0).id).toBe("card-new");
    });
  });

  describe("grab/release operations", () => {
    const createTestCard = (): Card => ({
      id: "card-1",
      suit: "hearts",
      rank: "A",
      faceUp: false,
      ownerId: null,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      zIndex: 0,
    });

    it("should grab a card", () => {
      initializeDeck(doc, [createTestCard()]);

      const player = {
        playerId: "player-123",
        playerName: "Test Player",
        playerColor: "#3B82F6",
      };

      grabCard(doc, "card-1", player);

      const deck = getDeckArray(doc);
      const grabbedCard = deck.get(0);
      expect(grabbedCard.grabbedBy).toEqual(player);
    });

    it("should release a card", () => {
      initializeDeck(doc, [createTestCard()]);

      grabCard(doc, "card-1", {
        playerId: "player-123",
        playerName: "Test Player",
        playerColor: "#3B82F6",
      });

      releaseCard(doc, "card-1");

      const deck = getDeckArray(doc);
      const releasedCard = deck.get(0);
      expect(releasedCard.grabbedBy).toBeNull();
    });
  });

  describe("dice operations", () => {
    const createTestDice = (): DiceState => ({
      id: "dice-1",
      type: "d6",
      value: 0,
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      isRolling: true,
      seed: 12345,
      ownerId: null,
    });

    it("should add dice to the game", () => {
      addDice(doc, createTestDice());

      const diceArray = getDiceArray(doc);
      expect(diceArray.length).toBe(1);
      expect(diceArray.get(0).id).toBe("dice-1");
      expect(diceArray.get(0).type).toBe("d6");
    });

    it("should settle dice with final value", () => {
      addDice(doc, createTestDice());

      settleDice(doc, "dice-1", 6);

      const diceArray = getDiceArray(doc);
      const settledDice = diceArray.get(0);
      expect(settledDice.value).toBe(6);
      expect(settledDice.isRolling).toBe(false);
    });
  });

  describe("message operations", () => {
    const createTestMessage = (): GameMessage => ({
      id: "msg-1",
      type: "chat",
      playerId: "player-123",
      playerName: "Test Player",
      playerColor: "#3B82F6",
      content: "Hello, world!",
      timestamp: Date.now(),
    });

    it("should add a message", () => {
      addMessage(doc, createTestMessage());

      const messages = getMessagesArray(doc);
      expect(messages.length).toBe(1);
      expect(messages.get(0).content).toBe("Hello, world!");
    });

    it("should add multiple messages in order", () => {
      addMessage(doc, createTestMessage());
      addMessage(doc, {
        ...createTestMessage(),
        id: "msg-2",
        content: "Second message",
      });

      const messages = getMessagesArray(doc);
      expect(messages.length).toBe(2);
      expect(messages.get(0).content).toBe("Hello, world!");
      expect(messages.get(1).content).toBe("Second message");
    });

    it("should clear all messages", () => {
      addMessage(doc, createTestMessage());
      addMessage(doc, { ...createTestMessage(), id: "msg-2" });

      clearMessages(doc);

      const messages = getMessagesArray(doc);
      expect(messages.length).toBe(0);
    });
  });

  describe("CRDT conflict resolution", () => {
    it("should merge concurrent card moves from two clients", () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      // Initialize both docs with same card
      const card: Card = {
        id: "card-1",
        suit: "hearts",
        rank: "A",
        faceUp: false,
        ownerId: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        zIndex: 0,
      };

      initializeDeck(doc1, [card]);

      // Sync doc1 to doc2
      const update1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update1);

      // Both clients move the card concurrently
      moveCard(doc1, "card-1", { x: 5, y: 0, z: 0 });
      moveCard(doc2, "card-1", { x: 0, y: 0, z: 5 });

      // Sync updates
      const update2 = Y.encodeStateAsUpdate(doc1);
      const update3 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc2, update2);
      Y.applyUpdate(doc1, update3);

      // Both docs should converge to the same state
      const deck1 = getDeckArray(doc1).toArray();
      const deck2 = getDeckArray(doc2).toArray();

      expect(deck1.length).toBeGreaterThan(0);
      expect(deck2.length).toBeGreaterThan(0);
      expect(deck1[0]?.position).toEqual(deck2[0]?.position);
    });

    it("should handle concurrent message additions", () => {
      const doc1 = new Y.Doc();
      const doc2 = new Y.Doc();

      // Sync initial state
      const update1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update1);

      // Both clients add messages concurrently
      addMessage(doc1, {
        id: "msg-1",
        type: "chat",
        playerId: "player-1",
        playerName: "Player 1",
        playerColor: "#FF0000",
        content: "Hello from player 1",
        timestamp: 1000,
      });

      addMessage(doc2, {
        id: "msg-2",
        type: "chat",
        playerId: "player-2",
        playerName: "Player 2",
        playerColor: "#00FF00",
        content: "Hello from player 2",
        timestamp: 1001,
      });

      // Sync updates
      const update2 = Y.encodeStateAsUpdate(doc1);
      const update3 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc2, update2);
      Y.applyUpdate(doc1, update3);

      // Both docs should have both messages
      const messages1 = getMessagesArray(doc1).toArray();
      const messages2 = getMessagesArray(doc2).toArray();

      expect(messages1.length).toBe(2);
      expect(messages2.length).toBe(2);
      expect(messages1).toEqual(messages2);
    });
  });
});
