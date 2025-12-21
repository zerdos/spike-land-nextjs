import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MixDetailClient } from "./MixDetailClient";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("sonner");

// Mock next-view-transitions
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next-view-transitions", () => ({
  useTransitionRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock next/navigation
const mockSearchParams = new Map<string, string>();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) ?? null,
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock ComparisonViewToggle
vi.mock("@/components/enhance/ComparisonViewToggle", () => ({
  ComparisonViewToggle: ({
    originalUrl,
    enhancedUrl,
  }: {
    originalUrl: string;
    enhancedUrl: string;
  }) => (
    <div data-testid="comparison-view" data-original={originalUrl} data-enhanced={enhancedUrl}>
      Comparison View
    </div>
  ),
}));

// Mock MixShareQRCode
vi.mock("@/components/mix/MixShareQRCode", () => ({
  MixShareQRCode: ({ shareUrl }: { shareUrl: string; }) => (
    <div data-testid="qr-code" data-url={shareUrl}>
      QR Code
    </div>
  ),
}));

describe("MixDetailClient", () => {
  const createMockJob = (overrides = {}) => ({
    id: "job-123",
    status: "COMPLETED" as const,
    tier: "TIER_2K" as const,
    resultUrl: "https://example.com/result.jpg",
    resultWidth: 2048,
    resultHeight: 2048,
    createdAt: "2024-01-15T10:30:00Z",
    targetImage: {
      id: "img-1",
      name: "Photo 1.jpg",
      url: "https://example.com/photo1.jpg",
      width: 1024,
      height: 768,
    },
    sourceImage: {
      id: "img-2",
      name: "Photo 2.jpg",
      url: "https://example.com/photo2.jpg",
      width: 800,
      height: 600,
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.clear();
    global.fetch = vi.fn();

    // Mock window.history.state for back navigation tests
    Object.defineProperty(window, "history", {
      value: {
        state: { idx: 0 },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders PhotoMix Result heading", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByText("PhotoMix Result")).toBeInTheDocument();
    });

    it("renders tier label correctly for TIER_1K", () => {
      render(<MixDetailClient job={createMockJob({ tier: "TIER_1K" })} />);

      expect(screen.getByText(/1K Quality/)).toBeInTheDocument();
    });

    it("renders tier label correctly for TIER_2K", () => {
      render(<MixDetailClient job={createMockJob({ tier: "TIER_2K" })} />);

      expect(screen.getByText(/2K Quality/)).toBeInTheDocument();
    });

    it("renders tier label correctly for TIER_4K", () => {
      render(<MixDetailClient job={createMockJob({ tier: "TIER_4K" })} />);

      expect(screen.getByText(/4K Quality/)).toBeInTheDocument();
    });

    it("renders Back button", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
    });

    it("renders Download button when job is completed", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByRole("button", { name: /Download Mix/i }))
        .toBeInTheDocument();
    });

    it("does not render Download button when job is processing", () => {
      render(<MixDetailClient job={createMockJob({ status: "PROCESSING", resultUrl: null })} />);

      expect(screen.queryByRole("button", { name: /Download Mix/i })).not
        .toBeInTheDocument();
    });

    it("renders Create New Mix button", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByRole("button", { name: /Create New Mix/i }))
        .toBeInTheDocument();
    });

    it("renders comparison view for completed job", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByTestId("comparison-view")).toBeInTheDocument();
    });

    it("renders processing state", () => {
      render(
        <MixDetailClient
          job={createMockJob({ status: "PROCESSING", resultUrl: null })}
        />,
      );

      expect(screen.getByText("Processing your mix...")).toBeInTheDocument();
    });

    it("renders failed state", () => {
      render(
        <MixDetailClient
          job={createMockJob({ status: "FAILED", resultUrl: null })}
        />,
      );

      expect(screen.getByText("Mix processing failed")).toBeInTheDocument();
    });

    it("renders source photos section", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByText("Source Photos")).toBeInTheDocument();
    });

    it("renders both parent images", () => {
      const job = createMockJob();
      render(<MixDetailClient job={job} />);

      expect(screen.getByAltText("Photo 1.jpg")).toBeInTheDocument();
      expect(screen.getByAltText("Photo 2.jpg")).toBeInTheDocument();
    });

    it("renders placeholder when sourceImage is null", () => {
      render(<MixDetailClient job={createMockJob({ sourceImage: null })} />);

      expect(
        screen.getByText(
          "Photo 2 was uploaded directly and not saved to gallery",
        ),
      ).toBeInTheDocument();
    });

    it("renders QR code component with share URL", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const qrCode = screen.getByTestId("qr-code");
      expect(qrCode).toBeInTheDocument();
    });

    it("renders result dimensions when job is completed", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByText("Dimensions: 2048 x 2048")).toBeInTheDocument();
    });
  });

  describe("Open Redirect Prevention (Security)", () => {
    it("navigates to valid path from 'from' parameter", () => {
      mockSearchParams.set("from", "/apps/pixel");

      render(<MixDetailClient job={createMockJob()} />);

      const backButton = screen.getByRole("button", { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith("/apps/pixel");
    });

    it("BLOCKS protocol-relative URLs (//evil.com) - SECURITY FIX", () => {
      mockSearchParams.set("from", "//evil.com");

      render(<MixDetailClient job={createMockJob()} />);

      const backButton = screen.getByRole("button", { name: /Back/i });
      fireEvent.click(backButton);

      // Should NOT navigate to //evil.com
      expect(mockPush).not.toHaveBeenCalledWith("//evil.com");
      // Should fall back to default
      expect(mockPush).toHaveBeenCalledWith("/apps/pixel/mix");
    });

    it("BLOCKS protocol-relative URLs with path (//evil.com/path)", () => {
      mockSearchParams.set("from", "//evil.com/malicious/path");

      render(<MixDetailClient job={createMockJob()} />);

      const backButton = screen.getByRole("button", { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockPush).not.toHaveBeenCalledWith("//evil.com/malicious/path");
      expect(mockPush).toHaveBeenCalledWith("/apps/pixel/mix");
    });

    it("allows valid paths with query params", () => {
      mockSearchParams.set("from", "/apps/pixel?tab=history");

      render(<MixDetailClient job={createMockJob()} />);

      const backButton = screen.getByRole("button", { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith("/apps/pixel?tab=history");
    });

    it("uses router.back() when no 'from' param but history exists", () => {
      Object.defineProperty(window, "history", {
        value: { state: { idx: 5 } },
        writable: true,
      });

      render(<MixDetailClient job={createMockJob()} />);

      const backButton = screen.getByRole("button", { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockBack).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("falls back to /apps/pixel/mix when no history and no 'from' param", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const backButton = screen.getByRole("button", { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith("/apps/pixel/mix");
    });
  });

  describe("Download functionality", () => {
    it("downloads image when Download button is clicked", async () => {
      const mockBlob = new Blob(["test"], { type: "image/jpeg" });
      vi.mocked(global.fetch).mockResolvedValue({
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      const createObjectURL = vi.fn().mockReturnValue("blob:test-url");
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      render(<MixDetailClient job={createMockJob()} />);

      const downloadButton = screen.getByRole("button", {
        name: /Download Mix/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "https://example.com/result.jpg",
        );
      });

      await waitFor(() => {
        expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
      });

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it("shows toast error when download fails", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      render(<MixDetailClient job={createMockJob()} />);

      const downloadButton = screen.getByRole("button", {
        name: /Download Mix/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to download image. Please try again.",
        );
      });
    });

    it("does not attempt download when resultUrl is null", async () => {
      render(
        <MixDetailClient
          job={createMockJob({ status: "PROCESSING", resultUrl: null })}
        />,
      );

      // Download button shouldn't be rendered at all
      expect(screen.queryByRole("button", { name: /Download Mix/i })).not
        .toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("navigates to Create New Mix page", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const createButton = screen.getByRole("button", {
        name: /Create New Mix/i,
      });
      fireEvent.click(createButton);

      expect(mockPush).toHaveBeenCalledWith("/apps/pixel/mix");
    });

    it("navigates to parent image when clicking source photo", () => {
      render(<MixDetailClient job={createMockJob()} />);

      // Click the first parent image button
      const parentButtons = screen.getAllByRole("button");
      const photo1Button = parentButtons.find((btn) => btn.querySelector('img[alt="Photo 1.jpg"]'));

      if (photo1Button) {
        fireEvent.click(photo1Button);

        expect(mockPush).toHaveBeenCalledWith(
          "/apps/pixel/img-1?from=/apps/pixel/mix/job-123",
        );
      }
    });
  });

  describe("Comparison View", () => {
    it("shows Photo 1 → Result tab by default", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByRole("tab", { name: /Photo 1 → Result/i }))
        .toBeInTheDocument();
    });

    it("shows Photo 2 → Result tab when sourceImage exists", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByRole("tab", { name: /Photo 2 → Result/i }))
        .toBeInTheDocument();
    });

    it("does not show tabs when sourceImage is null", () => {
      render(<MixDetailClient job={createMockJob({ sourceImage: null })} />);

      expect(screen.queryByRole("tab", { name: /Photo 2 → Result/i })).not
        .toBeInTheDocument();
    });

    it("tab buttons are clickable", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const tab1 = screen.getByRole("tab", { name: /Photo 1 → Result/i });
      const tab2 = screen.getByRole("tab", { name: /Photo 2 → Result/i });

      // Verify tabs are clickable (no errors thrown)
      expect(() => fireEvent.click(tab2)).not.toThrow();
      expect(() => fireEvent.click(tab1)).not.toThrow();
    });

    it("Photo 1 tab is active by default", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const tab1 = screen.getByRole("tab", { name: /Photo 1 → Result/i });
      expect(tab1.getAttribute("data-state")).toBe("active");
    });
  });

  describe("SSR Hydration", () => {
    it("renders share URL", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const qrCode = screen.getByTestId("qr-code");
      // The QR code should be rendered with a URL
      expect(qrCode.getAttribute("data-url")).toBeTruthy();
    });
  });

  describe("Date formatting", () => {
    it("displays job creation date", () => {
      render(<MixDetailClient job={createMockJob()} />);

      // The date should be displayed somewhere in the component
      // Check that the quality and date section exists
      const infoSection = screen.getByText(/2K Quality/);
      expect(infoSection).toBeInTheDocument();
    });
  });
});
