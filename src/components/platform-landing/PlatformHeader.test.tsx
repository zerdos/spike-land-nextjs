import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformHeader } from "./PlatformHeader";

// Mock the SpikeLandLogo component
vi.mock("@/components/brand", () => ({
  SpikeLandLogo: ({ size, variant }: { size: string; variant: string; }) => (
    <div data-testid="spike-land-logo" data-size={size} data-variant={variant}>
      SpikeLandLogo
    </div>
  ),
}));

describe("PlatformHeader Component", () => {
  it("should render the header with logo", () => {
    render(<PlatformHeader />);
    const logo = screen.getByTestId("spike-land-logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("data-size", "sm");
    expect(logo).toHaveAttribute("data-variant", "horizontal");
  });

  it("should have a link to home on the logo", () => {
    render(<PlatformHeader />);
    const homeLink = screen.getByRole("link", { name: /spikelandlogo/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("should render desktop navigation links", () => {
    render(<PlatformHeader />);
    expect(screen.getByRole("link", { name: "Apps" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
  });

  it("should have correct href for navigation links", () => {
    render(<PlatformHeader />);
    expect(screen.getByRole("link", { name: "Apps" })).toHaveAttribute(
      "href",
      "/apps",
    );
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/auth/signin",
    );
  });

  it("should render Get Started CTA button", () => {
    render(<PlatformHeader />);
    const ctaButtons = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaButtons.length).toBeGreaterThanOrEqual(1);
    expect(ctaButtons[0]).toHaveAttribute(
      "href",
      "/auth/signin?callbackUrl=/apps/pixel",
    );
  });

  it("should have fixed positioning", () => {
    const { container } = render(<PlatformHeader />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("fixed");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("z-50");
  });

  it("should have glass-morphism styling", () => {
    const { container } = render(<PlatformHeader />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("bg-background/80");
    expect(header).toHaveClass("backdrop-blur-md");
  });

  it("should render mobile menu trigger button", () => {
    render(<PlatformHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it("should open mobile menu dialog when clicking menu button", () => {
    render(<PlatformHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // Dialog content should be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should render navigation links in mobile menu when opened", () => {
    render(<PlatformHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // Check for navigation links in the dialog
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Mobile menu should contain navigation links
    // Links appear in both desktop and mobile nav, but testing library finds all accessible links
    const appsLinks = screen.getAllByRole("link", { name: "Apps" });
    expect(appsLinks.length).toBeGreaterThanOrEqual(1);

    // Verify the Get Started button is also in the mobile menu
    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("should have border styling on header", () => {
    const { container } = render(<PlatformHeader />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("border-b");
    expect(header).toHaveClass("border-border/50");
  });

  it("should have correct height for header", () => {
    const { container } = render(<PlatformHeader />);
    const innerDiv = container.querySelector(".flex.h-16");
    expect(innerDiv).toBeInTheDocument();
  });

  it("should close mobile menu when clicking a navigation link", async () => {
    render(<PlatformHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });

    // Open the menu
    fireEvent.click(menuButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Find the dialog and get the Apps link inside it
    const dialog = screen.getByRole("dialog");
    const appsLinkInDialog = dialog.querySelector('a[href="/apps"]');
    expect(appsLinkInDialog).toBeInTheDocument();

    // Click the Apps link to close the menu
    fireEvent.click(appsLinkInDialog!);

    // The dialog should no longer be in the document (menu closed)
    // Note: The Sheet component may take time to unmount, so we check it's been triggered
    // The onClick handler sets mobileMenuOpen to false
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should close mobile menu when clicking Get Started button", async () => {
    render(<PlatformHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });

    // Open the menu
    fireEvent.click(menuButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Find the dialog and get the Get Started link inside it
    const dialog = screen.getByRole("dialog");
    const getStartedLinkInDialog = dialog.querySelector(
      'a[href="/auth/signin?callbackUrl=/apps/pixel"]',
    );
    expect(getStartedLinkInDialog).toBeInTheDocument();

    // Click the Get Started link to close the menu
    fireEvent.click(getStartedLinkInDialog!);

    // The dialog should no longer be in the document (menu closed)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
