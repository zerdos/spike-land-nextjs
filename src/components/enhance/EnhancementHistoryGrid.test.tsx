import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnhancementHistoryGrid, type EnhancementVersion } from "./EnhancementHistoryGrid";

vi.mock("next/image", () => ({
  default: (
    { src, alt, onError, ...props }: {
      src: string;
      alt: string;
      onError?: () => void;
      [key: string]: unknown;
    },
  ) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={onError}
      data-testid="next-image"
      {...props}
    />
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAlert = vi.fn();
global.alert = mockAlert;

describe("EnhancementHistoryGrid", () => {
  const mockVersions: EnhancementVersion[] = [
    {
      id: "version-1",
      tier: "TIER_1K",
      enhancedUrl: "https://example.com/enhanced-1k.jpg",
      width: 1024,
      height: 768,
      createdAt: new Date("2024-12-09T13:01:00Z"),
      status: "COMPLETED",
      sizeBytes: 238400,
    },
    {
      id: "version-2",
      tier: "TIER_2K",
      enhancedUrl: "https://example.com/enhanced-2k.jpg",
      width: 2048,
      height: 1321,
      createdAt: new Date("2024-12-09T10:18:00Z"),
      status: "COMPLETED",
      sizeBytes: 841300,
    },
    {
      id: "version-3",
      tier: "TIER_4K",
      enhancedUrl: "https://example.com/enhanced-4k.jpg",
      width: 4096,
      height: 2642,
      createdAt: new Date("2024-12-09T10:16:00Z"),
      status: "COMPLETED",
      sizeBytes: 1500000,
    },
  ];

  const mockOnVersionSelect = vi.fn();
  const mockOnJobDelete = vi.fn();
  const mockOnJobCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
    mockOnJobDelete.mockResolvedValue(undefined);
    mockOnJobCancel.mockResolvedValue(undefined);
  });

  it("renders empty state when no versions", () => {
    render(
      <EnhancementHistoryGrid
        versions={[]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(
      screen.getByText(
        "No enhancement versions yet. Create your first enhancement above.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all versions with correct tier badges", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByText("1K")).toBeInTheDocument();
    expect(screen.getByText("2K")).toBeInTheDocument();
    expect(screen.getByText("4K")).toBeInTheDocument();
  });

  it("renders dimensions for each version", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByText("1024 x 768")).toBeInTheDocument();
    expect(screen.getByText("2048 x 1321")).toBeInTheDocument();
    expect(screen.getByText("4096 x 2642")).toBeInTheDocument();
  });

  it("renders file sizes for each version", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    // File sizes are formatted by formatFileSize utility
    expect(screen.getByText(/232.*KB/i)).toBeInTheDocument();
    expect(screen.getByText(/821.*KB/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.4.*MB/i)).toBeInTheDocument();
  });

  it("renders dates for each version", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const dateElements = screen.getAllByText(/Dec/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it("calls onVersionSelect when version is clicked", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const versionCard = screen.getByLabelText("Select 1K version");
    fireEvent.click(versionCard);

    expect(mockOnVersionSelect).toHaveBeenCalledWith("version-1");
  });

  it("calls onVersionSelect when Enter key is pressed", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const versionCard = screen.getByLabelText("Select 2K version");
    fireEvent.keyDown(versionCard, { key: "Enter" });

    expect(mockOnVersionSelect).toHaveBeenCalledWith("version-2");
  });

  it("calls onVersionSelect when Space key is pressed", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const versionCard = screen.getByLabelText("Select 4K version");
    fireEvent.keyDown(versionCard, { key: " " });

    expect(mockOnVersionSelect).toHaveBeenCalledWith("version-3");
  });

  it("highlights selected version with ring", () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        selectedVersionId="version-2"
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const selectedCard = screen.getByLabelText("Select 2K version");
    expect(selectedCard).toHaveClass("ring-2", "ring-primary");
    expect(selectedCard).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onJobDelete when delete button is clicked", async () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const deleteButton = screen.getByLabelText("Delete 1K version");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnJobDelete).toHaveBeenCalledWith("version-1");
    });
  });

  it("shows alert when delete fails", async () => {
    const error = new Error("Delete failed");
    mockOnJobDelete.mockRejectedValueOnce(error);

    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const deleteButton = screen.getByLabelText("Delete 1K version");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Delete failed");
    });
  });

  it("renders processing status for pending jobs", () => {
    const pendingVersion: EnhancementVersion = {
      id: "pending-1",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PENDING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[pendingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
        onJobCancel={mockOnJobCancel}
      />,
    );

    expect(screen.getByText("Queued")).toBeInTheDocument();
  });

  it("renders processing status for processing jobs", () => {
    const processingVersion: EnhancementVersion = {
      id: "processing-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
        onJobCancel={mockOnJobCancel}
      />,
    );

    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders cancel button for processing jobs", () => {
    const processingVersion: EnhancementVersion = {
      id: "processing-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
        onJobCancel={mockOnJobCancel}
      />,
    );

    expect(screen.getByLabelText("Cancel 4K job")).toBeInTheDocument();
  });

  it("calls onJobCancel when cancel button is clicked", async () => {
    const processingVersion: EnhancementVersion = {
      id: "processing-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
        onJobCancel={mockOnJobCancel}
      />,
    );

    const cancelButton = screen.getByLabelText("Cancel 4K job");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockOnJobCancel).toHaveBeenCalledWith("processing-1");
    });
  });

  it("shows alert when cancel fails", async () => {
    const error = new Error("Cancel failed");
    mockOnJobCancel.mockRejectedValueOnce(error);

    const processingVersion: EnhancementVersion = {
      id: "processing-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
        onJobCancel={mockOnJobCancel}
      />,
    );

    const cancelButton = screen.getByLabelText("Cancel 4K job");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Cancel failed");
    });
  });

  it("renders failed status", () => {
    const failedVersion: EnhancementVersion = {
      id: "failed-1",
      tier: "TIER_1K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "FAILED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[failedVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders cancelled status", () => {
    const cancelledVersion: EnhancementVersion = {
      id: "cancelled-1",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "CANCELLED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[cancelledVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("shows delete button for failed versions", () => {
    const failedVersion: EnhancementVersion = {
      id: "failed-1",
      tier: "TIER_1K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "FAILED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[failedVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByLabelText("Delete 1K version")).toBeInTheDocument();
  });

  it("shows delete button for cancelled versions", () => {
    const cancelledVersion: EnhancementVersion = {
      id: "cancelled-1",
      tier: "TIER_2K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "CANCELLED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[cancelledVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByLabelText("Delete 2K version")).toBeInTheDocument();
  });

  it("shows delete button for refunded versions", () => {
    const refundedVersion: EnhancementVersion = {
      id: "refunded-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "REFUNDED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[refundedVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.getByLabelText("Delete 4K version")).toBeInTheDocument();
  });

  it("handles image load error", async () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const images = screen.getAllByTestId("next-image");
    fireEvent.error(images[0]);

    await waitFor(() => {
      expect(screen.getByText("Image failed to load")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/logs/image-error",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("handles fetch error when logging broken image", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(
      () => {},
    );
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const images = screen.getAllByTestId("next-image");
    fireEvent.error(images[0]);

    await waitFor(() => {
      expect(screen.getByText("Image failed to load")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Image Error Logging Failed]",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("renders dash for missing dimensions", () => {
    const versionWithoutDimensions: EnhancementVersion = {
      id: "no-dims-1",
      tier: "TIER_1K",
      enhancedUrl: "https://example.com/img.jpg",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "COMPLETED",
      sizeBytes: 100000,
    };

    render(
      <EnhancementHistoryGrid
        versions={[versionWithoutDimensions]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders dash for missing file size", () => {
    const versionWithoutSize: EnhancementVersion = {
      id: "no-size-1",
      tier: "TIER_1K",
      enhancedUrl: "https://example.com/img.jpg",
      width: 1024,
      height: 768,
      createdAt: new Date(),
      status: "COMPLETED",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[versionWithoutSize]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("does not call onVersionSelect when delete button is clicked", async () => {
    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const deleteButton = screen.getByLabelText("Delete 1K version");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnJobDelete).toHaveBeenCalled();
    });

    expect(mockOnVersionSelect).not.toHaveBeenCalled();
  });

  it("does not render cancel button without onJobCancel prop", () => {
    const processingVersion: EnhancementVersion = {
      id: "processing-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.queryByLabelText("Cancel 4K job")).not.toBeInTheDocument();
  });

  it("handles generic error in delete", async () => {
    mockOnJobDelete.mockRejectedValueOnce("Generic error");

    render(
      <EnhancementHistoryGrid
        versions={mockVersions}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    const deleteButton = screen.getByLabelText("Delete 1K version");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to delete job");
    });
  });

  it("handles generic error in cancel", async () => {
    mockOnJobCancel.mockRejectedValueOnce("Generic error");

    const processingVersion: EnhancementVersion = {
      id: "processing-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
        onJobCancel={mockOnJobCancel}
      />,
    );

    const cancelButton = screen.getByLabelText("Cancel 4K job");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to cancel job");
    });
  });

  it("does not call onJobCancel when not provided", async () => {
    const processingVersion: EnhancementVersion = {
      id: "processing-1",
      tier: "TIER_4K",
      enhancedUrl: "",
      width: 0,
      height: 0,
      createdAt: new Date(),
      status: "PROCESSING",
      sizeBytes: null,
    };

    render(
      <EnhancementHistoryGrid
        versions={[processingVersion]}
        onVersionSelect={mockOnVersionSelect}
        onJobDelete={mockOnJobDelete}
      />,
    );

    expect(screen.queryByLabelText("Cancel 4K job")).not.toBeInTheDocument();
  });

  describe("sourceImage and blend badge", () => {
    it("renders blend badge with source image thumbnail", () => {
      const blendVersion: EnhancementVersion = {
        id: "blend-1",
        tier: "TIER_2K",
        enhancedUrl: "https://example.com/enhanced-blend.jpg",
        width: 2048,
        height: 1536,
        createdAt: new Date("2024-12-09T12:00:00Z"),
        status: "COMPLETED",
        sizeBytes: 500000,
        isBlend: true,
        sourceImageId: "source-123",
        sourceImage: {
          id: "source-123",
          url: "https://example.com/source-image.jpg",
          name: "Mountain Landscape",
        },
      };

      render(
        <EnhancementHistoryGrid
          versions={[blendVersion]}
          onVersionSelect={mockOnVersionSelect}
          onJobDelete={mockOnJobDelete}
        />,
      );

      // Check blend badge is rendered
      expect(screen.getByText("Blend")).toBeInTheDocument();

      // Check source image thumbnail is rendered with correct alt text
      const sourceImageThumbnail = screen.getByAltText(
        "Blend source: Mountain Landscape",
      );
      expect(sourceImageThumbnail).toBeInTheDocument();
      expect(sourceImageThumbnail).toHaveAttribute(
        "src",
        "https://example.com/source-image.jpg",
      );
    });

    it("renders blend badge with correct title attribute for source image", () => {
      const blendVersion: EnhancementVersion = {
        id: "blend-2",
        tier: "TIER_1K",
        enhancedUrl: "https://example.com/enhanced-blend-2.jpg",
        width: 1024,
        height: 768,
        createdAt: new Date("2024-12-09T11:00:00Z"),
        status: "COMPLETED",
        sizeBytes: 250000,
        isBlend: true,
        sourceImageId: "source-456",
        sourceImage: {
          id: "source-456",
          url: "https://example.com/sunset.jpg",
          name: "Sunset Beach",
        },
      };

      render(
        <EnhancementHistoryGrid
          versions={[blendVersion]}
          onVersionSelect={mockOnVersionSelect}
          onJobDelete={mockOnJobDelete}
        />,
      );

      // Find the container div that has the title attribute
      const sourceImageContainer = screen
        .getByAltText("Blend source: Sunset Beach")
        .closest("div");
      expect(sourceImageContainer).toHaveAttribute(
        "title",
        "Blended with: Sunset Beach",
      );
    });

    it("renders blend badge without thumbnail when sourceImage is null", () => {
      const blendVersionNoSourceImage: EnhancementVersion = {
        id: "blend-3",
        tier: "TIER_4K",
        enhancedUrl: "https://example.com/enhanced-blend-3.jpg",
        width: 4096,
        height: 3072,
        createdAt: new Date("2024-12-09T10:00:00Z"),
        status: "COMPLETED",
        sizeBytes: 1200000,
        isBlend: true,
        sourceImageId: "source-789",
        sourceImage: null,
      };

      render(
        <EnhancementHistoryGrid
          versions={[blendVersionNoSourceImage]}
          onVersionSelect={mockOnVersionSelect}
          onJobDelete={mockOnJobDelete}
        />,
      );

      // Blend badge should still be rendered
      expect(screen.getByText("Blend")).toBeInTheDocument();

      // But no source image thumbnail
      expect(
        screen.queryByAltText(/Blend source:/),
      ).not.toBeInTheDocument();
    });

    it("renders blend badge when only sourceImageId is present", () => {
      const versionWithSourceImageId: EnhancementVersion = {
        id: "blend-4",
        tier: "TIER_2K",
        enhancedUrl: "https://example.com/enhanced-blend-4.jpg",
        width: 2048,
        height: 1536,
        createdAt: new Date("2024-12-09T09:00:00Z"),
        status: "COMPLETED",
        sizeBytes: 600000,
        isBlend: false,
        sourceImageId: "source-abc",
      };

      render(
        <EnhancementHistoryGrid
          versions={[versionWithSourceImageId]}
          onVersionSelect={mockOnVersionSelect}
          onJobDelete={mockOnJobDelete}
        />,
      );

      // Blend badge should be rendered because sourceImageId is present
      expect(screen.getByText("Blend")).toBeInTheDocument();
    });

    it("does not render blend badge for non-blend versions", () => {
      const regularVersion: EnhancementVersion = {
        id: "regular-1",
        tier: "TIER_1K",
        enhancedUrl: "https://example.com/regular.jpg",
        width: 1024,
        height: 768,
        createdAt: new Date("2024-12-09T08:00:00Z"),
        status: "COMPLETED",
        sizeBytes: 200000,
      };

      render(
        <EnhancementHistoryGrid
          versions={[regularVersion]}
          onVersionSelect={mockOnVersionSelect}
          onJobDelete={mockOnJobDelete}
        />,
      );

      // No blend badge should be rendered
      expect(screen.queryByText("Blend")).not.toBeInTheDocument();
    });
  });
});
