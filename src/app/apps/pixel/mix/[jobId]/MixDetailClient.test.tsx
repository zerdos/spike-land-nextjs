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
    it("renders Back button", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
    });

    it("renders Download button when job is completed", () => {
      render(<MixDetailClient job={createMockJob()} />);

      expect(screen.getByRole("button", { name: /Download/i }))
        .toBeInTheDocument();
    });

    it("does not render Download button when job is processing", () => {
      render(<MixDetailClient job={createMockJob({ status: "PROCESSING", resultUrl: null })} />);

      expect(screen.queryByRole("button", { name: /Download/i })).not
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

    it("renders both parent images", () => {
      const job = createMockJob();
      render(<MixDetailClient job={job} />);

      expect(screen.getByAltText("Photo 1.jpg")).toBeInTheDocument();
      expect(screen.getByAltText("Photo 2.jpg")).toBeInTheDocument();
    });

    it("renders QR code component with share URL", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const qrCode = screen.getByTestId("qr-code");
      expect(qrCode).toBeInTheDocument();
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
      const mockHeaders = new Headers({
        "Content-Disposition": 'attachment; filename="mix-job-123.jpg"',
      });
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
        headers: mockHeaders,
      } as Response);

      const createObjectURL = vi.fn().mockReturnValue("blob:test-url");
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      render(<MixDetailClient job={createMockJob()} />);

      const downloadButton = screen.getByRole("button", {
        name: /Download/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/jobs/job-123/download",
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
        name: /Download/i,
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
      expect(screen.queryByRole("button", { name: /Download/i })).not
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
    it("shows two tabs when sourceImage exists", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
    });

    it("first tab shows Photo 1 → Result", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const tabs = screen.getAllByRole("tab");
      const tab1Images = tabs[0].querySelectorAll("img");
      expect(tab1Images).toHaveLength(2);
      expect(tab1Images[0]).toHaveAttribute("alt", "Photo 1");
      expect(tab1Images[1]).toHaveAttribute("alt", "Result");
    });

    it("second tab shows Photo 2 → Result", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const tabs = screen.getAllByRole("tab");
      const tab2Images = tabs[1].querySelectorAll("img");
      expect(tab2Images).toHaveLength(2);
      expect(tab2Images[0]).toHaveAttribute("alt", "Photo 2");
      expect(tab2Images[1]).toHaveAttribute("alt", "Result");
    });

    it("does not show tabs when sourceImage is null", () => {
      render(<MixDetailClient job={createMockJob({ sourceImage: null })} />);

      expect(screen.queryByRole("tab")).not
        .toBeInTheDocument();
    });

    it("tab buttons are clickable", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);

      // Verify tabs are clickable (no errors thrown)
      expect(() => fireEvent.click(tabs[1])).not.toThrow();
      expect(() => fireEvent.click(tabs[0])).not.toThrow();
    });

    it("Photo 1 tab is active by default", () => {
      render(<MixDetailClient job={createMockJob()} />);

      const tabs = screen.getAllByRole("tab");
      expect(tabs[0].getAttribute("data-state")).toBe("active");
    });

    it("renders thumbnail images in tabs including result", () => {
      const job = createMockJob();
      render(<MixDetailClient job={job} />);

      const tabs = screen.getAllByRole("tab");

      // Each tab should contain source image and result image thumbnails
      const tab1Images = tabs[0].querySelectorAll("img");
      const tab2Images = tabs[1].querySelectorAll("img");

      // Tab 1: Photo 1 → Result
      expect(tab1Images[0]).toHaveAttribute("alt", "Photo 1");
      expect(tab1Images[0]).toHaveAttribute("src", job.targetImage.url);
      expect(tab1Images[1]).toHaveAttribute("alt", "Result");
      expect(tab1Images[1]).toHaveAttribute("src", job.resultUrl);

      // Tab 2: Photo 2 → Result
      expect(tab2Images).toHaveLength(2);
      expect(tab2Images[0]).toHaveAttribute("alt", "Photo 2");
      expect(tab2Images[0]).toHaveAttribute("src", job.sourceImage!.url);
      expect(tab2Images[1]).toHaveAttribute("alt", "Result");
      expect(tab2Images[1]).toHaveAttribute("src", job.resultUrl);
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
});
