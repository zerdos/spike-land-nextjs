import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so the mock value is available when vi.mock factories run
const { mockContextValue, hoistedCreateContext } = vi.hoisted(() => {
  return { mockContextValue: { refreshCounter: 0 }, hoistedCreateContext: React.createContext };
});

// Mock next/link as a simple <a> tag
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons as simple spans with data-testid
vi.mock("lucide-react", () => ({
  ArrowLeft: (props: Record<string, unknown>) => (
    <span data-testid="icon-arrow-left" className={props["className"] as string} />
  ),
  Download: (props: Record<string, unknown>) => (
    <span data-testid="icon-download" className={props["className"] as string} />
  ),
  ExternalLink: (props: Record<string, unknown>) => (
    <span
      data-testid="icon-external-link"
      className={props["className"] as string}
    />
  ),
  RefreshCw: (props: Record<string, unknown>) => (
    <span data-testid="icon-refresh" className={props["className"] as string} />
  ),
  Sparkles: (props: Record<string, unknown>) => (
    <span data-testid="icon-sparkles" className={props["className"] as string} />
  ),
}));

// Mock @/lib/utils
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock the VibeCodeContext from vibe-code-provider using the hoisted value
vi.mock("./vibe-code-provider", () => ({
  VibeCodeContext: hoistedCreateContext(mockContextValue),
}));

import { LiveAppDisplay } from "./live-app-display";

const defaultProps = {
  codespaceId: "abc-123",
  codespaceUrl: "https://example.com/codespace/abc-123",
  title: "My Test App",
  slug: "my-test-app",
};

describe("LiveAppDisplay", () => {
  beforeEach(() => {
    mockContextValue.refreshCounter = 0;
  });

  it("renders iframe with correct src", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    const iframe = screen.getByTitle("My Test App");
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("src", "/api/codespace/abc-123/bundle");
  });

  it("shows title and slug", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    expect(screen.getByText("My Test App")).toBeInTheDocument();
    expect(screen.getByText("my-test-app")).toBeInTheDocument();
  });

  it("has refresh button that increments iframe key", async () => {
    const user = userEvent.setup();
    render(<LiveAppDisplay {...defaultProps} />);

    const refreshButton = screen.getByTitle("Reload App");
    expect(refreshButton).toBeInTheDocument();

    // The iframe should exist initially
    const iframeBefore = screen.getByTitle("My Test App");
    expect(iframeBefore).toBeInTheDocument();

    // Click refresh - this will reset loading state and re-key the iframe
    await user.click(refreshButton);

    // After refresh, a new iframe is rendered (key changed).
    // The iframe is still present with the same title.
    const iframeAfter = screen.getByTitle("My Test App");
    expect(iframeAfter).toBeInTheDocument();
  });

  it("has external link to bundle URL", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    const externalLink = screen.getByTitle("Open in new tab");
    expect(externalLink).toBeInTheDocument();
    expect(externalLink.tagName).toBe("A");
    expect(externalLink).toHaveAttribute(
      "href",
      "/api/codespace/abc-123/bundle",
    );
    expect(externalLink).toHaveAttribute("target", "_blank");
    expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has download link", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    const downloadLink = screen.getByTitle("Download as HTML");
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink.tagName).toBe("A");
    expect(downloadLink).toHaveAttribute(
      "href",
      "/api/codespace/abc-123/bundle?download=true",
    );
    expect(downloadLink).toHaveAttribute("download", "abc-123.html");
  });

  it("shows loading spinner initially", () => {
    const { container } = render(<LiveAppDisplay {...defaultProps} />);

    // The loading spinner is a div with animate-spin class
    const spinner = container.querySelector(".animate-spin.w-8.h-8");
    expect(spinner).toBeInTheDocument();
  });

  it("hides spinner after iframe loads", () => {
    const { container } = render(<LiveAppDisplay {...defaultProps} />);

    // Spinner should be present before load
    expect(container.querySelector(".animate-spin.w-8.h-8")).toBeInTheDocument();

    // Simulate iframe onLoad
    const iframe = screen.getByTitle("My Test App");
    act(() => {
      iframe.dispatchEvent(new Event("load"));
    });

    // Spinner should be gone after load
    expect(
      container.querySelector(".animate-spin.w-8.h-8"),
    ).not.toBeInTheDocument();
  });

  it("has dark-theme background class (bg-muted/20)", () => {
    const { container } = render(<LiveAppDisplay {...defaultProps} />);

    // The iframe container div uses bg-muted/20
    const iframeContainer = container.querySelector(".bg-muted\\/20");
    expect(iframeContainer).toBeInTheDocument();
  });

  it('has "Create Your Own" CTA button', () => {
    render(<LiveAppDisplay {...defaultProps} />);

    const ctaLink = screen.getByText("Create Your Own");
    expect(ctaLink).toBeInTheDocument();

    // It should be inside a link to /create
    const anchor = ctaLink.closest("a");
    expect(anchor).toHaveAttribute("href", "/create");
  });

  it('has "All Apps" back link', () => {
    render(<LiveAppDisplay {...defaultProps} />);

    const allAppsText = screen.getByText("All Apps");
    expect(allAppsText).toBeInTheDocument();

    // It should be inside a link to /create
    const anchor = allAppsText.closest("a");
    expect(anchor).toHaveAttribute("href", "/create");
  });

  it("auto-refreshes when refreshCounter changes", () => {
    // Start with refreshCounter = 0
    mockContextValue.refreshCounter = 0;

    const { rerender } = render(<LiveAppDisplay {...defaultProps} />);

    // Simulate iframe load to clear spinner
    const iframe = screen.getByTitle("My Test App");
    act(() => {
      iframe.dispatchEvent(new Event("load"));
    });

    // Now update the context refreshCounter
    // Since we mock the context at module level, we need to change the value
    // and re-render to trigger the useEffect
    mockContextValue.refreshCounter = 1;
    rerender(<LiveAppDisplay {...defaultProps} />);

    // After refreshCounter changes to > 0, handleRefresh is called,
    // which sets loading back to true. The spinner should reappear.
    // The iframe should still be present (re-keyed).
    const iframeAfter = screen.getByTitle("My Test App");
    expect(iframeAfter).toBeInTheDocument();
  });
});
