import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Card as CardType } from "../../types/card";
import { Card } from "./Card";

// Mocks
vi.mock("@react-three/drei", () => ({
  Html: ({ children }: { children: React.ReactNode; }) => (
    <div data-testid="card-html">{children}</div>
  ),
}));
vi.mock("@react-spring/three", () => ({
  useSpring: () => ({ position: [], rotation: [] }),
  animated: {
    group: ({ children }: any) => <div data-testid="card-group">{children}</div>,
  },
}));
vi.mock("@use-gesture/react", () => ({
  useDrag: () => () => ({}),
}));
vi.mock("three", () => ({
  Vector3: class {
    x = 0;
    y = 0;
    z = 0;
  },
}));
vi.mock("@react-three/fiber", () => ({
  ThreeEvent: {},
}));

const mockCard: CardType = {
  id: "c1",
  suit: "hearts",
  rank: "K",
  faceUp: true,
  ownerId: "p1",
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  zIndex: 1,
};

describe("Card Component", () => {
  it("renders correctly", () => {
    const { getByTestId } = render(
      <Card
        card={mockCard}
        isOwner={true}
        onMove={() => {}}
        onFlip={() => {}}
      />,
    );
    expect(getByTestId("card-group")).toBeDefined();
  });
});
