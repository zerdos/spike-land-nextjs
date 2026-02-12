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

// Mock fetch for health check calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("LiveAppPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ healthy: true }),
    });
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

  it("shows loaded state after iframe onLoad fires", async () => {
    render(
      <LiveAppPreview
        codespaceId="test-cs"
        lazy={false}
        fallbackTitle="Test App"
      />,
    );

    const iframe = screen.getByTitle("Test App");

    // Simulate iframe load
    await act(async () => {
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

  it("calls health check API after iframe loads", async () => {
    render(
      <LiveAppPreview
        codespaceId="test-cs"
        lazy={false}
        fallbackTitle="Test App"
      />,
    );

    const iframe = screen.getByTitle("Test App");

    await act(async () => {
      iframe.dispatchEvent(new Event("load"));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/create/health?codespaceId=test-cs",
    );
  });

  it("switches to error state when health check returns unhealthy", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ healthy: false }),
    });

    render(
      <LiveAppPreview
        codespaceId="unhealthy-cs"
        lazy={false}
        fallbackTitle="Unhealthy App"
      />,
    );

    const iframe = screen.getByTitle("Unhealthy App");

    await act(async () => {
      iframe.dispatchEvent(new Event("load"));
    });

    // Should show error state
    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(screen.queryByTitle("Unhealthy App")).not.toBeInTheDocument();
  });

  it("calls onHealthStatus callback with health result", async () => {
    const onHealthStatus = vi.fn();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ healthy: true }),
    });

    render(
      <LiveAppPreview
        codespaceId="test-cs"
        lazy={false}
        fallbackTitle="Test App"
        onHealthStatus={onHealthStatus}
      />,
    );

    const iframe = screen.getByTitle("Test App");

    await act(async () => {
      iframe.dispatchEvent(new Event("load"));
    });

    expect(onHealthStatus).toHaveBeenCalledWith(true);
  });

  it("calls onHealthStatus with false when unhealthy", async () => {
    const onHealthStatus = vi.fn();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ healthy: false }),
    });

    render(
      <LiveAppPreview
        codespaceId="bad-cs"
        lazy={false}
        fallbackTitle="Bad App"
        onHealthStatus={onHealthStatus}
      />,
    );

    const iframe = screen.getByTitle("Bad App");

    await act(async () => {
      iframe.dispatchEvent(new Event("load"));
    });

    expect(onHealthStatus).toHaveBeenCalledWith(false);
  });

  it("does not fail when health check fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(
      <LiveAppPreview
        codespaceId="test-cs"
        lazy={false}
        fallbackTitle="Test App"
      />,
    );

    const iframe = screen.getByTitle("Test App");

    // Should not throw
    await act(async () => {
      iframe.dispatchEvent(new Event("load"));
    });

    // Iframe should still be visible (loaded state maintained)
    expect(screen.getByTitle("Test App")).toBeInTheDocument();
  });
});
