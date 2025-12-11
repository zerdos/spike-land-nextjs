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
    sitemapUrls,
    trackedUrls,
  }: {
    sitemapUrls: string[];
    trackedUrls: string[];
  }) => (
    <div data-testid="sitemap-preview-client">
      <span data-testid="sitemap-urls-count">{sitemapUrls.length}</span>
      <span data-testid="tracked-urls-count">{trackedUrls.length}</span>
    </div>
  ),
}));

const { default: prisma } = await import("@/lib/prisma");

describe("SitemapPreviewPage", () => {
  it("should render the page title", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    expect(screen.getByText("Sitemap Preview")).toBeInTheDocument();
  });

  it("should render the page description", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    expect(
      screen.getByText("Preview all pages in the sitemap with staggered iframe loading."),
    ).toBeInTheDocument();
  });

  it("should render SitemapPreviewClient component", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    expect(screen.getByTestId("sitemap-preview-client")).toBeInTheDocument();
  });

  it("should pass sitemap URLs to client component", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    const result = await SitemapPreviewPage();
    render(result);

    const sitemapCount = screen.getByTestId("sitemap-urls-count");
    expect(parseInt(sitemapCount.textContent || "0")).toBe(22);
  });

  it("should pass tracked URLs from database to client component", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([
      {
        id: "1",
        url: "https://custom.example.com/page",
        label: "Custom Page",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
      },
      {
        id: "2",
        url: "https://another.example.com/page",
        label: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "user-1",
      },
    ]);

    const result = await SitemapPreviewPage();
    render(result);

    const trackedCount = screen.getByTestId("tracked-urls-count");
    expect(parseInt(trackedCount.textContent || "0")).toBe(2);
  });

  it("should query only active tracked URLs ordered by creation date", async () => {
    vi.mocked(prisma.trackedUrl.findMany).mockResolvedValueOnce([]);

    await SitemapPreviewPage();

    expect(prisma.trackedUrl.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  });
});
