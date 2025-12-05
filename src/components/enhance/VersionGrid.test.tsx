import type { EnhancementTier, JobStatus } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionGrid } from "./VersionGrid";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    ...props
  }: {
    src: string;
    alt: string;
    onError?: () => void;
    fill?: boolean;
    className?: string;
  }) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={onError}
        data-testid="next-image"
        {...props}
      />
    );
  },
}));

// Mock ExportButton component
vi.mock("./ExportButton", () => ({
  ExportButton: ({
    imageUrl,
    fileName,
  }: {
    imageUrl: string;
    fileName: string;
  }) => (
    <button data-testid="export-button" data-url={imageUrl} data-filename={fileName}>
      Export
    </button>
  ),
}));

// Mock fetch for logging
global.fetch = vi.fn();

const createMockVersion = (
  overrides?: Partial<{
    id: string;
    tier: EnhancementTier;
    enhancedUrl: string;
    width: number;
    height: number;
    status: JobStatus;
    createdAt: Date;
  }>,
) => ({
  id: "version-1",
  tier: "TIER_1K" as EnhancementTier,
  enhancedUrl: "https://example.com/enhanced.jpg",
  width: 1920,
  height: 1080,
  createdAt: new Date("2024-01-15T10:30:00Z"),
  status: "COMPLETED" as JobStatus,
  ...overrides,
});

describe("VersionGrid Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to prevent test output noise
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders empty state when no versions", () => {
    render(<VersionGrid versions={[]} />);

    expect(
      screen.getByText("No enhancement versions yet. Create your first enhancement above."),
    ).toBeInTheDocument();
  });

  it("renders list of versions", () => {
    const versions = [
      createMockVersion({ id: "version-1" }),
      createMockVersion({ id: "version-2" }),
      createMockVersion({ id: "version-3" }),
    ];

    render(<VersionGrid versions={versions} />);

    expect(screen.getAllByTestId("next-image")).toHaveLength(3);
  });

  it("shows tier labels correctly", () => {
    const versions = [
      createMockVersion({ tier: "TIER_1K" }),
      createMockVersion({ id: "version-2", tier: "TIER_2K" }),
      createMockVersion({ id: "version-3", tier: "TIER_4K" }),
    ];

    render(<VersionGrid versions={versions} />);

    expect(screen.getByText("1K")).toBeInTheDocument();
    expect(screen.getByText("2K")).toBeInTheDocument();
    expect(screen.getByText("4K")).toBeInTheDocument();
  });

  it("shows dimensions for each version", () => {
    const versions = [
      createMockVersion({ width: 1920, height: 1080 }),
    ];

    render(<VersionGrid versions={versions} />);

    expect(screen.getByText("1920 × 1080")).toBeInTheDocument();
  });

  it("shows formatted date for each version", () => {
    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} />);

    // Date formatted depends on locale - look for the expected formatted date
    const expectedDate = new Date("2024-01-15T10:30:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it("calls onVersionSelect when version is clicked", () => {
    const onVersionSelect = vi.fn();
    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} onVersionSelect={onVersionSelect} />);

    const card = screen.getByTestId("next-image").closest("div")?.parentElement?.parentElement;
    if (card) {
      fireEvent.click(card);
    }

    expect(onVersionSelect).toHaveBeenCalledWith("version-1");
  });

  it("highlights selected version", () => {
    const versions = [
      createMockVersion({ id: "version-1" }),
      createMockVersion({ id: "version-2" }),
    ];

    render(
      <VersionGrid versions={versions} selectedVersionId="version-1" />,
    );

    const cards = screen.getAllByTestId("next-image").map(
      img => img.closest("div")?.parentElement?.parentElement,
    );

    // Check if selected card has the ring class
    expect(cards[0]?.className).toContain("ring-2");
    expect(cards[1]?.className).not.toContain("ring-2");
  });

  it("shows export button for completed versions", () => {
    const versions = [createMockVersion({ status: "COMPLETED" })];

    render(<VersionGrid versions={versions} />);

    expect(screen.getByTestId("export-button")).toBeInTheDocument();
  });

  it("does not show export button for processing versions", () => {
    const versions = [createMockVersion({ status: "PROCESSING" })];

    render(<VersionGrid versions={versions} />);

    expect(screen.queryByTestId("export-button")).not.toBeInTheDocument();
  });

  it("does not show export button for failed versions", () => {
    const versions = [createMockVersion({ status: "FAILED" })];

    render(<VersionGrid versions={versions} />);

    expect(screen.queryByTestId("export-button")).not.toBeInTheDocument();
  });

  it("shows processing state with spinner", () => {
    const versions = [createMockVersion({ status: "PROCESSING" })];

    render(<VersionGrid versions={versions} />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
    // Check for spinner by looking for the animate-spin class
    const spinner = screen.getByText("Processing...").previousElementSibling;
    expect(spinner?.className).toContain("animate-spin");
  });

  it("shows failed state", () => {
    const versions = [createMockVersion({ status: "FAILED" })];

    render(<VersionGrid versions={versions} />);

    expect(screen.getByText("Enhancement Failed")).toBeInTheDocument();
  });

  it("handles image load error", async () => {
    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} />);

    const image = screen.getByTestId("next-image");
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByText("Image failed to load")).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalled();
  });

  it("logs broken image to server", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;

    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} />);

    const image = screen.getByTestId("next-image");
    fireEvent.error(image);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/logs/image-error",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    const callArgs = mockFetch.mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.type).toBe("ENHANCED_IMAGE_LOAD_ERROR");
    expect(body.versionId).toBe("version-1");
    expect(body.tier).toBe("TIER_1K");
  });

  it("does not show failed image after error", async () => {
    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} />);

    const image = screen.getByTestId("next-image");

    // Initially image should be visible
    expect(image).toBeInTheDocument();

    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByText("Image failed to load")).toBeInTheDocument();
    });

    // Image should no longer be rendered
    expect(screen.queryByTestId("next-image")).not.toBeInTheDocument();
  });

  it("handles logging error silently", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = mockFetch;

    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} />);

    const image = screen.getByTestId("next-image");
    fireEvent.error(image);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Should still show the error state even if logging fails
    expect(screen.getByText("Image failed to load")).toBeInTheDocument();
  });

  it("renders export button with correct props", () => {
    const versions = [
      createMockVersion({
        id: "version-1",
        tier: "TIER_2K",
        enhancedUrl: "https://example.com/enhanced-2k.jpg",
      }),
    ];

    render(<VersionGrid versions={versions} />);

    const exportButton = screen.getByTestId("export-button");
    expect(exportButton).toHaveAttribute("data-url", "https://example.com/enhanced-2k.jpg");
    expect(exportButton).toHaveAttribute("data-filename", "enhanced-2K-version-1.jpg");
  });

  it("renders multiple versions with different statuses", () => {
    const versions = [
      createMockVersion({ id: "version-1", status: "COMPLETED" }),
      createMockVersion({ id: "version-2", status: "PROCESSING" }),
      createMockVersion({ id: "version-3", status: "FAILED" }),
    ];

    render(<VersionGrid versions={versions} />);

    expect(screen.getAllByTestId("next-image")).toHaveLength(1); // Only completed shows image
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.getByText("Enhancement Failed")).toBeInTheDocument();
    expect(screen.getByTestId("export-button")).toBeInTheDocument(); // Only for completed
  });

  it("handles version selection with onVersionSelect callback", () => {
    const onVersionSelect = vi.fn();
    const versions = [
      createMockVersion({ id: "version-1" }),
      createMockVersion({ id: "version-2" }),
    ];

    render(<VersionGrid versions={versions} onVersionSelect={onVersionSelect} />);

    const cards = screen.getAllByTestId("next-image").map(
      img => img.closest("div")?.parentElement?.parentElement,
    );

    if (cards[0]) fireEvent.click(cards[0]);
    expect(onVersionSelect).toHaveBeenCalledWith("version-1");

    if (cards[1]) fireEvent.click(cards[1]);
    expect(onVersionSelect).toHaveBeenCalledWith("version-2");

    expect(onVersionSelect).toHaveBeenCalledTimes(2);
  });

  it("does not call onVersionSelect when not provided", () => {
    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} />);

    const card = screen.getByTestId("next-image").closest("div")?.parentElement?.parentElement;

    // Should not throw error when clicking without callback
    expect(() => {
      if (card) fireEvent.click(card);
    }).not.toThrow();
  });

  it("shows pending state correctly", () => {
    const versions = [createMockVersion({ status: "PENDING" })];

    render(<VersionGrid versions={versions} />);

    // Pending should show "Queued..." text
    expect(screen.getByText("Queued...")).toBeInTheDocument();
  });

  it("maintains failed state after multiple errors", async () => {
    const versions = [createMockVersion({ id: "version-1" })];

    render(<VersionGrid versions={versions} />);

    const image = screen.getByTestId("next-image");

    // Trigger error multiple times
    fireEvent.error(image);
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByText("Image failed to load")).toBeInTheDocument();
    });

    // Should only call logging once per version
    expect(global.fetch).toHaveBeenCalled();
  });

  it("shows cancelled status badge", () => {
    const versions = [createMockVersion({ status: "CANCELLED" })];

    render(<VersionGrid versions={versions} />);

    expect(screen.getAllByText("Cancelled")).toHaveLength(2); // One in image area, one in badge
  });

  it("shows cancel button for PENDING jobs", () => {
    const onJobCancel = vi.fn();
    const versions = [createMockVersion({ status: "PENDING" })];

    render(<VersionGrid versions={versions} onJobCancel={onJobCancel} />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows cancel button for PROCESSING jobs", () => {
    const onJobCancel = vi.fn();
    const versions = [createMockVersion({ status: "PROCESSING" })];

    render(<VersionGrid versions={versions} onJobCancel={onJobCancel} />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows delete button for COMPLETED jobs", () => {
    const onJobDelete = vi.fn();
    const versions = [createMockVersion({ status: "COMPLETED" })];

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    const deleteButton = screen.getByRole("button", { name: "" });
    expect(deleteButton).toBeInTheDocument();
  });

  it("shows delete button for FAILED jobs", () => {
    const onJobDelete = vi.fn();
    const versions = [createMockVersion({ status: "FAILED" })];

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("shows delete button for CANCELLED jobs", () => {
    const onJobDelete = vi.fn();
    const versions = [createMockVersion({ status: "CANCELLED" })];

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onJobCancel with confirmation", async () => {
    const onJobCancel = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const versions = [createMockVersion({ id: "job-1", status: "PENDING" })];

    render(<VersionGrid versions={versions} onJobCancel={onJobCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to cancel this job? Your tokens will be refunded.",
      );
      expect(onJobCancel).toHaveBeenCalledWith("job-1");
    });
  });

  it("does not call onJobCancel when confirmation is cancelled", async () => {
    const onJobCancel = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const versions = [createMockVersion({ status: "PENDING" })];

    render(<VersionGrid versions={versions} onJobCancel={onJobCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    expect(onJobCancel).not.toHaveBeenCalled();
  });

  it("calls onJobDelete with confirmation", async () => {
    const onJobDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const versions = [createMockVersion({ id: "job-1", status: "FAILED" })];

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this job? This action cannot be undone.",
      );
      expect(onJobDelete).toHaveBeenCalledWith("job-1");
    });
  });

  it("does not call onJobDelete when confirmation is cancelled", async () => {
    const onJobDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const versions = [createMockVersion({ status: "FAILED" })];

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    expect(onJobDelete).not.toHaveBeenCalled();
  });

  it("shows loading state when cancelling job", async () => {
    const onJobCancel = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const versions = [createMockVersion({ status: "PENDING" })];

    render(<VersionGrid versions={versions} onJobCancel={onJobCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText("Cancelling...")).toBeInTheDocument();
    });
  });

  it("shows loading state when deleting job", async () => {
    const onJobDelete = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const versions = [createMockVersion({ status: "FAILED" })];

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Deleting...")).toBeInTheDocument();
    });
  });

  it("handles cancel error gracefully", async () => {
    const onJobCancel = vi.fn().mockRejectedValue(new Error("Cancel failed"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const versions = [createMockVersion({ status: "PENDING" })];

    render(<VersionGrid versions={versions} onJobCancel={onJobCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Cancel failed");
    });
  });

  it("handles delete error gracefully", async () => {
    const onJobDelete = vi.fn().mockRejectedValue(new Error("Delete failed"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const versions = [createMockVersion({ status: "FAILED" })];

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Delete failed");
    });
  });

  it("does not propagate click event when clicking cancel button", async () => {
    const onVersionSelect = vi.fn();
    const onJobCancel = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const versions = [createMockVersion({ status: "PENDING" })];

    render(
      <VersionGrid
        versions={versions}
        onVersionSelect={onVersionSelect}
        onJobCancel={onJobCancel}
      />,
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(onJobCancel).toHaveBeenCalled();
    });

    expect(onVersionSelect).not.toHaveBeenCalled();
  });

  it("does not propagate click event when clicking delete button", async () => {
    const onVersionSelect = vi.fn();
    const onJobDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const versions = [createMockVersion({ status: "FAILED" })];

    render(
      <VersionGrid
        versions={versions}
        onVersionSelect={onVersionSelect}
        onJobDelete={onJobDelete}
      />,
    );

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onJobDelete).toHaveBeenCalled();
    });

    expect(onVersionSelect).not.toHaveBeenCalled();
  });
});
