import { render, screen } from "@testing-library/react";
import WorkflowEditor from "./index";
import { vi, describe, it, expect, beforeAll } from "vitest";

// Mock ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock reactflow
vi.mock("reactflow", () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow-provider">{children}</div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  Handle: () => <div data-testid="handle" />,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  useReactFlow: () => ({
    project: (pos: { x: number; y: number }) => pos,
  }),
  addEdge: vi.fn(),
  applyEdgeChanges: vi.fn(),
  applyNodeChanges: vi.fn(),
}));

describe("WorkflowEditor", () => {
  it("renders the editor", () => {
    render(<WorkflowEditor />);
    // The provider wraps the canvas, so we check for it
    expect(screen.getByTestId("react-flow-provider")).toBeInTheDocument();
    // Inside the provider, the main flow component should be rendered
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });
});
