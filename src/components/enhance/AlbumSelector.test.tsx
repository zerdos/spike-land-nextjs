import type { Album } from "@/hooks/useUserAlbums";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlbumSelector } from "./AlbumSelector";

const mockAlbums: Album[] = [
  {
    id: "album-1",
    name: "Vacation Photos",
    description: "Summer 2024",
    privacy: "PRIVATE",
    coverImageId: null,
    imageCount: 10,
    previewImages: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "album-2",
    name: "Work Projects",
    description: null,
    privacy: "UNLISTED",
    coverImageId: null,
    imageCount: 5,
    previewImages: [],
    createdAt: "2024-02-01",
    updatedAt: "2024-02-01",
  },
];

describe("AlbumSelector", () => {
  describe("rendering", () => {
    it("renders nothing when no albums", () => {
      const { container } = render(
        <AlbumSelector
          albums={[]}
          selectedAlbumId={null}
          onAlbumSelect={() => {}}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("renders select with albums", () => {
      render(
        <AlbumSelector
          albums={mockAlbums}
          selectedAlbumId={null}
          onAlbumSelect={() => {}}
        />,
      );

      expect(screen.getByText("Upload to:")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows selected album name in trigger", async () => {
      render(
        <AlbumSelector
          albums={mockAlbums}
          selectedAlbumId="album-1"
          onAlbumSelect={() => {}}
        />,
      );

      // The selected album name should be visible in the trigger
      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("Vacation Photos");
    });

    it("shows placeholder when no album selected", () => {
      render(
        <AlbumSelector
          albums={mockAlbums}
          selectedAlbumId={null}
          onAlbumSelect={() => {}}
        />,
      );

      const trigger = screen.getByRole("combobox");
      expect(trigger).toHaveTextContent("Select album...");
    });
  });

  describe("interactions", () => {
    it("calls onAlbumSelect with album id when selecting", async () => {
      const user = userEvent.setup();
      const onAlbumSelect = vi.fn();

      render(
        <AlbumSelector
          albums={mockAlbums}
          selectedAlbumId={null}
          onAlbumSelect={onAlbumSelect}
        />,
      );

      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByRole("option", { name: "Vacation Photos" }));

      expect(onAlbumSelect).toHaveBeenCalledWith("album-1");
    });

    it("allows changing album selection", async () => {
      const user = userEvent.setup();
      const onAlbumSelect = vi.fn();

      render(
        <AlbumSelector
          albums={mockAlbums}
          selectedAlbumId="album-1"
          onAlbumSelect={onAlbumSelect}
        />,
      );

      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByRole("option", { name: "Work Projects" }));

      expect(onAlbumSelect).toHaveBeenCalledWith("album-2");
    });
  });

  describe("disabled state", () => {
    it("disables select when disabled prop is true", () => {
      render(
        <AlbumSelector
          albums={mockAlbums}
          selectedAlbumId={null}
          onAlbumSelect={() => {}}
          disabled
        />,
      );

      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });
});
