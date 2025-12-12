/**
 * Tests for Sitemap Preview Admin Page
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SitemapPreviewPage from "./page";

vi.mock("@/lib/prisma", () => ({
  default: {
    trackedUrl: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => {
        if (name === "host") return "localhost:3000";
        if (name === "x-forwarded-proto") return "http";
        return null;
      },
    })
  ),
}));

vi.mock("./SitemapPreviewClient", () => ({
  SitemapPreviewClient: ({
    sitemapPaths,
    trackedPaths,
    origin,
  }: {
    sitemapPaths: string[];
    trackedPaths: { id: string; path: string; }[];
    origin: string;
  }) => (
    <div data-testid="sitemap-preview-client">
      <span data-testid="sitemap-paths-count">{sitemapPaths.length}</span>
      <span data-testid="tracked-paths-count">{trackedPaths.length}</span>
      <span data-testid="origin">{origin}</span>
    </div>
  ),
}));

const { default: prisma } = await import("@/lib/prisma");

describe("SitemapPreviewPage", () => {
  it("should render the page title", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    expect(screen.getByText("Application Monitor")).toBeInTheDocument();
  });

  it("should render the page description", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    expect(
      screen.getByText(
        /Visual site monitor\. Staggered loading active\. Spot-check page rendering and JS errors\./,
      ),
    ).toBeInTheDocument();
  });

  it("should render SitemapPreviewClient component", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    expect(screen.getByTestId("sitemap-preview-client")).toBeInTheDocument();
  });

  it("should pass sitemap paths to client component", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    const sitemapCount = screen.getByTestId("sitemap-paths-count");
    expect(parseInt(sitemapCount.textContent || "0")).toBe(20);
  });

  it("should pass tracked paths from database to client component", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([
      {
        id: "1",
        path: "/custom-page",
        label: "Custom Page",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
      },
      {
        id: "2",
        path: "/another-page",
        label: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
      },
    ]);

    const result = await SitemapPreviewPage();
    render(result);

    const trackedCount = screen.getByTestId("tracked-paths-count");
    expect(parseInt(trackedCount.textContent || "0")).toBe(2);
  });

  it("should query all tracked paths ordered by creation date", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    await SitemapPreviewPage();

    expect(prisma.trackedUrl.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("should pass the correct origin to client component", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    const origin = screen.getByTestId("origin");
    expect(origin.textContent).toBe("http://localhost:3000");
  });
});
