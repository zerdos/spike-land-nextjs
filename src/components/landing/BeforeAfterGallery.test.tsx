import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeforeAfterGalleryClient } from "./BeforeAfterGalleryClient";
import { FALLBACK_GALLERY_ITEMS } from "./gallery-fallback-data";

// Mock the ImageComparisonSlider to avoid complexity in tests
vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: (
    { originalUrl, enhancedUrl }: { originalUrl: string; enhancedUrl: string; },
  ) => (
    <div data-testid="comparison-slider" data-original={originalUrl} data-enhanced={enhancedUrl}>
      Mock Slider
    </div>
  ),
}));

describe("BeforeAfterGalleryClient Component", () => {
  it("should render the section heading", () => {
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    expect(screen.getByText("See the Difference")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    expect(screen.getByText(/Drag the slider to compare/)).toBeInTheDocument();
  });

  it("should render category tabs", () => {
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Portrait" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Landscape" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Architecture" })).toBeInTheDocument();
  });

  it("should show all items by default", () => {
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(6);
  });

  it("should filter items when category tab is clicked", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);

    // Click on Portrait tab
    await user.click(screen.getByRole("tab", { name: "Portrait" }));

    // Should show only portrait items (2 portraits in the data)
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(2);
  });

  it("should filter to landscape items", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);

    await user.click(screen.getByRole("tab", { name: "Landscape" }));
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(2);
  });

  it("should filter to product items", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);

    await user.click(screen.getByRole("tab", { name: "Product" }));
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(1);
  });

  it("should filter to architecture items", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);

    await user.click(screen.getByRole("tab", { name: "Architecture" }));
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(1);
  });

  it("should show all items when All tab is clicked after filtering", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);

    // First filter to portraits
    await user.click(screen.getByRole("tab", { name: "Portrait" }));
    expect(screen.getAllByTestId("comparison-slider").length).toBe(2);

    // Then click All
    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getAllByTestId("comparison-slider").length).toBe(6);
  });

  it("should render cards with titles", () => {
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    expect(screen.getByText("Portrait Enhancement")).toBeInTheDocument();
    expect(screen.getByText("Landscape Upscaling")).toBeInTheDocument();
    expect(screen.getByText("Product Photo")).toBeInTheDocument();
  });

  it("should render cards with descriptions", () => {
    render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    expect(screen.getByText("Skin smoothing and detail enhancement")).toBeInTheDocument();
    expect(screen.getByText("4K resolution with enhanced colors")).toBeInTheDocument();
  });

  it("should have the gallery section id", () => {
    const { container } = render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    const section = container.querySelector("#gallery");
    expect(section).toBeInTheDocument();
  });

  it("should have responsive grid classes", () => {
    const { container } = render(<BeforeAfterGalleryClient items={FALLBACK_GALLERY_ITEMS} />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("sm:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-3");
  });

  it("should handle empty items array", () => {
    render(<BeforeAfterGalleryClient items={[]} />);
    expect(screen.getByText("See the Difference")).toBeInTheDocument();
    expect(screen.queryAllByTestId("comparison-slider").length).toBe(0);
  });

  it("should handle custom items", () => {
    const customItems = [
      {
        id: "custom-1",
        title: "Custom Title",
        description: "Custom Description",
        category: "portrait" as const,
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 4,
        height: 3,
      },
    ];
    render(<BeforeAfterGalleryClient items={customItems} />);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Description")).toBeInTheDocument();
  });
});

// Tests for the BeforeAfterGallery server component
describe("BeforeAfterGallery Server Component", () => {
  // Mock getSuperAdminPublicPhotos
  const mockGetSuperAdminPublicPhotos = vi.fn();

  // Mock BeforeAfterGalleryClient for server component tests
  const mockBeforeAfterGalleryClient = vi.fn(({ items }: { items: unknown[]; }) => (
    <div data-testid="gallery-client" data-items-count={items.length}>
      Gallery Client Mock
    </div>
  ));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup mocks before importing the module
    vi.doMock("@/lib/gallery/super-admin-photos", () => ({
      getSuperAdminPublicPhotos: mockGetSuperAdminPublicPhotos,
    }));

    vi.doMock("./BeforeAfterGalleryClient", () => ({
      BeforeAfterGalleryClient: mockBeforeAfterGalleryClient,
    }));
  });

  it("should render with database photos when available", async () => {
    const mockPhotos = [
      {
        id: "photo-1",
        title: "Test Photo",
        originalUrl: "https://example.com/original.jpg",
        enhancedUrl: "https://example.com/enhanced.jpg",
        width: 800,
        height: 1200,
        albumName: "Test Album",
        tier: "TIER_2K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(screen.getByTestId("gallery-client")).toBeInTheDocument();
    expect(mockGetSuperAdminPublicPhotos).toHaveBeenCalled();
  });

  it("should use fallback items when database returns empty array", async () => {
    mockGetSuperAdminPublicPhotos.mockResolvedValue([]);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(screen.getByTestId("gallery-client")).toBeInTheDocument();
    // FALLBACK_GALLERY_ITEMS has 6 items
    expect(screen.getByTestId("gallery-client")).toHaveAttribute("data-items-count", "6");
  });

  it("should use fallback items when database throws error", async () => {
    mockGetSuperAdminPublicPhotos.mockRejectedValue(new Error("Database error"));

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(screen.getByTestId("gallery-client")).toBeInTheDocument();
    expect(screen.getByTestId("gallery-client")).toHaveAttribute("data-items-count", "6");
  });

  it("should infer portrait category for tall images", async () => {
    const mockPhotos = [
      {
        id: "portrait-1",
        title: "Portrait Photo",
        originalUrl: "https://example.com/portrait.jpg",
        enhancedUrl: "https://example.com/portrait-enhanced.jpg",
        width: 600,
        height: 800, // aspectRatio = 0.75 < 0.9 = portrait
        albumName: "Portraits",
        tier: "TIER_1K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(mockBeforeAfterGalleryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            category: "portrait",
          }),
        ]),
      }),
      undefined,
    );
  });

  it("should infer product category for square images", async () => {
    const mockPhotos = [
      {
        id: "product-1",
        title: "Product Photo",
        originalUrl: "https://example.com/product.jpg",
        enhancedUrl: "https://example.com/product-enhanced.jpg",
        width: 1000,
        height: 1000, // aspectRatio = 1.0, between 0.9 and 1.1 = product
        albumName: "Products",
        tier: "TIER_2K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(mockBeforeAfterGalleryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            category: "product",
          }),
        ]),
      }),
      undefined,
    );
  });

  it("should infer landscape category for wide images", async () => {
    const mockPhotos = [
      {
        id: "landscape-1",
        title: "Landscape Photo",
        originalUrl: "https://example.com/landscape.jpg",
        enhancedUrl: "https://example.com/landscape-enhanced.jpg",
        width: 1920,
        height: 1080, // aspectRatio = 1.78 > 1.5 = landscape
        albumName: "Landscapes",
        tier: "TIER_4K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(mockBeforeAfterGalleryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            category: "landscape",
          }),
        ]),
      }),
      undefined,
    );
  });

  it("should infer architecture category for moderate aspect ratio images", async () => {
    const mockPhotos = [
      {
        id: "arch-1",
        title: "Architecture Photo",
        originalUrl: "https://example.com/arch.jpg",
        enhancedUrl: "https://example.com/arch-enhanced.jpg",
        width: 1200,
        height: 1000, // aspectRatio = 1.2, between 1.1 and 1.5 = architecture (default)
        albumName: "Architecture",
        tier: "TIER_2K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(mockBeforeAfterGalleryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            category: "architecture",
          }),
        ]),
      }),
      undefined,
    );
  });

  it("should correctly map photo data to gallery items", async () => {
    const mockPhotos = [
      {
        id: "mapped-1",
        title: "Mapped Photo Title",
        originalUrl: "https://example.com/mapped-original.jpg",
        enhancedUrl: "https://example.com/mapped-enhanced.jpg",
        width: 1920,
        height: 1080,
        albumName: "Test Album",
        tier: "TIER_4K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(mockBeforeAfterGalleryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "mapped-1",
            title: "Mapped Photo Title",
            description: "Enhanced with TIER_4K from Test Album",
            originalUrl: "https://example.com/mapped-original.jpg",
            enhancedUrl: "https://example.com/mapped-enhanced.jpg",
            width: 1920,
            height: 1080,
          }),
        ]),
      }),
      undefined,
    );
  });

  it("should handle product category edge case at 0.9 aspect ratio", async () => {
    const mockPhotos = [
      {
        id: "edge-1",
        title: "Edge Case Photo",
        originalUrl: "https://example.com/edge.jpg",
        enhancedUrl: "https://example.com/edge-enhanced.jpg",
        width: 900,
        height: 1000, // aspectRatio = 0.9 = product (not portrait)
        albumName: "Edge Cases",
        tier: "TIER_1K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(mockBeforeAfterGalleryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            category: "product",
          }),
        ]),
      }),
      undefined,
    );
  });

  it("should handle product category edge case at 1.1 aspect ratio", async () => {
    const mockPhotos = [
      {
        id: "edge-2",
        title: "Edge Case Photo 2",
        originalUrl: "https://example.com/edge2.jpg",
        enhancedUrl: "https://example.com/edge2-enhanced.jpg",
        width: 1100,
        height: 1000, // aspectRatio = 1.1 = product (not architecture)
        albumName: "Edge Cases",
        tier: "TIER_1K",
      },
    ];
    mockGetSuperAdminPublicPhotos.mockResolvedValue(mockPhotos);

    const { BeforeAfterGallery } = await import("./BeforeAfterGallery");
    const Component = await BeforeAfterGallery();
    render(Component);

    expect(mockBeforeAfterGalleryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            category: "product",
          }),
        ]),
      }),
      undefined,
    );
  });
});
