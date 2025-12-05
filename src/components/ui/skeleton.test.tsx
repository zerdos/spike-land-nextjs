import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies default classes", () => {
    const { container } = render(<Skeleton />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass("animate-pulse");
    expect(element).toHaveClass("rounded-md");
    expect(element).toHaveClass("bg-primary/10");
  });

  it("accepts custom className", () => {
    const { container } = render(<Skeleton className="custom-class" />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass("custom-class");
    expect(element).toHaveClass("animate-pulse");
  });

  it("accepts custom props", () => {
    const { container } = render(
      <Skeleton data-testid="custom-skeleton" aria-label="Loading" />,
    );
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveAttribute("data-testid", "custom-skeleton");
    expect(element).toHaveAttribute("aria-label", "Loading");
  });

  it("accepts custom dimensions via className", () => {
    const { container } = render(<Skeleton className="h-12 w-48" />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveClass("h-12");
    expect(element).toHaveClass("w-48");
  });
});
