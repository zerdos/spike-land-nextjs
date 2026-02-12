import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveAppCard } from "./live-app-card";

let capturedOnHealthStatus: ((healthy: boolean) => void) | undefined;

// Mock LiveAppPreview to avoid iframe complexity in unit tests
vi.mock("./live-app-preview", () => ({
  LiveAppPreview: ({ fallbackTitle, onHealthStatus }: { fallbackTitle?: string; onHealthStatus?: (healthy: boolean) => void }) => {
    capturedOnHealthStatus = onHealthStatus;
    return <div data-testid="live-preview">{fallbackTitle}</div>;
  },
}));

describe("LiveAppCard", () => {
  it("renders AppCard fallback when no codespaceId", () => {
    render(
      <LiveAppCard
        title="Test App"
        description="A test application"
        slug="test-app"
      />,
    );

    expect(screen.getByText("Test App")).toBeInTheDocument();
    expect(screen.getByText("A test application")).toBeInTheDocument();
  });

  it("renders live preview card when codespaceId is provided", () => {
    render(
      <LiveAppCard
        title="Live App"
        description="A live application"
        slug="live-app"
        codespaceId="cs-123"
      />,
    );

    expect(screen.getByTestId("live-preview")).toBeInTheDocument();
    // Title appears multiple times (preview, title bar, hover overlay)
    expect(screen.getAllByText("Live App").length).toBeGreaterThanOrEqual(1);
  });

  it("renders AppCard fallback when codespaceId is null", () => {
    render(
      <LiveAppCard
        title="Null App"
        description="Has null codespace"
        slug="null-app"
        codespaceId={null}
      />,
    );

    // Should render as text card (AppCard), not live preview
    expect(screen.queryByTestId("live-preview")).not.toBeInTheDocument();
    expect(screen.getByText("Null App")).toBeInTheDocument();
  });

  it("shows view count when provided", () => {
    render(
      <LiveAppCard
        title="Popular App"
        description="Very popular"
        slug="popular-app"
        codespaceId="cs-456"
        viewCount={42}
      />,
    );

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("links to correct create page", () => {
    render(
      <LiveAppCard
        title="My App"
        description="Description"
        slug="my-app"
        codespaceId="cs-789"
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/create/my-app");
  });

  it("applies dark mode background class", () => {
    render(
      <LiveAppCard
        title="Dark App"
        description="Description"
        slug="dark-app"
        codespaceId="cs-dark"
      />,
    );

    const link = screen.getByRole("link");
    expect(link.className).toContain("dark:bg-gray-900");
  });

  it("falls back to AppCard when onHealthStatus reports unhealthy", () => {
    const { rerender } = render(
      <LiveAppCard
        title="Unhealthy App"
        description="Will become unhealthy"
        slug="unhealthy-app"
        codespaceId="cs-unhealthy"
      />,
    );

    // Initially shows live preview
    expect(screen.getByTestId("live-preview")).toBeInTheDocument();

    // Simulate health check reporting unhealthy
    act(() => {
      capturedOnHealthStatus?.(false);
    });

    // Re-render to reflect state change
    rerender(
      <LiveAppCard
        title="Unhealthy App"
        description="Will become unhealthy"
        slug="unhealthy-app"
        codespaceId="cs-unhealthy"
      />,
    );

    // Should now show AppCard fallback
    expect(screen.queryByTestId("live-preview")).not.toBeInTheDocument();
    expect(screen.getByText("Unhealthy App")).toBeInTheDocument();
  });

  it("stays as live preview when onHealthStatus reports healthy", () => {
    render(
      <LiveAppCard
        title="Healthy App"
        description="Stays healthy"
        slug="healthy-app"
        codespaceId="cs-healthy"
      />,
    );

    // Simulate health check reporting healthy
    act(() => {
      capturedOnHealthStatus?.(true);
    });

    // Should still show live preview
    expect(screen.getByTestId("live-preview")).toBeInTheDocument();
  });
});
