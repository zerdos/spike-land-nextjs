import { render } from "@testing-library/react";
import { vi } from "vitest";
import WorkflowEditor from "./index";

// Mock react-flow as it requires DOM APIs
vi.mock("reactflow", () => ({
  default: ({ children }: { children?: React.ReactNode; }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  addEdge: vi.fn(),
  applyEdgeChanges: vi.fn(),
  applyNodeChanges: vi.fn(),
  useNodesState: (initial: any) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: any) => [initial, vi.fn(), vi.fn()],
}));

describe("WorkflowEditor", () => {
  it("renders the editor", () => {
    const { container } = render(<WorkflowEditor />);
    expect(container.querySelector('[data-testid="react-flow"]'))
      .toBeInTheDocument();
  });
});
