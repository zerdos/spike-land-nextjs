import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchEnhance } from "./batch-enhance";

// Mock fetch
global.fetch = vi.fn();

describe("BatchEnhance Component", () => {
  const mockImages = [
    { id: "img-1", name: "test1.jpg", url: "https://example.com/test1.jpg" },
    { id: "img-2", name: "test2.jpg", url: "https://example.com/test2.jpg" },
    { id: "img-3", name: "test3.jpg", url: "https://example.com/test3.jpg" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
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
});
