import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ComparisonViewToggle } from "./ComparisonViewToggle";

vi.mock("next/image", () => ({
  default: ({ src, alt, onError, ...props }: { src: string; alt: string; onError?: () => void; [key: string]: unknown }) => {
    return (
      <img
        src={src}
        alt={alt}
        onError={onError}
        data-testid={props["data-testid"] || "mock-image"}
        {...props}
      />
    );
  },
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe("ComparisonViewToggle Component", () => {
  const defaultProps = {
    originalUrl: "https://example.com/original.jpg",
    enhancedUrl: "https://example.com/enhanced.jpg",
  };

  it("should render with slider as default mode", () => {
    render(<ComparisonViewToggle {...defaultProps} />);

    const sliderTab = screen.getByRole("tab", { name: /slider/i });
    expect(sliderTab).toHaveAttribute("data-state", "active");
  });

  it("should render with side-by-side mode when defaultMode is set", () => {
    render(<ComparisonViewToggle {...defaultProps} defaultMode="side-by-side" />);

    const sideBySideTab = screen.getByRole("tab", { name: /side by side/i });
    expect(sideBySideTab).toHaveAttribute("data-state", "active");
  });

  it("should switch to side-by-side mode when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ComparisonViewToggle {...defaultProps} />);

    const sideBySideTab = screen.getByRole("tab", { name: /side by side/i });
    await user.click(sideBySideTab);

    expect(sideBySideTab).toHaveAttribute("data-state", "active");
  });

  it("should switch to slider mode when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ComparisonViewToggle {...defaultProps} defaultMode="side-by-side" />);

    const sliderTab = screen.getByRole("tab", { name: /slider/i });
    await user.click(sliderTab);

    expect(sliderTab).toHaveAttribute("data-state", "active");
  });

  it("should call onModeChange when mode is changed", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<ComparisonViewToggle {...defaultProps} onModeChange={onModeChange} />);

    const sideBySideTab = screen.getByRole("tab", { name: /side by side/i });
    await user.click(sideBySideTab);

    expect(onModeChange).toHaveBeenCalledWith("side-by-side");
  });

  it("should pass width and height to child components", () => {
    const { container } = render(
      <ComparisonViewToggle {...defaultProps} width={1920} height={1080} />
    );

    const aspectRatioElements = container.querySelectorAll('[style*="aspect-ratio"]');
    expect(aspectRatioElements.length).toBeGreaterThan(0);
  });

  it("should render both tabs", () => {
    render(<ComparisonViewToggle {...defaultProps} />);

    expect(screen.getByRole("tab", { name: /slider/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /side by side/i })).toBeInTheDocument();
  });

  it("should render slider view by default", () => {
    render(<ComparisonViewToggle {...defaultProps} />);

    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Enhanced")).toBeInTheDocument();
  });

  it("should render side-by-side view when selected", async () => {
    const user = userEvent.setup();
    render(<ComparisonViewToggle {...defaultProps} />);

    await user.click(screen.getByRole("tab", { name: /side by side/i }));

    const originalLabels = screen.getAllByText("Original");
    const enhancedLabels = screen.getAllByText("Enhanced");

    expect(originalLabels.length).toBeGreaterThan(0);
    expect(enhancedLabels.length).toBeGreaterThan(0);
  });

  it("should use default width and height values", () => {
    const { container } = render(<ComparisonViewToggle {...defaultProps} />);

    const aspectRatioElements = container.querySelectorAll('[style*="aspect-ratio"]');
    expect(aspectRatioElements.length).toBeGreaterThan(0);
  });
});
