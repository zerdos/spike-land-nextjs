import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConnectionDetailPage from "./page";

describe("ConnectionDetailPage", () => {
  it("renders page title", () => {
    render(
      <ConnectionDetailPage params={{ workspaceSlug: "test-workspace", connectionId: "123" }} />,
    );
    expect(screen.getByText("Connection Details")).toBeInTheDocument();
  });
});
