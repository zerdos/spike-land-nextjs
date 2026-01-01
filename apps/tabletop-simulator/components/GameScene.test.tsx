import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GameScene from "./GameScene";

// Mock 3D libraries which don't run in JSDOM
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => <div>{children}</div>,
  useFrame: () => {},
  useLoader: () => {},
  useThree: () => ({ camera: {}, scene: {} }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  ContactShadows: () => <div data-testid="contact-shadows" />,
  Environment: () => <div data-testid="environment" />,
}));

vi.mock("@react-three/rapier", () => ({
  Physics: ({ children }: any) => <div>{children}</div>,
  RigidBody: ({ children }: any) => <div>{children}</div>,
  CuboidCollider: () => <div />,
}));

describe("GameScene", () => {
  it("renders without crashing", () => {
    const { container } = render(<GameScene />);
    expect(container).toBeDefined();
  });
});
