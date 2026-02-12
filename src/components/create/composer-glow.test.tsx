import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockUseReducedMotion = vi.fn(() => false);
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { animate: _a, initial: _i, exit: _e, transition: _t, ...rest } = props;
      return <div data-testid="motion-div" {...rest}>{children}</div>;
    },
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" "),
}));

import { ComposerGlow } from "./composer-glow";

describe("ComposerGlow", () => {
  it("renders children", () => {
    render(
      <ComposerGlow isFocused={false}>
        <span>Hello child</span>
      </ComposerGlow>,
    );

    expect(screen.getByText("Hello child")).toBeInTheDocument();
  });

  it("applies animate-border-rotate-fast class when isFocused is true and motion enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(
      <ComposerGlow isFocused={true}>
        <span>Content</span>
      </ComposerGlow>,
    );

    // The rotating gradient border div should have the fast animation class
    const borderDiv = container.querySelector(".animate-border-rotate-fast");
    expect(borderDiv).toBeTruthy();
  });

  it("applies animate-border-rotate class when isFocused is false and motion enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(
      <ComposerGlow isFocused={false}>
        <span>Content</span>
      </ComposerGlow>,
    );

    const borderDiv = container.querySelector(".animate-border-rotate");
    expect(borderDiv).toBeTruthy();
  });

  it("applies static border classes when reduced motion is preferred and focused", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(
      <ComposerGlow isFocused={true}>
        <span>Content</span>
      </ComposerGlow>,
    );

    // With reduced motion + focused, it should use border-glow-cyan class
    const borderDiv = container.querySelector(".border-glow-cyan");
    expect(borderDiv).toBeTruthy();

    // Should NOT have animation classes
    expect(container.querySelector(".animate-border-rotate-fast")).toBeNull();
    expect(container.querySelector(".animate-border-rotate")).toBeNull();
  });

  it("passes className prop to outer container", () => {
    const { container } = render(
      <ComposerGlow isFocused={false} className="custom-class">
        <span>Content</span>
      </ComposerGlow>,
    );

    const outerDiv = container.firstElementChild;
    expect(outerDiv?.className).toContain("custom-class");
  });

  it("has relative positioning on the outer container", () => {
    const { container } = render(
      <ComposerGlow isFocused={false}>
        <span>Content</span>
      </ComposerGlow>,
    );

    const outerDiv = container.firstElementChild;
    expect(outerDiv?.className).toContain("relative");
  });
});
