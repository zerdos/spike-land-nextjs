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
      screen.getByText("No albums yet. Create your first album to organize your images."),
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

  it("renders links to album pages when no onAlbumClick", () => {
    render(<AlbumsGrid albums={mockAlbums} />);

    const links = screen.getAllByTestId("next-link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/albums/album-1");
    expect(links[1]).toHaveAttribute("href", "/albums/album-2");
    expect(links[2]).toHaveAttribute("href", "/albums/album-3");
  });

  it("calls onAlbumClick when provided and album is clicked", () => {
    const mockOnAlbumClick = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onAlbumClick={mockOnAlbumClick} />);

    const albumCard = screen.getByText("Vacation Photos").closest("div[class*='block']");
    fireEvent.click(albumCard!);

    expect(mockOnAlbumClick).toHaveBeenCalledWith("album-1");
  });

  it("prevents default when onAlbumClick is provided", () => {
    const mockOnAlbumClick = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onAlbumClick={mockOnAlbumClick} />);

    const albumCard = screen.getByText("Vacation Photos").closest("div[class*='block']");
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

    const card = screen.getByText("Vacation Photos").closest("[class*='overflow-hidden']");
    fireEvent.dragOver(card!);

    expect(mockOnDragOver).toHaveBeenCalledWith("album-1");
  });

  it("calls onDragLeave when dragging leaves album", () => {
    const mockOnDragLeave = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onDragLeave={mockOnDragLeave} />);

    const card = screen.getByText("Vacation Photos").closest("[class*='overflow-hidden']");
    fireEvent.dragLeave(card!);

    expect(mockOnDragLeave).toHaveBeenCalled();
  });

  it("calls onDrop when dropping on album", () => {
    const mockOnDrop = vi.fn();
    render(<AlbumsGrid albums={mockAlbums} onDrop={mockOnDrop} />);

    const card = screen.getByText("Vacation Photos").closest("[class*='overflow-hidden']");
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

    const card = screen.getByText("Vacation Photos").closest("[class*='overflow-hidden']");

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
      previewImages: [{ id: "img-1", url: "https://example.com/img1.jpg", name: "" }],
    };

    render(<AlbumsGrid albums={[albumWithEmptyName]} />);

    const image = screen.getByTestId("next-image");
    expect(image.getAttribute("alt")).toBe("Album image");
  });
});
