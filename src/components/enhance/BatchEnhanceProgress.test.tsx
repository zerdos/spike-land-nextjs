import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BatchEnhanceProgress,
  type BatchEnhanceProgressProps,
  type BatchImageStatus,
} from "./BatchEnhanceProgress";

const createImage = (
  status: BatchImageStatus["status"],
  overrides: Partial<BatchImageStatus> = {},
): BatchImageStatus => ({
  imageId: overrides.imageId ?? `image-${Math.random().toString(36).slice(2)}`,
  thumbnailUrl: overrides.thumbnailUrl ?? "http://example.com/thumb.jpg",
  status,
  enhancedUrl: overrides.enhancedUrl,
  error: overrides.error,
});

const defaultProps: BatchEnhanceProgressProps = {
  images: [],
  tier: "TIER_1K",
};

describe("BatchEnhanceProgress Component", () => {
  describe("Rendering", () => {
    it("renders the progress region", () => {
      const images = [createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByRole("region", { name: "Batch enhancement progress" }))
        .toBeInTheDocument();
    });

    it("applies custom className", () => {
      const images = [createImage("PENDING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          className="custom-class"
        />,
      );
      expect(screen.getByRole("region")).toHaveClass("custom-class");
    });

    it("renders image thumbnails", () => {
      const images = [
        createImage("PENDING", {
          imageId: "img-1",
          thumbnailUrl: "http://example.com/1.jpg",
        }),
        createImage("PROCESSING", {
          imageId: "img-2",
          thumbnailUrl: "http://example.com/2.jpg",
        }),
      ];
      const { container } = render(
        <BatchEnhanceProgress {...defaultProps} images={images} />,
      );
      const imageElements = container.querySelectorAll("img");
      expect(imageElements).toHaveLength(2);
      expect(imageElements[0]).toHaveAttribute(
        "src",
        "http://example.com/1.jpg",
      );
      expect(imageElements[1]).toHaveAttribute(
        "src",
        "http://example.com/2.jpg",
      );
    });

    it("renders the image list with correct aria-label", () => {
      const images = [createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByRole("list", { name: "Image processing status" }))
        .toBeInTheDocument();
    });

    it("renders each image as a listitem with correct aria-label", () => {
      const images = [
        createImage("PENDING", { imageId: "img-1" }),
        createImage("COMPLETED", { imageId: "img-2" }),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(2);
      expect(listItems[0]).toHaveAttribute(
        "aria-label",
        "Pending: Image img-1",
      );
      expect(listItems[1]).toHaveAttribute(
        "aria-label",
        "Completed: Image img-2",
      );
    });
  });

  describe("Tier Labels", () => {
    it("displays 1K for TIER_1K", () => {
      const images = [createImage("PENDING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          tier="TIER_1K"
        />,
      );
      expect(screen.getByText(/at 1K quality/)).toBeInTheDocument();
    });

    it("displays 2K for TIER_2K", () => {
      const images = [createImage("PENDING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          tier="TIER_2K"
        />,
      );
      expect(screen.getByText(/at 2K quality/)).toBeInTheDocument();
    });

    it("displays 4K for TIER_4K", () => {
      const images = [createImage("PENDING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          tier="TIER_4K"
        />,
      );
      expect(screen.getByText(/at 4K quality/)).toBeInTheDocument();
    });
  });

  describe("Heading Text", () => {
    it("displays singular photo when there is 1 image", () => {
      const images = [createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("Enhancing 1 photo at 1K quality"))
        .toBeInTheDocument();
    });

    it("displays plural photos when there are multiple images", () => {
      const images = [createImage("PENDING"), createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("Enhancing 2 photos at 1K quality"))
        .toBeInTheDocument();
    });

    it("displays plural photos when there are zero images", () => {
      render(<BatchEnhanceProgress {...defaultProps} images={[]} />);
      expect(screen.getByText("Enhancing 0 photos at 1K quality"))
        .toBeInTheDocument();
    });
  });

  describe("Progress Calculation", () => {
    it("shows 0% when all images are pending", () => {
      const images = [createImage("PENDING"), createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("shows 50% when half the images are completed", () => {
      const images = [createImage("COMPLETED"), createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("shows 100% when all images are completed", () => {
      const images = [createImage("COMPLETED"), createImage("COMPLETED")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("includes failed images in finished count", () => {
      const images = [createImage("FAILED"), createImage("COMPLETED")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("does not include processing images in finished count", () => {
      const images = [
        createImage("COMPLETED"),
        createImage("PROCESSING"),
        createImage("PENDING"),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      // 1 completed / 3 total = 33%
      expect(screen.getByText("33%")).toBeInTheDocument();
    });

    it("shows 0% when images array is empty", () => {
      render(<BatchEnhanceProgress {...defaultProps} images={[]} />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("has accessible progress bar with correct aria-label", () => {
      const images = [createImage("COMPLETED"), createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByLabelText("Enhancement progress: 50%"))
        .toBeInTheDocument();
    });
  });

  describe("Status Counts", () => {
    it("displays completed count", () => {
      const images = [createImage("COMPLETED"), createImage("COMPLETED")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("Completed: 2")).toBeInTheDocument();
    });

    it("displays processing count", () => {
      const images = [createImage("PROCESSING"), createImage("PROCESSING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("Processing: 2")).toBeInTheDocument();
    });

    it("displays pending count", () => {
      const images = [createImage("PENDING"), createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("Pending: 2")).toBeInTheDocument();
    });

    it("displays failed count", () => {
      const images = [createImage("FAILED"), createImage("FAILED")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("Failed: 2")).toBeInTheDocument();
    });

    it("displays all counts together", () => {
      const images = [
        createImage("COMPLETED"),
        createImage("PROCESSING"),
        createImage("PENDING"),
        createImage("FAILED"),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("Completed: 1")).toBeInTheDocument();
      expect(screen.getByText("Processing: 1")).toBeInTheDocument();
      expect(screen.getByText("Pending: 1")).toBeInTheDocument();
      expect(screen.getByText("Failed: 1")).toBeInTheDocument();
    });
  });

  describe("Status Overlays", () => {
    it("renders CheckCircle icon for COMPLETED status", () => {
      const images = [createImage("COMPLETED", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem.querySelector(".bg-green-500\\/30")).toBeInTheDocument();
    });

    it("renders Loader2 icon for PROCESSING status", () => {
      const images = [createImage("PROCESSING", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem.querySelector(".bg-blue-500\\/30")).toBeInTheDocument();
      expect(listItem.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders XCircle icon for FAILED status", () => {
      const images = [createImage("FAILED", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem.querySelector(".bg-red-500\\/30")).toBeInTheDocument();
    });

    it("renders Circle icon for PENDING status", () => {
      const images = [createImage("PENDING", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem.querySelector(".bg-gray-500\\/20")).toBeInTheDocument();
    });
  });

  describe("Status Labels (title attribute)", () => {
    it("shows Completed as title for completed images", () => {
      const images = [createImage("COMPLETED", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem).toHaveAttribute("title", "Completed");
    });

    it("shows Processing as title for processing images", () => {
      const images = [createImage("PROCESSING", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem).toHaveAttribute("title", "Processing");
    });

    it("shows Failed as title for failed images", () => {
      const images = [createImage("FAILED", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem).toHaveAttribute("title", "Failed");
    });

    it("shows Pending as title for pending images", () => {
      const images = [createImage("PENDING", { imageId: "img-1" })];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem).toHaveAttribute("title", "Pending");
    });

    it("shows error message as title for failed images with error", () => {
      const images = [
        createImage("FAILED", {
          imageId: "img-1",
          error: "Enhancement failed",
        }),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      expect(listItem).toHaveAttribute("title", "Enhancement failed");
    });
  });

  describe("Cancel Button", () => {
    it("shows cancel button when onCancel is provided and not complete", () => {
      const onCancel = vi.fn();
      const images = [createImage("PENDING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onCancel={onCancel}
        />,
      );
      expect(screen.getByRole("button", { name: /cancel/i }))
        .toBeInTheDocument();
    });

    it("does not show cancel button when onCancel is not provided", () => {
      const images = [createImage("PENDING")];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.queryByRole("button", { name: /cancel/i })).not
        .toBeInTheDocument();
    });

    it("does not show cancel button when all images are complete", () => {
      const onCancel = vi.fn();
      const images = [createImage("COMPLETED"), createImage("COMPLETED")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onCancel={onCancel}
        />,
      );
      expect(screen.queryByRole("button", { name: /cancel/i })).not
        .toBeInTheDocument();
    });

    it("does not show cancel button when all images are failed", () => {
      const onCancel = vi.fn();
      const images = [createImage("FAILED"), createImage("FAILED")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onCancel={onCancel}
        />,
      );
      expect(screen.queryByRole("button", { name: /cancel/i })).not
        .toBeInTheDocument();
    });

    it("does not show cancel button when all images are completed or failed", () => {
      const onCancel = vi.fn();
      const images = [createImage("COMPLETED"), createImage("FAILED")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onCancel={onCancel}
        />,
      );
      expect(screen.queryByRole("button", { name: /cancel/i })).not
        .toBeInTheDocument();
    });

    it("shows cancel button when some images are still processing", () => {
      const onCancel = vi.fn();
      const images = [createImage("COMPLETED"), createImage("PROCESSING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onCancel={onCancel}
        />,
      );
      expect(screen.getByRole("button", { name: /cancel/i }))
        .toBeInTheDocument();
    });

    it("calls onCancel when cancel button is clicked", () => {
      const onCancel = vi.fn();
      const images = [createImage("PENDING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onCancel={onCancel}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("onComplete Callback", () => {
    it("calls onComplete when all images are finished", async () => {
      const onComplete = vi.fn();
      const images = [createImage("COMPLETED"), createImage("FAILED")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onComplete={onComplete}
        />,
      );
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call onComplete when some images are still pending", () => {
      const onComplete = vi.fn();
      const images = [createImage("COMPLETED"), createImage("PENDING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onComplete={onComplete}
        />,
      );
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("does not call onComplete when some images are still processing", () => {
      const onComplete = vi.fn();
      const images = [createImage("COMPLETED"), createImage("PROCESSING")];
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={images}
          onComplete={onComplete}
        />,
      );
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("does not call onComplete when images array is empty", () => {
      const onComplete = vi.fn();
      render(
        <BatchEnhanceProgress
          {...defaultProps}
          images={[]}
          onComplete={onComplete}
        />,
      );
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("does not call onComplete when onComplete is not provided", () => {
      const images = [createImage("COMPLETED")];
      // This should not throw
      expect(() => {
        render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      }).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("handles images with same imageId", () => {
      const images = [
        createImage("PENDING", { imageId: "same-id" }),
        createImage("COMPLETED", { imageId: "same-id" }),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(2);
    });

    it("handles unknown status gracefully (defaults to PENDING styling)", () => {
      // TypeScript would prevent this, but testing runtime behavior
      const images = [
        {
          imageId: "img-1",
          thumbnailUrl: "http://example.com/1.jpg",
          status: "UNKNOWN" as BatchImageStatus["status"],
        },
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      const listItem = screen.getByRole("listitem");
      // Should fall through to default/PENDING case
      expect(listItem.querySelector(".bg-gray-500\\/20")).toBeInTheDocument();
      expect(listItem).toHaveAttribute("title", "Pending");
    });

    it("renders images with enhancedUrl", () => {
      const images = [
        createImage("COMPLETED", {
          imageId: "img-1",
          enhancedUrl: "http://example.com/enhanced.jpg",
        }),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      // The enhancedUrl is available in the data but not displayed in this component
      expect(screen.getByRole("listitem")).toBeInTheDocument();
    });

    it("handles large number of images", () => {
      const images = Array.from(
        { length: 100 },
        (_, i) => createImage("PENDING", { imageId: `img-${i}` }),
      );
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getAllByRole("listitem")).toHaveLength(100);
      expect(screen.getByText("Enhancing 100 photos at 1K quality"))
        .toBeInTheDocument();
    });

    it("rounds progress percentage correctly", () => {
      // 1 completed out of 3 = 33.33...% should round to 33%
      const images = [
        createImage("COMPLETED"),
        createImage("PENDING"),
        createImage("PENDING"),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("33%")).toBeInTheDocument();
    });

    it("rounds progress percentage to 67% for 2/3 completed", () => {
      const images = [
        createImage("COMPLETED"),
        createImage("COMPLETED"),
        createImage("PENDING"),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);
      expect(screen.getByText("67%")).toBeInTheDocument();
    });
  });

  describe("Multiple Status Overlays", () => {
    it("renders correct overlays for mixed statuses", () => {
      const images = [
        createImage("PENDING", { imageId: "pending-1" }),
        createImage("PROCESSING", { imageId: "processing-1" }),
        createImage("COMPLETED", { imageId: "completed-1" }),
        createImage("FAILED", { imageId: "failed-1" }),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);

      const listItems = screen.getAllByRole("listitem");

      // PENDING - gray background
      expect(listItems[0].querySelector(".bg-gray-500\\/20"))
        .toBeInTheDocument();
      // PROCESSING - blue background with spinner
      expect(listItems[1].querySelector(".bg-blue-500\\/30"))
        .toBeInTheDocument();
      expect(listItems[1].querySelector(".animate-spin")).toBeInTheDocument();
      // COMPLETED - green background
      expect(listItems[2].querySelector(".bg-green-500\\/30"))
        .toBeInTheDocument();
      // FAILED - red background
      expect(listItems[3].querySelector(".bg-red-500\\/30"))
        .toBeInTheDocument();
    });
  });

  describe("Badge Styling", () => {
    it("renders badges with correct variant classes", () => {
      const images = [
        createImage("COMPLETED"),
        createImage("PROCESSING"),
        createImage("PENDING"),
        createImage("FAILED"),
      ];
      render(<BatchEnhanceProgress {...defaultProps} images={images} />);

      // Check the badge contents are rendered
      expect(screen.getByText("Completed: 1")).toBeInTheDocument();
      expect(screen.getByText("Processing: 1")).toBeInTheDocument();
      expect(screen.getByText("Pending: 1")).toBeInTheDocument();
      expect(screen.getByText("Failed: 1")).toBeInTheDocument();
    });
  });
});
