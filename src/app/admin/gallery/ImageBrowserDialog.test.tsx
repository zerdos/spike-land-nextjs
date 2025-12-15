/**
 * Tests for ImageBrowserDialog Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageBrowserDialog } from "./ImageBrowserDialog";

const mockFetchResponse = (data: unknown, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
};

const mockImages = [
  {
    id: "img1",
    originalUrl: "https://example.com/original1.jpg",
    shareToken: "abc123",
    createdAt: "2024-01-15T10:00:00.000Z",
    user: {
      id: "user1",
      name: "John Doe",
      email: "john@example.com",
    },
    enhancementJobs: [
      {
        id: "job1",
        tier: "TIER_1K",
        enhancedUrl: "https://example.com/enhanced1.jpg",
        createdAt: "2024-01-15T10:05:00.000Z",
      },
      {
        id: "job2",
        tier: "TIER_2K",
        enhancedUrl: "https://example.com/enhanced2.jpg",
        createdAt: "2024-01-15T10:10:00.000Z",
      },
    ],
  },
  {
    id: "img2",
    originalUrl: "https://example.com/original2.jpg",
    shareToken: null,
    createdAt: "2024-01-16T10:00:00.000Z",
    user: null,
    enhancementJobs: [
      {
        id: "job3",
        tier: "TIER_4K",
        enhancedUrl: "https://example.com/enhanced3.jpg",
        createdAt: "2024-01-16T10:05:00.000Z",
      },
    ],
  },
];

describe("ImageBrowserDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should render dialog when open", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Browse Images")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Search for images by share token or user email to add to the featured gallery.",
      ),
    ).toBeInTheDocument();
  });

  it("should not render dialog when closed", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={false}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    expect(screen.queryByText("Browse Images")).not.toBeInTheDocument();
  });

  it("should render search input", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByLabelText("Search Query")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter share token..."))
      .toBeInTheDocument();
  });

  it("should render search type toggle buttons", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("Share Token")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("should switch between search types", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    // Initially on Share Token
    expect(screen.getByPlaceholderText("Enter share token..."))
      .toBeInTheDocument();

    // Switch to User
    const userButton = screen.getByText("User");
    fireEvent.click(userButton);

    expect(screen.getByPlaceholderText("Enter user ID or email..."))
      .toBeInTheDocument();
  });

  it("should call browse API on search with share token", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/gallery/browse?shareToken=abc123",
      );
    });
  });

  it("should call browse API on search with user ID", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    // Switch to User search
    const userButton = screen.getByText("User");
    fireEvent.click(userButton);

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "user@example.com" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/gallery/browse?userId=user%40example.com",
      );
    });
  });

  it("should display search results", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Select an Image")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Anonymous")).toBeInTheDocument();
      expect(screen.getByText("2 enhancement(s)")).toBeInTheDocument();
      expect(screen.getByText("1 enhancement(s)")).toBeInTheDocument();
    });
  });

  it("should show enhancement jobs when image selected", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Click on first image
    const imageCards = screen.getAllByText(/enhancement\(s\)/)[0].closest("div")
      ?.parentElement;
    fireEvent.click(imageCards!);

    await waitFor(() => {
      expect(screen.getByText("Select an Enhancement")).toBeInTheDocument();
      expect(screen.getByText("TIER_1K")).toBeInTheDocument();
      expect(screen.getByText("TIER_2K")).toBeInTheDocument();
      expect(screen.getByText("Back to images")).toBeInTheDocument();
    });
  });

  it("should call onSelect with selected data", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Click on first image
    const imageCards = screen.getAllByText(/enhancement\(s\)/)[0].closest("div")
      ?.parentElement;
    fireEvent.click(imageCards!);

    await waitFor(() => {
      expect(screen.getByText("TIER_1K")).toBeInTheDocument();
    });

    // Click on first enhancement job
    const jobCard = screen.getByText("TIER_1K").closest("div")?.parentElement;
    fireEvent.click(jobCard!);

    await waitFor(() => {
      expect(screen.getByText("Use This Enhancement")).toBeInTheDocument();
    });

    // Confirm selection
    const confirmButton = screen.getByText("Use This Enhancement");
    fireEvent.click(confirmButton);

    expect(onSelect).toHaveBeenCalledWith(
      "img1",
      "job1",
      "https://example.com/original1.jpg",
      "https://example.com/enhanced1.jpg",
    );
  });

  it("should close dialog on cancel", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Click on first image and select enhancement
    const imageCards = screen.getAllByText(/enhancement\(s\)/)[0].closest("div")
      ?.parentElement;
    fireEvent.click(imageCards!);

    await waitFor(() => {
      expect(screen.getByText("TIER_1K")).toBeInTheDocument();
    });

    const jobCard = screen.getByText("TIER_1K").closest("div")?.parentElement;
    fireEvent.click(jobCard!);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should show error when search query is empty", async () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Please enter a search query"))
        .toBeInTheDocument();
    });
  });

  it("should show error when no images found", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: [] }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("No images found")).toBeInTheDocument();
    });
  });

  it("should handle API error gracefully", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: "Search failed" }, false),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Search failed")).toBeInTheDocument();
    });
  });

  it("should show message when image has no enhancements", async () => {
    const imageWithNoJobs = [
      {
        ...mockImages[0],
        enhancementJobs: [],
      },
    ];

    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: imageWithNoJobs }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("0 enhancement(s)")).toBeInTheDocument();
    });

    // Click on the image
    const imageCard = screen.getByText("0 enhancement(s)").closest("div")
      ?.parentElement;
    fireEvent.click(imageCard!);

    await waitFor(() => {
      expect(
        screen.getByText(
          "This image has no enhancements. Please select a different image.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("should allow going back to image list from enhancement selection", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Click on first image
    const imageCards = screen.getAllByText(/enhancement\(s\)/)[0].closest("div")
      ?.parentElement;
    fireEvent.click(imageCards!);

    await waitFor(() => {
      expect(screen.getByText("Select an Enhancement")).toBeInTheDocument();
    });

    // Click back button
    const backButton = screen.getByText("Back to images");
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText("Select an Image")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("should handle Enter key on search input", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/gallery/browse?shareToken=abc123",
      );
    });
  });

  it("should reset state when dialog closes", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      mockFetchResponse({ images: mockImages }),
    );

    const onOpenChange = vi.fn();
    const onSelect = vi.fn();

    const { unmount } = render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByLabelText("Search Query");
    fireEvent.change(searchInput, { target: { value: "abc123" } });

    const searchButton = screen.getByRole("button", { name: /^Search$/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Unmount and remount to simulate clean state
    unmount();

    render(
      <ImageBrowserDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    );

    // Should be reset
    const newSearchInput = screen.getByLabelText(
      "Search Query",
    ) as HTMLInputElement;
    expect(newSearchInput.value).toBe("");
    expect(screen.queryByText("Select an Image")).not.toBeInTheDocument();
  });
});
