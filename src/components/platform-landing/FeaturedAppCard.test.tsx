import { render, screen } from "@testing-library/react";
import { Image as ImageIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { FeaturedAppCard } from "./FeaturedAppCard";

// Mock next/image for ImageComparisonSlider
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

describe("FeaturedAppCard Component", () => {
  const defaultProps = {
    name: "Test App",
    description: "A test application description",
    icon: <ImageIcon data-testid="app-icon" />,
    href: "/apps/test",
  };

  it("should render the app name", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    expect(screen.getByText("Test App")).toBeInTheDocument();
  });

  it("should render the app description", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    expect(
      screen.getByText("A test application description"),
    ).toBeInTheDocument();
  });

  it("should render the app icon", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    expect(screen.getByTestId("app-icon")).toBeInTheDocument();
  });

  it("should render Learn More link for non-featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    const link = screen.getByRole("link", { name: /Learn More/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/apps/test");
  });

  it("should render Get Started link for featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} featured />);
    const link = screen.getByRole("link", { name: /Get Started/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/apps/test");
  });

  it("should render Featured badge for featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} featured />);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("should not render Featured badge for non-featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    expect(screen.queryByText("Featured")).not.toBeInTheDocument();
  });

  it("should have featured test id for featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} featured />);
    expect(screen.getByTestId("featured-app-card")).toBeInTheDocument();
  });

  it("should have app-card test id for non-featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    expect(screen.getByTestId("app-card")).toBeInTheDocument();
  });

  it("should have larger icon container for featured cards", () => {
    const { container } = render(
      <FeaturedAppCard {...defaultProps} featured />,
    );
    const iconContainer = container.querySelector(".h-16.w-16");
    expect(iconContainer).toBeInTheDocument();
  });

  it("should have smaller icon container for non-featured cards", () => {
    const { container } = render(<FeaturedAppCard {...defaultProps} />);
    const iconContainer = container.querySelector(".h-14.w-14");
    expect(iconContainer).toBeInTheDocument();
  });

  it("should have hover transition", () => {
    const { container } = render(<FeaturedAppCard {...defaultProps} />);
    const card = container.querySelector(".hover\\:scale-\\[1\\.02\\]");
    expect(card).toBeInTheDocument();
  });

  it("should have gradient background for featured cards", () => {
    const { container } = render(
      <FeaturedAppCard {...defaultProps} featured />,
    );
    const card = container.querySelector(".bg-gradient-to-br");
    expect(card).toBeInTheDocument();
  });

  it("should have primary border for featured cards", () => {
    const { container } = render(
      <FeaturedAppCard {...defaultProps} featured />,
    );
    const card = container.querySelector(".border-primary\\/30");
    expect(card).toBeInTheDocument();
  });

  it("should have larger title for featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} featured />);
    const title = screen.getByText("Test App");
    expect(title).toHaveClass("text-2xl");
  });

  it("should have smaller title for non-featured cards", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    const title = screen.getByText("Test App");
    expect(title).toHaveClass("text-lg");
  });

  it("should have ArrowRight icon in link", () => {
    const { container } = render(<FeaturedAppCard {...defaultProps} />);
    const arrowIcon = container.querySelector("svg.lucide-arrow-right");
    expect(arrowIcon).toBeInTheDocument();
  });

  it("should have icon with gradient background", () => {
    const { container } = render(<FeaturedAppCard {...defaultProps} />);
    const iconWrapper = container.querySelector(
      ".bg-gradient-to-br.from-primary.to-accent",
    );
    expect(iconWrapper).toBeInTheDocument();
  });

  it("should default featured to false", () => {
    render(<FeaturedAppCard {...defaultProps} />);
    expect(screen.queryByText("Featured")).not.toBeInTheDocument();
    expect(screen.getByTestId("app-card")).toBeInTheDocument();
  });

  describe("PixelLogo integration", () => {
    it("should render PixelLogo when usePixelLogo is true", () => {
      render(<FeaturedAppCard {...defaultProps} usePixelLogo />);
      expect(screen.getByRole("img", { name: "Pixel logo" })).toBeInTheDocument();
    });

    it("should not render icon when usePixelLogo is true", () => {
      render(<FeaturedAppCard {...defaultProps} usePixelLogo />);
      expect(screen.queryByTestId("app-icon")).not.toBeInTheDocument();
    });

    it("should not render app name CardTitle when usePixelLogo is true", () => {
      render(<FeaturedAppCard {...defaultProps} usePixelLogo />);
      expect(screen.queryByText("Test App")).not.toBeInTheDocument();
    });
  });

  describe("Tagline feature", () => {
    it("should render tagline when provided", () => {
      render(<FeaturedAppCard {...defaultProps} tagline="AI Image Enhancement" />);
      expect(screen.getByText("AI Image Enhancement")).toBeInTheDocument();
    });

    it("should not render tagline when not provided", () => {
      render(<FeaturedAppCard {...defaultProps} />);
      expect(screen.queryByText("AI Image Enhancement")).not.toBeInTheDocument();
    });

    it("should render tagline with primary color styling", () => {
      render(<FeaturedAppCard {...defaultProps} tagline="AI Image Enhancement" />);
      const tagline = screen.getByText("AI Image Enhancement");
      expect(tagline).toHaveClass("text-primary");
    });
  });

  describe("Comparison slider feature", () => {
    const comparisonImages = {
      originalUrl: "https://example.com/before.jpg",
      enhancedUrl: "https://example.com/after.jpg",
    };

    it("should render comparison slider when featured and comparisonImages provided", () => {
      render(
        <FeaturedAppCard
          {...defaultProps}
          featured
          comparisonImages={comparisonImages}
        />,
      );
      expect(screen.getByAltText("Before")).toBeInTheDocument();
      expect(screen.getByAltText("After")).toBeInTheDocument();
    });

    it("should not render comparison slider when not featured", () => {
      render(
        <FeaturedAppCard
          {...defaultProps}
          comparisonImages={comparisonImages}
        />,
      );
      expect(screen.queryByAltText("Before")).not.toBeInTheDocument();
    });

    it("should not render comparison slider when comparisonImages not provided", () => {
      render(<FeaturedAppCard {...defaultProps} featured />);
      expect(screen.queryByAltText("Before")).not.toBeInTheDocument();
    });
  });
});
