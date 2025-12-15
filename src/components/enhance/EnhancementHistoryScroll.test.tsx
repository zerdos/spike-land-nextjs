import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnhancementHistoryScroll, type EnhancementVersion } from "./EnhancementHistoryScroll";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: (
    { src, alt, onError, ...props }: {
      src: string;
      alt: string;
      onError?: () => void;
    },
  ) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} {...props} />
  ),
}));

describe("EnhancementHistoryScroll", () => {
  const mockVersions: EnhancementVersion[] = [
    {
      id: "version-1",
      tier: "TIER_1K",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
      width: 1024,
      height: 768,
      createdAt: new Date("2024-01-15T10:30:00"),
      status: "COMPLETED",
      sizeBytes: 256000,
    },
    {
      id: "version-2",
      tier: "TIER_2K",
      enhancedUrl: "https://example.com/enhanced-2k.jpg",
      width: 2048,
      height: 1536,
      createdAt: new Date("2024-01-15T11:00:00"),
      status: "COMPLETED",
      sizeBytes: 512000,
    },
    {
      id: "version-3",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date("2024-01-15T11:30:00"),
      status: "PROCESSING",
      sizeBytes: null,
    },
  ];

  const mockOnVersionSelect = vi.fn();
  const mockOnJobCancel = vi.fn().mockResolvedValue(undefined);
  const mockOnJobDelete = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render empty state when no versions", () => {
    render(<EnhancementHistoryScroll versions={[]} />);
    expect(screen.getByText(/no enhancement versions yet/i))
      .toBeInTheDocument();
  });

  it("should render versions with tier badges", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    expect(screen.getByText("1K")).toBeInTheDocument();
    expect(screen.getByText("2K")).toBeInTheDocument();
    expect(screen.getByText("4K")).toBeInTheDocument();
  });

  it("should render dimensions for completed versions", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    expect(screen.getByText("1024 x 768")).toBeInTheDocument();
    expect(screen.getByText("2048 x 1536")).toBeInTheDocument();
  });

  it("should render file sizes for completed versions", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    // formatFileSize uses 1024 as base: 256000 / 1024 = 250.0 KB, 512000 / 1024 = 500.0 KB
    expect(screen.getByText("250.0 KB")).toBeInTheDocument();
    expect(screen.getByText("500.0 KB")).toBeInTheDocument();
  });

  it("should call onVersionSelect when clicking a version", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    const firstVersion = screen.getByText("1K").closest(
      "div[class*='cursor-pointer']",
    );
    if (firstVersion) {
      fireEvent.click(firstVersion);
      expect(mockOnVersionSelect).toHaveBeenCalledWith("version-1");
    }
  });

  it("should highlight selected version", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        selectedVersionId="version-1"
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    const selectedVersion = screen.getByText("1K").closest(
      "div[class*='cursor-pointer']",
    );
    expect(selectedVersion?.className).toContain("ring-2");
    expect(selectedVersion?.className).toContain("ring-cyan-500");
  });

  it("should show processing state for in-progress jobs", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("should show queued state for pending jobs", () => {
    const pendingVersion: EnhancementVersion = {
      id: "version-pending",
      tier: "TIER_1K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PENDING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[pendingVersion]}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    expect(screen.getByText("Queued")).toBeInTheDocument();
  });

  it("should show failed state for failed jobs", () => {
    const failedVersion: EnhancementVersion = {
      id: "version-failed",
      tier: "TIER_1K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "FAILED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[failedVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("should show delete button for completed versions", () => {
    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("should show cancel button for processing versions", () => {
    const processingVersion: EnhancementVersion = {
      id: "version-processing",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobCancel={mockOnJobCancel}
      />,
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should call onJobDelete when delete is confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnJobDelete).toHaveBeenCalledWith("version-1");
  });

  it("should not call onJobDelete when delete is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnJobDelete).not.toHaveBeenCalled();
  });

  it("should call onJobCancel when cancel is confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const processingVersion: EnhancementVersion = {
      id: "version-processing",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobCancel={mockOnJobCancel}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnJobCancel).toHaveBeenCalledWith("version-processing");
  });

  it("should render dates in correct format", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    // The date format depends on locale, but we can check it renders something
    const dateElements = screen.getAllByText(/Jan|15/i);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it("should handle image load error and show failed to load message", () => {
    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    // Find the image and trigger an error
    const img = screen.getByAltText("Enhanced version 1K");
    fireEvent.error(img);

    // After error, should show "Failed to load" message
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("should not call onJobCancel when confirm is declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const processingVersion: EnhancementVersion = {
      id: "version-processing",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobCancel={mockOnJobCancel}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnJobCancel).not.toHaveBeenCalled();
  });

  it("should not trigger cancel when onJobCancel is not provided", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const processingVersion: EnhancementVersion = {
      id: "version-processing",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        // No onJobCancel provided
      />,
    );

    // Cancel button should not be shown when onJobCancel is not provided
    expect(screen.queryByRole("button", { name: /cancel/i })).not
      .toBeInTheDocument();
  });

  it("should show cancel button for pending jobs", () => {
    const pendingVersion: EnhancementVersion = {
      id: "version-pending",
      tier: "TIER_1K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PENDING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[pendingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobCancel={mockOnJobCancel}
      />,
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should handle cancel error with Error instance", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mockCancelError = vi.fn().mockRejectedValue(
      new Error("Cancel failed"),
    );

    const processingVersion: EnhancementVersion = {
      id: "version-processing",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobCancel={mockCancelError}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Wait for the async error handling
    await vi.waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Cancel failed");
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to cancel job:",
      expect.any(Error),
    );
  });

  it("should handle cancel error with non-Error instance", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mockCancelError = vi.fn().mockRejectedValue("String error");

    const processingVersion: EnhancementVersion = {
      id: "version-processing",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobCancel={mockCancelError}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Wait for the async error handling
    await vi.waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to cancel job");
    });
  });

  it("should handle delete error with Error instance", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mockDeleteError = vi.fn().mockRejectedValue(
      new Error("Delete failed"),
    );

    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockDeleteError}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    // Wait for the async error handling
    await vi.waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Delete failed");
    });
    expect(console.error).toHaveBeenCalledWith(
      "Failed to delete job:",
      expect.any(Error),
    );
  });

  it("should handle delete error with non-Error instance", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mockDeleteError = vi.fn().mockRejectedValue("String error");

    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockDeleteError}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    // Wait for the async error handling
    await vi.waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to delete job");
    });
  });

  it("should not show delete button when onJobDelete is not provided for completed versions", () => {
    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
        // No onJobDelete provided
      />,
    );

    expect(screen.queryByRole("button", { name: /delete/i })).not
      .toBeInTheDocument();
  });

  it("should not show remove button when onJobDelete is not provided for failed versions", () => {
    const failedVersion: EnhancementVersion = {
      id: "version-failed",
      tier: "TIER_1K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "FAILED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[failedVersion]}
        onVersionSelect={mockOnVersionSelect}
        // No onJobDelete provided
      />,
    );

    expect(screen.queryByRole("button", { name: /remove/i })).not
      .toBeInTheDocument();
  });

  it("should not display dimensions when width is 0", () => {
    const zeroWidthVersion: EnhancementVersion = {
      id: "version-zero-width",
      tier: "TIER_1K",
      enhancedUrl: "https://example.com/enhanced.jpg",
      width: 0,
      height: 768,
      createdAt: new Date(),
      status: "COMPLETED",
      sizeBytes: 256000,
    };

    render(
      <EnhancementHistoryScroll
        versions={[zeroWidthVersion]}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    // Should not display "0 x 768"
    expect(screen.queryByText(/0 x 768/)).not.toBeInTheDocument();
  });

  it("should not display dimensions when height is 0", () => {
    const zeroHeightVersion: EnhancementVersion = {
      id: "version-zero-height",
      tier: "TIER_1K",
      enhancedUrl: "https://example.com/enhanced.jpg",
      width: 1024,
      height: 0,
      createdAt: new Date(),
      status: "COMPLETED",
      sizeBytes: 256000,
    };

    render(
      <EnhancementHistoryScroll
        versions={[zeroHeightVersion]}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    // Should not display "1024 x 0"
    expect(screen.queryByText(/1024 x 0/)).not.toBeInTheDocument();
  });

  it("should not display file size when sizeBytes is null", () => {
    const noSizeVersion: EnhancementVersion = {
      id: "version-no-size",
      tier: "TIER_1K",
      enhancedUrl: "https://example.com/enhanced.jpg",
      width: 1024,
      height: 768,
      createdAt: new Date(),
      status: "COMPLETED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[noSizeVersion]}
        onVersionSelect={mockOnVersionSelect}
      />,
    );

    // The HardDrive icon indicates file size, check it's not present
    // We look for text that would be file size - but since there's no sizeBytes, no size shown
    const versionCard = screen.getByText("1K").closest(
      "div[class*='cursor-pointer']",
    );
    // Verify no KB/MB text is shown for this version
    expect(versionCard?.textContent).not.toMatch(/\d+\.\d+ [KMG]B/);
  });

  it("should work without onVersionSelect callback", () => {
    render(
      <EnhancementHistoryScroll
        versions={mockVersions}
        // No onVersionSelect provided
      />,
    );

    // Should still render versions
    expect(screen.getByText("1K")).toBeInTheDocument();

    // Clicking should not cause error
    const firstVersion = screen.getByText("1K").closest(
      "div[class*='cursor-pointer']",
    );
    if (firstVersion) {
      fireEvent.click(firstVersion);
      // No error should occur
    }
  });

  it("should delete failed job when remove is confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const failedVersion: EnhancementVersion = {
      id: "version-failed",
      tier: "TIER_1K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "FAILED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[failedVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const removeButton = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeButton);

    expect(mockOnJobDelete).toHaveBeenCalledWith("version-failed");
  });

  it("should show loading state on button during cancel processing", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    // Create a promise that we can control
    let resolveCancel: () => void = () => {};
    const controlledCancelPromise = new Promise<void>((resolve) => {
      resolveCancel = resolve;
    });
    const mockCancelDelayed = vi.fn().mockReturnValue(controlledCancelPromise);

    const processingVersion: EnhancementVersion = {
      id: "version-processing",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryScroll
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobCancel={mockCancelDelayed}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Button should show "..." while processing
    await vi.waitFor(() => {
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    // Button should be disabled
    expect(cancelButton).toBeDisabled();

    // Resolve the promise to complete
    resolveCancel();
  });

  it("should show loading state on button during delete processing", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    // Create a promise that we can control
    let resolveDelete: () => void = () => {};
    const controlledDeletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const mockDeleteDelayed = vi.fn().mockReturnValue(controlledDeletePromise);

    render(
      <EnhancementHistoryScroll
        versions={[mockVersions[0]]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockDeleteDelayed}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    // Button should show "..." while processing
    await vi.waitFor(() => {
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    // Button should be disabled
    expect(deleteButton).toBeDisabled();

    // Resolve the promise to complete
    resolveDelete();
  });
});
