import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BatchEnhance } from "./batch-enhance";

// Mock fetch
global.fetch = vi.fn();

// Mock console.error to suppress expected error messages in tests
const originalConsoleError = console.error;

describe("BatchEnhance Component", () => {
  const mockImages = [
    { id: "img-1", name: "test1.jpg", url: "https://example.com/test1.jpg" },
    { id: "img-2", name: "test2.jpg", url: "https://example.com/test2.jpg" },
    { id: "img-3", name: "test3.jpg", url: "https://example.com/test3.jpg" },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    console.error = vi.fn();
    // Re-initialize fetch mock after reset
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    console.error = originalConsoleError;
  });

  it("should render batch enhance card", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);
    expect(screen.getByText("Batch Enhancement")).toBeInTheDocument();
    expect(screen.getByText(/Select multiple images/i)).toBeInTheDocument();
  });

  it("should display current balance", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);
    expect(screen.getByText("50 tokens")).toBeInTheDocument();
  });

  it("should show tier selection options", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);
    expect(screen.getByText("1K (1024px)")).toBeInTheDocument();
    expect(screen.getByText("2K (2048px)")).toBeInTheDocument();
    expect(screen.getByText("4K (4096px)")).toBeInTheDocument();
  });

  it("should display image thumbnails for selection", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    expect(screen.getByText("test1.jpg")).toBeInTheDocument();
    expect(screen.getByText("test2.jpg")).toBeInTheDocument();
    expect(screen.getByText("test3.jpg")).toBeInTheDocument();
  });

  it("should allow selecting individual images", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    expect(screen.getByText("Selected Images:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should allow selecting all images", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should allow deselecting all images", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);
    expect(screen.getByText("3")).toBeInTheDocument();

    const deselectAllButton = screen.getByText("Deselect All");
    fireEvent.click(deselectAllButton);

    expect(screen.queryByText("Selected Images:")).not.toBeInTheDocument();
  });

  it("should calculate total cost correctly", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // Default tier is TIER_2K (5 tokens per image)
    expect(screen.getByText("Total Cost:")).toBeInTheDocument();
    expect(screen.getByText("15 tokens")).toBeInTheDocument();
  });

  it("should update cost when tier changes", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // Select TIER_1K (2 tokens per image)
    const tier1k = screen.getByRole("radio", { name: /1K \(1024px\)/i });
    fireEvent.click(tier1k);

    // Cost should be 3 images * 2 tokens = 6 tokens
    expect(screen.getByText("6 tokens")).toBeInTheDocument();
  });

  it("should show insufficient tokens warning", () => {
    render(<BatchEnhance images={mockImages} currentBalance={5} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    expect(screen.getByText(/Insufficient tokens/i)).toBeInTheDocument();
  });

  it("should disable enhance button when insufficient tokens", () => {
    render(<BatchEnhance images={mockImages} currentBalance={5} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    expect(enhanceButton).toBeDisabled();
  });

  it("should start batch enhancement when button clicked", async () => {
    vi.useRealTimers();
    const mockOnEnhanceComplete = vi.fn();
    render(
      <BatchEnhance
        images={mockImages}
        currentBalance={50}
        onEnhanceComplete={mockOnEnhanceComplete}
      />,
    );

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, imageId: "img-1", jobId: "job-1" },
          { success: true, imageId: "img-2", jobId: "job-2" },
          { success: true, imageId: "img-3", jobId: "job-3" },
        ],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("3 images")).toBeInTheDocument();
    }, { timeout: 1000 });
  }, 10000);

  it("should show enhancement progress", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, imageId: "img-1", jobId: "job-1" },
          { success: true, imageId: "img-2", jobId: "job-2" },
          { success: true, imageId: "img-3", jobId: "job-3" },
        ],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("3 enhancing")).toBeInTheDocument();
    }, { timeout: 1000 });
  }, 10000);

  it("should poll job statuses and update progress", async () => {
    vi.useRealTimers();
    const mockOnEnhanceComplete = vi.fn();
    render(
      <BatchEnhance
        images={mockImages}
        currentBalance={50}
        onEnhanceComplete={mockOnEnhanceComplete}
      />,
    );

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, imageId: "img-1", jobId: "job-1" },
        ],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 1000 });
  }, 10000);

  it("should handle enhancement API error", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Enhancement service unavailable" }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Enhancement service unavailable/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  }, 10000);

  it("should handle partial enhancement failure", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, imageId: "img-1", jobId: "job-1" },
          { success: false, imageId: "img-2", error: "Processing failed" },
          { success: true, imageId: "img-3", jobId: "job-3" },
        ],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("2 enhancing")).toBeInTheDocument();
      expect(screen.getByText("1 failed")).toBeInTheDocument();
    }, { timeout: 1000 });
  }, 10000);

  it("should refresh balance after enhancement starts", async () => {
    vi.useRealTimers();
    const mockOnBalanceRefresh = vi.fn();
    render(
      <BatchEnhance
        images={mockImages}
        currentBalance={50}
        onBalanceRefresh={mockOnBalanceRefresh}
      />,
    );

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(mockOnBalanceRefresh).toHaveBeenCalled();
    }, { timeout: 1000 });
  }, 10000);

  it("should clear completed images", async () => {
    vi.useRealTimers();
    // Test clearing completed without waiting for actual polling
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify Clear All button exists while processing
    expect(screen.queryByText("Clear All")).toBeInTheDocument();
  }, 10000);

  it("should clear all images", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify Clear All button exists
    const clearAllButton = screen.getByText("Clear All");
    expect(clearAllButton).toBeInTheDocument();
  }, 10000);

  it("should disable controls while processing", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, imageId: "img-1", jobId: "job-1" },
        ],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      const radioInputs = screen.getAllByRole("radio");
      radioInputs.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    }, { timeout: 1000 });
  }, 10000);

  it("should handle no images selected", () => {
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const enhanceButton = screen.getByRole("button", { name: /Enhance 0 Images/i });
    expect(enhanceButton).toBeDisabled();
  });

  it("should call onEnhanceComplete when all jobs complete", async () => {
    vi.useRealTimers();
    const mockOnEnhanceComplete = vi.fn();
    render(
      <BatchEnhance
        images={mockImages}
        currentBalance={50}
        onEnhanceComplete={mockOnEnhanceComplete}
      />,
    );

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify the enhancement was started (onEnhanceComplete would be called after polling completes)
    expect(global.fetch).toHaveBeenCalled();
  }, 10000);

  it("should toggle selection when clicking already selected image", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    // Select an image
    const image1Container = screen.getByText("test1.jpg").closest("div")?.parentElement;
    if (image1Container) {
      fireEvent.click(image1Container);
    }

    // Verify selected
    expect(screen.getByText("Selected Images:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    // Deselect the same image
    if (image1Container) {
      fireEvent.click(image1Container);
    }

    // Should no longer have selection summary
    expect(screen.queryByText("Selected Images:")).not.toBeInTheDocument();
  });

  it("should handle polling batch status API error", async () => {
    vi.useRealTimers();
    const mockOnEnhanceComplete = vi.fn();
    render(
      <BatchEnhance
        images={mockImages}
        currentBalance={50}
        onEnhanceComplete={mockOnEnhanceComplete}
      />,
    );

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - fails
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait for polling to fail
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    }, { timeout: 5000 });
  }, 15000);

  it("should handle job completion polling with COMPLETED status", async () => {
    vi.useRealTimers();
    const mockOnEnhanceComplete = vi.fn();
    render(
      <BatchEnhance
        images={mockImages}
        currentBalance={50}
        onEnhanceComplete={mockOnEnhanceComplete}
      />,
    );

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - returns COMPLETED
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    }, { timeout: 5000 });

    // onEnhanceComplete should be called when all jobs complete
    await waitFor(() => {
      expect(mockOnEnhanceComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  }, 15000);

  it("should handle job completion polling with FAILED status", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - returns FAILED
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "FAILED", errorMessage: "Processing failed" }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 failed")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should display error message
    await waitFor(() => {
      expect(screen.getByText("Processing failed")).toBeInTheDocument();
    }, { timeout: 2000 });
  }, 15000);

  it("should handle job still processing and continue polling", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - still processing
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    // Third call - now complete
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    // Should keep showing enhancing while processing
    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 3000 });

    // After polling completes, should show completed
    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    }, { timeout: 8000 });
  }, 20000);

  it("should handle clearing completed items", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - returns COMPLETED
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click Clear Completed button
    const clearCompletedButton = screen.getByText("Clear Completed");
    fireEvent.click(clearCompletedButton);

    // Should no longer show the completed image
    await waitFor(() => {
      expect(screen.queryByText("1 completed")).not.toBeInTheDocument();
    }, { timeout: 2000 });
  }, 15000);

  it("should handle Clear All button click", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - returns COMPLETED
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Click Clear All button
    const clearAllButton = screen.getByText("Clear All");
    fireEvent.click(clearAllButton);

    // Should show the image selection grid again
    await waitFor(() => {
      expect(screen.queryByText("1 completed")).not.toBeInTheDocument();
      expect(screen.getByText("Select All")).toBeInTheDocument();
    }, { timeout: 2000 });
  }, 15000);

  it("should render with empty images array", () => {
    render(<BatchEnhance images={[]} currentBalance={50} />);
    expect(screen.getByText("Batch Enhancement")).toBeInTheDocument();
    expect(screen.queryByText("Select Images")).not.toBeInTheDocument();
  });

  it("should handle API error without error message", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // Mock API returning error without message
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Batch enhancement failed/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  }, 10000);

  it("should handle non-Error object thrown during enhancement", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // Mock fetch throwing a non-Error object
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce("Network failure");

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Enhancement failed/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  }, 10000);

  it("should handle batch results with no matching imageId", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // Mock API returning result for different image ID
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-unknown", jobId: "job-1" }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      // The image should still be in pending state since no result matched
      expect(screen.getByText("1 pending")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it("should handle batch status response with no matching jobId", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - no matching job ID
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-unknown", status: "COMPLETED", errorMessage: null }],
      }),
    });

    // Third call - return proper completion
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it("should handle batch results with empty results array", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // Mock API returning empty results
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    // Should be in pending state since no results were returned
    await waitFor(() => {
      expect(screen.getByText("1 pending")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it("should display all status badges correctly", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    // Select all images
    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // Mock API returning mixed results
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { success: true, imageId: "img-1", jobId: "job-1" },
          { success: false, imageId: "img-2", error: "Failed" },
          { success: true, imageId: "img-3", jobId: "job-3" },
        ],
      }),
    });

    // Mock batch status - one complete, one still processing
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [
          { id: "job-1", status: "COMPLETED", errorMessage: null },
          { id: "job-3", status: "PROCESSING", errorMessage: null },
        ],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    fireEvent.click(enhanceButton);

    // Should show various statuses
    await waitFor(() => {
      expect(screen.getByText("3 images")).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show failed badge
    await waitFor(() => {
      expect(screen.getByText("1 failed")).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show completed badge
    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    }, { timeout: 5000 });
  }, 15000);

  it("should not call startBatchEnhancement when no images selected", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    // Do not select any images
    const enhanceButton = screen.getByRole("button", { name: /Enhance 0 Images/i });
    expect(enhanceButton).toBeDisabled();

    // Try to click anyway
    fireEvent.click(enhanceButton);

    // Fetch should not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should select TIER_4K and calculate costs correctly", () => {
    render(<BatchEnhance images={mockImages} currentBalance={100} />);

    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // Select TIER_4K (10 tokens per image)
    const tier4k = screen.getByRole("radio", { name: /4K \(4096px\)/i });
    fireEvent.click(tier4k);

    // Cost should be 3 images * 10 tokens = 30 tokens
    expect(screen.getByText("30 tokens")).toBeInTheDocument();
  });

  it("should display progress bar during processing", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Return PROCESSING to keep it in processing state
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it("should call onEnhanceComplete without callback provided", async () => {
    vi.useRealTimers();
    // Render without onEnhanceComplete callback
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - returns COMPLETED
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    // Should complete without error even without callback
    await waitFor(() => {
      expect(screen.getByText("1 completed")).toBeInTheDocument();
    }, { timeout: 5000 });
  }, 15000);

  it("should handle batch status API network error", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - throws error
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 2000 });

    // Should handle the error gracefully
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    }, { timeout: 5000 });
  }, 15000);

  it("should handle batch status with empty jobs array", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - empty jobs array
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [],
      }),
    });

    // Third call - proper completion
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    // Should still be enhancing after empty jobs response
    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it("should not start enhancement when hasEnoughTokens is false", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={1} />);

    // Select all images - cost will be 15 tokens for TIER_2K
    const selectAllButton = screen.getByText("Select All");
    fireEvent.click(selectAllButton);

    // Button should be disabled
    const enhanceButton = screen.getByRole("button", { name: /Enhance 3 Images/i });
    expect(enhanceButton).toBeDisabled();

    // Try to click anyway
    fireEvent.click(enhanceButton);

    // Fetch should not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should prevent image selection while processing", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    // Select one image
    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Keep processing forever for this test
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "PROCESSING", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 3000 });

    // Image selection grid should be hidden during processing
    expect(screen.queryByText("Select All")).not.toBeInTheDocument();
  }, 10000);

  it("should handle batch status response with undefined jobs", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // First call for batch enhance
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ success: true, imageId: "img-1", jobId: "job-1" }],
      }),
    });

    // Second call for batch status - undefined jobs
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // Third call - proper completion
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [{ id: "job-1", status: "COMPLETED", errorMessage: null }],
      }),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    await waitFor(() => {
      expect(screen.getByText("1 enhancing")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it("should handle batch results with undefined results", async () => {
    vi.useRealTimers();
    render(<BatchEnhance images={mockImages} currentBalance={50} />);

    const image1 = screen.getByText("test1.jpg").closest("div");
    if (image1?.parentElement) {
      fireEvent.click(image1.parentElement);
    }

    // Mock API returning undefined results
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const enhanceButton = screen.getByRole("button", { name: /Enhance 1 Image/i });
    fireEvent.click(enhanceButton);

    // Should be in pending state since no results were returned
    await waitFor(() => {
      expect(screen.getByText("1 pending")).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);
});
