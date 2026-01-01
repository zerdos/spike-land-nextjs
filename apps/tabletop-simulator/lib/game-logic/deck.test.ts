import { describe, expect, it } from "vitest";
import { createStandardDeck, dealCards, shuffleDeck } from "./deck";

describe("Deck Logic", () => {
  it("creates a standard 52-card deck", () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);

    const clubs = deck.filter(c => c.suit === "clubs");
    expect(clubs).toHaveLength(13);
  });

  it("shuffles deterministically", () => {
    const deck = createStandardDeck();
    const shuffled1 = shuffleDeck(deck, 12345);
    const shuffled2 = shuffleDeck(deck, 12345);
    const shuffled3 = shuffleDeck(deck, 67890);

    expect(shuffled1).toEqual(shuffled2);
    expect(shuffled1).not.toEqual(shuffled3);
    expect(shuffled1).not.toEqual(deck); // Unlikely to match sorted
  });

  it("deals cards correctly", () => {
    const deck = createStandardDeck();
    const { dealt, remaining } = dealCards(deck, 5, "p1");

    expect(dealt).toHaveLength(5);
    expect(remaining).toHaveLength(47);
    expect(dealt[0].ownerId).toBe("p1");
    expect(remaining[0].ownerId).toBeNull();
  });
});
