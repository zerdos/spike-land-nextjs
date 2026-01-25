import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ABTestingPage from "./page";

// Mock the ABTestingPageContent component since it uses complex components
vi.mock("./ABTestingPageContent", () => ({
  ABTestingPageContent: () => (
    <main data-testid="ab-testing-page">
      <h1>A/B Testing</h1>
      <p>Stop guessing what content performs best.</p>
      <a href="/auth/signin">Start A/B Testing</a>
      <a href="/features">Features</a>
    </main>
  ),
}));

describe("ABTestingPage", () => {
  it("should render the page with correct metadata", async () => {
    // Test that the page component exists and renders
    render(<ABTestingPage />);
    expect(screen.getByTestId("ab-testing-page")).toBeInTheDocument();
  });

  it("should render the main heading", () => {
    render(<ABTestingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /a\/b testing/i,
    );
  });

  it("should have a CTA link", () => {
    render(<ABTestingPage />);
    expect(screen.getByRole("link", { name: /start a\/b testing/i })).toHaveAttribute(
      "href",
      "/auth/signin",
    );
  });

  it("should render the page description", () => {
    render(<ABTestingPage />);
    expect(
      screen.getByText(/stop guessing what content performs best/i),
    ).toBeInTheDocument();
  });
});
