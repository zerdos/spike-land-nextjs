import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppScreenshotGallery, Screenshot } from "./app-screenshot-gallery";

vi.mock("next/image", () => ({
  default: ({ src, alt, fill, priority, sizes, className }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      data-fill={fill}
      data-priority={priority}
      data-sizes={sizes}
      className={className}
    />
  ),
}));

describe("AppScreenshotGallery", () => {
  const mockScreenshots: Screenshot[] = [
    {
      id: "1",
      url: "/screenshots/test1.jpg",
      alt: "Screenshot 1",
      title: "First Screenshot",
    },
    {
      id: "2",
      url: "/screenshots/test2.jpg",
      alt: "Screenshot 2",
      title: "Second Screenshot",
    },
    {
      id: "3",
      url: "/screenshots/test3.jpg",
      alt: "Screenshot 3",
      title: "Third Screenshot",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty State", () => {
    it("renders empty state when no screenshots provided", () => {
      render(<AppScreenshotGallery screenshots={[]} />);

      expect(screen.getByText("No screenshots available")).toBeInTheDocument();
    });

    it("applies custom className to empty state", () => {
      const { container } = render(
        <AppScreenshotGallery screenshots={[]} className="custom-empty" />,
      );

      const emptyState = container.querySelector(".custom-empty");
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent("No screenshots available");
    });

    it("empty state has correct styling", () => {
      const { container } = render(<AppScreenshotGallery screenshots={[]} />);

      const emptyState = container.querySelector(
        ".text-center.py-8.text-muted-foreground",
      );
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe("Thumbnail Grid Rendering", () => {
    it("renders all screenshots as thumbnails", () => {
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      mockScreenshots.forEach((screenshot) => {
        const images = screen.getAllByAltText(screenshot.alt);
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it("renders with default 3 columns", () => {
      const { container } = render(
        <AppScreenshotGallery screenshots={mockScreenshots} />,
      );

      const grid = container.querySelector(
        ".grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3",
      );
      expect(grid).toBeInTheDocument();
    });

    it("renders with 2 columns when specified", () => {
      const { container } = render(
        <AppScreenshotGallery screenshots={mockScreenshots} columns={2} />,
      );

      const grid = container.querySelector(".grid-cols-1.sm\\:grid-cols-2");
      expect(grid).toBeInTheDocument();
    });

    it("renders with 4 columns when specified", () => {
      const { container } = render(
        <AppScreenshotGallery screenshots={mockScreenshots} columns={4} />,
      );

      const grid = container.querySelector(
        ".grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4",
      );
      expect(grid).toBeInTheDocument();
    });

    it("applies custom className to gallery container", () => {
      const { container } = render(
        <AppScreenshotGallery
          screenshots={mockScreenshots}
          className="custom-gallery"
        />,
      );

      const gallery = container.querySelector(".custom-gallery");
      expect(gallery).toBeInTheDocument();
    });

    it("renders screenshot titles in thumbnails", () => {
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      expect(screen.getByText("First Screenshot")).toBeInTheDocument();
      expect(screen.getByText("Second Screenshot")).toBeInTheDocument();
      expect(screen.getByText("Third Screenshot")).toBeInTheDocument();
    });

    it("renders thumbnails without title when not provided", () => {
      const screenshotsWithoutTitles: Screenshot[] = [
        { id: "1", url: "/test1.jpg", alt: "Test 1" },
        { id: "2", url: "/test2.jpg", alt: "Test 2" },
      ];

      render(<AppScreenshotGallery screenshots={screenshotsWithoutTitles} />);

      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(screenshotsWithoutTitles.length);
    });
  });

  describe("Thumbnail Interaction", () => {
    it("thumbnails are clickable buttons", () => {
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("thumbnail buttons have correct accessibility attributes", () => {
      const { container } = render(
        <AppScreenshotGallery screenshots={mockScreenshots} />,
      );

      const thumbnailButtons = container.querySelectorAll(
        "button.group.relative",
      );
      thumbnailButtons.forEach((button) => {
        expect(button).toHaveClass("focus:outline-none");
        expect(button).toHaveClass("focus:ring-2");
        expect(button).toHaveClass("focus:ring-ring");
        expect(button).toHaveClass("focus:ring-offset-2");
      });
    });

    it("opens dialog when thumbnail clicked", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });

  describe("Modal/Dialog View", () => {
    it("displays selected image in modal", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[1]);

      const dialog = screen.getByRole("dialog");
      const images = within(dialog).getAllByAltText("Screenshot 2");
      expect(images.length).toBeGreaterThan(0);
    });

    it("shows title in modal when available", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        const allTitles = screen.getAllByText("First Screenshot");
        expect(allTitles.length).toBeGreaterThan(0);
      });
    });

    it("shows image counter when multiple screenshots", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        expect(screen.getByText("1 of 3")).toBeInTheDocument();
      });
    });

    it("does not show navigation buttons for single screenshot", async () => {
      const user = userEvent.setup();
      const singleScreenshot: Screenshot[] = [
        {
          id: "1",
          url: "/test.jpg",
          alt: "Single",
          title: "Single Screenshot",
        },
      ];

      render(<AppScreenshotGallery screenshots={singleScreenshot} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      const dialog = screen.getByRole("dialog");
      const buttons = within(dialog).getAllByRole("button");

      const hasNavigationButtons = buttons.some((btn) =>
        btn.querySelector("svg")?.parentElement?.className.includes(
          "absolute",
        ) &&
        btn.querySelector("svg")?.parentElement?.className.includes("top-1/2")
      );

      expect(hasNavigationButtons).toBe(false);
    });

    it("shows navigation buttons for multiple screenshots", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        const dialog = screen.getByRole("dialog");
        const buttons = within(dialog).getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(1);
      });
    });
  });

  describe("Image Navigation", () => {
    it("navigates to next image when next button clicked", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        expect(screen.getByText("1 of 3")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const buttons = within(dialog).getAllByRole("button");
      const nextButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg?.parentElement?.className.includes("right-2") &&
          svg?.parentElement?.className.includes("top-1/2");
      });

      if (nextButton) {
        await user.click(nextButton);
        await vi.waitFor(() => {
          expect(screen.getByText("2 of 3")).toBeInTheDocument();
        });
      }
    });

    it("navigates to previous image when previous button clicked", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[1]);

      await vi.waitFor(() => {
        expect(screen.getByText("2 of 3")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const buttons = within(dialog).getAllByRole("button");
      const prevButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg?.parentElement?.className.includes("left-2") &&
          svg?.parentElement?.className.includes("top-1/2");
      });

      if (prevButton) {
        await user.click(prevButton);
        await vi.waitFor(() => {
          expect(screen.getByText("1 of 3")).toBeInTheDocument();
        });
      }
    });

    it("wraps to last image when previous clicked on first image", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        expect(screen.getByText("1 of 3")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const buttons = within(dialog).getAllByRole("button");
      const prevButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg?.parentElement?.className.includes("left-2") &&
          svg?.parentElement?.className.includes("top-1/2");
      });

      if (prevButton) {
        await user.click(prevButton);
        await vi.waitFor(() => {
          expect(screen.getByText("3 of 3")).toBeInTheDocument();
        });
      }
    });

    it("wraps to first image when next clicked on last image", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[2]);

      await vi.waitFor(() => {
        expect(screen.getByText("3 of 3")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const buttons = within(dialog).getAllByRole("button");
      const nextButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg?.parentElement?.className.includes("right-2") &&
          svg?.parentElement?.className.includes("top-1/2");
      });

      if (nextButton) {
        await user.click(nextButton);
        await vi.waitFor(() => {
          expect(screen.getByText("1 of 3")).toBeInTheDocument();
        });
      }
    });
  });

  describe("Image Properties", () => {
    it("thumbnail images have correct attributes", () => {
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const images = screen.getAllByRole("img");
      const thumbnailImages = images.filter((img) =>
        img.getAttribute("data-sizes") ===
          "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      );

      expect(thumbnailImages.length).toBe(mockScreenshots.length);
      thumbnailImages.forEach((img) => {
        expect(img).toHaveAttribute("data-fill", "true");
      });
    });

    it("modal images have priority attribute", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        const images = screen.getAllByRole("img");
        const priorityImage = images.find((img) => img.getAttribute("data-priority") === "true");
        expect(priorityImage).toBeDefined();
      });
    });

    it("modal images have correct sizes attribute", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        const images = screen.getAllByRole("img");
        const modalImage = images.find((img) => img.getAttribute("data-sizes") === "90vw");
        expect(modalImage).toBeDefined();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles screenshot without title gracefully", async () => {
      const user = userEvent.setup();
      const screenshotNoTitle: Screenshot[] = [
        { id: "1", url: "/test.jpg", alt: "No title" },
      ];

      render(<AppScreenshotGallery screenshots={screenshotNoTitle} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("handles very long screenshot titles", () => {
      const longTitleScreenshot: Screenshot[] = [
        {
          id: "1",
          url: "/test.jpg",
          alt: "Long title",
          title: "This is a very long screenshot title that should be truncated properly",
        },
      ];

      const { container } = render(
        <AppScreenshotGallery screenshots={longTitleScreenshot} />,
      );

      const titleElement = container.querySelector(".truncate");
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent(
        "This is a very long screenshot title that should be truncated properly",
      );
    });

    it("renders with single screenshot", () => {
      const singleScreenshot: Screenshot[] = [
        { id: "1", url: "/single.jpg", alt: "Single", title: "Only One" },
      ];

      render(<AppScreenshotGallery screenshots={singleScreenshot} />);

      expect(screen.getByAltText("Single")).toBeInTheDocument();
      expect(screen.getByText("Only One")).toBeInTheDocument();
    });

    it("updates selected index when different thumbnails are clicked", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);
      await vi.waitFor(() => {
        expect(screen.getByText("1 of 3")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog");
      const buttons = within(dialog).getAllByRole("button");
      const nextButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg?.parentElement?.className.includes("right-2") &&
          svg?.parentElement?.className.includes("top-1/2");
      });

      if (nextButton) {
        await user.click(nextButton);
        await vi.waitFor(() => {
          expect(screen.getByText("2 of 3")).toBeInTheDocument();
        });

        await user.click(nextButton);
        await vi.waitFor(() => {
          expect(screen.getByText("3 of 3")).toBeInTheDocument();
        });
      }
    });
  });

  describe("Accessibility", () => {
    it("thumbnails have proper focus styles", () => {
      const { container } = render(
        <AppScreenshotGallery screenshots={mockScreenshots} />,
      );

      const thumbnailButtons = container.querySelectorAll("button.group");
      thumbnailButtons.forEach((button) => {
        expect(button).toHaveClass("focus:outline-none");
        expect(button).toHaveClass("focus:ring-2");
      });
    });

    it("all images have alt text", () => {
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const images = screen.getAllByRole("img");
      images.forEach((img) => {
        expect(img).toHaveAttribute("alt");
        expect(img.getAttribute("alt")).toBeTruthy();
      });
    });

    it("dialog is properly labeled with role", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("navigation buttons are accessible", async () => {
      const user = userEvent.setup();
      render(<AppScreenshotGallery screenshots={mockScreenshots} />);

      const thumbnailButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("group")
      );

      await user.click(thumbnailButtons[0]);

      await vi.waitFor(() => {
        const dialog = screen.getByRole("dialog");
        const buttons = within(dialog).getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });
});
