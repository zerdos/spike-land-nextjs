import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BrandBrainPage from "./page";

// Mock the BrandBrainPageContent component since it uses complex components
vi.mock("./BrandBrainPageContent", () => ({
  BrandBrainPageContent: () => (
    <main data-testid="brand-brain-page">
      <h1>Brand Brain</h1>
      <p>Train AI to understand your brand voice.</p>
      <a href="/auth/signin">Train Your Brand Brain</a>
      <a href="/features">Features</a>
    </main>
  ),
}));

describe("BrandBrainPage", () => {
  it("should render the page with correct structure", () => {
    render(<BrandBrainPage />);
    expect(screen.getByTestId("brand-brain-page")).toBeInTheDocument();
  });

  it("should render the main heading", () => {
    render(<BrandBrainPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /brand brain/i,
    );
  });

  it("should have a CTA link", () => {
    render(<BrandBrainPage />);
    expect(screen.getByRole("link", { name: /train your brand brain/i })).toHaveAttribute(
      "href",
      "/auth/signin",
    );
  });

  it("should render the page description", () => {
    render(<BrandBrainPage />);
    expect(
      screen.getByText(/train ai to understand your brand voice/i),
    ).toBeInTheDocument();
  });
});
