/**
 * Tests for McpHistoryClient Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McpHistoryClient } from "./McpHistoryClient";

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
  }) => <img src={src} alt={alt} {...props} data-testid="next-image" />,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockFetchResponse = (data: unknown, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);
};

const createMockJob = (overrides: Partial<McpJob> = {}): McpJob => ({
  id: "job_123456789012345678901234",
  type: "GENERATE",
  tier: "TIER_2K",
  tokensCost: 5,
  status: "COMPLETED",
  prompt: "A beautiful sunset over the ocean",
  inputImageUrl: undefined,
  outputImageUrl: "https://example.com/output.jpg",
  outputWidth: 2048,
  outputHeight: 1536,
  createdAt: "2025-01-15T10:00:00Z",
  processingCompletedAt: "2025-01-15T10:00:30Z",
  apiKeyName: "test-key",
  ...overrides,
});

interface McpJob {
  id: string;
  type: "GENERATE" | "MODIFY";
  tier: string;
  tokensCost: number;
  status: string;
  prompt: string;
  inputImageUrl?: string;
  outputImageUrl?: string;
  outputWidth?: number;
  outputHeight?: number;
  createdAt: string;
  processingCompletedAt?: string;
  apiKeyName?: string;
}

const mockCompletedJob = createMockJob();

const mockProcessingJob = createMockJob({
  id: "job_processing12345678901234",
  status: "PROCESSING",
  outputImageUrl: undefined,
  processingCompletedAt: undefined,
  apiKeyName: undefined,
});

const mockFailedJob = createMockJob({
  id: "job_failed1234567890123456",
  status: "FAILED",
  outputImageUrl: undefined,
  processingCompletedAt: undefined,
});

const mockRefundedJob = createMockJob({
  id: "job_refunded123456789012345",
  status: "REFUNDED",
  outputImageUrl: undefined,
});

const mockModifyJob = createMockJob({
  id: "job_modify123456789012345678",
  type: "MODIFY",
  tier: "TIER_1K",
  tokensCost: 2,
  inputImageUrl: "https://example.com/input.jpg",
});

const mockUnknownTypeJob = createMockJob({
  id: "job_unknown12345678901234567",
  type: "UNKNOWN" as "GENERATE",
  status: "UNKNOWN",
});

const mockJobsResponse = {
  jobs: [mockCompletedJob, mockProcessingJob, mockFailedJob],
  total: 3,
  hasMore: false,
};

describe("McpHistoryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("Page Layout", () => {
    it("should render the page title and description", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      expect(screen.getByText("MCP Usage History")).toBeInTheDocument();
      expect(
        screen.getByText("View your image generation and modification history"),
      ).toBeInTheDocument();
    });

    it("should render filter section with type dropdown", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      expect(screen.getByText("Filter & Navigate")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should render MCP Tools link", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      const mcpToolsLink = screen.getByRole("link", { name: /mcp tools/i });
      expect(mcpToolsLink).toBeInTheDocument();
      expect(mcpToolsLink).toHaveAttribute("href", "/apps/pixel/mcp-tools");
    });

    it("should display total jobs count", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("3 total jobs")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("should display loading spinner while fetching", async () => {
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockFetchResponse(mockJobsResponse)), 100)
          ),
      );

      render(<McpHistoryClient />);

      // Loading spinner should be visible
      const loadingSpinners = document.querySelectorAll(".animate-spin");
      expect(loadingSpinners.length).toBeGreaterThan(0);
    });
  });

  describe("Error State", () => {
    it("should display error message on fetch failure", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ error: "Database error" }, false),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Failed to fetch history")).toBeInTheDocument();
      });
    });

    it("should display generic error for non-Error exceptions", async () => {
      vi.mocked(global.fetch).mockRejectedValue("string error");

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load history")).toBeInTheDocument();
      });
    });

    it("should display Try Again button on error", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({}, false),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i }))
          .toBeInTheDocument();
      });
    });

    it("should refetch data when clicking Try Again", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse({}, false),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i }))
          .toBeInTheDocument();
      });

      // Mock successful retry
      vi.mocked(global.fetch).mockResolvedValueOnce(
        mockFetchResponse(mockJobsResponse),
      );

      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Empty State", () => {
    it("should display empty state when no jobs", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [], total: 0, hasMore: false }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("No Jobs Found")).toBeInTheDocument();
        expect(
          screen.getByText("You haven't used the MCP API yet."),
        ).toBeInTheDocument();
      });
    });

    it("should display filtered empty state message", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [], total: 0, hasMore: false }),
      );

      render(<McpHistoryClient />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("No Jobs Found")).toBeInTheDocument();
      });

      // Change filter
      fireEvent.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getByText("Generate")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Generate"));

      await waitFor(() => {
        expect(screen.getByText("No generate jobs yet.")).toBeInTheDocument();
      });
    });

    it("should display Try MCP Tools link in empty state", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [], total: 0, hasMore: false }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        const tryMcpToolsButton = screen.getByRole("link", {
          name: /try mcp tools/i,
        });
        expect(tryMcpToolsButton).toBeInTheDocument();
        expect(tryMcpToolsButton).toHaveAttribute(
          "href",
          "/apps/pixel/mcp-tools",
        );
      });
    });
  });

  describe("Job List Display", () => {
    it("should display job cards after loading", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });
    });

    it("should display job tokens cost", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("5 tokens")).toBeInTheDocument();
      });
    });

    it("should display job output image when available", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        const images = screen.getAllByTestId("next-image");
        expect(images.length).toBeGreaterThan(0);
        expect(images[0]).toHaveAttribute(
          "src",
          "https://example.com/output.jpg",
        );
      });
    });

    it("should show processing spinner when job is processing without output image", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockProcessingJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Processing")).toBeInTheDocument();
      });
    });

    it("should show alert icon when job has no output image and is not processing", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [mockFailedJob], total: 1, hasMore: false }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });
    });

    it("should display API key name when available", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("test-key")).toBeInTheDocument();
      });
    });
  });

  describe("Status Badges", () => {
    it("should render COMPLETED status badge", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Completed")).toBeInTheDocument();
      });
    });

    it("should render PROCESSING status badge", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockProcessingJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Processing")).toBeInTheDocument();
      });
    });

    it("should render FAILED status badge", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [mockFailedJob], total: 1, hasMore: false }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });
    });

    it("should render REFUNDED status badge", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockRefundedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Refunded")).toBeInTheDocument();
      });
    });

    it("should render unknown status as-is", async () => {
      const jobWithUnknownStatus = createMockJob({
        id: "job_unknownstatus123456789",
        type: "GENERATE",
        status: "CANCELLED",
      });
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [jobWithUnknownStatus],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        // The default case in getStatusBadge should render the status as-is
        expect(screen.getByText("CANCELLED")).toBeInTheDocument();
      });
    });
  });

  describe("Type Badges", () => {
    it("should render GENERATE type badge", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getAllByText("Generate").length).toBeGreaterThan(0);
      });
    });

    it("should render MODIFY type badge", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [mockModifyJob], total: 1, hasMore: false }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Modify")).toBeInTheDocument();
      });
    });

    it("should render unknown type as-is", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockUnknownTypeJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        // The badge should contain the unknown type
        expect(screen.getAllByText("UNKNOWN").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Type Filter", () => {
    it("should filter by GENERATE type", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("3 total jobs")).toBeInTheDocument();
      });

      // Click on the select trigger
      fireEvent.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Generate" }))
          .toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("option", { name: "Generate" }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("type=GENERATE"),
        );
      });
    });

    it("should filter by MODIFY type", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("3 total jobs")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("combobox"));

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Modify" }))
          .toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("option", { name: "Modify" }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("type=MODIFY"),
        );
      });
    });

    it("should reset to All Types filter", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("3 total jobs")).toBeInTheDocument();
      });

      // First select Generate filter
      fireEvent.click(screen.getByRole("combobox"));
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Generate" }))
          .toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: "Generate" }));

      // Then reset to All Types
      fireEvent.click(screen.getByRole("combobox"));
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "All Types" }))
          .toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: "All Types" }));

      await waitFor(() => {
        // Should not include type parameter for "all" filter
        const calls = vi.mocked(global.fetch).mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall).not.toContain("type=");
      });
    });

    it("should reset page to 0 when filter changes", async () => {
      const manyJobs = {
        jobs: Array(15).fill(null).map((_, i) => createMockJob({ id: `job_${i}` })),
        total: 30,
        hasMore: true,
      };
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse(manyJobs));

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
      });

      // Go to page 2
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("offset=12"),
        );
      });

      // Change filter - should reset to page 0
      fireEvent.click(screen.getByRole("combobox"));
      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Generate" }))
          .toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("option", { name: "Generate" }));

      await waitFor(() => {
        const calls = vi.mocked(global.fetch).mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall).toContain("offset=0");
      });
    });
  });

  describe("Pagination", () => {
    const manyJobsResponse = {
      jobs: Array(12).fill(null).map((_, i) => createMockJob({ id: `job_${i}` })),
      total: 36,
      hasMore: true,
    };

    it("should display pagination when there are multiple pages", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(manyJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
    });

    it("should not display pagination when there is only one page", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("3 total jobs")).toBeInTheDocument();
      });

      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });

    it("should navigate to next page", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(manyJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("offset=12"),
        );
      });
    });

    it("should navigate to previous page", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(manyJobsResponse),
      );

      render(<McpHistoryClient />);

      // Go to page 2 first
      await waitFor(() => {
        expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /previous/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("offset=0"),
        );
      });
    });

    it("should disable next button on last page", async () => {
      const lastPageResponse = {
        ...manyJobsResponse,
        jobs: [createMockJob()],
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(manyJobsResponse),
      );

      render(<McpHistoryClient />);

      // Navigate to last page
      await waitFor(() => {
        expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
      });

      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(lastPageResponse),
      );
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
      });
    });
  });

  describe("Job Detail Dialog", () => {
    it("should open dialog when clicking a job card", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      // Click on the job card
      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("Job ID")).toBeInTheDocument();
        expect(screen.getByText("job_123456789012345678901234"))
          .toBeInTheDocument();
      });
    });

    it("should display job tier in dialog", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("Tier")).toBeInTheDocument();
        expect(screen.getByText("2K Quality")).toBeInTheDocument();
      });
    });

    it("should display processing time in dialog", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("Processing Time")).toBeInTheDocument();
        expect(screen.getByText("30s")).toBeInTheDocument();
      });
    });

    it("should display 'In progress' when job is still processing", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockProcessingJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("Processing")).toBeInTheDocument();
      });

      // Find and click the card
      const cards = document.querySelectorAll("[class*='cursor-pointer']");
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(screen.getByText("In progress")).toBeInTheDocument();
      });
    });

    it("should display dimensions when available", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("Dimensions")).toBeInTheDocument();
        expect(screen.getByText("2048 x 1536")).toBeInTheDocument();
      });
    });

    it("should not display dimensions when not available", async () => {
      const jobWithoutDimensions = createMockJob({
        outputWidth: undefined,
        outputHeight: undefined,
      });
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [jobWithoutDimensions],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.queryByText("Dimensions")).not.toBeInTheDocument();
      });
    });

    it("should display API key name in dialog when available", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("API Key")).toBeInTheDocument();
      });
    });

    it("should not display API key in dialog when not available", async () => {
      const jobWithoutApiKey = createMockJob({ apiKeyName: undefined });
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [jobWithoutApiKey],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        // There should be no "API Key" label in the grid
        const apiKeyLabels = screen.queryAllByText("API Key");
        expect(apiKeyLabels.length).toBe(0);
      });
    });

    it("should display output image in dialog when available", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        // Dialog should show the output image
        const images = screen.getAllByTestId("next-image");
        // There should be multiple images - one in the card and one in the dialog
        expect(images.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should display completion date when available", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText(/Completed:/)).toBeInTheDocument();
      });
    });

    it("should close dialog when clicking close", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("Job ID")).toBeInTheDocument();
      });

      // Find and click the close button (usually an X button in the dialog)
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        // The dialog content should no longer be visible
        expect(screen.queryByText("Job ID")).not.toBeInTheDocument();
      });
    });
  });

  describe("Date Formatting", () => {
    it("should format dates correctly", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({
          jobs: [mockCompletedJob],
          total: 1,
          hasMore: false,
        }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        // The date should be formatted as e.g., "Jan 15, 2025, 10:00 AM"
        expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
      });
    });
  });

  describe("Duration Formatting", () => {
    it("should format seconds-only duration", async () => {
      const shortJob = createMockJob({
        createdAt: "2025-01-15T10:00:00Z",
        processingCompletedAt: "2025-01-15T10:00:30Z",
      });
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [shortJob], total: 1, hasMore: false }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("30s")).toBeInTheDocument();
      });
    });

    it("should format minutes and seconds duration", async () => {
      const longJob = createMockJob({
        createdAt: "2025-01-15T10:00:00Z",
        processingCompletedAt: "2025-01-15T10:02:15Z",
      });
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse({ jobs: [longJob], total: 1, hasMore: false }),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(screen.getByText("A beautiful sunset over the ocean"))
          .toBeInTheDocument();
      });

      const jobCard = screen.getByText("A beautiful sunset over the ocean")
        .closest(
          "[class*='cursor-pointer']",
        );
      fireEvent.click(jobCard!);

      await waitFor(() => {
        expect(screen.getByText("2m 15s")).toBeInTheDocument();
      });
    });
  });

  describe("API Calls", () => {
    it("should call API with correct parameters on mount", async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        mockFetchResponse(mockJobsResponse),
      );

      render(<McpHistoryClient />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/mcp/history?"),
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("limit=12"),
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("offset=0"),
        );
      });
    });
  });
});
