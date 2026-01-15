import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "./sonner";

// Mock sonner
vi.mock("sonner", () => ({
  Toaster: ({
    theme,
    className,
    toastOptions,
    ...props
  }: {
    theme?: string;
    className?: string;
    toastOptions?: {
      classNames?: {
        toast?: string;
        description?: string;
        actionButton?: string;
        cancelButton?: string;
      };
    };
  }) => (
    <div
      data-testid="sonner-toaster"
      data-theme={theme}
      className={className}
      data-toast-class={toastOptions?.classNames?.toast}
      data-description-class={toastOptions?.classNames?.description}
      data-action-class={toastOptions?.classNames?.actionButton}
      data-cancel-class={toastOptions?.classNames?.cancelButton}
      {...props}
    />
  ),
}));

describe("Toaster", () => {
  it("renders Toaster component", () => {
    render(<Toaster />);

    expect(screen.getByTestId("sonner-toaster")).toBeInTheDocument();
  });

  it("uses dark theme by default", () => {
    render(<Toaster />);

    const toaster = screen.getByTestId("sonner-toaster");
    expect(toaster).toHaveAttribute("data-theme", "dark");
  });

  it("applies toaster group className", () => {
    render(<Toaster />);

    const toaster = screen.getByTestId("sonner-toaster");
    expect(toaster).toHaveClass("toaster");
    expect(toaster).toHaveClass("group");
  });

  it("configures toast classNames", () => {
    render(<Toaster />);

    const toaster = screen.getByTestId("sonner-toaster");
    expect(toaster.dataset["toastClass"]).toContain("group-[.toaster]:bg-card");
    expect(toaster.dataset["toastClass"]).toContain(
      "group-[.toaster]:text-foreground",
    );
    expect(toaster.dataset["toastClass"]).toContain(
      "group-[.toaster]:rounded-xl",
    );
  });

  it("configures description classNames", () => {
    render(<Toaster />);

    const toaster = screen.getByTestId("sonner-toaster");
    expect(toaster.dataset["descriptionClass"]).toContain(
      "group-[.toast]:text-muted-foreground",
    );
  });

  it("configures action button classNames", () => {
    render(<Toaster />);

    const toaster = screen.getByTestId("sonner-toaster");
    expect(toaster.dataset["actionClass"]).toContain("group-[.toast]:bg-primary");
    expect(toaster.dataset["actionClass"]).toContain(
      "group-[.toast]:text-primary-foreground",
    );
  });

  it("configures cancel button classNames", () => {
    render(<Toaster />);

    const toaster = screen.getByTestId("sonner-toaster");
    expect(toaster.dataset["cancelClass"]).toContain("group-[.toast]:bg-muted");
    expect(toaster.dataset["cancelClass"]).toContain(
      "group-[.toast]:text-muted-foreground",
    );
  });
});
