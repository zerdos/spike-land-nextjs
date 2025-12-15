import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AlbumBatchEnhance,
  type AlbumBatchEnhanceProps,
  countEnhancedByTier,
} from "./AlbumBatchEnhance";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from "sonner";

const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
};

global.fetch = vi.fn();

const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

describe("countEnhancedByTier", () => {
  it("should count images enhanced at each tier", () => {
    const images = [
      {
        id: "1",
        enhancementJobs: [
          { tier: "TIER_1K" as const, status: "COMPLETED" },
          { tier: "TIER_2K" as const, status: "COMPLETED" },
        ],
      },
      {
        id: "2",
        enhancementJobs: [{ tier: "TIER_1K" as const, status: "COMPLETED" }],
      },
      {
        id: "3",
        enhancementJobs: [{ tier: "TIER_4K" as const, status: "PENDING" }],
      },
    ];

    const result = countEnhancedByTier(images);

    expect(result).toEqual({
      TIER_1K: 2,
      TIER_2K: 1,
      TIER_4K: 0,
    });
  });

  it("should return zero counts for empty array", () => {
    const result = countEnhancedByTier([]);

    expect(result).toEqual({
      TIER_1K: 0,
      TIER_2K: 0,
      TIER_4K: 0,
    });
  });

  it("should not count non-completed jobs", () => {
    const images = [
      {
        id: "1",
        enhancementJobs: [
          { tier: "TIER_1K" as const, status: "PENDING" },
          { tier: "TIER_2K" as const, status: "FAILED" },
          { tier: "TIER_4K" as const, status: "PROCESSING" },
        ],
      },
    ];

    const result = countEnhancedByTier(images);

    expect(result).toEqual({
      TIER_1K: 0,
      TIER_2K: 0,
      TIER_4K: 0,
    });
  });
});

describe("AlbumBatchEnhance", () => {
  const defaultProps: AlbumBatchEnhanceProps = {
    albumId: "album-1",
    albumName: "Test Album",
    images: [
      { id: "img-1", enhancementJobs: [] },
      { id: "img-2", enhancementJobs: [] },
      { id: "img-3", enhancementJobs: [] },
    ],
    onEnhancementComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should render enhance all button", () => {
    render(<AlbumBatchEnhance {...defaultProps} />);

    expect(screen.getByTestId("enhance-all-button")).toBeInTheDocument();
    expect(screen.getByText("Enhance All")).toBeInTheDocument();
  });

  it("should not render when there are no images", () => {
    render(<AlbumBatchEnhance {...defaultProps} images={[]} />);

    expect(screen.queryByTestId("enhance-all-button")).not.toBeInTheDocument();
  });

  it("should open dialog when button is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 50 }),
    });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByText(`Enhance Album: ${defaultProps.albumName}`))
        .toBeInTheDocument();
    });
  });

  it("should fetch and display user balance when dialog opens", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 100 }),
    });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("user-balance")).toHaveTextContent(
        "100 tokens",
      );
    });
  });

  it("should show loading state while fetching balance", async () => {
    let resolveBalance: (value: unknown) => void;
    const balancePromise = new Promise((resolve) => {
      resolveBalance = resolve;
    });

    mockFetch.mockImplementationOnce(() =>
      balancePromise.then(() => ({
        ok: true,
        json: async () => ({ balance: 50 }),
      }))
    );

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    expect(screen.getByTestId("balance-loader")).toBeInTheDocument();

    resolveBalance!(undefined);

    await waitFor(() => {
      expect(screen.queryByTestId("balance-loader")).not.toBeInTheDocument();
    });
  });

  it("should display enhanced counts for each tier", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 50 }),
    });

    const imagesWithEnhancements = [
      {
        id: "img-1",
        enhancementJobs: [{ tier: "TIER_1K" as const, status: "COMPLETED" }],
      },
      {
        id: "img-2",
        enhancementJobs: [
          { tier: "TIER_1K" as const, status: "COMPLETED" },
          { tier: "TIER_2K" as const, status: "COMPLETED" },
        ],
      },
      { id: "img-3", enhancementJobs: [] },
    ];

    render(
      <AlbumBatchEnhance {...defaultProps} images={imagesWithEnhancements} />,
    );

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("enhanced-count-TIER_1K")).toHaveTextContent(
        "1K (1024px): 2/3",
      );
      expect(screen.getByTestId("enhanced-count-TIER_2K")).toHaveTextContent(
        "2K (2048px): 1/3",
      );
      expect(screen.getByTestId("enhanced-count-TIER_4K")).toHaveTextContent(
        "4K (4096px): 0/3",
      );
    });
  });

  it("should show tier selection with costs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 50 }),
    });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByText("1K (1024px)")).toBeInTheDocument();
      expect(screen.getByText("2K (2048px)")).toBeInTheDocument();
      expect(screen.getByText("4K (4096px)")).toBeInTheDocument();
    });
  });

  it("should calculate total cost correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 50 }),
    });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("total-cost")).toHaveTextContent("15 tokens");
    });
  });

  it("should update cost when tier changes", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 50 }),
    });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("total-cost")).toBeInTheDocument();
    });

    const tier1kRadio = screen.getByRole("radio", { name: /1K \(1024px\)/i });
    fireEvent.click(tier1kRadio);

    expect(screen.getByTestId("total-cost")).toHaveTextContent("6 tokens");
  });

  it("should show insufficient balance warning", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 5 }),
    });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(
        screen.getByTestId("insufficient-balance-warning"),
      ).toBeInTheDocument();
    });
  });

  it("should disable confirm button when balance is insufficient", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 5 }),
    });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeDisabled();
    });
  });

  it("should show message when all images are already enhanced at selected tier", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: 50 }),
    });

    const fullyEnhancedImages = [
      {
        id: "img-1",
        enhancementJobs: [{ tier: "TIER_2K" as const, status: "COMPLETED" }],
      },
      {
        id: "img-2",
        enhancementJobs: [{ tier: "TIER_2K" as const, status: "COMPLETED" }],
      },
    ];

    render(
      <AlbumBatchEnhance {...defaultProps} images={fullyEnhancedImages} />,
    );

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("all-enhanced-message")).toBeInTheDocument();
    });
  });

  it("should start batch enhancement when confirm button is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { success: true, imageId: "img-1", jobId: "job-1" },
            { success: true, imageId: "img-2", jobId: "job-2" },
            { success: true, imageId: "img-3", jobId: "job-3" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 35 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [
            { id: "job-1", status: "COMPLETED", errorMessage: null },
            { id: "job-2", status: "COMPLETED", errorMessage: null },
            { id: "job-3", status: "COMPLETED", errorMessage: null },
          ],
        }),
      });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(screen.getByTestId("enhancement-progress")).toBeInTheDocument();
    });
  });

  it("should show progress during enhancement", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { success: true, imageId: "img-1", jobId: "job-1" },
            { success: true, imageId: "img-2", jobId: "job-2" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 40 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [
            { id: "job-1", status: "PROCESSING", errorMessage: null },
            { id: "job-2", status: "PROCESSING", errorMessage: null },
          ],
        }),
      });

    const twoImages = [
      { id: "img-1", enhancementJobs: [] },
      { id: "img-2", enhancementJobs: [] },
    ];

    render(<AlbumBatchEnhance {...defaultProps} images={twoImages} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(screen.getByText("2 enhancing")).toBeInTheDocument();
    });
  });

  it("should handle batch enhancement API error", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Enhancement service unavailable" }),
      });

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Enhancement service unavailable",
      );
    });
  });

  it("should show success toast when all enhancements complete", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 45 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
        }),
      });

    const oneImage = [{ id: "img-1", enhancementJobs: [] }];

    render(<AlbumBatchEnhance {...defaultProps} images={oneImage} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Successfully enhanced 1 image",
      );
    });
  });

  it("should show warning toast when some enhancements fail", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { success: true, imageId: "img-1", jobId: "job-1" },
            { success: true, imageId: "img-2", jobId: "job-2" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 40 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [
            { id: "job-1", status: "COMPLETED", errorMessage: null },
            { id: "job-2", status: "FAILED", errorMessage: "Processing error" },
          ],
        }),
      });

    const twoImages = [
      { id: "img-1", enhancementJobs: [] },
      { id: "img-2", enhancementJobs: [] },
    ];

    render(<AlbumBatchEnhance {...defaultProps} images={twoImages} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(mockToast.warning).toHaveBeenCalledWith(
        "Enhanced 1 image, 1 failed",
      );
    });
  });

  it("should call onEnhancementComplete when processing finishes", async () => {
    const mockOnComplete = vi.fn();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 45 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
        }),
      });

    const oneImage = [{ id: "img-1", enhancementJobs: [] }];

    render(
      <AlbumBatchEnhance
        {...defaultProps}
        images={oneImage}
        onEnhancementComplete={mockOnComplete}
      />,
    );

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it("should apply custom className to trigger button", () => {
    render(<AlbumBatchEnhance {...defaultProps} className="custom-class" />);

    expect(screen.getByTestId("enhance-all-button")).toHaveClass(
      "custom-class",
    );
  });

  it("should prevent dialog close while processing", async () => {
    let resolveJobs: (value: unknown) => void;
    const jobsPromise = new Promise((resolve) => {
      resolveJobs = resolve;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 45 }),
      })
      .mockImplementationOnce(() =>
        jobsPromise.then(() => ({
          ok: true,
          json: async () => ({
            jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
          }),
        }))
      );

    const oneImage = [{ id: "img-1", enhancementJobs: [] }];

    render(<AlbumBatchEnhance {...defaultProps} images={oneImage} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(screen.getByTestId("done-button")).toBeDisabled();
    });

    resolveJobs!(undefined);

    await waitFor(() => {
      expect(screen.getByTestId("done-button")).toBeEnabled();
    });
  });

  it("should skip already enhanced images for selected tier", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ success: true, imageId: "img-2", jobId: "job-2" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 45 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: "job-2", status: "COMPLETED", errorMessage: null }],
        }),
      });

    const mixedImages = [
      {
        id: "img-1",
        enhancementJobs: [{ tier: "TIER_2K" as const, status: "COMPLETED" }],
      },
      { id: "img-2", enhancementJobs: [] },
    ];

    render(<AlbumBatchEnhance {...defaultProps} images={mixedImages} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("total-cost")).toHaveTextContent("5 tokens");
    });

    expect(screen.getByText("Images to enhance:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should handle partial job creation failure", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { success: true, imageId: "img-1", jobId: "job-1" },
            { success: false, imageId: "img-2", error: "Failed to create job" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 45 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
        }),
      });

    const twoImages = [
      { id: "img-1", enhancementJobs: [] },
      { id: "img-2", enhancementJobs: [] },
    ];

    render(<AlbumBatchEnhance {...defaultProps} images={twoImages} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(screen.getByTestId("enhancement-progress")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("1 failed")).toBeInTheDocument();
    });
  });

  it("should handle balance fetch error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<AlbumBatchEnhance {...defaultProps} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("user-balance")).toHaveTextContent("0 tokens");
    });
  });

  it("should show error toast when all jobs fail to start", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { success: false, imageId: "img-1", error: "Failed" },
            { success: false, imageId: "img-2", error: "Failed" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 50 }),
      });

    const twoImages = [
      { id: "img-1", enhancementJobs: [] },
      { id: "img-2", enhancementJobs: [] },
    ];

    render(<AlbumBatchEnhance {...defaultProps} images={twoImages} />);

    fireEvent.click(screen.getByTestId("enhance-all-button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-enhance-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("confirm-enhance-button"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to start enhancement for all images",
      );
    });
  });
});
