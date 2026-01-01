import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Card } from "../../types/card";
import { HandDrawer } from "./HandDrawer";

const mockCard: Card = {
  id: "c1",
  suit: "hearts",
  rank: "A",
  faceUp: false,
  ownerId: "player1",
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  zIndex: 0,
};

describe("HandDrawer", () => {
  it("renders the hand drawer", () => {
    render(<HandDrawer hand={[]} />);

    expect(screen.getByTestId("hand-drawer")).toBeDefined();
  });

  it("shows hand count in header", () => {
    render(
      <HandDrawer hand={[mockCard, { ...mockCard, id: "c2" }]} />,
    );

    expect(screen.getByText("Your Hand (2)")).toBeDefined();
  });

  it("shows empty state message when hand is empty", () => {
    render(<HandDrawer hand={[]} />);

    expect(screen.getByText("Draw cards from the deck to play")).toBeDefined();
  });

  it("renders cards with suit symbols", () => {
    render(<HandDrawer hand={[mockCard]} />);

    // Check for heart symbol (Unicode)
    expect(screen.getAllByText("\u2665").length).toBeGreaterThan(0);
  });

  it("calls onPlayCard when a card is clicked", () => {
    const onPlayCard = vi.fn();

    render(<HandDrawer hand={[mockCard]} onPlayCard={onPlayCard} />);

    fireEvent.click(screen.getByTestId(`hand-card-${mockCard.id}`));
    expect(onPlayCard).toHaveBeenCalledWith("c1");
  });

  it("renders cards for different suits", () => {
    const cards: Card[] = [
      { ...mockCard, id: "c1", suit: "hearts" },
      { ...mockCard, id: "c2", suit: "diamonds" },
      { ...mockCard, id: "c3", suit: "clubs" },
      { ...mockCard, id: "c4", suit: "spades" },
    ];

    render(<HandDrawer hand={cards} />);

    // All 4 cards should be rendered
    expect(screen.getByTestId("hand-card-c1")).toBeDefined();
    expect(screen.getByTestId("hand-card-c2")).toBeDefined();
    expect(screen.getByTestId("hand-card-c3")).toBeDefined();
    expect(screen.getByTestId("hand-card-c4")).toBeDefined();
  });

  it("displays card rank correctly", () => {
    render(<HandDrawer hand={[mockCard]} />);

    // Should show the rank 'A' multiple times (center and corners)
    const ranks = screen.getAllByText("A");
    expect(ranks.length).toBeGreaterThanOrEqual(1);
  });
});
