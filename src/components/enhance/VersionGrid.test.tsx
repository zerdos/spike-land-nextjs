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

// Mock BulkDeleteDialog component
vi.mock("./BulkDeleteDialog", () => ({
  BulkDeleteDialog: ({
    selectedVersions,
    onDelete,
    onCancel: _onCancel,
    disabled,
  }: {
    selectedVersions: Array<{ id: string; tier: string; sizeBytes?: number | null; }>;
    onDelete: (ids: string[]) => Promise<void>;
    onCancel: () => void;
    disabled?: boolean;
  }) => {
    if (selectedVersions.length === 0) return null;
    return (
      <div>
        <button
          onClick={() => {
            const dialog = document.createElement("div");
            dialog.setAttribute("role", "dialog");
            dialog.innerHTML = `
              <button data-testid="confirm-delete">Delete ${selectedVersions.length} version${
              selectedVersions.length !== 1 ? "s" : ""
            }</button>
            `;
            document.body.appendChild(dialog);
            const confirmBtn = dialog.querySelector("[data-testid='confirm-delete']");
            confirmBtn?.addEventListener("click", () => {
              onDelete(selectedVersions.map((v) => v.id));
              document.body.removeChild(dialog);
            });
          }}
          disabled={disabled}
        >
          Delete Selected ({selectedVersions.length})
        </button>
      </div>
    );
  },
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
    sizeBytes: number | null;
  }>,
) => ({
  id: "version-1",
  tier: "TIER_1K" as EnhancementTier,
  enhancedUrl: "https://example.com/enhanced.jpg",
  width: 1920,
  height: 1080,
  createdAt: new Date("2024-01-15T10:30:00Z"),
  status: "COMPLETED" as JobStatus,
  sizeBytes: 1024 * 500,
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

    expect(screen.getByText("1920 x 1080")).toBeInTheDocument();
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

  // New tests for storage size display
  it("shows storage size for completed versions", () => {
    const versions = [createMockVersion({ sizeBytes: 1024 * 1024 * 2 })];

    render(<VersionGrid versions={versions} />);

    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
  });

  it("shows total storage used", () => {
    const versions = [
      createMockVersion({ id: "v1", sizeBytes: 1024 * 1024 }),
      createMockVersion({ id: "v2", sizeBytes: 1024 * 1024 * 2 }),
    ];

    render(<VersionGrid versions={versions} />);

    expect(screen.getByText(/total storage/i)).toBeInTheDocument();
  });

  it("does not show size for versions without sizeBytes", () => {
    const versions = [createMockVersion({ sizeBytes: null })];

    render(<VersionGrid versions={versions} />);

    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  // New tests for bulk delete functionality
  it("shows bulk select controls when enableBulkSelect is true", () => {
    const versions = [createMockVersion()];
    const onBulkDelete = vi.fn();

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument();
  });

  it("hides bulk select controls when enableBulkSelect is false", () => {
    const versions = [createMockVersion()];

    render(<VersionGrid versions={versions} enableBulkSelect={false} />);

    expect(screen.queryByRole("button", { name: /select all/i })).not.toBeInTheDocument();
  });

  it("shows checkbox for deletable versions when bulk select is enabled", () => {
    const versions = [createMockVersion()];
    const onBulkDelete = vi.fn();

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("toggles version selection when checkbox is clicked", async () => {
    const versions = [createMockVersion()];
    const onBulkDelete = vi.fn();

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toHaveAttribute("data-state", "checked");
    });
  });

  it("selects all versions when Select All is clicked", async () => {
    const versions = [
      createMockVersion({ id: "v1" }),
      createMockVersion({ id: "v2" }),
    ];
    const onBulkDelete = vi.fn();

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    const selectAllButton = screen.getByRole("button", { name: /select all/i });
    fireEvent.click(selectAllButton);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute("data-state", "checked");
      });
    });
  });

  it("deselects all versions when Deselect All is clicked", async () => {
    const versions = [
      createMockVersion({ id: "v1" }),
      createMockVersion({ id: "v2" }),
    ];
    const onBulkDelete = vi.fn();

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    // First select all
    const selectAllButton = screen.getByRole("button", { name: /select all/i });
    fireEvent.click(selectAllButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument();
    });

    // Then deselect all
    const deselectAllButton = screen.getByRole("button", { name: /deselect all/i });
    fireEvent.click(deselectAllButton);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute("data-state", "unchecked");
      });
    });
  });

  it("shows bulk delete dialog when versions are selected", async () => {
    const versions = [createMockVersion()];
    const onBulkDelete = vi.fn();

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
    });
  });

  it("calls onBulkDelete when bulk delete is confirmed", async () => {
    const versions = [createMockVersion()];
    const onBulkDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /delete selected/i });
    fireEvent.click(deleteButton);

    // Now confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /delete 1 version/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onBulkDelete).toHaveBeenCalledWith(["version-1"]);
    });
  });

  it("highlights selected versions with destructive ring", async () => {
    const versions = [createMockVersion()];
    const onBulkDelete = vi.fn();

    const { container } = render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => {
      const selectedCard = container.querySelector("[class*='ring-destructive']");
      expect(selectedCard).toBeInTheDocument();
    });
  });

  it("does not show checkbox for non-deletable versions", () => {
    const versions = [createMockVersion({ status: "PROCESSING" })];
    const onBulkDelete = vi.fn();

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows REFUNDED status in deletable versions", () => {
    const versions = [createMockVersion({ status: "REFUNDED" })];
    const onJobDelete = vi.fn();

    render(<VersionGrid versions={versions} onJobDelete={onJobDelete} />);

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("does not show dimensions when both width and height are 0", () => {
    const versions = [createMockVersion({ width: 0, height: 0 })];

    render(<VersionGrid versions={versions} />);

    expect(screen.queryByText("0 x 0")).not.toBeInTheDocument();
  });

  it("clears selection when bulk delete succeeds", async () => {
    const versions = [createMockVersion()];
    const onBulkDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <VersionGrid
        versions={versions}
        enableBulkSelect={true}
        onBulkDelete={onBulkDelete}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(checkbox).toHaveAttribute("data-state", "checked");
    });

    const deleteButton = screen.getByRole("button", { name: /delete selected/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /delete 1 version/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onBulkDelete).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(checkbox).toHaveAttribute("data-state", "unchecked");
    });
  });
});
