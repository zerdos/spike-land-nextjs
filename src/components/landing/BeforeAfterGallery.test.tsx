import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BeforeAfterGallery } from "./BeforeAfterGallery";

// Mock the ImageComparisonSlider to avoid complexity in tests
vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: (
    { originalUrl, enhancedUrl }: { originalUrl: string; enhancedUrl: string; },
  ) => (
    <div data-testid="comparison-slider" data-original={originalUrl} data-enhanced={enhancedUrl}>
      Mock Slider
    </div>
  ),
}));

describe("BeforeAfterGallery Component", () => {
  it("should render the section heading", () => {
    render(<BeforeAfterGallery />);
    expect(screen.getByText("See the Difference")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<BeforeAfterGallery />);
    expect(screen.getByText(/Drag the slider to compare/)).toBeInTheDocument();
  });

  it("should render category tabs", () => {
    render(<BeforeAfterGallery />);
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Portrait" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Landscape" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Architecture" })).toBeInTheDocument();
  });

  it("should show all items by default", () => {
    render(<BeforeAfterGallery />);
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(6);
  });

  it("should filter items when category tab is clicked", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGallery />);

    // Click on Portrait tab
    await user.click(screen.getByRole("tab", { name: "Portrait" }));

    // Should show only portrait items (2 portraits in the data)
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(2);
  });

  it("should filter to landscape items", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGallery />);

    await user.click(screen.getByRole("tab", { name: "Landscape" }));
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(2);
  });

  it("should filter to product items", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGallery />);

    await user.click(screen.getByRole("tab", { name: "Product" }));
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(1);
  });

  it("should filter to architecture items", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGallery />);

    await user.click(screen.getByRole("tab", { name: "Architecture" }));
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBe(1);
  });

  it("should show all items when All tab is clicked after filtering", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGallery />);

    // First filter to portraits
    await user.click(screen.getByRole("tab", { name: "Portrait" }));
    expect(screen.getAllByTestId("comparison-slider").length).toBe(2);

    // Then click All
    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getAllByTestId("comparison-slider").length).toBe(6);
  });

  it("should render cards with titles", () => {
    render(<BeforeAfterGallery />);
    expect(screen.getByText("Portrait Enhancement")).toBeInTheDocument();
    expect(screen.getByText("Landscape Upscaling")).toBeInTheDocument();
    expect(screen.getByText("Product Photo")).toBeInTheDocument();
  });

  it("should render cards with descriptions", () => {
    render(<BeforeAfterGallery />);
    expect(screen.getByText("Skin smoothing and detail enhancement")).toBeInTheDocument();
    expect(screen.getByText("4K resolution with enhanced colors")).toBeInTheDocument();
  });

  it("should have the gallery section id", () => {
    const { container } = render(<BeforeAfterGallery />);
    const section = container.querySelector("#gallery");
    expect(section).toBeInTheDocument();
  });

  it("should have responsive grid classes", () => {
    const { container } = render(<BeforeAfterGallery />);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("sm:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-3");
  });
});
