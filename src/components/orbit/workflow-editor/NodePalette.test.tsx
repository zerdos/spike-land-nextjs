import { render, screen } from "@testing-library/react";
import NodePalette from "./NodePalette";

describe("NodePalette", () => {
  it("renders the node palette", () => {
    render(<NodePalette />);
    expect(screen.getByText("Nodes")).toBeInTheDocument();
    expect(screen.getByText(/trigger: on new tweet/i)).toBeInTheDocument();
  });
});
