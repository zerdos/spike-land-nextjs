import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PixelHeader } from "./PixelHeader";

// Mock the PixelLogo component
vi.mock("@/components/brand", () => ({
  PixelLogo: ({ size, variant }: { size: string; variant: string; }) => (
    <div data-testid="pixel-logo" data-size={size} data-variant={variant}>
      PixelLogo
    </div>
  ),
}));

describe("PixelHeader Component", () => {
  it("should render the header with logo", () => {
    render(<PixelHeader />);
    const logo = screen.getByTestId("pixel-logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("data-size", "sm");
    expect(logo).toHaveAttribute("data-variant", "horizontal");
  });

  it("should have a link to Pixel landing page on the logo", () => {
    render(<PixelHeader />);
    const logoLink = screen.getByRole("link", { name: /pixellogo/i });
    expect(logoLink).toHaveAttribute("href", "/apps/pixel");
  });

  it("should render desktop navigation links", () => {
    render(<PixelHeader />);
    expect(screen.getByRole("link", { name: "Features" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
  });

  it("should have correct href for navigation links", () => {
    render(<PixelHeader />);
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute(
      "href",
      "#features",
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
    render(<PixelHeader />);
    const ctaButtons = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaButtons.length).toBeGreaterThanOrEqual(1);
    expect(ctaButtons[0]).toHaveAttribute("href", "/apps/pixel");
  });

  it("should have fixed positioning", () => {
    const { container } = render(<PixelHeader />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("fixed");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("z-50");
  });

  it("should have glass-morphism styling", () => {
    const { container } = render(<PixelHeader />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("bg-background/80");
    expect(header).toHaveClass("backdrop-blur-md");
  });

  it("should render mobile menu trigger button", () => {
    render(<PixelHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it("should open mobile menu dialog when clicking menu button", () => {
    render(<PixelHeader />);
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // Dialog content should be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should have cyan glow on CTA button", () => {
    const { container } = render(<PixelHeader />);
    const ctaButton = container.querySelector(".shadow-glow-cyan-sm");
    expect(ctaButton).toBeInTheDocument();
  });

  it("should close mobile menu when clicking a navigation link", () => {
    render(<PixelHeader />);

    // Open the mobile menu
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // Verify the dialog is open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Find the Features link inside the dialog and click it
    const featuresLinks = screen.getAllByRole("link", { name: "Features" });
    // The second one should be inside the mobile menu (dialog)
    const mobileMenuFeaturesLink = featuresLinks.find((link) => dialog.contains(link));
    expect(mobileMenuFeaturesLink).toBeDefined();
    fireEvent.click(mobileMenuFeaturesLink!);

    // The dialog should no longer be in the document (menu closed)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should close mobile menu when clicking Get Started button in mobile menu", () => {
    render(<PixelHeader />);

    // Open the mobile menu
    const menuButton = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuButton);

    // Verify the dialog is open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Find the Get Started button inside the dialog
    const getStartedLinks = screen.getAllByRole("link", { name: /get started/i });
    const mobileMenuGetStarted = getStartedLinks.find((link) => dialog.contains(link));
    expect(mobileMenuGetStarted).toBeDefined();
    fireEvent.click(mobileMenuGetStarted!);

    // The dialog should no longer be in the document (menu closed)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
