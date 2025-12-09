import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/cache - unstable_cache should pass through the function
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    featuredGalleryItem: {
      findFirst: vi.fn(),
    },
  },
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

import prisma from "@/lib/prisma";

// Need to import after mocks are set up
const { HeroSectionWithData } = await import("./HeroSectionWithData");

describe("HeroSectionWithData Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render HeroSection with database URLs when available", async () => {
    const mockItem = {
      originalUrl: "https://example.com/db-original.jpg",
      enhancedUrl: "https://example.com/db-enhanced.jpg",
    };
    vi.mocked(prisma.featuredGalleryItem.findFirst).mockResolvedValue(mockItem);

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

  it("should render HeroSection with undefined URLs when no items exist", async () => {
    vi.mocked(prisma.featuredGalleryItem.findFirst).mockResolvedValue(null);

    const Component = await HeroSectionWithData();
    render(Component);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).not.toHaveAttribute("data-original");
    expect(heroSection).not.toHaveAttribute("data-enhanced");
  });

  it("should render HeroSection with undefined URLs when database fails", async () => {
    vi.mocked(prisma.featuredGalleryItem.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const Component = await HeroSectionWithData();
    render(Component);

    const heroSection = screen.getByTestId("hero-section");
    expect(heroSection).not.toHaveAttribute("data-original");
    expect(heroSection).not.toHaveAttribute("data-enhanced");
  });

  it("should query for active items sorted by sortOrder", async () => {
    vi.mocked(prisma.featuredGalleryItem.findFirst).mockResolvedValue(null);

    await HeroSectionWithData();

    expect(prisma.featuredGalleryItem.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        originalUrl: true,
        enhancedUrl: true,
      },
    });
  });
});
