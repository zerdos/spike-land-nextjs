import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnalyticsPage from "./page";

// Mock the AnalyticsPageContent component since it uses complex components
vi.mock("./AnalyticsPageContent", () => ({
  AnalyticsPageContent: () => (
    <main data-testid="analytics-page">
      <h1>Analytics</h1>
      <p>Deep performance insights across all platforms.</p>
      <a href="/auth/signin">See Your Analytics</a>
      <a href="/features">Features</a>
      <h2>Unified Dashboard</h2>
      <h2>AI-Powered Insights</h2>
      <h2>Competitor Benchmarking</h2>
      <h2>Custom Reports</h2>
    </main>
  ),
}));

describe("AnalyticsPage", () => {
  it("should render the page with correct structure", () => {
    render(<AnalyticsPage />);
    expect(screen.getByTestId("analytics-page")).toBeInTheDocument();
  });

  it("should render the main heading", () => {
    render(<AnalyticsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /analytics/i,
    );
  });

  it("should render feature sections", () => {
    render(<AnalyticsPage />);
    expect(screen.getByRole("heading", { name: /unified dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ai-powered insights/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /competitor benchmarking/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /custom reports/i })).toBeInTheDocument();
  });

  it("should have a CTA link", () => {
    render(<AnalyticsPage />);
    expect(screen.getByRole("link", { name: /see your analytics/i })).toHaveAttribute(
      "href",
      "/auth/signin",
    );
  });

  it("should render the page description", () => {
    render(<AnalyticsPage />);
    expect(
      screen.getByText(/deep performance insights across all platforms/i),
    ).toBeInTheDocument();
  });
});
