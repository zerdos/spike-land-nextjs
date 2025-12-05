import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MyAppsLoading from "./loading";

describe("MyAppsLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<MyAppsLoading />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders main container", () => {
    const { container } = render(<MyAppsLoading />);
    const mainContainer = container.querySelector(".min-h-screen");
    expect(mainContainer).toBeInTheDocument();
  });

  it("renders skeleton elements", () => {
    const { container } = render(<MyAppsLoading />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders card structure", () => {
    const { container } = render(<MyAppsLoading />);
    const card = container.querySelector('[class*="rounded-xl"]');
    expect(card).toBeInTheDocument();
  });

  it("renders header section skeleton", () => {
    const { container } = render(<MyAppsLoading />);
    const header = container.querySelector(".mb-8");
    expect(header).toBeInTheDocument();
  });

  it("matches expected structure", () => {
    const { container } = render(<MyAppsLoading />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(12);
  });
});
