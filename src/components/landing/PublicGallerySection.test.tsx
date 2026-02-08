import type { PublicPhoto } from "@/lib/gallery/public-photos";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicGallerySection } from "./PublicGallerySection";

vi.mock("@/components/orbit-landing/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    // eslint-disable-next-line @next/next/no-img-element
    (<img src={src} alt={alt} />),
}));

const mockPhotos: PublicPhoto[] = [
  {
    id: "p1",
    name: "Sunset",
    originalUrl: "https://example.com/sunset.jpg",
    enhancedUrl: "https://example.com/sunset-enhanced.jpg",
    width: 1920,
    height: 1080,
  },
  {
    id: "p2",
    name: "Mountain",
    originalUrl: "https://example.com/mountain.jpg",
    enhancedUrl: null,
    width: 1920,
    height: 1080,
  },
];

describe("PublicGallerySection", () => {
  it("renders the section heading", () => {
    render(<PublicGallerySection photos={mockPhotos} />);
    expect(screen.getByText(/Enhanced with/)).toBeInTheDocument();
    expect(screen.getByText("Pixel")).toBeInTheDocument();
  });

  it("renders images using enhanced URL when available", () => {
    render(<PublicGallerySection photos={mockPhotos} />);
    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute(
      "src",
      "https://example.com/sunset-enhanced.jpg",
    );
  });

  it("falls back to original URL when enhanced is null", () => {
    render(<PublicGallerySection photos={mockPhotos} />);
    const images = screen.getAllByRole("img");
    expect(images[1]).toHaveAttribute(
      "src",
      "https://example.com/mountain.jpg",
    );
  });

  it("renders photo names", () => {
    render(<PublicGallerySection photos={mockPhotos} />);
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText("Mountain")).toBeInTheDocument();
  });

  it("renders Try Pixel link", () => {
    render(<PublicGallerySection photos={mockPhotos} />);
    const link = screen.getByRole("link", { name: /try pixel/i });
    expect(link).toHaveAttribute("href", "/pixel");
  });

  it("renders nothing when photos array is empty", () => {
    const { container } = render(<PublicGallerySection photos={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the Pixel Gallery badge", () => {
    render(<PublicGallerySection photos={mockPhotos} />);
    expect(screen.getByText("Pixel Gallery")).toBeInTheDocument();
  });
});
