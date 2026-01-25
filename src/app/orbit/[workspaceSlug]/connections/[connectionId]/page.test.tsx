import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConnectionDetailPage from "./page";

describe("ConnectionDetailPage", () => {
  it("renders page title", async () => {
    const PageComponent = await ConnectionDetailPage({
      params: Promise.resolve({ workspaceSlug: "test-workspace", connectionId: "123" }),
    });
    render(PageComponent);
    expect(screen.getByText("Connection Details")).toBeInTheDocument();
  });
});
