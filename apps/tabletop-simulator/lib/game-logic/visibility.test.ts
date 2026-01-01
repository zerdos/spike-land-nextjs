import { describe, expect, it } from "vitest";
import { Card } from "../../types/card";
import { canPeekCard, isCardVisible } from "./visibility";

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

describe("Visibility Logic", () => {
  it("allows owner to peek", () => {
    const ownedFn = { ...mockCard, ownerId: "p1" };
    expect(canPeekCard(ownedFn, "p1")).toBe(true);
    expect(canPeekCard(ownedFn, "p2")).toBe(false);
  });

  it("determines visibility", () => {
    const faceDown = { ...mockCard, faceUp: false, ownerId: null };
    const faceUp = { ...mockCard, faceUp: true, ownerId: null };
    const owned = { ...mockCard, faceUp: false, ownerId: "p1" };

    expect(isCardVisible(faceDown, "p1")).toBe(false);
    expect(isCardVisible(faceUp, "p1")).toBe(true);
    expect(isCardVisible(owned, "p1")).toBe(true);
    expect(isCardVisible(owned, "p2")).toBe(false);
  });
});
