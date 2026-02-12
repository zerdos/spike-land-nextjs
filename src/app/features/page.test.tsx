import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeaturesPage from "./page";

describe("FeaturesPage", () => {
  it("should render the main heading", () => {
    render(<FeaturesPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /powerful features/i,
    );
  });

  it("should render all five feature cards", () => {
    render(<FeaturesPage />);
    expect(screen.getByRole("heading", { name: /a\/b testing/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ai calendar/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /brand brain/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ai tools/i })).toBeInTheDocument();
  });

  it("should have links to individual feature pages", () => {
    render(<FeaturesPage />);
    expect(screen.getByRole("link", { name: /a\/b testing/i })).toHaveAttribute(
      "href",
      "/features/ab-testing",
    );
    expect(screen.getByRole("link", { name: /ai calendar/i })).toHaveAttribute(
      "href",
      "/features/calendar",
    );
    expect(screen.getByRole("link", { name: /brand brain/i })).toHaveAttribute(
      "href",
      "/features/brand-brain",
    );
    expect(screen.getByRole("link", { name: /analytics/i })).toHaveAttribute(
      "href",
      "/features/analytics",
    );
    expect(screen.getByRole("link", { name: /ai tools/i })).toHaveAttribute(
      "href",
      "/features/ai-tools",
    );
  });

  it("should have a Try It Free CTA", () => {
    render(<FeaturesPage />);
    const tryItLinks = screen.getAllByRole("link", { name: /try it free/i });
    expect(tryItLinks.length).toBeGreaterThanOrEqual(1);
    expect(tryItLinks[0]).toHaveAttribute("href", "/create");
  });

  it("should have a View Pricing link", () => {
    render(<FeaturesPage />);
    expect(screen.getByRole("link", { name: /view pricing/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("should render feature descriptions", () => {
    render(<FeaturesPage />);
    expect(
      screen.getByText(/optimize your content with data-driven insights/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/smart scheduling powered by ai/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your ai brand guardian/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/deep performance insights across all platforms/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/intelligent automation suite for content creation/i),
    ).toBeInTheDocument();
  });

  it("should render the CTA section", () => {
    render(<FeaturesPage />);
    expect(
      screen.getByText(/ready to transform your social media/i),
    ).toBeInTheDocument();
  });
});
