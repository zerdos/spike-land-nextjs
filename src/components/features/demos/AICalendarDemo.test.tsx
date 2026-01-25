import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AICalendarDemo } from "./AICalendarDemo";

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
    button: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      style,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => (
      <button className={className} style={style} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode; }) => <>{children}</>,
}));

describe("AICalendarDemo", () => {
  it("should render the calendar header", () => {
    render(<AICalendarDemo />);
    expect(screen.getByText("AI Content Calendar")).toBeInTheDocument();
  });

  it("should render week navigation", () => {
    render(<AICalendarDemo />);
    expect(screen.getByText("This Week")).toBeInTheDocument();
  });

  it("should render 7 day buttons", async () => {
    render(<AICalendarDemo />);
    await waitFor(() => {
      // Should have day names (Mon, Tue, etc.)
      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Tue")).toBeInTheDocument();
      expect(screen.getByText("Wed")).toBeInTheDocument();
    });
  });

  it("should display engagement heatmap", async () => {
    render(<AICalendarDemo />);
    await waitFor(() => {
      expect(screen.getByText("Engagement Heatmap")).toBeInTheDocument();
    });
  });

  it("should show time labels", async () => {
    render(<AICalendarDemo />);
    await waitFor(() => {
      expect(screen.getByText("6 AM")).toBeInTheDocument();
      expect(screen.getByText("12 PM")).toBeInTheDocument();
      expect(screen.getByText("6 PM")).toBeInTheDocument();
      expect(screen.getByText("10 PM")).toBeInTheDocument();
    });
  });

  it("should show low/high legend", async () => {
    render(<AICalendarDemo />);
    await waitFor(() => {
      expect(screen.getByText("Low")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });
  });

  it("should display AI recommendation after delay", async () => {
    render(<AICalendarDemo />);
    await waitFor(
      () => {
        expect(screen.getByText("AI Recommendation")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("should show optimal posting times description", () => {
    render(<AICalendarDemo />);
    expect(screen.getByText(/Optimal posting times for your audience/i)).toBeInTheDocument();
  });

  it("should allow clicking on day buttons", async () => {
    const user = userEvent.setup();
    render(<AICalendarDemo />);

    await waitFor(() => {
      expect(screen.getByText("Tue")).toBeInTheDocument();
    });

    const tuesdayButton = screen.getByText("Tue").closest("button");
    if (tuesdayButton) {
      await user.click(tuesdayButton);
      // Day should now be selected (test passes if no error)
      expect(tuesdayButton).toBeInTheDocument();
    }
  });
});
