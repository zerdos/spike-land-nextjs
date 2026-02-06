import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssetCard } from "./AssetCard";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AssetCard", () => {
  const mockAsset = {
    id: "asset-1",
    workspaceId: "ws-1",
    folderId: null,
    filename: "test-image.jpg",
    fileType: "image/jpeg",
    sizeBytes: 1024,
    width: 800,
    height: 600,
    duration: null,
    url: "https://example.com/image.jpg",
    altText: "Test Image",
    qualityScore: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    usage: { posts: 0, scheduledPosts: 0, total: 0 },
  };

  it("renders with correct accessibility attributes", () => {
    render(<AssetCard asset={mockAsset} />);

    // Check for "More options" button aria-label
    const moreOptionsButton = screen.getByLabelText("More options");
    expect(moreOptionsButton).toBeInTheDocument();

    // Check for "Preview" button text (it has icon but also text)
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("has focus-within class on the overlay", () => {
    const { container } = render(<AssetCard asset={mockAsset} />);

    // Find the overlay div
    // We can look for the div containing the "Preview" button
    const previewButton = screen.getByText("Preview");
    const overlay = previewButton.closest("div");

    expect(overlay).toHaveClass("focus-within:opacity-100");
  });
});
