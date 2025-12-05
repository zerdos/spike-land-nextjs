import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddToAlbumModal } from "./AddToAlbumModal";

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// Mock sonner toast - using inline mock to avoid hoisting issues
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Import the mock after mocking
import { toast as mockToast } from "sonner";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAlbums = [
  { id: "album-1", name: "Vacation Photos", imageCount: 5 },
  { id: "album-2", name: "Work Screenshots", imageCount: 12 },
  { id: "album-3", name: "Family", imageCount: 0 },
];

describe("AddToAlbumModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("when modal is closed", () => {
    it("does not render content when open is false", () => {
      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={false}
          onOpenChange={() => {}}
        />,
      );

      expect(screen.queryByText("Add to Album")).not.toBeInTheDocument();
    });
  });

  describe("when modal is open", () => {
    it("renders modal title and description", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      // Title should be visible immediately
      expect(
        screen.getByRole("heading", { name: "Add to Album" }),
      ).toBeInTheDocument();

      // Wait for description to appear after loading
      await waitFor(() => {
        expect(
          screen.getByText("Select an album to add this image to"),
        ).toBeInTheDocument();
      });
    });

    it("renders modal with image name in description", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          imageName="My Beautiful Photo"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      expect(
        screen.getByText('Add "My Beautiful Photo" to an album'),
      ).toBeInTheDocument();
    });

    it("shows loading state while fetching albums", async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      // Loading state should be visible (the loader)
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("fetches albums when modal opens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/albums");
      });
    });

    it("shows album select dropdown after loading", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Select an album")).toBeInTheDocument();
      });
    });

    it("shows empty state when user has no albums", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText("You don't have any albums yet"),
        ).toBeInTheDocument();
        expect(screen.getByText("Create Album")).toBeInTheDocument();
      });
    });

    it("shows error toast when fetching albums fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to load albums");
      });
    });

    it("renders Cancel and Add to Album buttons", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Add to Album" }),
        ).toBeInTheDocument();
      });
    });

    it("disables Add to Album button when no album is selected", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        const addButton = screen.getByRole("button", { name: "Add to Album" });
        expect(addButton).toBeDisabled();
      });
    });

    it("calls onOpenChange(false) when Cancel is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={onOpenChange}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Cancel"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("accessibility", () => {
    it("has proper dialog structure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      // Dialog should be present
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has proper button labels", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Cancel" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Add to Album" }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("refetching albums on modal reopen", () => {
    it("fetches albums each time modal opens", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ albums: mockAlbums }),
      });

      const { rerender } = render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Close modal
      rerender(
        <AddToAlbumModal
          imageId="test-image-1"
          open={false}
          onOpenChange={() => {}}
        />,
      );

      // Open modal again
      rerender(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("empty albums state", () => {
    it("links to albums page when no albums exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        const createAlbumLink = screen.getByRole("link", {
          name: /Create Album/i,
        });
        expect(createAlbumLink).toHaveAttribute("href", "/albums");
      });
    });

    it("disables Add to Album button when no albums exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ albums: [] }),
      });

      render(
        <AddToAlbumModal
          imageId="test-image-1"
          open={true}
          onOpenChange={() => {}}
        />,
      );

      await waitFor(() => {
        const addButton = screen.getByRole("button", { name: "Add to Album" });
        expect(addButton).toBeDisabled();
      });
    });
  });
});
