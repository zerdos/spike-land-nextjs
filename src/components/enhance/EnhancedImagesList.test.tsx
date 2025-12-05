import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnhancedImagesList } from "./EnhancedImagesList";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const mockImage: EnhancedImage & { enhancementJobs: ImageEnhancementJob[]; } = {
  id: "test-image-1",
  originalUrl: "https://example.com/original.jpg",
  userId: "user-123",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T10:00:00Z"),
  enhancementJobs: [],
};

describe("EnhancedImagesList Component", () => {
  it("renders empty state when no images", () => {
    render(<EnhancedImagesList images={[]} />);

    expect(
      screen.getByText(
        "No images uploaded yet. Upload your first image to get started.",
      ),
    ).toBeInTheDocument();
  });

  it("renders list of images", () => {
    const images = [
      { ...mockImage, id: "image-1" },
      { ...mockImage, id: "image-2" },
      { ...mockImage, id: "image-3" },
    ];

    render(<EnhancedImagesList images={images} />);

    const uploadedImages = screen.getAllByRole("img", { name: "Uploaded image" });
    expect(uploadedImages).toHaveLength(3);
  });

  it('shows "Not Enhanced" badge for images without jobs', () => {
    render(<EnhancedImagesList images={[mockImage]} />);

    expect(screen.getByText("Not Enhanced")).toBeInTheDocument();
  });

  it("shows completed count badge when jobs are completed", () => {
    const imageWithCompletedJobs: typeof mockImage = {
      ...mockImage,
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "test-image-1",
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
          width: 1920,
          height: 1080,
          fileSize: 500000,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: null,
        },
        {
          id: "job-2",
          imageId: "test-image-1",
          tier: "TIER_2K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-2k.jpg",
          width: 2560,
          height: 1440,
          fileSize: 800000,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: null,
        },
      ],
    };

    render(<EnhancedImagesList images={[imageWithCompletedJobs]} />);

    expect(screen.getByText("2 Enhanced")).toBeInTheDocument();
  });

  it('shows "Processing..." badge when jobs are processing', () => {
    const imageWithProcessingJobs: typeof mockImage = {
      ...mockImage,
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "test-image-1",
          tier: "TIER_1K",
          status: "PROCESSING",
          enhancedUrl: null,
          width: 1920,
          height: 1080,
          fileSize: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: null,
        },
      ],
    };

    render(<EnhancedImagesList images={[imageWithProcessingJobs]} />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it('shows "Failed" badge when all jobs failed', () => {
    const imageWithFailedJobs: typeof mockImage = {
      ...mockImage,
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "test-image-1",
          tier: "TIER_1K",
          status: "FAILED",
          enhancedUrl: null,
          width: 1920,
          height: 1080,
          fileSize: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: "Enhancement failed",
        },
      ],
    };

    render(<EnhancedImagesList images={[imageWithFailedJobs]} />);

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it('shows "Pending" badge when jobs are pending', () => {
    const imageWithPendingJobs: typeof mockImage = {
      ...mockImage,
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "test-image-1",
          tier: "TIER_1K",
          status: "PENDING",
          enhancedUrl: null,
          width: 1920,
          height: 1080,
          fileSize: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: null,
        },
      ],
    };

    render(<EnhancedImagesList images={[imageWithPendingJobs]} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows formatted date for each image after client mount", async () => {
    render(<EnhancedImagesList images={[mockImage]} />);

    // Date should render after client-side mount with consistent format
    // The component uses a custom formatDate function: "Jan 15" format
    const expectedDate = "Jan 15";

    // Wait for client-side effect to run
    await vi.waitFor(() => {
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it('shows "Enhance" button for images without jobs', () => {
    render(<EnhancedImagesList images={[mockImage]} />);

    expect(screen.getByText("Enhance")).toBeInTheDocument();
  });

  it('shows "View" button for images with jobs', () => {
    const imageWithJobs: typeof mockImage = {
      ...mockImage,
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "test-image-1",
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced.jpg",
          width: 1920,
          height: 1080,
          fileSize: 500000,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: null,
        },
      ],
    };

    render(<EnhancedImagesList images={[imageWithJobs]} />);

    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();

    render(<EnhancedImagesList images={[mockImage]} onDelete={onDelete} />);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith("test-image-1");
  });

  it("does not render delete button when onDelete is not provided", () => {
    render(<EnhancedImagesList images={[mockImage]} />);

    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it('shows "Deleting..." text when image is being deleted', () => {
    const onDelete = vi.fn();

    render(
      <EnhancedImagesList
        images={[mockImage]}
        onDelete={onDelete}
        deletingImageId="test-image-1"
      />,
    );

    expect(screen.getByText("Deleting...")).toBeInTheDocument();
  });

  it("disables buttons when image is being deleted", () => {
    const onDelete = vi.fn();

    render(
      <EnhancedImagesList
        images={[mockImage]}
        onDelete={onDelete}
        deletingImageId="test-image-1"
      />,
    );

    const deleteButton = screen.getByText("Deleting...");
    expect(deleteButton).toBeDisabled();

    // The Enhance button link should be wrapped in a Button that is disabled
    const enhanceText = screen.getByText("Enhance");
    expect(enhanceText).toBeInTheDocument();
  });

  it("links to correct enhance page", () => {
    render(<EnhancedImagesList images={[mockImage]} />);

    const links = screen.getAllByRole("link");
    const enhanceLink = links.find((link) =>
      link.getAttribute("href")?.includes("/enhance/test-image-1")
    );

    expect(enhanceLink).toBeInTheDocument();
    expect(enhanceLink?.getAttribute("href")).toBe("/enhance/test-image-1");
  });

  it("renders image with correct URL", () => {
    render(<EnhancedImagesList images={[mockImage]} />);

    const image = screen.getByRole("img", { name: "Uploaded image" });
    expect(image).toHaveAttribute("src", "https://example.com/original.jpg");
  });

  it("renders multiple images with different statuses", () => {
    const images = [
      {
        ...mockImage,
        id: "image-1",
        enhancementJobs: [],
      },
      {
        ...mockImage,
        id: "image-2",
        enhancementJobs: [
          {
            id: "job-1",
            imageId: "image-2",
            tier: "TIER_1K" as const,
            status: "PROCESSING" as const,
            enhancedUrl: null,
            width: 1920,
            height: 1080,
            fileSize: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            error: null,
          },
        ],
      },
      {
        ...mockImage,
        id: "image-3",
        enhancementJobs: [
          {
            id: "job-2",
            imageId: "image-3",
            tier: "TIER_2K" as const,
            status: "COMPLETED" as const,
            enhancedUrl: "https://example.com/enhanced.jpg",
            width: 2560,
            height: 1440,
            fileSize: 800000,
            createdAt: new Date(),
            updatedAt: new Date(),
            error: null,
          },
        ],
      },
    ];

    render(<EnhancedImagesList images={images} />);

    expect(screen.getByText("Not Enhanced")).toBeInTheDocument();
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.getByText("1 Enhanced")).toBeInTheDocument();
  });

  it("prevents delete button click from triggering card link", () => {
    const onDelete = vi.fn();

    render(<EnhancedImagesList images={[mockImage]} onDelete={onDelete} />);

    const deleteButton = screen.getByText("Delete");
    const clickEvent = new MouseEvent("click", { bubbles: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, "preventDefault");

    fireEvent(deleteButton, clickEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith("test-image-1");
  });

  it("shows completed badge even when some jobs failed", () => {
    const imageWithMixedJobs: typeof mockImage = {
      ...mockImage,
      enhancementJobs: [
        {
          id: "job-1",
          imageId: "test-image-1",
          tier: "TIER_1K",
          status: "COMPLETED",
          enhancedUrl: "https://example.com/enhanced-1k.jpg",
          width: 1920,
          height: 1080,
          fileSize: 500000,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: null,
        },
        {
          id: "job-2",
          imageId: "test-image-1",
          tier: "TIER_2K",
          status: "FAILED",
          enhancedUrl: null,
          width: 2560,
          height: 1440,
          fileSize: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          error: "Enhancement failed",
        },
      ],
    };

    render(<EnhancedImagesList images={[imageWithMixedJobs]} />);

    // Should show completed count, not failed
    expect(screen.getByText("1 Enhanced")).toBeInTheDocument();
  });

  describe("SSR compatibility (hydration)", () => {
    it("renders date span that will be populated client-side", async () => {
      render(<EnhancedImagesList images={[mockImage]} />);

      // The date span exists with the text-muted-foreground class
      const dateSpans = document.querySelectorAll(".text-xs.text-muted-foreground");
      expect(dateSpans.length).toBeGreaterThan(0);

      // After useEffect runs, it should have the formatted date
      await vi.waitFor(() => {
        expect(screen.getByText("Jan 15")).toBeInTheDocument();
      });
    });

    it("date format is consistent using UTC to prevent server/client mismatch", async () => {
      // Test that the formatDate function produces consistent UTC output
      // regardless of the local timezone (uses getUTCMonth/getUTCDate)
      const testDates = [
        { input: new Date("2024-01-15T00:00:00Z"), expected: "Jan 15" },
        { input: new Date("2024-06-30T12:00:00Z"), expected: "Jun 30" },
        { input: new Date("2024-12-01T12:00:00Z"), expected: "Dec 1" },
      ];

      for (const { input, expected } of testDates) {
        const imageWithDate = { ...mockImage, createdAt: input };
        const { unmount } = render(<EnhancedImagesList images={[imageWithDate]} />);

        await vi.waitFor(() => {
          expect(screen.getByText(expected)).toBeInTheDocument();
        });

        unmount();
      }
    });

    it("date element exists in card content", () => {
      const { container } = render(<EnhancedImagesList images={[mockImage]} />);

      // Find the date span by its class
      const spans = container.querySelectorAll("span.text-xs.text-muted-foreground");
      expect(spans.length).toBeGreaterThan(0);
    });
  });
});
