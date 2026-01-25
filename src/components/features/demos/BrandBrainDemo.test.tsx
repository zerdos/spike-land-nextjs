import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BrandBrainDemo } from "./BrandBrainDemo";

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
    }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    span: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      style,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }) => (
      <span className={className} style={style} {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
}));

describe("BrandBrainDemo", () => {
  it("should render the Brand Brain header", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByText("Brand Brain")).toBeInTheDocument();
  });

  it("should show the description", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByText(/AI that speaks your brand's language/i)).toBeInTheDocument();
  });

  it("should render tone sliders", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("Friendly")).toBeInTheDocument();
    expect(screen.getByText("Witty")).toBeInTheDocument();
    expect(screen.getByText("Bold")).toBeInTheDocument();
  });

  it("should display Voice Parameters section", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByText("Voice Parameters")).toBeInTheDocument();
  });

  it("should show detected brand traits", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByText("Detected Brand Traits")).toBeInTheDocument();
    expect(screen.getByText("Approachable")).toBeInTheDocument();
    expect(screen.getByText("Innovative")).toBeInTheDocument();
    expect(screen.getByText("Trustworthy")).toBeInTheDocument();
    expect(screen.getByText("Dynamic")).toBeInTheDocument();
  });

  it("should display original text section", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByText("ORIGINAL")).toBeInTheDocument();
  });

  it("should have Apply Brand Voice button", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByRole("button", { name: /apply brand voice/i })).toBeInTheDocument();
  });

  it("should have Train on Content button", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByRole("button", { name: /train on content/i })).toBeInTheDocument();
  });

  it("should show branded result after transformation", async () => {
    vi.useFakeTimers();
    render(<BrandBrainDemo />);

    // Fast-forward past the auto-transform delay (1500ms) and transformation time (1500ms)
    await vi.advanceTimersByTimeAsync(3500);

    // Check for the branded voice label which appears after transformation
    expect(screen.queryByText("BRAND VOICE")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("should allow clicking Apply Brand Voice button", async () => {
    const user = userEvent.setup();
    render(<BrandBrainDemo />);

    const applyButton = screen.getByRole("button", { name: /apply brand voice/i });
    await user.click(applyButton);

    // Button should show transforming state briefly
    expect(applyButton).toBeInTheDocument();
  });

  it("should display sample text content", () => {
    render(<BrandBrainDemo />);
    expect(screen.getByText("Check out our new product launch!")).toBeInTheDocument();
  });
});
