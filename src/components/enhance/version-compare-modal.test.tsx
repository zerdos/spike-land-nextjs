import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VersionCompareModal } from "./version-compare-modal";
import type { Version } from "./version-history";

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

vi.mock("./ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({
    originalUrl,
    enhancedUrl,
    originalLabel,
    enhancedLabel,
    width,
    height,
  }: {
    originalUrl: string;
    enhancedUrl: string;
    originalLabel: string;
    enhancedLabel: string;
    width: number;
    height: number;
  }) => (
    <div data-testid="image-comparison-slider">
      <div data-testid="original-url">{originalUrl}</div>
      <div data-testid="enhanced-url">{enhancedUrl}</div>
      <div data-testid="original-label">{originalLabel}</div>
      <div data-testid="enhanced-label">{enhancedLabel}</div>
      <div data-testid="width">{width}</div>
      <div data-testid="height">{height}</div>
    </div>
  ),
}));

const baseVersion: Version = {
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
};

const mockVersion2: Version = {
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
};

const mockVersion3: Version = {
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
};

const mockVersions: Version[] = [baseVersion, mockVersion2, mockVersion3];

describe("VersionCompareModal", () => {
  it("should not render when versions array is empty", () => {
    const { container } = render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={[]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render modal when open is true", () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByText("Compare Versions")).toBeInTheDocument();
    expect(screen.getByText(/Compare different enhancement versions/))
      .toBeInTheDocument();
    expect(screen.getByText(/Test Image/)).toBeInTheDocument();
  });

  it("should not render modal when open is false", () => {
    render(
      <VersionCompareModal
        open={false}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.queryByText("Compare Versions")).not.toBeInTheDocument();
  });

  it("should initialize with first two versions by default", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/enhanced-1k.jpg",
      );
      expect(screen.getByTestId("enhanced-url")).toHaveTextContent(
        "https://example.com/enhanced-2k.jpg",
      );
    });
  });

  it("should initialize with provided initial versions", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
        initialVersion1={mockVersions[1]}
        initialVersion2={mockVersions[2]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/enhanced-2k.jpg",
      );
      expect(screen.getByTestId("enhanced-url")).toHaveTextContent(
        "https://example.com/enhanced-4k.jpg",
      );
    });
  });

  it("should render version selectors", () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    expect(screen.getByTestId("version1-select")).toBeInTheDocument();
    expect(screen.getByTestId("version2-select")).toBeInTheDocument();
  });

  it("should display tier badges for selected versions", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      const badges = screen.getAllByText("1K");
      expect(badges.length).toBeGreaterThan(0);
      const badges2k = screen.getAllByText("2K");
      expect(badges2k.length).toBeGreaterThan(0);
    });
  });

  it("should display tokens spent for selected versions", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("5 tokens")).toBeInTheDocument();
      expect(screen.getByText("10 tokens")).toBeInTheDocument();
    });
  });

  it("should display dimensions for selected versions", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("1000 x 750")).toBeInTheDocument();
      expect(screen.getByText("2000 x 1500")).toBeInTheDocument();
    });
  });

  it("should render download buttons for both versions", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("download-version1")).toBeInTheDocument();
      expect(screen.getByTestId("download-version2")).toBeInTheDocument();
    });
  });

  it("should trigger download when download button is clicked", async () => {
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
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      const downloadButton = screen.getByTestId("download-version1");
      fireEvent.click(downloadButton);
    });

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it("should disable download button when resultUrl is null", async () => {
    const versionsWithNullUrl: Version[] = [
      {
        ...baseVersion,
        resultUrl: null,
      },
      mockVersion2,
    ];

    const versionWithNullUrl = versionsWithNullUrl[0] as Version;
    const version2 = versionsWithNullUrl[1] as Version;

    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithNullUrl}
        initialVersion1={versionWithNullUrl}
        initialVersion2={version2}
      />,
    );

    await waitFor(() => {
      const downloadButton = screen.getByTestId("download-version1");
      expect(downloadButton).toBeDisabled();
    });
  });

  it("should change version when selector is changed", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/enhanced-1k.jpg",
      );
    });

    const version1Select = screen.getByTestId("version1-select");
    fireEvent.click(version1Select);

    const option = await screen.findByText("4K - Jan 1, 2024, 12:00 PM");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/enhanced-4k.jpg",
      );
    });
  });

  it("should use original image when Original is selected", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      const version1Select = screen.getByTestId("version1-select");
      fireEvent.click(version1Select);
    });

    const originalOption = await screen.findByRole("option", {
      name: "Original",
    });
    fireEvent.click(originalOption);

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/original.jpg",
      );
      expect(screen.getByTestId("original-label")).toHaveTextContent(
        "Original",
      );
    });
  });

  it("should pass correct dimensions to ImageComparisonSlider", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
        initialVersion1={mockVersions[0]}
        initialVersion2={mockVersions[1]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("width")).toHaveTextContent("2000");
      expect(screen.getByTestId("height")).toHaveTextContent("1500");
    });
  });

  it("should use default dimensions when version dimensions are null", async () => {
    const versionsWithNullDimensions: Version[] = [
      {
        ...baseVersion,
        width: null,
        height: null,
      },
    ];

    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithNullDimensions}
        initialVersion1={null}
        initialVersion2={versionsWithNullDimensions[0]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("width")).toHaveTextContent("16");
      expect(screen.getByTestId("height")).toHaveTextContent("9");
    });
  });

  it("should call onOpenChange when modal is closed", () => {
    const onOpenChange = vi.fn();

    render(
      <VersionCompareModal
        open={true}
        onOpenChange={onOpenChange}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should not show version info when original is selected", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
        initialVersion1={null}
        initialVersion2={mockVersions[0]}
      />,
    );

    await waitFor(() => {
      const version1Select = screen.getByTestId("version1-select");
      expect(version1Select).toBeInTheDocument();
    });

    const version1Select = screen.getByTestId("version1-select");
    fireEvent.click(version1Select);

    const originalOption = await screen.findByRole("option", {
      name: "Original",
    });
    fireEvent.click(originalOption);

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/original.jpg",
      );
      expect(screen.getByTestId("original-label")).toHaveTextContent(
        "Original",
      );
    });
  });

  it("should reinitialize versions when modal is reopened", async () => {
    const { rerender } = render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
        initialVersion1={mockVersions[0]}
        initialVersion2={mockVersions[1]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/enhanced-1k.jpg",
      );
    });

    rerender(
      <VersionCompareModal
        open={false}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
        initialVersion1={mockVersions[0]}
        initialVersion2={mockVersions[1]}
      />,
    );

    rerender(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
        initialVersion1={mockVersions[1]}
        initialVersion2={mockVersions[2]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("original-url")).toHaveTextContent(
        "https://example.com/enhanced-2k.jpg",
      );
    });
  });

  it("should format tier labels correctly", async () => {
    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={mockVersions}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("original-label")).toHaveTextContent(/1K/);
      expect(screen.getByTestId("enhanced-label")).toHaveTextContent(/2K/);
    });
  });

  it("should not trigger download when resultUrl is null", async () => {
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

    const versionWithNullUrl: Version = {
      ...baseVersion,
      resultUrl: null,
    };
    const versionsWithNullUrl: Version[] = [versionWithNullUrl, mockVersion2];

    render(
      <VersionCompareModal
        open={true}
        onOpenChange={() => {}}
        imageId="img-1"
        imageName="Test Image"
        originalUrl="https://example.com/original.jpg"
        versions={versionsWithNullUrl}
        initialVersion1={versionWithNullUrl}
        initialVersion2={mockVersion2}
      />,
    );

    await waitFor(() => {
      const downloadButton = screen.getByTestId("download-version1");
      fireEvent.click(downloadButton);
    });

    expect(clickSpy).not.toHaveBeenCalled();

    createElementSpy.mockRestore();
  });
});
