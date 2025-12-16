import { fireEvent, render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";
import { PlatformHeader } from "./PlatformHeader";

// Mock the SpikeLandLogo and PixelLogo components
vi.mock("@/components/brand", () => ({
  SpikeLandLogo: ({ size, variant }: { size: string; variant: string; }) => (
    <div data-testid="spike-land-logo" data-size={size} data-variant={variant}>
      SpikeLandLogo
    </div>
  ),
  PixelLogo: ({ size, variant }: { size: string; variant: string; }) => (
    <div data-testid="pixel-logo" data-size={size} data-variant={variant}>
      PixelLogo
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
  },
  expires: "2025-12-31",
};

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
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

    it("should render desktop navigation links", () => {
      render(<PlatformHeader />);
      expect(
        screen.getAllByTestId("pixel-logo").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
    });

    it("should have correct href for navigation links", () => {
      render(<PlatformHeader />);
      expect(screen.getByRole("link", { name: /pixellogo/i })).toHaveAttribute(
        "href",
        "/pixel",
      );
      expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
        "href",
        "/blog/pixel-launch-announcement",
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
      expect(ctaButtons[0]).toHaveAttribute("href", "/pixel");
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

    it("should render navigation links in mobile menu when opened", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();

      const pixelLogos = screen.getAllByTestId("pixel-logo");
      expect(pixelLogos.length).toBeGreaterThanOrEqual(1);

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

      fireEvent.click(menuButton);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const dialog = screen.getByRole("dialog");
      const appsLinkInDialog = dialog.querySelector('a[href="/pixel"]');
      expect(appsLinkInDialog).toBeInTheDocument();

      fireEvent.click(appsLinkInDialog!);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should close mobile menu when clicking Get Started button", async () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });

      fireEvent.click(menuButton);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const dialog = screen.getByRole("dialog");
      const getStartedLinkInDialog = dialog.querySelector('a[href="/pixel"]');
      expect(getStartedLinkInDialog).toBeInTheDocument();

      fireEvent.click(getStartedLinkInDialog!);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
      expect(
        screen.getAllByTestId("pixel-logo").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("link", { name: "Blog" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
    });

    it("should render UserAvatar in mobile menu when authenticated", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      // UserAvatar should be rendered in the mobile menu too
      const avatars = screen.getAllByTestId("user-avatar");
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });

    it("should not show Sign In in mobile menu when authenticated", () => {
      render(<PlatformHeader />);
      const menuButton = screen.getByRole("button", { name: /open menu/i });
      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      const signInLink = dialog.querySelector('a[href="/auth/signin"]');
      expect(signInLink).not.toBeInTheDocument();
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
});
