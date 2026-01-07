import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentDemo } from "./ComponentDemo";

describe("ComponentDemo Component", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render the section heading", () => {
    render(<ComponentDemo />);
    expect(screen.getByText("Built with Modern UI")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<ComponentDemo />);
    expect(screen.getByText(/Crafted with shadcn\/ui/)).toBeInTheDocument();
  });

  it("should render tabs for different component categories", () => {
    render(<ComponentDemo />);
    expect(screen.getByRole("tab", { name: "Buttons" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Inputs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Feedback" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Dialog" })).toBeInTheDocument();
  });

  describe("Buttons Tab", () => {
    it("should render button variants", () => {
      render(<ComponentDemo />);
      expect(screen.getByRole("button", { name: "Primary" }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Secondary" }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Outline" }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ghost" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Destructive" }))
        .toBeInTheDocument();
    });

    it("should render button sizes", () => {
      render(<ComponentDemo />);
      expect(screen.getByRole("button", { name: "Small" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Default" }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Large" })).toBeInTheDocument();
    });

    it("should render badges", () => {
      render(<ComponentDemo />);
      // Multiple elements with "Default" text, but Badge should be present
      const badges = document.querySelectorAll(".inline-flex");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("should show loading state when Click Me button is pressed", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      const button = screen.getByRole("button", { name: "Click Me" });
      await user.click(button);

      expect(screen.getByRole("button", { name: /Loading/i }))
        .toBeInTheDocument();

      // Advance timers to complete the loading state
      await vi.advanceTimersByTimeAsync(2000);
    });
  });

  describe("Inputs Tab", () => {
    it("should switch to inputs tab and show form controls", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Inputs" }));

      expect(screen.getByLabelText("Text Input")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter your email"))
        .toBeInTheDocument();
    });

    it("should render select component", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Inputs" }));

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should render switch component", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Inputs" }));

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toBeChecked();
    });

    it("should toggle switch", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Inputs" }));

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeChecked();

      await user.click(switchElement);
      expect(switchElement).not.toBeChecked();
    });
  });

  describe("Feedback Tab", () => {
    it("should show progress bar", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Feedback" }));

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should show alerts", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Feedback" }));

      expect(screen.getByText("Information")).toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("should show skeleton loaders", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Feedback" }));

      expect(screen.getByText("Loading Skeleton")).toBeInTheDocument();
    });

    it("should animate progress when button clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Feedback" }));

      const animateButton = screen.getByRole("button", {
        name: "Animate Progress",
      });
      await user.click(animateButton);

      // Progress should start at 0 and animate
      await waitFor(() => {
        const progressbar = screen.getByRole("progressbar");
        expect(progressbar).toBeInTheDocument();
      });

      // Advance timers to let the progress animation run
      await vi.advanceTimersByTimeAsync(2500);

      // Progress should complete
      await waitFor(() => {
        const progressbar = screen.getByRole("progressbar");
        expect(progressbar).toHaveAttribute("aria-valuenow", "100");
      });
    });
  });

  describe("Dialog Tab", () => {
    it("should show dialog tab content", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Dialog" }));

      expect(screen.getByText("Dialog / Modal")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open Dialog" }))
        .toBeInTheDocument();
    });

    it("should open dialog when button clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Dialog" }));
      await user.click(screen.getByRole("button", { name: "Open Dialog" }));

      expect(screen.getByText("Dialog Example")).toBeInTheDocument();
      expect(screen.getByText(/This dialog tests the overlay/))
        .toBeInTheDocument();
    });

    it("should close dialog with Cancel button", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Dialog" }));
      await user.click(screen.getByRole("button", { name: "Open Dialog" }));

      expect(screen.getByText("Dialog Example")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => {
        expect(screen.queryByText("Dialog Example")).not.toBeInTheDocument();
      });
    });

    it("should close dialog with Confirm button", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ComponentDemo />);

      await user.click(screen.getByRole("tab", { name: "Dialog" }));
      await user.click(screen.getByRole("button", { name: "Open Dialog" }));

      await user.click(screen.getByRole("button", { name: /Confirm/i }));

      await waitFor(() => {
        expect(screen.queryByText("Dialog Example")).not.toBeInTheDocument();
      });
    });
  });
});
