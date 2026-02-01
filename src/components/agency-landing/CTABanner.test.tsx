import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll, afterEach } from "vitest";
import { CTABanner } from "./CTABanner";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("CTABanner Component", () => {
  beforeAll(() => {
    // Define window properties
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 1000,
    });

    // Ensure scrollY is writable (it usually is in modern JSDOM but good to be safe)
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 0
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Reset scroll
    window.scrollY = 0;
  });

  it("should be hidden initially", () => {
    render(<CTABanner />);
    const banner = screen.queryByText("Ready to scale?");
    expect(banner).not.toBeInTheDocument();
  });

  it("should appear after scrolling past threshold", () => {
    render(<CTABanner />);

    // Simulate scroll
    act(() => {
      window.scrollY = 800; // > 1000 * 0.7 = 700
      window.dispatchEvent(new Event("scroll"));
    });

    const banner = screen.queryByText("Ready to scale?");
    expect(banner).toBeInTheDocument();
  });

  it("should hide when scrolling back up", () => {
    render(<CTABanner />);

    // Scroll down to show
    act(() => {
      window.scrollY = 800;
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.queryByText("Ready to scale?")).toBeInTheDocument();

    // Scroll up to hide
    act(() => {
      window.scrollY = 100;
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.queryByText("Ready to scale?")).not.toBeInTheDocument();
  });

  it("should render the 'Book Call' button", () => {
    render(<CTABanner />);

    act(() => {
      window.scrollY = 800;
      window.dispatchEvent(new Event("scroll"));
    });

    const button = screen.getByRole("link", { name: /Book Call/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "/book-call");
  });
});
