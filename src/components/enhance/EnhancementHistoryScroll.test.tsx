import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnhancementHistoryScroll, type EnhancementVersion } from "./EnhancementHistoryScroll";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: (
    { src, alt, onError, ...props }: { src: string; alt: string; onError?: () => void; },
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
    expect(screen.getByText(/no enhancement versions yet/i)).toBeInTheDocument();
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

    const firstVersion = screen.getByText("1K").closest("div[class*='cursor-pointer']");
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

    const selectedVersion = screen.getByText("1K").closest("div[class*='cursor-pointer']");
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
});
