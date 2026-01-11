import { render } from "@testing-library/react";
import WorkflowEditor from "./index";

// Mock react-flow as it requires DOM APIs
vi.mock("reactflow", () => ({
  default: ({ children }: { children?: React.ReactNode; }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Background: () => null,
  Controls: () => null,
  addEdge: vi.fn(),
  applyEdgeChanges: vi.fn(),
  applyNodeChanges: vi.fn(),
}));

import { vi } from "vitest";

describe("WorkflowEditor", () => {
  it("renders the editor", () => {
    const { container } = render(<WorkflowEditor />);
    expect(container.querySelector('[data-testid="react-flow"]')).toBeInTheDocument();
  });
});
