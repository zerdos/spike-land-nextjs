import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreationStats } from "./CreationStats";

vi.mock("./animated-counter", () => ({
  AnimatedCounter: ({ value, suffix }: { value: number; suffix?: string }) => (
    <span data-testid="animated-counter">{value}{suffix}</span>
  ),
}));

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("CreationStats", () => {
  it("renders all three stat items", () => {
    render(<CreationStats appsCreated={150} creatorCount={42} />);
    expect(screen.getByText("Apps Created")).toBeInTheDocument();
    expect(screen.getByText("Creators")).toBeInTheDocument();
    expect(screen.getByText("Built in seconds")).toBeInTheDocument();
  });

  it("passes correct values to AnimatedCounter", () => {
    render(<CreationStats appsCreated={150} creatorCount={42} />);
    const counters = screen.getAllByTestId("animated-counter");
    expect(counters).toHaveLength(3);
    expect(counters[0]).toHaveTextContent("150+");
    expect(counters[1]).toHaveTextContent("42+");
    expect(counters[2]).toHaveTextContent("30s");
  });

  it("renders with zero values", () => {
    render(<CreationStats appsCreated={0} creatorCount={0} />);
    const counters = screen.getAllByTestId("animated-counter");
    expect(counters[0]).toHaveTextContent("0+");
    expect(counters[1]).toHaveTextContent("0+");
  });
});
