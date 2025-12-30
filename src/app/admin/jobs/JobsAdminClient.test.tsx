/**
 * Tests for JobsAdminClient Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobsAdminClient } from "./JobsAdminClient";

vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: (
    { originalUrl, enhancedUrl }: { originalUrl: string; enhancedUrl: string; },
  ) => (
    <div data-testid="image-comparison-slider">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={originalUrl} alt="original" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enhancedUrl} alt="enhanced" />
    </div>
  ),
}));

const mockFetchResponse = (data: unknown, ok = true): Response => {
  return {
    ok,
    json: () => Promise.resolve(data),
  } as Response;
};

const mockJob = {
  id: "job_12345678901234567890123",
  source: "enhancement" as const,
  imageId: "img_12345678901234567890123",
  imageName: "vacation.jpg",
  userId: "user_12345678901234567890",
  userEmail: "test@example.com",
  userName: "Test User",
  tier: "TIER_4K" as const,
  tokensCost: 10,
  status: "COMPLETED" as const,
  prompt: "Enhance this image to high resolution",
  inputUrl: "https://example.com/original.jpg",
  outputUrl: "https://example.com/enhanced.jpg",
  outputR2Key: "enhanced/test/job_12345.jpg",
  outputWidth: 4096,
  outputHeight: 2304,
  outputSizeBytes: 5000000,
  errorMessage: null,
  retryCount: 0,
  maxRetries: 3,
  geminiModel: "gemini-3-pro-image-preview",
  geminiTemp: null,
  processingStartedAt: "2025-01-01T10:00:00Z",
  processingCompletedAt: "2025-01-01T10:00:12Z",
  createdAt: "2025-01-01T09:59:50Z",
  updatedAt: "2025-01-01T10:00:12Z",
  workflowRunId: "workflow_123",
};

const mockFailedJob = {
  ...mockJob,
  id: "job_failed123456789012345",
  status: "FAILED" as const,
  outputUrl: null,
  outputR2Key: null,
  outputWidth: null,
  outputHeight: null,
  outputSizeBytes: null,
  errorMessage: "Gemini API quota exceeded",
  processingCompletedAt: null,
};

const mockJobsResponse = {
  jobs: [mockJob, mockFailedJob],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
  statusCounts: {
    ALL: 2,
    COMPLETED: 1,
    FAILED: 1,
    PENDING: 0,
    PROCESSING: 0,
    CANCELLED: 0,
    REFUNDED: 0,
  },
  typeCounts: {
    all: 2,
    enhancement: 2,
    mcp: 0,
  },
};

describe("JobsAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should render the page title and description", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    expect(screen.getByText("Jobs Management")).toBeInTheDocument();
    expect(screen.getByText("View and manage all enhancement jobs"))
      .toBeInTheDocument();
  });

  it("should render status filter tabs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      // Check for status tabs (not type tabs)
      expect(screen.getByRole("button", { name: /queue/i }))
        .toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /queue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /running/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /completed/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /failed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelled/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refunded/i }))
      .toBeInTheDocument();
  });

  it("should render search and refresh controls", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    expect(screen.getByPlaceholderText("Search by Job ID or email..."))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i }))
      .toBeInTheDocument();
  });

  it("should display loading state", async () => {
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockFetchResponse(mockJobsResponse)), 100)
        ),
    );

    render(<JobsAdminClient />);

    // Loading skeletons should be visible
    const loadingElements = document.querySelectorAll(".animate-pulse");
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it("should display job list after loading", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("FAILED")).toBeInTheDocument();
    // Both jobs are TIER_4K so expect multiple 4K elements
    expect(screen.getAllByText("4K").length).toBeGreaterThanOrEqual(2);
  });

  it("should display error state on fetch failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse({ error: "Database error" }, false),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Database error")).toBeInTheDocument();
    });
  });

  it("should display empty state when no jobs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse({
        jobs: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        statusCounts: { ALL: 0 },
        typeCounts: { all: 0, enhancement: 0, mcp: 0 },
      }),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("No jobs found")).toBeInTheDocument();
    });
  });

  it("should show job details when clicking a job", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on the completed job (look for the truncated job ID)
    const completedJobElement = screen.getByText(/job_12345678/);
    fireEvent.click(completedJobElement.closest("[class*='cursor-pointer']")!);

    await waitFor(() => {
      // User email appears in the details panel
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("should show image comparison slider for completed jobs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on the completed job (first one)
    const jobItems = document.querySelectorAll("[class*='cursor-pointer']");
    if (jobItems[0]) {
      fireEvent.click(jobItems[0]);
    }

    await waitFor(() => {
      expect(screen.getByTestId("image-comparison-slider")).toBeInTheDocument();
    });
  });

  it("should show error message for failed jobs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on the failed job (look for the failed job ID - only first 12 chars displayed)
    // job_failed123456789012345 -> "job_failed12..."
    const failedJobElement = screen.getByText(/job_failed12/);
    fireEvent.click(failedJobElement.closest("[class*='cursor-pointer']")!);

    await waitFor(() => {
      // Error message should appear in the detail panel
      expect(screen.getAllByText("Gemini API quota exceeded").length)
        .toBeGreaterThan(0);
    });
  });

  it("should filter jobs when clicking status tabs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on Failed tab
    fireEvent.click(screen.getByRole("button", { name: /failed/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=FAILED"),
      );
    });
  });

  it("should search when clicking search button", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by Job ID or email...",
    );
    fireEvent.change(searchInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("search=test%40example.com"),
      );
    });
  });

  it("should search when pressing Enter in search field", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      "Search by Job ID or email...",
    );
    fireEvent.change(searchInput, { target: { value: "job_123" } });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("search=job_123"),
      );
    });
  });

  it("should refresh when clicking refresh button", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Initial fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("should display AI model information", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on the completed job
    const jobItems = document.querySelectorAll("[class*='cursor-pointer']");
    if (jobItems[0]) {
      fireEvent.click(jobItems[0]);
    }

    await waitFor(() => {
      expect(screen.getByText("AI Model")).toBeInTheDocument();
      expect(screen.getByText("gemini-3-pro-image-preview"))
        .toBeInTheDocument();
      // Temperature row is only shown when geminiTemp is not null
    });
  });

  it("should display prompt for jobs with prompt", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on the completed job
    const jobItems = document.querySelectorAll("[class*='cursor-pointer']");
    if (jobItems[0]) {
      fireEvent.click(jobItems[0]);
    }

    await waitFor(() => {
      expect(screen.getByText("Prompt")).toBeInTheDocument();
      expect(screen.getByText("Enhance this image to high resolution"))
        .toBeInTheDocument();
    });
  });

  it("should show pagination when there are multiple pages", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse({
        ...mockJobsResponse,
        pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      }),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (50)")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("should navigate to next page", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse({
        ...mockJobsResponse,
        pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      }),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      );
    });
  });

  it("should display processing time for completed jobs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on the completed job (look for the job ID - first 12 chars)
    const jobListItems = document.querySelectorAll("[class*='cursor-pointer']");
    expect(jobListItems.length).toBeGreaterThan(0);
    if (jobListItems[0]) {
      fireEvent.click(jobListItems[0]);
    }

    await waitFor(() => {
      expect(screen.getByText("Processing Time")).toBeInTheDocument();
    });

    // Duration is 12 seconds (10:00:00 to 10:00:12) - formatted as 12.0s
    // May appear multiple times (in list item and detail panel)
    expect(screen.getAllByText("12.0s").length).toBeGreaterThan(0);
  });

  it("should format file sizes correctly", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      expect(screen.getByText("Jobs (2)")).toBeInTheDocument();
    });

    // Click on the completed job
    const jobItems = document.querySelectorAll("[class*='cursor-pointer']");
    if (jobItems[0]) {
      fireEvent.click(jobItems[0]);
    }

    await waitFor(() => {
      // Check for formatted output size (5MB = 4.77 MB)
      expect(screen.getByText(/4\.77 MB/)).toBeInTheDocument();
    });
  });

  it("should display status counts in tabs", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      mockFetchResponse(mockJobsResponse),
    );

    render(<JobsAdminClient />);

    await waitFor(() => {
      // Expect counts in badge elements
      const badges = document.querySelectorAll(
        "[class*='rounded-md'][class*='border']",
      );
      // Should have at least some badges with counts
      expect(badges.length).toBeGreaterThan(0);
    });

    // Check for the ALL count of 2
    await waitFor(() => {
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    });
  });
});
