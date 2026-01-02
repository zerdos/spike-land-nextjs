import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GameScene from "./GameScene";

// Mock 3D libraries which don't run in JSDOM
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode; }) => <div>{children}</div>,
  useFrame: () => {},
  useLoader: () => {},
  useThree: () => ({ camera: {}, scene: {} }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  ContactShadows: () => <div data-testid="contact-shadows" />,
  Environment: () => <div data-testid="environment" />,
  Text: () => <div data-testid="text" />,
}));

vi.mock("@react-three/rapier", () => ({
  Physics: ({ children }: { children: React.ReactNode; }) => <div>{children}</div>,
  RigidBody: ({ children }: { children: React.ReactNode; }) => <div>{children}</div>,
  CuboidCollider: () => <div />,
}));

// Mock the child components
vi.mock("./objects/Card", () => ({
  Card: () => <div data-testid="card" />,
}));

vi.mock("./objects/Dice", () => ({
  Dice: () => <div data-testid="dice" />,
}));

vi.mock("./objects/Deck", () => ({
  Deck: () => <div data-testid="deck" />,
}));

vi.mock("./scene/Camera", () => ({
  GameCamera: () => <div data-testid="camera" />,
}));

vi.mock("./scene/Lighting", () => ({
  TableLighting: () => <div data-testid="lighting" />,
}));

vi.mock("./scene/TableSurface", () => ({
  TableSurface: () => <div data-testid="table" />,
}));

describe("GameScene", () => {
  const defaultProps = {
    cards: [],
    dice: [],
    playerId: "player-1",
    interactionMode: "orbit" as const,
    onCardMove: vi.fn(),
    onCardFlip: vi.fn(),
    onDiceSettle: vi.fn(),
    onDeckDraw: vi.fn(),
    onDeckShuffle: vi.fn(),
  };

  it("renders without crashing", () => {
    const { container } = render(<GameScene {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it("renders cards on the table", () => {
    const cards = [
      {
        id: "card-1",
        suit: "hearts" as const,
        rank: "A" as const,
        faceUp: true,
        ownerId: null,
        position: { x: 1, y: 0.1, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
        zIndex: 0,
      },
    ];

    const { getAllByTestId } = render(
      <GameScene {...defaultProps} cards={cards} />,
    );
    expect(getAllByTestId("card")).toHaveLength(1);
  });

  it("renders dice on the table", () => {
    const dice = [
      {
        id: "dice-1",
        type: "d6" as const,
        value: 0,
        position: { x: 0, y: 2, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        isRolling: true,
        seed: 12345,
        ownerId: null,
      },
    ];

    const { getAllByTestId } = render(
      <GameScene {...defaultProps} dice={dice} />,
    );
    expect(getAllByTestId("dice")).toHaveLength(1);
  });
});
