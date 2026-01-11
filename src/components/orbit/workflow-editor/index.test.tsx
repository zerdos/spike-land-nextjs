import { render, screen } from "@testing-library/react";
import WorkflowEditor from "./index";

describe("WorkflowEditor", () => {
  it("renders the editor", () => {
    render(<WorkflowEditor />);
    expect(screen.getByText(/drag nodes from the left/i)).toBeInTheDocument();
  });
});
