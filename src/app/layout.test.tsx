import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

// Mock next/font/google to avoid actual font loading in tests
vi.mock("next/font/google", () => ({
  Geist: vi.fn(() => ({
    variable: "--font-geist-sans",
    className: "geist-sans-test-class",
  })),
  Geist_Mono: vi.fn(() => ({
    variable: "--font-geist-mono",
    className: "geist-mono-test-class",
  })),
  Montserrat: vi.fn(() => ({
    variable: "--font-montserrat",
    className: "montserrat-test-class",
  })),
}));

vi.mock("@/components/auth/auth-header", () => ({
  AuthHeader: () => <div data-testid="auth-header">Auth Header</div>,
}));

vi.mock("@/components/auth/session-provider", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode; }) => <div>{children}</div>,
}));

vi.mock("@/components/theme/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode; }) => <div>{children}</div>,
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => <div data-testid="analytics">Analytics</div>,
}));

vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => <div data-testid="speed-insights">SpeedInsights</div>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

vi.mock("@/components/feedback/FeedbackButton", () => ({
  FeedbackButton: () => <div data-testid="feedback-button">FeedbackButton</div>,
}));

describe("RootLayout", () => {
  it("should be a function component", () => {
    expect(typeof RootLayout).toBe("function");
  });

  it("should accept children prop", () => {
    const layoutProps = {
      children: <div>Test</div>,
    };
    const result = RootLayout(layoutProps);
    expect(result).toBeDefined();
    expect(result.type).toBe("html");
  });

  it('should render html element with lang="en"', () => {
    const result = RootLayout({ children: <div>Test</div> });
    expect(result.props.lang).toBe("en");
  });

  it("should have suppressHydrationWarning on html element", () => {
    const result = RootLayout({ children: <div>Test</div> });
    expect(result.props.suppressHydrationWarning).toBe(true);
  });

  it("should render body element inside html", () => {
    const result = RootLayout({ children: <div>Test</div> });
    expect(result.props.children.type).toBe("body");
  });

  it("should apply font class variables to body", () => {
    const result = RootLayout({ children: <div>Test</div> });
    const bodyClassName = result.props.children.props.className;
    expect(bodyClassName).toContain("--font-geist-sans");
    expect(bodyClassName).toContain("--font-geist-mono");
    expect(bodyClassName).toContain("--font-montserrat");
    expect(bodyClassName).toContain("antialiased");
  });

  it("should wrap children in ThemeProvider and SessionProvider", () => {
    const testChild = <div>Test Child</div>;
    const result = RootLayout({ children: testChild });
    const bodyChildren = result.props.children.props.children;
    expect(bodyChildren).toBeDefined();
  });

  it("should render ThemeProvider wrapping content", () => {
    const testChild = <div>Test Child</div>;
    const { getByText } = render(RootLayout({ children: testChild }));
    // Verify the child content is rendered (it will be wrapped by providers)
    expect(getByText("Test Child")).toBeInTheDocument();
  });

  it("should render Analytics component", () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }));
    expect(getByTestId("analytics")).toBeInTheDocument();
  });

  it("should render SpeedInsights component", () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }));
    expect(getByTestId("speed-insights")).toBeInTheDocument();
  });

  it("should render Toaster component", () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }));
    expect(getByTestId("toaster")).toBeInTheDocument();
  });

  it("should render AuthHeader component for global theme and user controls", () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }));
    expect(getByTestId("auth-header")).toBeInTheDocument();
  });

  it("should render FeedbackButton component", () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }));
    expect(getByTestId("feedback-button")).toBeInTheDocument();
  });
});

describe("metadata", () => {
  it("should export correct metadata object", () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Spike Land - Vibe Coded Apps with Claude Code");
    expect(metadata.description).toContain("Smart Video Wall");
    expect(metadata.description).toContain("vibe-coded");
  });

  it("should have title property", () => {
    expect(metadata).toHaveProperty("title");
  });

  it("should have description property", () => {
    expect(metadata).toHaveProperty("description");
  });

  it("should have keywords for SEO", () => {
    expect(metadata).toHaveProperty("keywords");
    expect(metadata.keywords).toContain("Spike Land");
    expect(metadata.keywords).toContain("Claude Code");
  });

  it("should have authors metadata", () => {
    expect(metadata).toHaveProperty("authors");
  });

  it("should have openGraph metadata for social sharing", () => {
    expect(metadata).toHaveProperty("openGraph");
    expect(metadata.openGraph).toHaveProperty("title");
    expect(metadata.openGraph).toHaveProperty("description");
  });

  it("should have twitter card metadata", () => {
    expect(metadata).toHaveProperty("twitter");
    expect(metadata.twitter).toHaveProperty("card");
    expect(metadata.twitter).toHaveProperty("title");
    expect(metadata.twitter).toHaveProperty("description");
  });
});
