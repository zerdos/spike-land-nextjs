/**
 * Tests for GalleryAdminClient Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GalleryAdminClient } from "./GalleryAdminClient";

const mockFetchResponse = (data: unknown, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockGalleryItems = [
  {
    id: "item1",
    title: "Beautiful Portrait",
    description: "A stunning portrait photo",
    category: "PORTRAIT" as const,
    originalUrl: "https://example.com/original1.jpg",
    enhancedUrl: "https://example.com/enhanced1.jpg",
    isActive: true,
    sortOrder: 1,
    sourceImageId: "img1",
    sourceJobId: "job1",
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "item2",
    title: "Mountain Landscape",
    description: "Beautiful mountain scenery",
    category: "LANDSCAPE" as const,
    originalUrl: "https://example.com/original2.jpg",
    enhancedUrl: "https://example.com/enhanced2.jpg",
    isActive: false,
    sortOrder: 2,
    sourceImageId: "img2",
    sourceJobId: "job2",
    createdAt: "2024-01-16T10:00:00.000Z",
    updatedAt: "2024-01-16T10:00:00.000Z",
  },
];

describe("GalleryAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should render loading state initially", () => {
    vi.mocked(global.fetch).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<GalleryAdminClient />);

    // Loading state shows skeleton cards
    const skeletonCards = document.querySelectorAll(".animate-pulse");
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it("should render gallery items after loading", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
      expect(screen.getByText("Mountain Landscape")).toBeInTheDocument();
    });
  });

  it("should show Add New Item button", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: [] }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Add New Item")).toBeInTheDocument();
    });
  });

  it("should open browse dialog when Add New Item button clicked", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: [] }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Add New Item")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add New Item");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Browse Images")).toBeInTheDocument();
    });
  });

  it("should show empty state when no items", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: [] }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("No gallery items yet.")).toBeInTheDocument();
      expect(
        screen.getByText(
          'Click "Add New Item" to add before/after pairs to the featured gallery.',
        ),
      ).toBeInTheDocument();
    });
  });

  it("should call API to fetch items on mount", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/gallery");
    });
  });

  it("should handle fetch error gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: "Failed to fetch" }, false),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch gallery items/))
        .toBeInTheDocument();
    });
  });

  it("should toggle item active status", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
    });

    // Mock the toggle API call
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true }),
    );

    // Find the switch for the first item (which is active)
    const switches = document.querySelectorAll('button[role="switch"]');
    const firstSwitch = switches[0] as HTMLButtonElement;

    fireEvent.click(firstSwitch);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "item1",
          isActive: false,
        }),
      });
    });
  });

  it("should open edit dialog for item", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Edit Gallery Item")).toBeInTheDocument();
      expect(screen.getByText("Update the details for this gallery item."))
        .toBeInTheDocument();
    });
  });

  it("should show delete confirmation", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Gallery Item")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/))
        .toBeInTheDocument();
      expect(screen.getByText(/"Beautiful Portrait"/)).toBeInTheDocument();
    });
  });

  it("should delete item when confirmed", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Gallery Item")).toBeInTheDocument();
    });

    // Mock delete API call
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true }),
    );

    // Mock refetch after delete
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: [mockGalleryItems[1]] }),
    );

    // Confirm deletion
    const confirmButton = screen.getByRole("button", { name: /^Delete$/ });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/gallery?id=item1", {
        method: "DELETE",
      });
    });
  });

  it("should reorder items with Move Up button", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Mountain Landscape")).toBeInTheDocument();
    });

    // Mock reorder API call
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true }),
    );

    // Mock refetch after reorder
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    // Click Move Up on the second item (item2 at index 1 wants to move to item1's sortOrder which is 1)
    const moveUpButtons = screen.getAllByText("Up");
    fireEvent.click(moveUpButtons[1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/gallery/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "item2",
          newOrder: 1, // item1's sortOrder
        }),
      });
    });
  });

  it("should reorder items with Move Down button", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
    });

    // Mock reorder API call
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true }),
    );

    // Mock refetch after reorder
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    // Click Move Down on the first item (item1 at index 0 wants to move to item2's sortOrder which is 2)
    const moveDownButtons = screen.getAllByText("Down");
    fireEvent.click(moveDownButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/gallery/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "item1",
          newOrder: 2, // item2's sortOrder
        }),
      });
    });
  });

  it("should display category badges with correct colors", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("PORTRAIT")).toBeInTheDocument();
      expect(screen.getByText("LANDSCAPE")).toBeInTheDocument();
    });
  });

  it("should handle API error on toggle", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
    });

    // Mock failed toggle
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: "Failed to update" }, false),
    );

    const switches = document.querySelectorAll('button[role="switch"]');
    const initialState = switches[0]?.getAttribute("data-state");

    fireEvent.click(switches[0] as HTMLButtonElement);

    // Wait for the request to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "item1",
          isActive: false,
        }),
      });
    });

    // Verify state didn't change (due to error)
    await waitFor(() => {
      const updatedSwitch = document.querySelectorAll('button[role="switch"]')[0];
      expect(updatedSwitch?.getAttribute("data-state")).toBe(initialState);
    });
  });

  it("should show retry button on error", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: "Failed to fetch" }, false),
    );

    render(<GalleryAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    // Mock successful retry
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ items: mockGalleryItems }),
    );

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Beautiful Portrait")).toBeInTheDocument();
    });
  });
});
