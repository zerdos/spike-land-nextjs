import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConditionalHeader } from "./ConditionalHeader";

// Mock PlatformHeader
vi.mock("./PlatformHeader", () => ({
  PlatformHeader: () => <header data-testid="platform-header">Header</header>,
}));

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("ConditionalHeader Component", () => {
  it("should render PlatformHeader on regular pages", () => {
    mockUsePathname.mockReturnValue("/");
    render(<ConditionalHeader />);
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });

  it("should render PlatformHeader on /pixel page", () => {
    mockUsePathname.mockReturnValue("/pixel");
    render(<ConditionalHeader />);
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });

  it("should render PlatformHeader on /apps/pixel page", () => {
    mockUsePathname.mockReturnValue("/apps/pixel");
    render(<ConditionalHeader />);
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });

  it("should render PlatformHeader on /blog page", () => {
    mockUsePathname.mockReturnValue("/blog");
    render(<ConditionalHeader />);
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });

  it("should render PlatformHeader on /pricing page", () => {
    mockUsePathname.mockReturnValue("/pricing");
    render(<ConditionalHeader />);
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });

  it("should NOT render PlatformHeader on /canvas pages", () => {
    mockUsePathname.mockReturnValue("/canvas/album-123");
    render(<ConditionalHeader />);
    expect(screen.queryByTestId("platform-header")).not.toBeInTheDocument();
  });

  it("should NOT render PlatformHeader on /canvas root", () => {
    mockUsePathname.mockReturnValue("/canvas");
    render(<ConditionalHeader />);
    expect(screen.queryByTestId("platform-header")).not.toBeInTheDocument();
  });

  it("should NOT render PlatformHeader on /storybook pages", () => {
    mockUsePathname.mockReturnValue("/storybook/buttons");
    render(<ConditionalHeader />);
    expect(screen.queryByTestId("platform-header")).not.toBeInTheDocument();
  });

  it("should NOT render PlatformHeader on /storybook root", () => {
    mockUsePathname.mockReturnValue("/storybook");
    render(<ConditionalHeader />);
    expect(screen.queryByTestId("platform-header")).not.toBeInTheDocument();
  });

  it("should render PlatformHeader on /settings page", () => {
    mockUsePathname.mockReturnValue("/settings");
    render(<ConditionalHeader />);
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });

  it("should render PlatformHeader on /profile page", () => {
    mockUsePathname.mockReturnValue("/profile");
    render(<ConditionalHeader />);
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });

  it("should handle null pathname gracefully", () => {
    mockUsePathname.mockReturnValue(null);
    render(<ConditionalHeader />);
    // Should render header when pathname is null (not starting with excluded paths)
    expect(screen.getByTestId("platform-header")).toBeInTheDocument();
  });
});
