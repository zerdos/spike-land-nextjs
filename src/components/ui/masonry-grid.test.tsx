import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MasonryGrid, MasonryGridUniform, type ZoomLevel } from "./masonry-grid";

describe("MasonryGrid", () => {
  it("renders children in a masonry layout", () => {
    render(
      <MasonryGrid>
        <div data-testid="item-1">Item 1</div>
        <div data-testid="item-2">Item 2</div>
        <div data-testid="item-3">Item 3</div>
      </MasonryGrid>,
    );

    expect(screen.getByTestId("item-1")).toBeDefined();
    expect(screen.getByTestId("item-2")).toBeDefined();
    expect(screen.getByTestId("item-3")).toBeDefined();
  });

  it("applies default zoom level 3 column classes", () => {
    const { container } = render(
      <MasonryGrid>
        <div>Item</div>
      </MasonryGrid>,
    );

    const grid = container.firstChild as HTMLElement;
    // Default zoom level 3 should have sm:columns-2
    expect(grid.className).toContain("sm:columns-2");
    expect(grid.className).toContain("md:columns-3");
    expect(grid.className).toContain("lg:columns-4");
    expect(grid.className).toContain("xl:columns-5");
  });

  it("applies zoom level 1 column classes (most columns)", () => {
    const { container } = render(
      <MasonryGrid zoomLevel={1}>
        <div>Item</div>
      </MasonryGrid>,
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("sm:columns-4");
    expect(grid.className).toContain("md:columns-5");
    expect(grid.className).toContain("lg:columns-6");
    expect(grid.className).toContain("xl:columns-8");
  });

  it("applies zoom level 5 column classes (fewest columns)", () => {
    const { container } = render(
      <MasonryGrid zoomLevel={5}>
        <div>Item</div>
      </MasonryGrid>,
    );

    const grid = container.firstChild as HTMLElement;
    // Zoom level 5 should have fewer columns
    expect(grid.className).toContain("md:columns-2");
    expect(grid.className).toContain("lg:columns-2");
    expect(grid.className).toContain("xl:columns-3");
  });

  it("applies custom className", () => {
    const { container } = render(
      <MasonryGrid className="custom-class">
        <div>Item</div>
      </MasonryGrid>,
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("custom-class");
  });

  it("wraps each child in a break-inside-avoid container", () => {
    const { container } = render(
      <MasonryGrid>
        <div data-testid="item">Item</div>
      </MasonryGrid>,
    );

    const wrapper = container.querySelector(".break-inside-avoid");
    expect(wrapper).toBeDefined();
    expect(wrapper?.querySelector('[data-testid="item"]')).toBeDefined();
  });
});

describe("MasonryGridUniform", () => {
  it("renders children in a grid layout", () => {
    render(
      <MasonryGridUniform>
        <div data-testid="item-1">Item 1</div>
        <div data-testid="item-2">Item 2</div>
      </MasonryGridUniform>,
    );

    expect(screen.getByTestId("item-1")).toBeDefined();
    expect(screen.getByTestId("item-2")).toBeDefined();
  });

  it("applies grid classes instead of column classes", () => {
    const { container } = render(
      <MasonryGridUniform>
        <div>Item</div>
      </MasonryGridUniform>,
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className).toContain("md:grid-cols-3");
  });

  it("applies zoom level correctly for grid layout", () => {
    const { container } = render(
      <MasonryGridUniform zoomLevel={1}>
        <div>Item</div>
      </MasonryGridUniform>,
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("sm:grid-cols-4");
    expect(grid.className).toContain("md:grid-cols-5");
    expect(grid.className).toContain("lg:grid-cols-6");
    expect(grid.className).toContain("xl:grid-cols-8");
  });

  it("applies custom className", () => {
    const { container } = render(
      <MasonryGridUniform className="custom-grid">
        <div>Item</div>
      </MasonryGridUniform>,
    );

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("custom-grid");
  });
});

describe("ZoomLevel type", () => {
  it("should only accept valid zoom levels 1-5", () => {
    // This is a type-level test - compile-time verification
    const validLevels: ZoomLevel[] = [1, 2, 3, 4, 5];
    expect(validLevels).toHaveLength(5);
  });
});
