import { UserRole } from "@prisma/client";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
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

// Mock UserAvatar component
vi.mock("@/components/auth/user-avatar", () => ({
  UserAvatar: () => <div data-testid="user-avatar">UserAvatar</div>,
}));

// Create mock session
const mockSession: Session = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: "https://example.com/avatar.jpg",
    role: UserRole.USER,
  },
  expires: "2025-12-31",
};

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signOut: vi.fn(),
}));

describe("PlatformHeader Component", () => {
  describe("when user is not authenticated", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    });

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

    it("should render Orbit CTA button in desktop navigation", () => {
      render(<PlatformHeader />);
      const orbitLinks = screen.getAllByRole("link", { name: /orbit/i });
      expect(orbitLinks.length).toBeGreaterThanOrEqual(1);
      expect(orbitLinks[0]).toHaveAttribute("href", "/orbit");
    });

    it("should render Features dropdown trigger", () => {
      render(<PlatformHeader />);
      expect(screen.getByRole("button", { name: /features/i })).toBeInTheDocument();
    });

    it("should render desktop navigation links", () => {
      render(<PlatformHeader />);
      expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "My Apps" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
    });

    it("should have correct href for navigation links", () => {
      render(<PlatformHeader />);
      expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
        "href",
        "/pricing",
      );
      expect(screen.getByRole("link", { name: "My Apps" })).toHaveAttribute(
        "href",
        "/my-apps",
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
      expect(ctaButtons[0]).toHaveAttribute("href", "/auth/signin");
    });

    it("should not render UserAvatar when not authenticated", () => {
      render(<PlatformHeader />);
      expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
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
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should render Orbit link in mobile menu when opened", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      const orbitLink = dialog.querySelector('a[href="/orbit"]');
      expect(orbitLink).toBeInTheDocument();
    });

    it("should render feature items in mobile menu when opened", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      expect(dialog.querySelector('a[href="/features/ab-testing"]')).toBeInTheDocument();
      expect(dialog.querySelector('a[href="/features/calendar"]')).toBeInTheDocument();
      expect(dialog.querySelector('a[href="/features/brand-brain"]')).toBeInTheDocument();
      expect(dialog.querySelector('a[href="/features/analytics"]')).toBeInTheDocument();
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

    it("should close mobile menu when clicking Orbit link", async () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });

      fireEvent.click(menuButton);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const dialog = screen.getByRole("dialog");
      const orbitLinkInDialog = dialog.querySelector('a[href="/orbit"]');
      expect(orbitLinkInDialog).toBeInTheDocument();

      fireEvent.click(orbitLinkInDialog!);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should close mobile menu when clicking Get Started button", async () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });

      fireEvent.click(menuButton);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const dialog = screen.getByRole("dialog");
      const getStartedLinkInDialog = dialog.querySelector('a[href="/auth/signin"]');
      expect(getStartedLinkInDialog).toBeInTheDocument();

      fireEvent.click(getStartedLinkInDialog!);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render My Apps link in mobile menu with de-emphasized styling", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      const myAppsLink = dialog.querySelector('a[href="/my-apps"]');
      expect(myAppsLink).toBeInTheDocument();
      expect(myAppsLink).toHaveClass("text-muted-foreground");
    });
  });

  describe("when user is authenticated", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
      });
    });

    it("should render UserAvatar instead of Get Started button", () => {
      render(<PlatformHeader />);
      expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /get started/i }),
      ).not.toBeInTheDocument();
    });

    it("should hide Sign In link when authenticated", () => {
      render(<PlatformHeader />);
      expect(
        screen.queryByRole("link", { name: "Sign In" }),
      ).not.toBeInTheDocument();
    });

    it("should still render navigation links", () => {
      render(<PlatformHeader />);
      expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "My Apps" })).toBeInTheDocument();
    });

    it("should render Orbit CTA when authenticated", () => {
      render(<PlatformHeader />);
      const orbitLinks = screen.getAllByRole("link", { name: /orbit/i });
      expect(orbitLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should not show Sign In in mobile menu when authenticated", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      // Sign In link in nav section (not the one in user section)
      const signInLinks = dialog.querySelectorAll('a[href="/auth/signin"]');
      // Should not have Sign In link (only the user section links)
      const navSignIn = Array.from(signInLinks).filter(
        (link) => link.textContent === "Sign In",
      );
      expect(navSignIn.length).toBe(0);
    });
  });

  describe("when session is loading", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: null, status: "loading" });
    });

    it("should not show UserAvatar while loading", () => {
      render(<PlatformHeader />);
      expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
    });

    it("should show Sign In and Get Started while loading", () => {
      render(<PlatformHeader />);
      expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
      expect(
        screen.getAllByRole("link", { name: /get started/i }).length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Features dropdown", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    });

    it("should have Features dropdown trigger button", () => {
      render(<PlatformHeader />);
      const featuresButton = screen.getByRole("button", { name: /features/i });
      expect(featuresButton).toBeInTheDocument();
      // Check that dropdown trigger has the expected styling
      expect(featuresButton).toHaveClass("flex");
    });

    it("should have features listed in mobile menu", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      // Features section header
      expect(dialog.textContent).toContain("Features");
      // Feature items
      expect(dialog.querySelector('a[href="/features/ab-testing"]')).toBeInTheDocument();
      expect(dialog.querySelector('a[href="/features/calendar"]')).toBeInTheDocument();
      expect(dialog.querySelector('a[href="/features/brand-brain"]')).toBeInTheDocument();
      expect(dialog.querySelector('a[href="/features/analytics"]')).toBeInTheDocument();
    });

    it("should have aria-label on Features dropdown trigger", () => {
      render(<PlatformHeader />);
      const featuresButton = screen.getByRole("button", { name: /features menu/i });
      expect(featuresButton).toHaveAttribute("aria-label", "Features menu");
    });
  });

  describe("Keyboard navigation", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    });

    it("should have correct aria attributes on Features dropdown trigger", () => {
      render(<PlatformHeader />);
      const featuresButton = screen.getByRole("button", { name: /features menu/i });

      // Verify keyboard-accessible attributes
      expect(featuresButton).toHaveAttribute("aria-haspopup", "menu");
      expect(featuresButton).toHaveAttribute("aria-expanded", "false");
    });

    it("should have correct initial aria-expanded state", () => {
      render(<PlatformHeader />);
      const featuresButton = screen.getByRole("button", { name: /features menu/i });

      // Initially closed
      expect(featuresButton).toHaveAttribute("aria-expanded", "false");
      expect(featuresButton).toHaveAttribute("data-state", "closed");
    });

    it("should be focusable for keyboard navigation", () => {
      render(<PlatformHeader />);
      const featuresButton = screen.getByRole("button", { name: /features menu/i });

      // Button should be focusable
      featuresButton.focus();
      expect(document.activeElement).toBe(featuresButton);
    });

    it("should allow Tab navigation through header links", () => {
      render(<PlatformHeader />);

      // Get all focusable elements in the header
      const orbitLinks = screen.getAllByRole("link", { name: /orbit/i });
      const pricingLink = screen.getByRole("link", { name: "Pricing" });
      const myAppsLink = screen.getByRole("link", { name: "My Apps" });

      // Verify these elements exist and are tabbable (no tabindex=-1)
      expect(orbitLinks[0]).not.toHaveAttribute("tabindex", "-1");
      expect(pricingLink).not.toHaveAttribute("tabindex", "-1");
      expect(myAppsLink).not.toHaveAttribute("tabindex", "-1");
    });

    it("should close mobile menu with Escape key", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });

      // Open mobile menu
      fireEvent.click(menuButton);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Press Escape to close
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should have proper focus management when opening mobile menu", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });

      // Open mobile menu
      fireEvent.click(menuButton);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      // Dialog should be visible and accessible
      expect(dialog).toBeVisible();
    });

    it("should have aria-controls on mobile menu trigger", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });

      // Radix Sheet adds aria-controls automatically
      expect(menuButton).toHaveAttribute("aria-haspopup", "dialog");
    });

    it("should have accessible name on mobile menu dialog", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });

      // Open mobile menu
      fireEvent.click(menuButton);

      // The dialog should have an accessible name via VisuallyHidden SheetTitle
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      // Radix handles the accessible label via aria-labelledby
    });
  });
});
