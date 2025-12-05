/**
 * Tests for Admin Photos Gallery Page
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPhotosPage from "./page";

global.fetch = vi.fn();

const mockWindowOpen = vi.fn();
Object.defineProperty(window, "open", {
  value: mockWindowOpen,
  writable: true,
});

describe("AdminPhotosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowOpen.mockClear();
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
          name: null,
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

  const mockUserHistoryResponse = {
    user: {
      id: "user1",
      name: "Test User",
      email: "test@example.com",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    enhancements: [
      {
        id: "job1",
        tier: "TIER_1K",
        status: "COMPLETED",
        tokenCost: 10,
        errorMessage: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        processingStartedAt: "2025-01-01T00:00:01.000Z",
        processingCompletedAt: "2025-01-01T00:00:30.000Z",
        resultUrl: "https://example.com/result1.jpg",
        image: {
          id: "img1",
          name: "test1.jpg",
          originalUrl: "https://example.com/test1.jpg",
          width: 1920,
          height: 1080,
          format: "JPEG",
        },
      },
      {
        id: "job2",
        tier: "TIER_2K",
        status: "FAILED",
        tokenCost: 20,
        errorMessage: "Processing failed",
        createdAt: "2025-01-02T00:00:00.000Z",
        processingStartedAt: "2025-01-02T00:00:01.000Z",
        processingCompletedAt: null,
        resultUrl: null,
        image: null,
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
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

  it("should render refresh button", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    expect(screen.getByRole("button", { name: "Refresh photos" })).toBeInTheDocument();
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
      expect(screen.getByText("1920 x 1080")).toBeInTheDocument();
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

  it("should refresh photos when Refresh button is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    });

    vi.mocked(fetch).mockClear();

    const refreshButton = screen.getByRole("button", { name: "Refresh photos" });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/admin/photos"));
    });
  });

  it("should show user name as clickable link in photo card", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    expect(userLink).toBeInTheDocument();
  });

  it("should show user email when name is null", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockPhotosResponse,
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("another@example.com")).toBeInTheDocument();
    });
  });

  it("should open user history modal when user name is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("User Enhancement History")).toBeInTheDocument();
    });
  });

  it("should display user history data in modal", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("Total Enhancements")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("TIER_1K")).toBeInTheDocument();
      expect(screen.getByText("TIER_2K")).toBeInTheDocument();
    });
  });

  it("should display error message in enhancement history", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("Error: Processing failed")).toBeInTheDocument();
    });
  });

  it("should show View Enhanced Result button when resultUrl exists", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("View Enhanced Result")).toBeInTheDocument();
    });
  });

  it("should open result URL in new tab when View Enhanced Result is clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("View Enhanced Result")).toBeInTheDocument();
    });

    const resultButton = screen.getByText("View Enhanced Result");
    await user.click(resultButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://example.com/result1.jpg",
      "_blank",
    );
  });

  it("should display Open Full Size button in photo modal", async () => {
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
      expect(screen.getByText("Open Full Size")).toBeInTheDocument();
    });
  });

  it("should open image URL in new tab when Open Full Size is clicked", async () => {
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
      expect(screen.getByText("Open Full Size")).toBeInTheDocument();
    });

    const openButton = screen.getByText("Open Full Size");
    await user.click(openButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://example.com/test1.jpg",
      "_blank",
    );
  });

  it("should show View User Enhancement History button in photo modal", async () => {
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
      expect(screen.getByText("View User Enhancement History")).toBeInTheDocument();
    });
  });

  it("should close photo modal and open user history when clicking View User Enhancement History", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
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
      expect(screen.getByText("View User Enhancement History")).toBeInTheDocument();
    });

    const historyButton = screen.getByText("View User Enhancement History");
    await user.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText("User Enhancement History")).toBeInTheDocument();
    });
  });

  it("should handle user history fetch error gracefully", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to fetch user history" }),
      } as Response);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("should display loading state in user history modal", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    expect(screen.getByText("Loading user history...")).toBeInTheDocument();
  });

  it("should format duration correctly for completed jobs", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("Duration: 29s")).toBeInTheDocument();
      expect(screen.getByText("Duration: N/A")).toBeInTheDocument();
    });
  });

  it("should display empty enhancements message when user has no enhancements", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockUserHistoryResponse,
          enhancements: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("No enhancements found")).toBeInTheDocument();
    });
  });

  it("should paginate user history", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockUserHistoryResponse,
          pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockUserHistoryResponse,
          pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
        }),
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    const nextButton = screen.getAllByRole("button", { name: "Next" }).slice(-1)[0];
    await user.click(nextButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
    });
  });

  it("should handle status colors correctly", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPhotosResponse,
        images: [
          ...mockPhotosResponse.images,
          {
            id: "img3",
            name: "test3.png",
            originalUrl: "https://example.com/test3.png",
            thumbnailUrl: "https://example.com/test3.png",
            width: 1920,
            height: 1080,
            sizeBytes: 1024000,
            format: "PNG",
            createdAt: "2025-01-03T00:00:00.000Z",
            user: {
              id: "user3",
              name: "Test User 3",
              email: "test3@example.com",
            },
            enhancementCount: 1,
            latestJobStatus: "PROCESSING",
          },
          {
            id: "img4",
            name: "test4.png",
            originalUrl: "https://example.com/test4.png",
            thumbnailUrl: "https://example.com/test4.png",
            width: 1920,
            height: 1080,
            sizeBytes: 1024000,
            format: "PNG",
            createdAt: "2025-01-04T00:00:00.000Z",
            user: {
              id: "user4",
              name: "Test User 4",
              email: "test4@example.com",
            },
            enhancementCount: 1,
            latestJobStatus: "FAILED",
          },
        ],
      }),
    } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
      expect(screen.getByText("PROCESSING")).toBeInTheDocument();
      expect(screen.getByText("FAILED")).toBeInTheDocument();
    });
  });

  it("should handle format bytes for 0 bytes", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPhotosResponse,
        images: [
          {
            ...mockPhotosResponse.images[0],
            sizeBytes: 0,
          },
        ],
      }),
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
      expect(screen.getByText("0 B")).toBeInTheDocument();
    });
  });

  it("should display Unknown Image when enhancement image is null", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserHistoryResponse,
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("Unknown Image")).toBeInTheDocument();
    });
  });

  it("should display user name as No name when name is null in history modal", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotosResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockUserHistoryResponse,
          user: {
            ...mockUserHistoryResponse.user,
            name: null,
          },
        }),
      } as Response);

    render(<AdminPhotosPage />);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    const userLink = screen.getByRole("button", {
      name: "View enhancement history for Test User",
    });
    await user.click(userLink);

    await waitFor(() => {
      expect(screen.getByText("No name")).toBeInTheDocument();
    });
  });
});
