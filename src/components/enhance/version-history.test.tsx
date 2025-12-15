import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Version, VersionHistory } from "./version-history";

beforeEach(() => {
  const portalRoot = document.createElement("div");
  portalRoot.setAttribute("id", "portal-root");
  document.body.appendChild(portalRoot);
});

afterEach(() => {
  const portalRoot = document.getElementById("portal-root");
  if (portalRoot && portalRoot.parentNode) {
    portalRoot.parentNode.removeChild(portalRoot);
  }
});

vi.mock("./version-compare-modal", () => ({
  VersionCompareModal: ({
    open,
    onOpenChange,
    imageId,
    imageName,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageId: string;
    imageName: string;
  }) => (
    <div data-testid="version-compare-modal" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close Modal</button>
      <span>{imageId}</span>
      <span>{imageName}</span>
    </div>
  ),
}));

const mockVersions: Version[] = [
  {
    jobId: "job-1",
    tier: "TIER_1K",
    status: "COMPLETED",
    resultUrl: "https://example.com/enhanced-1k.jpg",
    tokensSpent: 5,
    createdAt: new Date("2024-01-01T10:00:00Z"),
    processingTimeMs: 15000,
    width: 1000,
    height: 750,
    sizeBytes: 300000,
  },
  {
    jobId: "job-2",
    tier: "TIER_2K",
    status: "COMPLETED",
    resultUrl: "https://example.com/enhanced-2k.jpg",
    tokensSpent: 10,
    createdAt: new Date("2024-01-01T11:00:00Z"),
    processingTimeMs: 20000,
    width: 2000,
    height: 1500,
    sizeBytes: 600000,
  },
  {
    jobId: "job-3",
    tier: "TIER_4K",
    status: "COMPLETED",
    resultUrl: "https://example.com/enhanced-4k.jpg",
    tokensSpent: 20,
    createdAt: new Date("2024-01-01T12:00:00Z"),
    processingTimeMs: 30000,
    width: 4000,
    height: 3000,
    sizeBytes: 1200000,
  },
];

describe("VersionHistory", () => {
  it("should render empty state when no versions", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={[]}
      />,
    );

    expect(screen.getByText("Version History")).toBeInTheDocument();
    expect(screen.getByText("No enhancement versions available yet"))
      .toBeInTheDocument();
  });

  it("should render all versions in timeline", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByText("Version History")).toBeInTheDocument();
    expect(screen.getByText("3 enhancements available")).toBeInTheDocument();

    expect(screen.getByText("1K")).toBeInTheDocument();
    expect(screen.getByText("2K")).toBeInTheDocument();
    expect(screen.getByText("4K")).toBeInTheDocument();

    expect(screen.getByTestId("version-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("version-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("version-item-2")).toBeInTheDocument();
  });

  it("should display tokens spent for each version", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByText("5 tokens")).toBeInTheDocument();
    expect(screen.getByText("10 tokens")).toBeInTheDocument();
    expect(screen.getByText("20 tokens")).toBeInTheDocument();
  });

  it("should display processing time for each version", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByText("15s")).toBeInTheDocument();
    expect(screen.getByText("20s")).toBeInTheDocument();
    expect(screen.getByText("30s")).toBeInTheDocument();
  });

  it("should display N/A for null processing time", () => {
    const versionsWithNullTime: Version[] = [
      {
        ...mockVersions[0],
        processingTimeMs: null,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithNullTime}
      />,
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("should display dimensions and file size", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByText("1000 x 750")).toBeInTheDocument();
    expect(screen.getByText("293.0 KB")).toBeInTheDocument();

    expect(screen.getByText("2000 x 1500")).toBeInTheDocument();
    expect(screen.getByText("585.9 KB")).toBeInTheDocument();

    expect(screen.getByText("4000 x 3000")).toBeInTheDocument();
    expect(screen.getByText("1.1 MB")).toBeInTheDocument();
  });

  it("should handle null dimensions and file size", () => {
    const versionsWithNullData: Version[] = [
      {
        ...mockVersions[0],
        width: null,
        height: null,
        sizeBytes: null,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithNullData}
      />,
    );

    expect(screen.queryByText(/x/)).not.toBeInTheDocument();
  });

  it("should render download buttons for each version", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByTestId("download-button-0")).toBeInTheDocument();
    expect(screen.getByTestId("download-button-1")).toBeInTheDocument();
    expect(screen.getByTestId("download-button-2")).toBeInTheDocument();
  });

  it("should trigger download when download button is clicked", () => {
    const clickSpy = vi.fn();
    const mockAnchor = {
      click: clickSpy,
      href: "",
      download: "",
      target: "",
      nodeType: 1,
      nodeName: "A",
    } as unknown as HTMLAnchorElement;

    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, "createElement")
      .mockImplementation(
        (tagName: string) => {
          if (tagName === "a") {
            return mockAnchor;
          }
          return originalCreateElement(tagName);
        },
      );

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    const downloadButton = screen.getByTestId("download-button-0");
    fireEvent.click(downloadButton);

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it("should disable download button when resultUrl is null", () => {
    const versionsWithNullUrl: Version[] = [
      {
        ...mockVersions[0],
        resultUrl: null,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithNullUrl}
      />,
    );

    const downloadButton = screen.getByTestId("download-button-0");
    expect(downloadButton).toBeDisabled();
  });

  it("should show compare button when 2+ versions exist", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByTestId("compare-button")).toBeInTheDocument();
    expect(screen.getByText("Compare Versions")).toBeInTheDocument();
  });

  it("should not show compare button when less than 2 versions", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={[mockVersions[0]]}
      />,
    );

    expect(screen.queryByTestId("compare-button")).not.toBeInTheDocument();
  });

  it("should open compare modal when compare button is clicked", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    const compareButton = screen.getByTestId("compare-button");
    fireEvent.click(compareButton);

    const modal = screen.getByTestId("version-compare-modal");
    expect(modal).toHaveAttribute("data-open", "true");
    expect(screen.getByText("img-1")).toBeInTheDocument();
    expect(screen.getByText("Test Image")).toBeInTheDocument();
  });

  it("should close compare modal when close button is clicked", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    const compareButton = screen.getByTestId("compare-button");
    fireEvent.click(compareButton);

    const closeButton = screen.getByText("Close Modal");
    fireEvent.click(closeButton);

    const modal = screen.getByTestId("version-compare-modal");
    expect(modal).toHaveAttribute("data-open", "false");
  });

  it("should render compare-next buttons for each version except the last", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByTestId("compare-next-button-0")).toBeInTheDocument();
    expect(screen.getByTestId("compare-next-button-1")).toBeInTheDocument();
    expect(screen.queryByTestId("compare-next-button-2")).not
      .toBeInTheDocument();
  });

  it("should open compare modal with correct versions when compare-next is clicked", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    const compareNextButton = screen.getByTestId("compare-next-button-0");
    fireEvent.click(compareNextButton);

    const modal = screen.getByTestId("version-compare-modal");
    expect(modal).toHaveAttribute("data-open", "true");
  });

  it("should format dates correctly", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    const dates = screen.getAllByText(/Jan 1, 2024/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it("should format processing time over 60 seconds as minutes", () => {
    const versionsWithLongTime: Version[] = [
      {
        ...mockVersions[0],
        processingTimeMs: 125000,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithLongTime}
      />,
    );

    expect(screen.getByText("2m 5s")).toBeInTheDocument();
  });

  it("should format file size in bytes for small files", () => {
    const versionsWithSmallFile: Version[] = [
      {
        ...mockVersions[0],
        sizeBytes: 500,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithSmallFile}
      />,
    );

    expect(screen.getByText("500 B")).toBeInTheDocument();
  });

  it("should use singular enhancement text when only one version", () => {
    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={[mockVersions[0]]}
      />,
    );

    expect(screen.getByText("1 enhancement available")).toBeInTheDocument();
  });

  it("should handle string dates", () => {
    const versionsWithStringDates: Version[] = [
      {
        ...mockVersions[0],
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithStringDates}
      />,
    );

    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
  });

  it("should handle unknown tier in getTierLabel and getTierColor", () => {
    const versionsWithUnknownTier: Version[] = [
      {
        ...mockVersions[0],
        tier: "UNKNOWN_TIER" as "TIER_1K" | "TIER_2K" | "TIER_4K",
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithUnknownTier}
      />,
    );

    expect(screen.getByText("UNKNOWN_TIER")).toBeInTheDocument();
  });

  it("should display sizeBytes only when width is null", () => {
    const versionsWithSizeOnly: Version[] = [
      {
        ...mockVersions[0],
        width: null,
        height: null,
        sizeBytes: 500000,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithSizeOnly}
      />,
    );

    expect(screen.getByText("488.3 KB")).toBeInTheDocument();
    expect(screen.queryByText(/x/)).not.toBeInTheDocument();
  });

  it("should not display dimensions when only width is present without height", () => {
    const versionsWithWidthOnly: Version[] = [
      {
        ...mockVersions[0],
        width: 1000,
        height: null,
        sizeBytes: null,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithWidthOnly}
      />,
    );

    expect(screen.queryByText(/1000 x/)).not.toBeInTheDocument();
  });

  it("should not trigger download when resultUrl is null", () => {
    const clickSpy = vi.fn();
    const mockAnchor = {
      click: clickSpy,
      href: "",
      download: "",
      target: "",
      nodeType: 1,
      nodeName: "A",
    } as unknown as HTMLAnchorElement;

    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, "createElement")
      .mockImplementation(
        (tagName: string) => {
          if (tagName === "a") {
            return mockAnchor;
          }
          return originalCreateElement(tagName);
        },
      );

    const versionsWithNullUrl: Version[] = [
      {
        ...mockVersions[0],
        resultUrl: null,
      },
    ];

    render(
      <VersionHistory
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithNullUrl}
      />,
    );

    const downloadButton = screen.getByTestId("download-button-0");
    fireEvent.click(downloadButton);

    expect(clickSpy).not.toHaveBeenCalled();

    createElementSpy.mockRestore();
  });
});
