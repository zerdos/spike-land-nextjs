import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlbumsGrid, type AlbumsGridProps } from "./AlbumsGrid";

vi.mock("next/image", () => ({
  default: (
    { src, alt, ...props }: {
      src: string;
      alt: string;
      [key: string]: unknown;
    },
  ) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: (
    { href, children, ...props }: {
      href: string;
      children: React.ReactNode;
      [key: string]: unknown;
    },
  ) => (
    <a href={href} data-testid="next-link" {...props}>
      {children}
    </a>
  ),
}));

describe("AlbumsGrid", () => {
  const mockAlbums: AlbumsGridProps["albums"] = [
    {
      id: "album-1",
      name: "Vacation Photos",
      description: "Summer 2024 vacation",
      privacy: "PRIVATE",
      coverImageId: null,
      imageCount: 24,
      previewImages: [
        { id: "img-1", url: "https://example.com/img1.jpg", name: "Beach" },
        { id: "img-2", url: "https://example.com/img2.jpg", name: "Sunset" },
        { id: "img-3", url: "https://example.com/img3.jpg", name: "Mountains" },
        { id: "img-4", url: "https://example.com/img4.jpg", name: "Forest" },
      ],
      createdAt: new Date("2024-06-15"),
    },
    {
      id: "album-2",
      name: "Family",
      description: null,
      privacy: "UNLISTED",
      coverImageId: "img-5",
      imageCount: 1,
      previewImages: [
        { id: "img-5", url: "https://example.com/img5.jpg", name: "Portrait" },
      ],
      createdAt: new Date("2024-07-20"),
    },
    {
      id: "album-3",
      name: "Public Gallery",
      description: "My best shots",
      privacy: "PUBLIC",
      coverImageId: null,
      imageCount: 0,
      previewImages: [],
      createdAt: new Date("2024-08-01"),
    },
  ];

  it("renders empty state when no albums", () => {
    render(<AlbumsGrid albums={[]} />);

    expect(
      screen.getByText(
        "No albums yet. Create your first album to organize your images.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all albums with correct names", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    expect(screen.getByText("Vacation Photos")).toBeInTheDocument();
    expect(screen.getByText("Family")).toBeInTheDocument();
    expect(screen.getByText("Public Gallery")).toBeInTheDocument();
  });

  it("renders image counts correctly", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    expect(screen.getByText("24 images")).toBeInTheDocument();
    expect(screen.getByText("1 image")).toBeInTheDocument();
    expect(screen.getByText("0 images")).toBeInTheDocument();
  });

  it("renders privacy badges for private albums", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("renders privacy badges for unlisted albums", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    expect(screen.getByText("Unlisted")).toBeInTheDocument();
  });

  it("renders privacy badges for public albums", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("renders mosaic preview with 4 images", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    const images = screen.getAllByTestId("next-image");
    expect(images.length).toBeGreaterThanOrEqual(4);
  });

  it("renders empty state icon when album has no images", () => {
    const emptyAlbum = mockAlbums.find((a) => a.imageCount === 0);
    expect(emptyAlbum).toBeDefined();

    render(<AlbumsGrid albums={[emptyAlbum!]} />);

    expect(screen.queryByTestId("next-image")).not.toBeInTheDocument();
  });

  it("renders albums as non-clickable divs when no onAlbumClick", () => {
    const { container } = render(<AlbumsGrid albums={mockAlbums} />);

    // Albums are display-only without onAlbumClick - verify they render as divs not links
    const links = screen.queryAllByTestId("next-link");
    expect(links).toHaveLength(0);

    // Should have 3 album cards rendered as divs
    const albumCards = container.querySelectorAll("[class*='block']");
    expect(albumCards.length).toBe(3);
  });

  it("calls onAlbumClick when provided and album is clicked", () => {
    const mockOnAlbumClick = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onAlbumClick={mockOnAlbumClick} />);

    const albumCard = screen.getByText("Vacation Photos").closest(
      "div[class*='block']",
    );
    fireEvent.click(albumCard!);

    expect(mockOnAlbumClick).toHaveBeenCalledWith("album-1");
  });

  it("prevents default when onAlbumClick is provided", () => {
    const mockOnAlbumClick = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onAlbumClick={mockOnAlbumClick} />);

    const albumCard = screen.getByText("Vacation Photos").closest(
      "div[class*='block']",
    );
    const clickEvent = new MouseEvent("click", { bubbles: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, "preventDefault");

    albumCard!.dispatchEvent(clickEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("applies drag-over styles when dragging over album", () => {
    render(<AlbumsGrid albums={mockAlbums} dragOverAlbumId="album-1" />);

    const cards = document.querySelectorAll("[class*='ring-2']");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("calls onDragOver when dragging over album", () => {
    const mockOnDragOver = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onDragOver={mockOnDragOver} />);

    const card = screen.getByText("Vacation Photos").closest(
      "[class*='overflow-hidden']",
    );
    fireEvent.dragOver(card!);

    expect(mockOnDragOver).toHaveBeenCalledWith("album-1");
  });

  it("calls onDragLeave when dragging leaves album", () => {
    const mockOnDragLeave = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onDragLeave={mockOnDragLeave} />);

    const card = screen.getByText("Vacation Photos").closest(
      "[class*='overflow-hidden']",
    );
    fireEvent.dragLeave(card!);

    expect(mockOnDragLeave).toHaveBeenCalled();
  });

  it("calls onDrop when dropping on album", () => {
    const mockOnDrop = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onDrop={mockOnDrop} />);

    const card = screen.getByText("Vacation Photos").closest(
      "[class*='overflow-hidden']",
    );
    fireEvent.drop(card!);

    expect(mockOnDrop).toHaveBeenCalledWith("album-1");
  });

  it("renders grid with correct responsive classes", () => {
    const { container } = render(<AlbumsGrid albums={mockAlbums} />);

    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("md:grid-cols-3");
    expect(grid).toHaveClass("lg:grid-cols-4");
    expect(grid).toHaveClass("xl:grid-cols-5");
    expect(grid).toHaveClass("gap-4");
  });

  it("renders single image mosaic correctly", () => {
    const singleImageAlbum = mockAlbums.find((a) => a.previewImages.length === 1);
    render(<AlbumsGrid albums={[singleImageAlbum!]} />);

    const images = screen.getAllByTestId("next-image");
    expect(images).toHaveLength(1);
  });

  it("renders two image mosaic correctly", () => {
    const twoImageAlbum = {
      ...mockAlbums[0],
      id: "two-img-album",
      previewImages: mockAlbums[0].previewImages.slice(0, 2),
    };

    render(<AlbumsGrid albums={[twoImageAlbum]} />);

    const images = screen.getAllByTestId("next-image");
    expect(images).toHaveLength(2);
  });

  it("renders three image mosaic correctly", () => {
    const threeImageAlbum = {
      ...mockAlbums[0],
      id: "three-img-album",
      previewImages: mockAlbums[0].previewImages.slice(0, 3),
    };

    render(<AlbumsGrid albums={[threeImageAlbum]} />);

    const images = screen.getAllByTestId("next-image");
    expect(images).toHaveLength(3);
  });

  it("limits mosaic to 4 images maximum", () => {
    const manyImagesAlbum = {
      ...mockAlbums[0],
      previewImages: [
        ...mockAlbums[0].previewImages,
        { id: "img-5", url: "https://example.com/img5.jpg", name: "Extra1" },
        { id: "img-6", url: "https://example.com/img6.jpg", name: "Extra2" },
      ],
    };

    render(<AlbumsGrid albums={[manyImagesAlbum]} />);

    const images = screen.getAllByTestId("next-image");
    expect(images).toHaveLength(4);
  });

  it("truncates long album names with line-clamp", () => {
    const longNameAlbum = {
      ...mockAlbums[0],
      name: "This is a very long album name that should be truncated when displayed",
    };

    render(<AlbumsGrid albums={[longNameAlbum]} />);

    const nameElement = screen.getByText(longNameAlbum.name);
    expect(nameElement).toHaveClass("line-clamp-1");
  });

  it("does not render links when onAlbumClick is provided", () => {
    const mockOnAlbumClick = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onAlbumClick={mockOnAlbumClick} />);

    const links = screen.queryAllByTestId("next-link");
    expect(links).toHaveLength(0);
  });

  it("stops propagation on drag events", () => {
    const mockOnDragOver = vi.fn();
    const mockOnDrop = vi.fn();
    const mockOnDragLeave = vi.fn();

    render(
      <AlbumsGrid
        albums={mockAlbums}
        onDragOver={mockOnDragOver}
        onDrop={mockOnDrop}
        onDragLeave={mockOnDragLeave}
      />,
    );

    const card = screen.getByText("Vacation Photos").closest(
      "[class*='overflow-hidden']",
    );

    const dragOverEvent = new Event("dragover", { bubbles: true });
    const stopPropagationSpy = vi.spyOn(dragOverEvent, "stopPropagation");
    card!.dispatchEvent(dragOverEvent);
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it("uses correct image alt text", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    const images = screen.getAllByTestId("next-image");
    const beachImage = images.find((img) => img.getAttribute("alt") === "Beach");
    expect(beachImage).toBeInTheDocument();
  });

  it("falls back to 'Album image' when image name is empty", () => {
    const albumWithEmptyName = {
      ...mockAlbums[0],
      previewImages: [{
        id: "img-1",
        url: "https://example.com/img1.jpg",
        name: "",
      }],
    };

    render(<AlbumsGrid albums={[albumWithEmptyName]} />);

    const image = screen.getByTestId("next-image");
    expect(image.getAttribute("alt")).toBe("Album image");
  });

  it("does not call onDragOver when handler is not provided", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    const card = screen.getByText("Vacation Photos").closest(
      "[class*='overflow-hidden']",
    );
    // Should not throw when dragging without handler
    expect(() => fireEvent.dragOver(card!)).not.toThrow();
  });

  it("does not call onDragLeave when handler is not provided", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    const card = screen.getByText("Vacation Photos").closest(
      "[class*='overflow-hidden']",
    );
    // Should not throw when leaving without handler
    expect(() => fireEvent.dragLeave(card!)).not.toThrow();
  });

  it("does not call onDrop when handler is not provided", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    const card = screen.getByText("Vacation Photos").closest(
      "[class*='overflow-hidden']",
    );
    // Should not throw when dropping without handler
    expect(() => fireEvent.drop(card!)).not.toThrow();
  });

  it("does not call onClick when onAlbumClick is not provided", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    const albumCard = screen.getByText("Vacation Photos").closest(
      "div[class*='block']",
    );
    // Should not throw when clicking without handler
    expect(() => fireEvent.click(albumCard!)).not.toThrow();
  });

  it("does not apply cursor-pointer class when onAlbumClick is not provided", () => {
    const { container } = render(<AlbumsGrid albums={mockAlbums} />);

    const albumCards = container.querySelectorAll(".block");
    albumCards.forEach((card) => {
      expect(card.classList.contains("cursor-pointer")).toBe(false);
    });
  });

  it("applies cursor-pointer class when onAlbumClick is provided", () => {
    const mockOnAlbumClick = vi.fn();
    const { container } = render(
      <AlbumsGrid albums={mockAlbums} onAlbumClick={mockOnAlbumClick} />,
    );

    const albumCards = container.querySelectorAll(".cursor-pointer");
    expect(albumCards.length).toBeGreaterThan(0);
  });

  it("does not apply drag-over styles when dragOverAlbumId is null", () => {
    const { container } = render(
      <AlbumsGrid albums={mockAlbums} dragOverAlbumId={null} />,
    );

    // Check that no Card elements have the ring-primary class (drag-over style)
    const cardsWithRing = container.querySelectorAll(".ring-primary");
    expect(cardsWithRing.length).toBe(0);
  });

  it("does not apply drag-over styles when dragOverAlbumId does not match any album", () => {
    const { container } = render(
      <AlbumsGrid albums={mockAlbums} dragOverAlbumId="non-existent-id" />,
    );

    // Check that no Card elements have the ring-primary class (drag-over style)
    const cardsWithRing = container.querySelectorAll(".ring-primary");
    expect(cardsWithRing.length).toBe(0);
  });

  it("renders mosaic with 4 images without special layout classes", () => {
    const fourImageAlbum = {
      ...mockAlbums[0],
      id: "four-img-album",
      previewImages: mockAlbums[0].previewImages.slice(0, 4),
    };

    const { container } = render(<AlbumsGrid albums={[fourImageAlbum]} />);

    // With 4 images, no special classes like col-span-2 or row-span-2 should be applied
    const images = screen.getAllByTestId("next-image");
    expect(images).toHaveLength(4);

    // Get the mosaic grid container and check its direct children
    const mosaicGrid = container.querySelector(".grid.grid-cols-2.gap-0\\.5");
    expect(mosaicGrid).toBeTruthy();

    // For 4 images, none should have col-span-2 or row-span-2
    const imageContainers = mosaicGrid!.querySelectorAll(":scope > .relative");
    expect(imageContainers.length).toBe(4);
    imageContainers.forEach((imgContainer) => {
      expect(imgContainer.classList.contains("col-span-2")).toBe(false);
      expect(imgContainer.classList.contains("row-span-2")).toBe(false);
    });
  });

  it("renders first image with row-span-2 when album has exactly 3 images", () => {
    const threeImageAlbum = {
      ...mockAlbums[0],
      id: "three-img-album",
      previewImages: mockAlbums[0].previewImages.slice(0, 3),
    };

    const { container } = render(<AlbumsGrid albums={[threeImageAlbum]} />);

    // Find the mosaic grid (grid-cols-2 with gap-0.5)
    const mosaicGrid = container.querySelector(".grid.grid-cols-2.gap-0\\.5");
    expect(mosaicGrid).toBeTruthy();

    const imageContainers = mosaicGrid!.querySelectorAll(":scope > .relative");
    expect(imageContainers.length).toBe(3);
    // First container should have row-span-2
    expect(imageContainers[0].classList.contains("row-span-2")).toBe(true);
  });

  it("renders images with row-span-2 when album has exactly 2 images", () => {
    const twoImageAlbum = {
      ...mockAlbums[0],
      id: "two-img-album",
      previewImages: mockAlbums[0].previewImages.slice(0, 2),
    };

    const { container } = render(<AlbumsGrid albums={[twoImageAlbum]} />);

    const mosaicGrid = container.querySelector(".grid.grid-cols-2.gap-0\\.5");
    expect(mosaicGrid).toBeTruthy();

    const imageContainers = mosaicGrid!.querySelectorAll(":scope > .relative");
    expect(imageContainers.length).toBe(2);
    // Both containers should have row-span-2
    expect(imageContainers[0].classList.contains("row-span-2")).toBe(true);
    expect(imageContainers[1].classList.contains("row-span-2")).toBe(true);
  });

  it("renders single image with col-span-2 and row-span-2", () => {
    const singleImageAlbum = {
      ...mockAlbums[0],
      id: "single-img-album",
      previewImages: [mockAlbums[0].previewImages[0]],
    };

    const { container } = render(<AlbumsGrid albums={[singleImageAlbum]} />);

    const mosaicGrid = container.querySelector(".grid.grid-cols-2.gap-0\\.5");
    expect(mosaicGrid).toBeTruthy();

    const imageContainers = mosaicGrid!.querySelectorAll(":scope > .relative");
    expect(imageContainers.length).toBe(1);
    // Single image container should have both col-span-2 and row-span-2
    expect(imageContainers[0].classList.contains("col-span-2")).toBe(true);
    expect(imageContainers[0].classList.contains("row-span-2")).toBe(true);
  });

  it("verifies non-first images in 3-image mosaic do not have row-span-2", () => {
    const threeImageAlbum = {
      ...mockAlbums[0],
      id: "three-img-album",
      previewImages: mockAlbums[0].previewImages.slice(0, 3),
    };

    const { container } = render(<AlbumsGrid albums={[threeImageAlbum]} />);

    const mosaicGrid = container.querySelector(".grid.grid-cols-2.gap-0\\.5");
    expect(mosaicGrid).toBeTruthy();

    const imageContainers = mosaicGrid!.querySelectorAll(":scope > .relative");
    expect(imageContainers.length).toBe(3);
    // Second and third containers should NOT have row-span-2 (only first does for 3 images)
    expect(imageContainers[1].classList.contains("row-span-2")).toBe(false);
    expect(imageContainers[2].classList.contains("row-span-2")).toBe(false);
  });

  describe("file drop functionality", () => {
    it("calls onFileDrop when image files are dropped on album", () => {
      const mockOnFileDrop = vi.fn();
      render(<AlbumsGrid albums={mockAlbums} onFileDrop={mockOnFileDrop} />);

      const card = screen.getByText("Vacation Photos").closest(
        "[class*='overflow-hidden']",
      );

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const dataTransfer = {
        files: [file],
      };

      fireEvent.drop(card!, { dataTransfer });

      expect(mockOnFileDrop).toHaveBeenCalledWith("album-1", [file]);
    });

    it("calls onFileDrop with multiple files when multiple images are dropped", () => {
      const mockOnFileDrop = vi.fn();
      render(<AlbumsGrid albums={mockAlbums} onFileDrop={mockOnFileDrop} />);

      const card = screen.getByText("Vacation Photos").closest(
        "[class*='overflow-hidden']",
      );

      const file1 = new File(["content1"], "test1.jpg", { type: "image/jpeg" });
      const file2 = new File(["content2"], "test2.png", { type: "image/png" });
      const dataTransfer = {
        files: [file1, file2],
      };

      fireEvent.drop(card!, { dataTransfer });

      expect(mockOnFileDrop).toHaveBeenCalledWith("album-1", [file1, file2]);
    });

    it("filters out non-image files when dropping", () => {
      const mockOnFileDrop = vi.fn();
      const mockOnDrop = vi.fn();
      render(
        <AlbumsGrid
          albums={mockAlbums}
          onFileDrop={mockOnFileDrop}
          onDrop={mockOnDrop}
        />,
      );

      const card = screen.getByText("Vacation Photos").closest(
        "[class*='overflow-hidden']",
      );

      const imageFile = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });
      const textFile = new File(["content"], "test.txt", {
        type: "text/plain",
      });
      const dataTransfer = {
        files: [imageFile, textFile],
      };

      fireEvent.drop(card!, { dataTransfer });

      // Only the image file should be included
      expect(mockOnFileDrop).toHaveBeenCalledWith("album-1", [imageFile]);
      // onDrop should not be called since we had image files
      expect(mockOnDrop).not.toHaveBeenCalled();
    });

    it("calls onDrop instead of onFileDrop when only non-image files are dropped", () => {
      const mockOnFileDrop = vi.fn();
      const mockOnDrop = vi.fn();
      render(
        <AlbumsGrid
          albums={mockAlbums}
          onFileDrop={mockOnFileDrop}
          onDrop={mockOnDrop}
        />,
      );

      const card = screen.getByText("Vacation Photos").closest(
        "[class*='overflow-hidden']",
      );

      const textFile = new File(["content"], "test.txt", {
        type: "text/plain",
      });
      const dataTransfer = {
        files: [textFile],
      };

      fireEvent.drop(card!, { dataTransfer });

      // onFileDrop should not be called (no image files)
      expect(mockOnFileDrop).not.toHaveBeenCalled();
      // onDrop should be called as fallback
      expect(mockOnDrop).toHaveBeenCalledWith("album-1");
    });

    it("calls onDrop when no files are dropped (internal drag)", () => {
      const mockOnFileDrop = vi.fn();
      const mockOnDrop = vi.fn();
      render(
        <AlbumsGrid
          albums={mockAlbums}
          onFileDrop={mockOnFileDrop}
          onDrop={mockOnDrop}
        />,
      );

      const card = screen.getByText("Vacation Photos").closest(
        "[class*='overflow-hidden']",
      );

      const dataTransfer = {
        files: [],
      };

      fireEvent.drop(card!, { dataTransfer });

      // onFileDrop should not be called (no files)
      expect(mockOnFileDrop).not.toHaveBeenCalled();
      // onDrop should be called for internal drag
      expect(mockOnDrop).toHaveBeenCalledWith("album-1");
    });

    it("does not call onFileDrop when handler is not provided", () => {
      const mockOnDrop = vi.fn();
      render(<AlbumsGrid albums={mockAlbums} onDrop={mockOnDrop} />);

      const card = screen.getByText("Vacation Photos").closest(
        "[class*='overflow-hidden']",
      );

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      const dataTransfer = {
        files: [file],
      };

      // Should not throw even if onFileDrop is not provided
      expect(() => fireEvent.drop(card!, { dataTransfer })).not.toThrow();
      // onDrop should be called as fallback
      expect(mockOnDrop).toHaveBeenCalledWith("album-1");
    });
  });
});
