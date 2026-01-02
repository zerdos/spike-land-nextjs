import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiceState } from "../../types/dice";
import { Dice } from "./Dice";

// Mock canvas context for tests
beforeEach(() => {
  const mockContext = {
    fillStyle: "",
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mockContext as any,
  );
});

// Mocks
vi.mock("@react-three/rapier", () => ({
  RigidBody: ({ children }: any) => <div data-testid="dice-rb">{children}</div>,
  useRapier: () => ({ rapier: {}, world: {} }),
}));
vi.mock("@react-three/fiber", () => ({
  useFrame: () => {},
}));
vi.mock("../../hooks/useDicePhysics", () => ({
  useDicePhysics: () => ({ rigidBodyRef: { current: null } }),
}));

const mockDice: DiceState = {
  id: "d1",
  type: "d6",
  value: 1,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  isRolling: false,
  seed: 123,
  ownerId: null,
};

describe("Dice Component", () => {
  it("renders correctly", () => {
    const { getByTestId } = render(
      <Dice state={mockDice} onSettle={() => {}} />,
    );
    expect(getByTestId("dice-rb")).toBeDefined();
  });
});
