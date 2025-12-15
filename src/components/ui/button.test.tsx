import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./button";

describe("Button Component", () => {
  it("should render button with children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" }))
      .toBeInTheDocument();
  });

  it("should apply default variant classes", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-gradient-primary");
  });

  it("should apply destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("should apply outline variant", () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border");
  });

  it("should apply secondary variant", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-secondary");
  });

  it("should apply ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("hover:bg-muted");
  });

  it("should apply link variant", () => {
    render(<Button variant="link">Link</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("underline-offset-4");
  });

  it("should apply small size", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-9");
  });

  it("should apply large size", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-12");
  });

  it("should apply icon size", () => {
    render(<Button size="icon">Icon</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-10", "w-10");
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should handle disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should handle click events", async () => {
    let clicked = false;
    const user = userEvent.setup();
    render(
      <Button
        onClick={() => {
          clicked = true;
        }}
      >
        Click
      </Button>,
    );

    await user.click(screen.getByRole("button"));
    expect(clicked).toBe(true);
  });

  it("should render as child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("should forward ref correctly", () => {
    const ref = { current: null };
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("should pass through additional props", () => {
    render(<Button data-testid="test-button" aria-label="Test">Button</Button>);
    const button = screen.getByTestId("test-button");
    expect(button).toHaveAttribute("aria-label", "Test");
  });

  it("should have correct display name", () => {
    expect(Button.displayName).toBe("Button");
  });

  describe("loading state", () => {
    it("should render spinner when loading is true", () => {
      render(<Button loading>Submit</Button>);
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should hide children when loading is true", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    });

    it("should disable button when loading is true", () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should set aria-busy when loading is true", () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("should not set aria-busy when loading is false", () => {
      render(<Button>Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("aria-busy");
    });

    it("should render children when loading is false", () => {
      render(<Button loading={false}>Submit</Button>);
      expect(screen.getByText("Submit")).toBeInTheDocument();
    });

    it("should not prevent clicks when loading (disabled handles it)", async () => {
      let clicked = false;
      const user = userEvent.setup();
      render(
        <Button
          loading
          onClick={() => {
            clicked = true;
          }}
        >
          Submit
        </Button>,
      );

      await user.click(screen.getByRole("button"));
      expect(clicked).toBe(false);
    });

    it("should work with different variants when loading", () => {
      render(<Button loading variant="destructive">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-destructive");
      expect(button).toBeDisabled();
    });
  });

  describe("buttonVariants", () => {
    it("should generate default variant classes", () => {
      const classes = buttonVariants();
      expect(classes).toContain("bg-gradient-primary");
    });

    it("should generate variant-specific classes", () => {
      const classes = buttonVariants({ variant: "destructive" });
      expect(classes).toContain("bg-destructive");
    });

    it("should generate size-specific classes", () => {
      const classes = buttonVariants({ size: "lg" });
      expect(classes).toContain("h-12");
    });

    it("should merge custom className", () => {
      const classes = buttonVariants({ className: "custom" });
      expect(classes).toContain("custom");
    });
  });
});
