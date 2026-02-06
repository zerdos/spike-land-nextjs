import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryGrid } from "./LibraryGrid";
import type { LibraryImage } from "./LibraryItem";

// Mock next/image
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: any) => <img {...props} />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock MasonryGridUniform to simplify DOM
vi.mock("@/components/ui/masonry-grid", () => ({
  MasonryGridUniform: ({ children }: any) => <div>{children}</div>,
}));

// Mock getBestThumbnail
vi.mock("@/lib/images/get-best-thumbnail", () => ({
  getBestThumbnail: () => "/mock-image.jpg",
}));

describe("LibraryGrid", () => {
  const mockImages: LibraryImage[] = [
    {
      id: "img1",
      name: "Image 1",
      createdAt: new Date(),
      originalUrl: "/img1.jpg",
      enhancementJobs: [],
    } as any,
    {
      id: "img2",
      name: "Image 2",
      createdAt: new Date(),
      originalUrl: "/img2.jpg",
      enhancementJobs: [],
    } as any,
  ];

  it("renders empty state", () => {
    render(
      <LibraryGrid
        images={[]}
        selectedIds={[]}
        onToggleSelect={() => {}}
      />
    );
    expect(screen.getByText("Your library is empty.")).toBeInTheDocument();
  });

  it("renders images", () => {
    render(
      <LibraryGrid
        images={mockImages}
        selectedIds={[]}
        onToggleSelect={() => {}}
      />
    );
    expect(screen.getByText("Image 1")).toBeInTheDocument();
    expect(screen.getByText("Image 2")).toBeInTheDocument();
  });

  it("calls onToggleSelect when clicked", () => {
    const onToggleSelect = vi.fn();
    render(
      <LibraryGrid
        images={mockImages}
        selectedIds={[]}
        onToggleSelect={onToggleSelect}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(onToggleSelect).toHaveBeenCalledWith("img1");
  });

  it("renders selected state correctly", () => {
    render(
      <LibraryGrid
        images={mockImages}
        selectedIds={["img1"]}
        onToggleSelect={() => {}}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked(); // img1 selected
    expect(checkboxes[1]).not.toBeChecked(); // img2 not selected
  });
});
