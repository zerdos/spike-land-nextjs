import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ABTestingDemo } from "./ABTestingDemo";

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
  },
  AnimatePresence: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
}));

describe("ABTestingDemo", () => {
  it("should render the demo container", () => {
    render(<ABTestingDemo />);
    expect(screen.getByText(/A\/B Test Running/i)).toBeInTheDocument();
  });

  it("should render variant A and B cards", () => {
    render(<ABTestingDemo />);
    expect(screen.getByText("Variant A")).toBeInTheDocument();
    expect(screen.getByText("Variant B")).toBeInTheDocument();
  });

  it("should display engagement metrics", () => {
    render(<ABTestingDemo />);
    expect(screen.getAllByText("Likes")).toHaveLength(2);
    expect(screen.getAllByText("Comments")).toHaveLength(2);
    expect(screen.getAllByText("Shares")).toHaveLength(2);
  });

  it("should show engagement rate for each variant", () => {
    render(<ABTestingDemo />);
    expect(screen.getAllByText("Engagement Rate")).toHaveLength(2);
  });

  it("should display testing status", async () => {
    render(<ABTestingDemo />);
    // Initially should show testing phase
    await waitFor(
      () => {
        expect(screen.getByText(/Comparing post variations/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should render the bar chart icon", () => {
    render(<ABTestingDemo />);
    // Check for the header section with the icon
    expect(screen.getByText("A/B Test Running")).toBeInTheDocument();
  });

  it("should display content preview for variants", () => {
    render(<ABTestingDemo />);
    expect(screen.getByText(/Discover how AI is transforming/i)).toBeInTheDocument();
    expect(screen.getByText(/Mind = BLOWN by what AI/i)).toBeInTheDocument();
  });

  it("should show tone labels for variants", () => {
    render(<ABTestingDemo />);
    expect(screen.getByText("Formal")).toBeInTheDocument();
    expect(screen.getByText("Casual")).toBeInTheDocument();
  });
});
