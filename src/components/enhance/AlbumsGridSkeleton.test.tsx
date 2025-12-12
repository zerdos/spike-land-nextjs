import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlbumsGridSkeleton } from "./AlbumsGridSkeleton";

describe("AlbumsGridSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<AlbumsGridSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders default 4 skeleton items", () => {
    const { container } = render(<AlbumsGridSkeleton />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(8);
  });

  it("renders custom number of skeleton items", () => {
    const { container } = render(<AlbumsGridSkeleton count={6} />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(12);
  });

  it("renders with responsive grid classes", () => {
    const { container } = render(<AlbumsGridSkeleton />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("md:grid-cols-3");
    expect(grid.className).toContain("lg:grid-cols-4");
    expect(grid.className).toContain("xl:grid-cols-5");
  });

  it("applies custom className", () => {
    const { container } = render(
      <AlbumsGridSkeleton className="custom-class" />,
    );
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("custom-class");
  });

  it("renders aspect-square skeleton for album thumbnail", () => {
    const { container } = render(<AlbumsGridSkeleton count={1} />);
    const aspectSkeleton = container.querySelector('[class*="aspect-square"]');
    expect(aspectSkeleton).toBeInTheDocument();
  });

  it("renders rounded-2xl skeleton for album thumbnail", () => {
    const { container } = render(<AlbumsGridSkeleton count={1} />);
    const roundedSkeleton = container.querySelector('[class*="rounded-2xl"]');
    expect(roundedSkeleton).toBeInTheDocument();
  });

  it("renders album name skeleton with correct width", () => {
    const { container } = render(<AlbumsGridSkeleton count={1} />);
    const nameSkeleton = container.querySelector('[class*="w-2/3"]');
    expect(nameSkeleton).toBeInTheDocument();
  });

  it("renders zero items when count is 0", () => {
    const { container } = render(<AlbumsGridSkeleton count={0} />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(0);
  });

  it("renders gap between items", () => {
    const { container } = render(<AlbumsGridSkeleton />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain("gap-4");
  });
});
