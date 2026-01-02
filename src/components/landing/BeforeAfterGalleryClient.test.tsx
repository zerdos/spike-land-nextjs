import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { BeforeAfterGalleryClient } from "./BeforeAfterGalleryClient";
import type { GalleryItem } from "./gallery-fallback-data";

// Mock dependencies
vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({ originalUrl, enhancedUrl }: any) => (
    <div data-testid="comparison-slider">
      Original: {originalUrl}, Enhanced: {enhancedUrl}
    </div>
  ),
}));

vi.mock("react-masonry-css", () => ({
  default: ({ children }: any) => <div data-testid="masonry">{children}</div>,
}));

// Mock Data
const mockItems: GalleryItem[] = [
  {
    id: "1",
    title: "Item 1",
    description: "Desc 1",
    category: "portrait",
    originalUrl: "/orig1.jpg",
    enhancedUrl: "/enh1.jpg",
    width: 100,
    height: 100,
  },
  {
    id: "2",
    title: "Item 2",
    description: "Desc 2",
    category: "landscape",
    originalUrl: "/orig2.jpg",
    enhancedUrl: "/enh2.jpg",
    width: 200,
    height: 200,
  },
];

describe("BeforeAfterGalleryClient", () => {
  it("renders the component with all items initially", () => {
    render(<BeforeAfterGalleryClient items={mockItems} />);

    expect(screen.getByText("See the Difference")).toBeInTheDocument();
    expect(screen.getByText("All")).toHaveAttribute("data-state", "active");

    // Masonry should render
    expect(screen.getByTestId("masonry")).toBeInTheDocument();

    // Should see both sliders
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders).toHaveLength(2);
  });

  it("filters items when a category is selected", async () => {
    const user = userEvent.setup();
    render(<BeforeAfterGalleryClient items={mockItems} />);

    const portraitTab = screen.getByText("Portrait");
    await user.click(portraitTab);

    // Wait for the state to update and the DOM to reflect the change
    await waitFor(() => {
      // Check if the "All" tab is inactive
      expect(screen.getByText("All")).toHaveAttribute("data-state", "inactive");
      expect(screen.getByText("Portrait")).toHaveAttribute(
        "data-state",
        "active",
      );

      // Check sliders
      const sliders = screen.getAllByTestId("comparison-slider");
      expect(sliders).toHaveLength(1);
      expect(screen.getByText("Original: /orig1.jpg, Enhanced: /enh1.jpg"))
        .toBeInTheDocument();
    });

    expect(screen.queryByText("Original: /orig2.jpg, Enhanced: /enh2.jpg")).not
      .toBeInTheDocument();
  });

  it("renders correctly with empty items", () => {
    render(<BeforeAfterGalleryClient items={[]} />);
    expect(screen.getByText("See the Difference")).toBeInTheDocument();
    expect(screen.queryByTestId("comparison-slider")).not.toBeInTheDocument();
  });
});
