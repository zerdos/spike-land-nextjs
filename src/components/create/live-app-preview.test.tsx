import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { LiveAppPreview } from "./live-app-preview";

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];

  constructor(_callback: IntersectionObserverCallback) {
    // callback stored for potential future use in intersection tests
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

describe("LiveAppPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it("renders skeleton initially when lazy", () => {
    render(
      <LiveAppPreview codespaceId="test-cs" fallbackTitle="Test App" />,
    );

    // Should not render iframe yet (idle state)
    expect(screen.queryByTitle("Test App")).not.toBeInTheDocument();
  });

  it("renders iframe immediately when not lazy", () => {
    render(
      <LiveAppPreview
        codespaceId="test-cs"
        lazy={false}
        fallbackTitle="Test App"
      />,
    );

    // Should render iframe (loading state triggered immediately)
    expect(screen.getByTitle("Test App")).toBeInTheDocument();
    expect(screen.getByTitle("Test App").tagName).toBe("IFRAME");
    expect(screen.getByTitle("Test App")).toHaveAttribute(
      "src",
      "https://testing.spike.land/live/test-cs/",
    );
  });

  it("shows error fallback with title when iframe times out", async () => {
    render(
      <LiveAppPreview
        codespaceId="test-cs"
        lazy={false}
        fallbackTitle="My Cool App"
      />,
    );

    // Fast-forward past the 15s timeout
    act(() => {
      vi.advanceTimersByTime(16_000);
    });

    // Should show error fallback with app title
    expect(screen.getByText("My Cool App")).toBeInTheDocument();
    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    // Should NOT show iframe after error
    expect(screen.queryByTitle("My Cool App")).not.toBeInTheDocument();
  });

  it("shows loaded state after iframe onLoad fires", () => {
    render(
      <LiveAppPreview
        codespaceId="test-cs"
        lazy={false}
        fallbackTitle="Test App"
      />,
    );

    const iframe = screen.getByTitle("Test App");

    // Simulate iframe load
    act(() => {
      iframe.dispatchEvent(new Event("load"));
    });

    // Iframe should still be visible (state = "loaded")
    expect(screen.getByTitle("Test App")).toBeInTheDocument();
  });

  it("applies scale transform when scale prop is provided", () => {
    render(
      <LiveAppPreview
        codespaceId="test-cs"
        scale={0.35}
        lazy={false}
        fallbackTitle="Test App"
      />,
    );

    const iframe = screen.getByTitle("Test App");
    const wrapper = iframe.parentElement;

    expect(wrapper).toHaveStyle({
      transform: "scale(0.35)",
      transformOrigin: "top left",
    });
  });
});
