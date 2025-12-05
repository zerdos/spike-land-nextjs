/**
 * Tests for Admin Photos Gallery Page
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPhotosPage from "./page";

global.fetch = vi.fn();

describe("AdminPhotosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPhotosResponse = {
    images: [
      {
        id: "img1",
        name: "test1.jpg",
        originalUrl: "https://example.com/test1.jpg",
        thumbnailUrl: "https://example.com/test1.jpg",
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: "JPEG",
        createdAt: "2025-01-01T00:00:00.000Z",
        user: {
          id: "user1",
          name: "Test User",
          email: "test@example.com",
        },
        enhancementCount: 2,
        latestJobStatus: "COMPLETED",
      },
      {
        id: "img2",
        name: "test2.png",
        originalUrl: "https://example.com/test2.png",
        thumbnailUrl: "https://example.com/test2.png",
        width: 3840,
        height: 2160,
        sizeBytes: 2048000,
        format: "PNG",
        createdAt: "2025-01-02T00:00:00.000Z",
        user: {
          id: "user2",
          name: "Another User",
          email: "another@example.com",
        },
        enhancementCount: 0,
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    },
  };

  it("should render page title and description", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    expect(screen.getByText("Photo Gallery")).toBeInTheDocument();
    expect(
      screen.getByText("View all uploaded photos with pagination and filtering"),
    ).toBeInTheDocument();
  });

  it("should fetch and display photos on mount", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
      expect(screen.getByText("test2.png")).toBeInTheDocument();
    });

    expect(screen.getByText("Photos (2)")).toBeInTheDocument();
  });

  it("should display loading state", async () => {
    vi.mocked(fetch).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    render(<AdminPhotosPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should display error state", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed to fetch photos" }),
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Error: Failed to fetch photos")).toBeInTheDocument();
    });
  });

  it("should display empty state when no photos", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        images: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("No photos found")).toBeInTheDocument();
    });
  });

  it("should apply filters when Apply Filters is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    const userIdInput = screen.getByPlaceholderText("Enter user ID...");
    const startDateInput = screen.getByLabelText("Start Date");
    const applyButton = screen.getByRole("button", { name: "Apply Filters" });

    await user.type(userIdInput, "user123");
    await user.type(startDateInput, "2025-01-01");
    await user.click(applyButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("userId=user123"),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("startDate=2025-01-01"),
      );
    });
  });

  it("should clear filters when Clear Filters is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    const userIdInput = screen.getByPlaceholderText("Enter user ID...");
    const clearButton = screen.getByRole("button", { name: "Clear Filters" });

    await user.type(userIdInput, "user123");
    await user.click(clearButton);

    expect(userIdInput).toHaveValue("");
  });

  it("should navigate to next page", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPhotosResponse,
        pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      }),
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "Next" });
    await user.click(nextButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
    });
  });

  it("should navigate to previous page", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockPhotosResponse,
          pagination: { page: 2, limit: 20, total: 50, totalPages: 3 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockPhotosResponse,
          pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
        }),
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Page 2 of 3")).toHaveLength(2);
    });

    const prevButton = screen.getByRole("button", { name: "Previous" });
    await user.click(prevButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
      );
    });
  });

  it("should disable previous button on first page", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPhotosResponse,
        pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      }),
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    const prevButton = screen.getByRole("button", { name: "Previous" });
    expect(prevButton).toBeDisabled();
  });

  it("should disable next button on last page", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPhotosResponse,
        pagination: { page: 3, limit: 20, total: 50, totalPages: 3 },
      }),
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).toBeDisabled();
  });

  it("should open photo details modal when photo is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    const photoCard = screen.getByText("test1.jpg").closest("div");
    if (photoCard) {
      await user.click(photoCard);
    }

    await waitFor(() => {
      expect(screen.getByText("Photo Details")).toBeInTheDocument();
      expect(screen.getByText("1920 × 1080")).toBeInTheDocument();
    });
  });

  it("should display enhancement count badge", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("2 enhancements")).toBeInTheDocument();
      expect(screen.getByText("0 enhancements")).toBeInTheDocument();
    });
  });

  it("should display job status badge", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    });
  });

  it("should format file size correctly", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    const photoCard = screen.getByText("test1.jpg").closest("div");
    if (photoCard) {
      await user.click(photoCard);
    }

    await waitFor(() => {
      expect(screen.getByText("1000 KB")).toBeInTheDocument();
    });
  });

  it("should not show pagination controls when totalPages is 1", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPhotosResponse,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      }),
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("should handle fetch error with generic message", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

    render(<AdminPhotosPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
