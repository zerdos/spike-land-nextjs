import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/cache - unstable_cache should pass through the function
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock getSuperAdminPublicPhotos
vi.mock("@/lib/gallery/super-admin-photos", () => ({
  getSuperAdminPublicPhotos: vi.fn(),
}));

// Mock HeroSection
vi.mock("./HeroSection", () => ({
  HeroSection: ({
    originalUrl,
    enhancedUrl,
  }: {
    originalUrl?: string;
    enhancedUrl?: string;
  }) => (
    <div
      data-testid="hero-section"
      data-original={originalUrl}
      data-enhanced={enhancedUrl}
    >
      Hero Section
    </div>
  ),
}));

import { getSuperAdminPublicPhotos } from "@/lib/gallery/super-admin-photos";
import type { EnhancementTier } from "@/types/enhancement";

// Need to import after mocks are set up
const { HeroSectionWithData } = await import("./HeroSectionWithData");

describe("HeroSectionWithData Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render HeroSection with database URLs when available", async () => {
    const mockPhoto = {
      id: "photo-1",
      title: "Test Photo",
      originalUrl: "https://example.com/db-original.jpg",
      enhancedUrl: "https://example.com/db-enhanced.jpg",
      width: 2000,
      height: 1500,
      albumName: "Test Album",
      tier: "TIER_2K" as EnhancementTier,
    };
    vi.mocked(getSuperAdminPublicPhotos).mockResolvedValue([mockPhoto]);

    const Component = await HeroSectionWithData();
    render(Component);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).toHaveAttribute(
      "data-original",
      "https://example.com/db-original.jpg",
    );
    expect(heroSection).toHaveAttribute(
      "data-enhanced",
      "https://example.com/db-enhanced.jpg",
    );
  });

  it("should render HeroSection with undefined URLs when no photos exist", async () => {
    vi.mocked(getSuperAdminPublicPhotos).mockResolvedValue([]);

    const Component = await HeroSectionWithData();
    render(Component);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).not.toHaveAttribute("data-original");
    expect(heroSection).not.toHaveAttribute("data-enhanced");
  });

  it("should render HeroSection with undefined URLs when database fails", async () => {
    vi.mocked(getSuperAdminPublicPhotos).mockRejectedValue(
      new Error("Database error"),
    );

    const Component = await HeroSectionWithData();
    render(Component);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).not.toHaveAttribute("data-original");
    expect(heroSection).not.toHaveAttribute("data-enhanced");
  });

  it("should request only 1 photo from getSuperAdminPublicPhotos", async () => {
    vi.mocked(getSuperAdminPublicPhotos).mockResolvedValue([]);

    await HeroSectionWithData();

    expect(getSuperAdminPublicPhotos).toHaveBeenCalledWith(1);
  });
});
