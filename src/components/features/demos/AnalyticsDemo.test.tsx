import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsDemo } from "./AnalyticsDemo";

// Mock framer-motion to avoid animation complexities in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      layout: _layout,
      whileHover: _whileHover,
      whileTap: _whileTap,
      whileInView: _whileInView,
      viewport: _viewport,
      style,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      layout?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
    }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
}));

describe("AnalyticsDemo", () => {
  it("should render the Analytics Dashboard header", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
  });

  it("should show cross-platform insights description", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Cross-platform insights at a glance")).toBeInTheDocument();
  });

  it("should display total impressions metric", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Total Impressions")).toBeInTheDocument();
  });

  it("should display total followers metric", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Total Followers")).toBeInTheDocument();
  });

  it("should display engagement rate metric", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Engagement Rate")).toBeInTheDocument();
  });

  it("should display total comments metric", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Total Comments")).toBeInTheDocument();
  });

  it("should render weekly engagement chart section", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Weekly Engagement")).toBeInTheDocument();
  });

  it("should display platform performance section", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Platform Performance")).toBeInTheDocument();
  });

  it("should show platform names", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("Twitter")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("TikTok")).toBeInTheDocument();
  });

  it("should display day labels in chart", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("should show time period indicator", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
  });

  it("should display All Platforms indicator", () => {
    render(<AnalyticsDemo />);
    expect(screen.getByText("All Platforms")).toBeInTheDocument();
  });

  it("should show AI insights after delay", async () => {
    render(<AnalyticsDemo />);
    await waitFor(
      () => {
        // One of the insight titles should be visible
        const peakPerformance = screen.queryByText("Peak Performance");
        const growingAudience = screen.queryByText("Growing Audience");
        const optimizationTip = screen.queryByText("Optimization Tip");

        expect(
          peakPerformance || growingAudience || optimizationTip,
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
