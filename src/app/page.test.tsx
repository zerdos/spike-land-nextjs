import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

vi.mock("@/lib/landing/showcase-feed", () => ({
  getLatestShowcaseApps: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/gallery/public-photos", () => ({
  getRecentPublicPhotos: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/landing/creation-stats", () => ({
  getCreationStats: vi.fn().mockResolvedValue({ appsCreated: 10, creatorCount: 5 }),
}));

vi.mock("@/components/landing/LandingHero", () => ({
  LandingHero: () => <div data-testid="landing-hero">LandingHero</div>,
}));

vi.mock("@/components/landing/AppShowcaseSection", () => ({
  AppShowcaseSection: () => <div data-testid="app-showcase-section">AppShowcaseSection</div>,
}));

vi.mock("@/components/landing/PublicGallerySection", () => ({
  PublicGallerySection: () => <div data-testid="public-gallery-section">PublicGallerySection</div>,
}));

vi.mock("@/components/landing/PhotoMixDemo", () => ({
  PhotoMixDemo: () => <div data-testid="photo-mix-demo">PhotoMixDemo</div>,
}));

vi.mock("@/components/orbit-landing", () => ({
  BlogPreviewSection: () => <div data-testid="blog-preview-section">BlogPreviewSection</div>,
}));

vi.mock("@/components/landing/CreateCTASection", () => ({
  CreateCTASection: () => <div data-testid="create-cta-section">CreateCTASection</div>,
}));

vi.mock("@/components/seo/LandingPageStructuredData", () => ({
  LandingPageStructuredData: () => <div data-testid="structured-data">StructuredData</div>,
}));

describe("Home Page", () => {
  it("should render all sections", async () => {
    render(await Home());

    expect(screen.getByTestId("structured-data")).toBeInTheDocument();
    expect(screen.getByTestId("landing-hero")).toBeInTheDocument();
    expect(screen.getByTestId("app-showcase-section")).toBeInTheDocument();
    expect(screen.getByTestId("public-gallery-section")).toBeInTheDocument();
    expect(screen.getByTestId("photo-mix-demo")).toBeInTheDocument();
    expect(screen.getByTestId("blog-preview-section")).toBeInTheDocument();
    expect(screen.getByTestId("create-cta-section")).toBeInTheDocument();
  });

  it("should render gracefully when database fails", async () => {
    const { getLatestShowcaseApps } = await import("@/lib/landing/showcase-feed");
    const { getRecentPublicPhotos } = await import("@/lib/gallery/public-photos");

    vi.mocked(getLatestShowcaseApps).mockRejectedValueOnce(new Error("DB connection failed"));
    vi.mocked(getRecentPublicPhotos).mockRejectedValueOnce(new Error("DB connection failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(await Home());
    consoleSpy.mockRestore();

    expect(screen.getByTestId("structured-data")).toBeInTheDocument();
    expect(screen.getByTestId("landing-hero")).toBeInTheDocument();
    expect(screen.getByTestId("app-showcase-section")).toBeInTheDocument();
    expect(screen.getByTestId("public-gallery-section")).toBeInTheDocument();
  });
});
