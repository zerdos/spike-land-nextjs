import { describe, expect, it } from "vitest";
import { createStandardDeck, shuffleDeck } from "../../../lib/game-logic/deck";
import type { Card } from "../../../types/card";

describe("deck game logic", () => {
  describe("createStandardDeck", () => {
    it("should create a standard 52-card deck", () => {
      const deck = createStandardDeck();
      expect(deck.length).toBe(52);
    });

    it("should have 13 cards of each suit", () => {
      const deck = createStandardDeck();

      const hearts = deck.filter(c => c.suit === "hearts");
      const diamonds = deck.filter(c => c.suit === "diamonds");
      const clubs = deck.filter(c => c.suit === "clubs");
      const spades = deck.filter(c => c.suit === "spades");

      expect(hearts.length).toBe(13);
      expect(diamonds.length).toBe(13);
      expect(clubs.length).toBe(13);
      expect(spades.length).toBe(13);
    });

    it("should have all ranks in each suit", () => {
      const deck = createStandardDeck();
      const expectedRanks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

      const hearts = deck.filter(c => c.suit === "hearts");
      const heartRanks = hearts.map(c => c.rank).sort();

      expect(heartRanks).toEqual(expectedRanks.sort());
    });

    it("should create cards with correct default properties", () => {
      const deck = createStandardDeck();
      expect(deck.length).toBeGreaterThan(0);
      const firstCard = deck[0];
      expect(firstCard).toBeDefined();

      expect(firstCard?.faceUp).toBe(false);
      expect(firstCard?.ownerId).toBeNull();
      expect(firstCard?.position).toEqual({ x: 0, y: 0, z: 0 });
      // Cards start face down with Math.PI rotation
      expect(firstCard?.rotation).toEqual({ x: 0, y: 0, z: Math.PI });
    });

    it("should create unique card IDs", () => {
      const deck = createStandardDeck();
      const ids = deck.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(52);
    });
  });

  describe("shuffleDeck", () => {
    it("should return a deck with the same number of cards", () => {
      const deck = createStandardDeck();
      const shuffled = shuffleDeck(deck, 12345);

      expect(shuffled.length).toBe(deck.length);
    });

    it("should contain the same cards after shuffling", () => {
      const deck = createStandardDeck();
      const shuffled = shuffleDeck(deck, 12345);

      const originalIds = new Set(deck.map(c => c.id));
      const shuffledIds = new Set(shuffled.map(c => c.id));

      expect(shuffledIds).toEqual(originalIds);
    });

    it("should produce deterministic results with the same seed", () => {
      const deck = createStandardDeck();
      const shuffled1 = shuffleDeck(deck, 12345);
      const shuffled2 = shuffleDeck(deck, 12345);

      const ids1 = shuffled1.map(c => c.id);
      const ids2 = shuffled2.map(c => c.id);

      expect(ids1).toEqual(ids2);
    });

    it("should produce different results with different seeds", () => {
      const deck = createStandardDeck();
      const shuffled1 = shuffleDeck(deck, 12345);
      const shuffled2 = shuffleDeck(deck, 54321);

      const ids1 = shuffled1.map(c => c.id);
      const ids2 = shuffled2.map(c => c.id);

      // They should not be equal (statistically almost impossible)
      expect(ids1).not.toEqual(ids2);
    });

    it("should actually shuffle the order (not return same order)", () => {
      const deck = createStandardDeck();
      const shuffled = shuffleDeck(deck, Date.now());

      const originalIds = deck.map(c => c.id);
      const shuffledIds = shuffled.map(c => c.id);

      // The probability of a perfect shuffle keeping all positions is astronomically low
      let samePositionCount = 0;
      for (let i = 0; i < originalIds.length; i++) {
        if (originalIds[i] === shuffledIds[i]) {
          samePositionCount++;
        }
      }

      // At most a few cards should be in the same position by chance
      expect(samePositionCount).toBeLessThan(deck.length / 2);
    });

    it("should not mutate the original deck", () => {
      const deck = createStandardDeck();
      const originalIds = deck.map(c => c.id);

      shuffleDeck(deck, 12345);

      const afterShuffleIds = deck.map(c => c.id);
      expect(afterShuffleIds).toEqual(originalIds);
    });

    it("should update zIndex values after shuffling", () => {
      const deck = createStandardDeck();
      const shuffled = shuffleDeck(deck, 12345);

      // Each card should have a zIndex matching its position
      shuffled.forEach((card, index) => {
        expect(card.zIndex).toBe(index);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty deck", () => {
      const emptyDeck: Card[] = [];
      const shuffled = shuffleDeck(emptyDeck, 12345);

      expect(shuffled).toEqual([]);
    });

    it("should handle single card deck", () => {
      const singleCard: Card[] = [
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
      ];

      const shuffled = shuffleDeck(singleCard, 12345);

      expect(shuffled.length).toBe(1);
      expect(shuffled[0]?.id).toBe("card-1");
    });
  });
});
