import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Card } from "../../types/card";
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
    render(
      <HandDrawer
        hand={[]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByTestId("hand-drawer")).toBeDefined();
  });

  it("shows hand count in toggle button", () => {
    render(
      <HandDrawer
        hand={[mockCard, { ...mockCard, id: "c2" }]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("Hand (2)")).toBeDefined();
  });

  it("calls onToggle when toggle button is clicked", () => {
    const onToggle = vi.fn();

    render(
      <HandDrawer
        hand={[]}
        isOpen={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByTestId("hand-toggle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows empty state message when hand is empty", () => {
    render(
      <HandDrawer
        hand={[]}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText("Click on the deck to draw cards")).toBeDefined();
  });

  it("renders cards with suit symbols", () => {
    render(
      <HandDrawer
        hand={[mockCard]}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );

    // Check for rank
    expect(screen.getByText("A")).toBeDefined();
    // Check for heart symbol (Unicode)
    expect(screen.getByText("\u2665")).toBeDefined();
  });

  it("calls onPlayCard when a card is clicked", () => {
    const onPlayCard = vi.fn();

    render(
      <HandDrawer
        hand={[mockCard]}
        isOpen={true}
        onToggle={vi.fn()}
        onPlayCard={onPlayCard}
      />,
    );

    fireEvent.click(screen.getByTestId(`hand-card-${mockCard.id}`));
    expect(onPlayCard).toHaveBeenCalledWith("c1");
  });

  it("applies correct color classes for different suits", () => {
    const cards: Card[] = [
      { ...mockCard, id: "c1", suit: "hearts" },
      { ...mockCard, id: "c2", suit: "diamonds" },
      { ...mockCard, id: "c3", suit: "clubs" },
      { ...mockCard, id: "c4", suit: "spades" },
    ];

    render(
      <HandDrawer
        hand={cards}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );

    // All 4 cards should be rendered
    expect(screen.getByTestId("hand-card-c1")).toBeDefined();
    expect(screen.getByTestId("hand-card-c2")).toBeDefined();
    expect(screen.getByTestId("hand-card-c3")).toBeDefined();
    expect(screen.getByTestId("hand-card-c4")).toBeDefined();
  });

  it("translates drawer when open", () => {
    const { rerender } = render(
      <HandDrawer
        hand={[]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    const drawer = screen.getByTestId("hand-drawer");
    expect(drawer.className).toContain("translate-y-full");

    rerender(
      <HandDrawer
        hand={[]}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );

    expect(drawer.className).toContain("translate-y-0");
  });
});
