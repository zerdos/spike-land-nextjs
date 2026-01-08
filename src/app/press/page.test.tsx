import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PressPage from "./page";

// Mock child components that might have complex logic or use browser APIs not available in jsdom
vi.mock("@/components/brand/SpikeLandLogo", () => ({
  SpikeLandLogo: ({ variant, size }: any) => (
    <div data-testid={`spike-logo-${variant}-${size}`}>Mock Logo</div>
  ),
}));

vi.mock("@/components/enhance/ImageComparisonSlider", () => ({
  ImageComparisonSlider: ({ originalLabel }: any) => (
    <div data-testid="comparison-slider">{originalLabel}</div>
  ),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: any) => <img {...props} />,
}));

describe("PressPage", () => {
  it("renders the main heading", () => {
    render(<PressPage />);
    expect(screen.getByRole("heading", { name: /Press & Media Kit/i }))
      .toBeDefined();
  });

  it("renders download buttons with correct links", () => {
    render(<PressPage />);
    const kitLink = screen.getByRole("link", {
      name: /Download Full Press Kit \(ZIP\)/i,
    });
    expect(kitLink.getAttribute("href")).toBe("/press/press-kit.zip");

    const logoLink = screen.getByRole("link", { name: /Logo Package Only/i });
    expect(logoLink.getAttribute("href")).toBe("/press/logo-package.zip");
  });

  it("renders logo sections", () => {
    render(<PressPage />);
    expect(screen.getByText("Full Logo")).toBeDefined();
    expect(screen.getByText("Icon Only")).toBeDefined();
    expect(screen.getByText("Wordmark")).toBeDefined();
    expect(screen.getByText("Pixel Product")).toBeDefined();
  });

  it("renders screenshots section", () => {
    render(<PressPage />);
    expect(screen.getByText("Screenshots")).toBeDefined();
    // Check if sliders are rendered
    const sliders = screen.getAllByTestId("comparison-slider");
    expect(sliders.length).toBeGreaterThan(0);
  });

  it("renders founder bio correctly", () => {
    render(<PressPage />);
    expect(screen.getByText("Zoltan Erdos")).toBeDefined();
    expect(screen.getByText(/Chief Morale Officer/i)).toBeDefined();
  });

  it("renders press releases link", () => {
    render(<PressPage />);
    expect(screen.getByText("Recreate Your Memories in 4K")).toBeDefined();
  });

  it("renders correct social links", () => {
    render(<PressPage />);
    const twitterLink = screen.getByRole("link", { name: /X \(Twitter\)/i });
    expect(twitterLink.getAttribute("href")).toBe(
      "https://x.com/ai_spike_land",
    );
  });
});
