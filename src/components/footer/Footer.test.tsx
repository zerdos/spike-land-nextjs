import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, type Mock, vi } from "vitest";
import { Footer } from "./Footer";

// Mock NewsletterForm to avoid dynamic import issues in tests
vi.mock("./NewsletterForm", () => ({
  NewsletterForm: () => (
    <div data-testid="newsletter-form">
      <input placeholder="Enter your email" />
      <button type="submit">Subscribe</button>
    </div>
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

describe("Footer", () => {
  it("renders correctly", () => {
    render(<Footer />);
    expect(screen.getByText("Spike Land")).toBeDefined();
    expect(screen.getByText("Subscribe to our newsletter")).toBeDefined();
    expect(screen.getByTestId("newsletter-form")).toBeDefined();
  });

  it("returns null on /my-apps routes", () => {
    (usePathname as Mock).mockReturnValue("/my-apps");
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null on /my-apps/[codeSpace] routes", () => {
    (usePathname as Mock).mockReturnValue("/my-apps/test-app");
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders on non-my-apps routes", () => {
    (usePathname as Mock).mockReturnValue("/dashboard");
    render(<Footer />);
    expect(screen.getByText("Spike Land")).toBeDefined();
  });
});
