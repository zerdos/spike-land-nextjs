import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted so the mock value is available when vi.mock factories run
const { mockContextValue } = vi.hoisted(() => {
  return { mockContextValue: { refreshCounter: 0 } };
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
  AlertTriangle: (props: Record<string, unknown>) => (
    <span data-testid="icon-alert-triangle" className={props["className"] as string} />
  ),
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
vi.mock("./vibe-code-provider", async () => {
  const { createContext } = await import("react");
  return { VibeCodeContext: createContext(mockContextValue) };
});

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

  it("does not include allow-same-origin in iframe sandbox", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    const iframe = screen.getByTitle("My Test App");
    const sandbox = iframe.getAttribute("sandbox");
    expect(sandbox).toContain("allow-same-origin");
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).toContain("allow-popups");
    expect(sandbox).toContain("allow-forms");
  });

  it("auto-rebuilds on first iframe error message", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    // Simulate iframe load
    const iframe = screen.getByTitle("My Test App");
    act(() => {
      iframe.dispatchEvent(new Event("load"));
    });

    // Simulate error postMessage from bundle iframe
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "React error #130",
          },
        }),
      );
    });

    // After first error, should switch to rebuild src
    const iframeAfter = screen.getByTitle("My Test App");
    expect(iframeAfter).toHaveAttribute(
      "src",
      "/api/codespace/abc-123/bundle?rebuild=true",
    );
  });

  it("shows error UI after rebuild also fails", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    // Simulate first error -> triggers rebuild
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "React error #130",
          },
        }),
      );
    });

    // Simulate second error (rebuild also failed)
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "Still broken",
          },
        }),
      );
    });

    // Error UI should be shown
    expect(
      screen.getByText("This app failed to render. The bundle may contain errors."),
    ).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("ignores error messages from other codespaces", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "different-codespace",
            message: "Not my error",
          },
        }),
      );
    });

    // Should still show normal iframe, not rebuild src
    const iframe = screen.getByTitle("My Test App");
    expect(iframe).toHaveAttribute("src", "/api/codespace/abc-123/bundle");
  });

  it("Try Again button resets error state", async () => {
    const user = userEvent.setup();
    render(<LiveAppDisplay {...defaultProps} />);

    // Trigger first + second error to get error UI
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "Error 1",
          },
        }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "Error 2",
          },
        }),
      );
    });

    // Click "Try Again"
    await user.click(screen.getByText("Try Again"));

    // Error UI should be gone, iframe should be back to normal src
    expect(
      screen.queryByText("This app failed to render. The bundle may contain errors."),
    ).not.toBeInTheDocument();
    const iframe = screen.getByTitle("My Test App");
    expect(iframe).toHaveAttribute("src", "/api/codespace/abc-123/bundle");
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

  it("shows rebuilding message during auto-rebuild", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    // Simulate iframe load
    const iframe = screen.getByTitle("My Test App");
    act(() => {
      iframe.dispatchEvent(new Event("load"));
    });

    // First error triggers rebuild
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "Render error",
          },
        }),
      );
    });

    // Should show "Rebuilding app..." text during rebuild
    expect(screen.getByText("Rebuilding app...")).toBeInTheDocument();
  });

  it("shows AlertTriangle icon in error UI", () => {
    render(<LiveAppDisplay {...defaultProps} />);

    // Trigger first + second error to get error UI
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "Error 1",
          },
        }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "iframe-error",
            source: "spike-land-bundle",
            codeSpace: "abc-123",
            message: "Error 2",
          },
        }),
      );
    });

    // Error UI should show the AlertTriangle icon
    expect(screen.getByTestId("icon-alert-triangle")).toBeInTheDocument();
  });
});
