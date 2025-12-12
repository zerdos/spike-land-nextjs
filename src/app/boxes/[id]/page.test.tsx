import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BoxDetailPage from "./page";

describe("BoxDetailPage", () => {
  it("renders the page with box details", async () => {
    const params = Promise.resolve({ id: "test-box-123" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Agent Box test-box-123")).toBeInTheDocument();
    expect(screen.getByText("Browser Agent Environment")).toBeInTheDocument();
  });

  it("renders the AgentControlPanel component", async () => {
    const params = Promise.resolve({ id: "test-box-456" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Live Session")).toBeInTheDocument();
  });

  it("displays system initialization message", async () => {
    const params = Promise.resolve({ id: "test-box-789" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Agent initialized and ready.")).toBeInTheDocument();
  });

  it("uses the correct box ID from params", async () => {
    const params = Promise.resolve({ id: "custom-id" });
    render(await BoxDetailPage({ params }));

    expect(screen.getByText("Agent Box custom-id")).toBeInTheDocument();
  });
});
