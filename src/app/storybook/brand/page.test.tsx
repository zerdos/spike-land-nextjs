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
  Avatar: (
    { children, className }: { children: React.ReactNode; className?: string; },
  ) => <div data-testid="avatar" className={className}>{children}</div>,
  AvatarImage: ({ src, alt }: { src: string; alt: string; }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: (
    { children, className }: { children: React.ReactNode; className?: string; },
  ) => <span data-testid="avatar-fallback" className={className}>{children}</span>,
}));

import BrandPage from "./page";

describe("BrandPage", () => {
  describe("rendering", () => {
    it("should render the PageHeader with correct title", () => {
      render(<BrandPage />);
      expect(screen.getByText("Brand Identity")).toBeInTheDocument();
    });

    it("should render the section description", () => {
      render(<BrandPage />);
      expect(
        screen.getByText(/The visual core of the spike\.land design system/i),
      ).toBeInTheDocument();
    });
  });

  describe("AI Spark Logo section", () => {
    it("should render sizes section", () => {
      render(<BrandPage />);
      expect(screen.getByText("Sizes & Scale")).toBeInTheDocument();
    });

    it("should render variants section", () => {
      render(<BrandPage />);
      expect(screen.getByText("Structural Variants")).toBeInTheDocument();
    });

    it("should render AI Spark Logo mark", () => {
      render(<BrandPage />);
      expect(screen.getByText("AI Spark Logo")).toBeInTheDocument();
    });
  });

  describe("spike.land platform logo section", () => {
    it("should render platform logo section", () => {
      render(<BrandPage />);
      expect(screen.getByText("spike.land Platform Logo")).toBeInTheDocument();
    });
  });

  describe("user identity section", () => {
    it("should render user identity section", () => {
      render(<BrandPage />);
      expect(screen.getByText("User Identity")).toBeInTheDocument();
    });

    it("should render dynamic sizing samples", () => {
      render(<BrandPage />);
      expect(screen.getByText("Dynamic Sizing")).toBeInTheDocument();
    });

    it("should render fallback states samples", () => {
      render(<BrandPage />);
      expect(screen.getByText("Fallback States")).toBeInTheDocument();
    });
  });
});
