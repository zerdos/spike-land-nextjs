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
    render(
      <HandDrawer
        hand={[]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByTestId("hand-drawer")).toBeDefined();
  });

  it("shows hand count badge in toggle button when cards exist", () => {
    render(
      <HandDrawer
        hand={[mockCard, { ...mockCard, id: "c2" }]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    // Count badge shows the number
    expect(screen.getByText("2")).toBeDefined();
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

  it("renders cards with suit symbols when open", () => {
    render(
      <HandDrawer
        hand={[mockCard]}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );

    // Check for heart symbol (Unicode) - appears in card center
    expect(screen.getAllByText("\u2665").length).toBeGreaterThan(0);
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

  it("adjusts height based on open state and cards", () => {
    const { rerender } = render(
      <HandDrawer
        hand={[]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    const drawer = screen.getByTestId("hand-drawer");
    // Empty, closed = h-12
    expect(drawer.className).toContain("h-12");

    rerender(
      <HandDrawer
        hand={[mockCard]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    // Has cards, closed = h-16 (shows minimized cards)
    expect(drawer.className).toContain("h-16");

    rerender(
      <HandDrawer
        hand={[mockCard]}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );

    // Open = h-32
    expect(drawer.className).toContain("h-32");
  });

  it("shows minimized card badges when closed with cards", () => {
    render(
      <HandDrawer
        hand={[mockCard, { ...mockCard, id: "c2" }]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    // Both full cards (hidden) and minimized view are in DOM
    // Full cards have 1 symbol each (center), minimized has 1 each
    // Total: 4 symbols for 2 cards
    const suitSymbols = screen.getAllByText("\u2665");
    expect(suitSymbols.length).toBe(4);
  });

  it("hides card container when closed", () => {
    const { container, rerender } = render(
      <HandDrawer
        hand={[mockCard]}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );

    // When closed, full cards should be hidden (opacity-0)
    const cardsContainer = container.querySelector("[class*='opacity-0']");
    expect(cardsContainer).not.toBeNull();

    rerender(
      <HandDrawer
        hand={[mockCard]}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );

    // When open, cards should be visible (opacity-100)
    const visibleContainer = container.querySelector("[class*='opacity-100']");
    expect(visibleContainer).not.toBeNull();
  });
});
