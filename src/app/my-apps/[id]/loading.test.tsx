import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppWorkspaceLoading from "./loading";

describe("AppWorkspaceLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<AppWorkspaceLoading />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders main container", () => {
    const { container } = render(<AppWorkspaceLoading />);
    const mainContainer = container.querySelector(".min-h-screen");
    expect(mainContainer).toBeInTheDocument();
  });

  it("renders skeleton elements", () => {
    const { container } = render(<AppWorkspaceLoading />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders grid layout with two columns", () => {
    const { container } = render(<AppWorkspaceLoading />);
    const grid = container.querySelector(".grid.gap-6.lg\\:grid-cols-2");
    expect(grid).toBeInTheDocument();
  });

  it("renders header section skeleton with back link", () => {
    const { container } = render(<AppWorkspaceLoading />);
    const header = container.querySelector(".mb-6");
    expect(header).toBeInTheDocument();
  });

  it("renders chat panel skeleton", () => {
    const { container } = render(<AppWorkspaceLoading />);
    const cards = container.querySelectorAll('[class*="rounded-2xl"]');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("renders preview panel skeleton", () => {
    const { container } = render(<AppWorkspaceLoading />);
    const cards = container.querySelectorAll('[class*="rounded-2xl"]');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("renders message input area skeleton", () => {
    const { container } = render(<AppWorkspaceLoading />);
    const inputArea = container.querySelector(".border-t.p-4");
    expect(inputArea).toBeInTheDocument();
  });
});
