import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock brand components
vi.mock("@/components/brand", () => ({
  PixelLogo: ({ size, variant }: { size?: string; variant?: string; }) => (
    <div data-testid="pixel-logo" data-size={size} data-variant={variant}>
      PixelLogo
    </div>
  ),
  SpikeLandLogo: ({ size, variant }: { size?: string; variant?: string; }) => (
    <div data-testid="spike-land-logo" data-size={size} data-variant={variant}>
      SpikeLandLogo
    </div>
  ),
}));

// Mock avatar component
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string; }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string; }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string; }) => (
    <span data-testid="avatar-fallback" className={className}>{children}</span>
  ),
}));

import BrandPage from "./page";

describe("BrandPage", () => {
  describe("rendering", () => {
    it("should render the Pixel logo section title", () => {
      render(<BrandPage />);
      expect(screen.getByText(/logo - the ai spark/i)).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<BrandPage />);
      expect(
        screen.getByText(/the pixel logo represents transformation and digital magic/i),
      ).toBeInTheDocument();
    });
  });

  describe("pixel logo sections", () => {
    it("should render sizes card", () => {
      render(<BrandPage />);
      // Get all "Sizes" headings and check at least one exists
      const sizesHeadings = screen.getAllByText("Sizes");
      expect(sizesHeadings.length).toBeGreaterThan(0);
    });

    it("should render variants card", () => {
      render(<BrandPage />);
      // Get all "Variants" headings and check at least one exists
      const variantsHeadings = screen.getAllByText("Variants");
      expect(variantsHeadings.length).toBeGreaterThan(0);
    });

    it("should render complete matrix card", () => {
      render(<BrandPage />);
      expect(screen.getByText("Complete Matrix")).toBeInTheDocument();
      expect(screen.getByText(/all size and variant combinations/i)).toBeInTheDocument();
    });

    it("should render icon only card", () => {
      render(<BrandPage />);
      // Multiple "Icon Only" cards exist now
      const iconOnlyCards = screen.getAllByText(/icon only/i);
      expect(iconOnlyCards.length).toBeGreaterThan(0);
    });

    it("should render multiple PixelLogo components", () => {
      render(<BrandPage />);
      const logos = screen.getAllByTestId("pixel-logo");
      expect(logos.length).toBeGreaterThan(0);
    });
  });

  describe("spike land logo section", () => {
    it("should render spike land logo section", () => {
      render(<BrandPage />);
      expect(screen.getByText("Spike Land Logo")).toBeInTheDocument();
    });

    it("should render SpikeLandLogo components", () => {
      render(<BrandPage />);
      const logos = screen.getAllByTestId("spike-land-logo");
      expect(logos.length).toBeGreaterThan(0);
    });
  });

  describe("avatar section", () => {
    it("should render avatar section", () => {
      render(<BrandPage />);
      expect(screen.getByText("Avatar")).toBeInTheDocument();
    });

    it("should render avatar components", () => {
      render(<BrandPage />);
      const avatars = screen.getAllByTestId("avatar");
      expect(avatars.length).toBeGreaterThan(0);
    });

    it("should render avatar fallbacks section", () => {
      render(<BrandPage />);
      expect(screen.getByText("Fallbacks")).toBeInTheDocument();
    });

    it("should render avatar group section", () => {
      render(<BrandPage />);
      expect(screen.getByText("Avatar Group")).toBeInTheDocument();
    });
  });

  describe("badges", () => {
    it("should render size badges", () => {
      render(<BrandPage />);
      expect(screen.getAllByText("sm").length).toBeGreaterThan(0);
      expect(screen.getAllByText("md").length).toBeGreaterThan(0);
      expect(screen.getAllByText("lg").length).toBeGreaterThan(0);
      expect(screen.getAllByText("xl").length).toBeGreaterThan(0);
    });

    it("should render variant badges", () => {
      render(<BrandPage />);
      expect(screen.getAllByText("icon").length).toBeGreaterThan(0);
      expect(screen.getAllByText("horizontal").length).toBeGreaterThan(0);
      expect(screen.getAllByText("stacked").length).toBeGreaterThan(0);
    });
  });
});
