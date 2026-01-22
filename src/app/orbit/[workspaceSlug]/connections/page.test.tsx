import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConnectionsPage from "./page";

describe("ConnectionsPage", () => {
  it("renders page title", () => {
    render(<ConnectionsPage />);
    expect(screen.getByText("Connections")).toBeInTheDocument();
  });
});
