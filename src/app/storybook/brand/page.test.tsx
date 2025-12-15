import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock PixelLogo component
vi.mock("@/components/brand", () => ({
  PixelLogo: ({ size, variant }: { size?: string; variant?: string; }) => (
    <div data-testid="pixel-logo" data-size={size} data-variant={variant}>
      PixelLogo
    </div>
  ),
}));

import BrandPage from "./page";

describe("BrandPage", () => {
  describe("rendering", () => {
    it("should render the section title", () => {
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

  describe("logo sections", () => {
    it("should render sizes card", () => {
      render(<BrandPage />);
      expect(screen.getByText("Sizes")).toBeInTheDocument();
      expect(screen.getByText(/available logo sizes for different contexts/i)).toBeInTheDocument();
    });

    it("should render variants card", () => {
      render(<BrandPage />);
      expect(screen.getByText("Variants")).toBeInTheDocument();
      expect(screen.getByText(/different layout options for the logo/i)).toBeInTheDocument();
    });

    it("should render complete matrix card", () => {
      render(<BrandPage />);
      expect(screen.getByText("Complete Matrix")).toBeInTheDocument();
      expect(screen.getByText(/all size and variant combinations/i)).toBeInTheDocument();
    });

    it("should render icon only card", () => {
      render(<BrandPage />);
      expect(screen.getByText(/icon only/i)).toBeInTheDocument();
      expect(screen.getByText(/logo without wordmark for compact spaces/i)).toBeInTheDocument();
    });

    it("should render multiple PixelLogo components", () => {
      render(<BrandPage />);
      const logos = screen.getAllByTestId("pixel-logo");
      expect(logos.length).toBeGreaterThan(0);
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
