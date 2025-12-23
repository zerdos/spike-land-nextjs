import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlbumCard } from "./AlbumCard";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

const mockAlbum = {
  id: "album-1",
  name: "Test Album",
  privacy: "PRIVATE" as const,
  imageCount: 5,
  previewImages: [
    { id: "img-1", url: "https://example.com/image1.jpg", name: "Image 1" },
    { id: "img-2", url: "https://example.com/image2.jpg", name: "Image 2" },
    { id: "img-3", url: "https://example.com/image3.jpg", name: "Image 3" },
    { id: "img-4", url: "https://example.com/image4.jpg", name: "Image 4" },
  ],
};

describe("AlbumCard Component", () => {
  it("renders album name", () => {
    render(<AlbumCard album={mockAlbum} />);

    expect(screen.getByText("Test Album")).toBeInTheDocument();
  });

  it("renders image count badge", () => {
    render(<AlbumCard album={mockAlbum} />);

    expect(screen.getByText("5 images")).toBeInTheDocument();
  });

  it("renders singular image count for 1 image", () => {
    const albumWithOneImage = { ...mockAlbum, imageCount: 1 };
    render(<AlbumCard album={albumWithOneImage} />);

    expect(screen.getByText("1 image")).toBeInTheDocument();
  });

  it("renders private privacy badge", () => {
    render(<AlbumCard album={mockAlbum} />);

    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("renders unlisted privacy badge", () => {
    const unlistedAlbum = { ...mockAlbum, privacy: "UNLISTED" as const };
    render(<AlbumCard album={unlistedAlbum} />);

    expect(screen.getByText("Unlisted")).toBeInTheDocument();
  });

  it("renders public privacy badge", () => {
    const publicAlbum = { ...mockAlbum, privacy: "PUBLIC" as const };
    render(<AlbumCard album={publicAlbum} />);

    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("renders preview images when available", () => {
    render(<AlbumCard album={mockAlbum} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(4);
    expect(images[0]).toHaveAttribute("src", "https://example.com/image1.jpg");
  });

  it("renders empty state icon when no preview images", () => {
    const emptyAlbum = { ...mockAlbum, previewImages: [], imageCount: 0 };
    render(<AlbumCard album={emptyAlbum} />);

    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<AlbumCard album={mockAlbum} onClick={handleClick} />);

    const card = screen.getByRole("button");
    await user.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when Enter key is pressed", () => {
    const handleClick = vi.fn();

    render(<AlbumCard album={mockAlbum} onClick={handleClick} />);

    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when Space key is pressed", () => {
    const handleClick = vi.fn();

    render(<AlbumCard album={mockAlbum} onClick={handleClick} />);

    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: " " });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick for other keys", () => {
    const handleClick = vi.fn();

    render(<AlbumCard album={mockAlbum} onClick={handleClick} />);

    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Tab" });

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies drop target styling when isDropTarget is true", () => {
    const { container } = render(<AlbumCard album={mockAlbum} isDropTarget />);

    const cardContent = container.querySelector(".ring-primary");
    expect(cardContent).toBeInTheDocument();
  });

  it("does not have button role when onClick is not provided", () => {
    render(<AlbumCard album={mockAlbum} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has proper aria-label when onClick is provided", () => {
    render(<AlbumCard album={mockAlbum} onClick={() => {}} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Open album Test Album");
  });

  it("truncates long album names", () => {
    const longNameAlbum = {
      ...mockAlbum,
      name: "This is a very long album name that should be truncated",
    };
    render(<AlbumCard album={longNameAlbum} />);

    const nameElement = screen.getByTitle(
      "This is a very long album name that should be truncated",
    );
    expect(nameElement).toHaveClass("truncate");
  });

  describe("preview image grid layout", () => {
    it("renders single image spanning full grid", () => {
      const firstPreviewImage = mockAlbum.previewImages[0];
      const singleImageAlbum = {
        ...mockAlbum,
        previewImages: [firstPreviewImage],
      };
      const { container } = render(<AlbumCard album={singleImageAlbum} />);

      const imageContainer = container.querySelector(".col-span-2.row-span-2");
      expect(imageContainer).toBeInTheDocument();
    });

    it("renders two images with row-span-2", () => {
      const twoImageAlbum = {
        ...mockAlbum,
        previewImages: mockAlbum.previewImages.slice(0, 2),
      };
      const { container } = render(<AlbumCard album={twoImageAlbum} />);

      const rowSpanContainers = container.querySelectorAll(".row-span-2");
      expect(rowSpanContainers).toHaveLength(2);
    });

    it("renders three images with first spanning two rows", () => {
      const threeImageAlbum = {
        ...mockAlbum,
        previewImages: mockAlbum.previewImages.slice(0, 3),
      };
      const { container } = render(<AlbumCard album={threeImageAlbum} />);

      const rowSpanContainers = container.querySelectorAll(".row-span-2");
      expect(rowSpanContainers).toHaveLength(1);
    });

    it("renders four images in standard 2x2 grid", () => {
      const { container } = render(<AlbumCard album={mockAlbum} />);

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(4);

      // Four images should not have special spanning classes
      const rowSpanContainers = container.querySelectorAll(".row-span-2");
      expect(rowSpanContainers).toHaveLength(0);
    });
  });

  it("renders image alt text correctly", () => {
    render(<AlbumCard album={mockAlbum} />);

    expect(screen.getByAltText("Image 1")).toBeInTheDocument();
    expect(screen.getByAltText("Image 2")).toBeInTheDocument();
  });

  it("uses fallback alt text when name is empty", () => {
    const albumWithEmptyName = {
      ...mockAlbum,
      previewImages: [{
        id: "img-1",
        url: "https://example.com/image1.jpg",
        name: "",
      }],
    };
    render(<AlbumCard album={albumWithEmptyName} />);

    expect(screen.getByAltText("Album image")).toBeInTheDocument();
  });
});
