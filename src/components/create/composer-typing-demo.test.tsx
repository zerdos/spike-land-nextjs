import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComposerTypingDemo } from "./composer-typing-demo";

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: vi.fn(() => false),
}));

vi.mock("@/hooks/useTypewriter", () => ({
  useTypewriter: vi.fn(() => ({ displayText: "Building a game...", isTyping: true })),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className} data-testid="typing-demo">{children}</div>
    ),
  },
}));

describe("ComposerTypingDemo", () => {
  it("renders nothing when not active", () => {
    const { container } = render(<ComposerTypingDemo isActive={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when reduced motion is preferred", async () => {
    const { useReducedMotion } = await import("@/hooks/useReducedMotion");
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { container } = render(<ComposerTypingDemo isActive={true} />);
    expect(container.innerHTML).toBe("");

    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it("shows typewriter text when active", async () => {
    const { useReducedMotion } = await import("@/hooks/useReducedMotion");
    vi.mocked(useReducedMotion).mockReturnValue(false);

    render(<ComposerTypingDemo isActive={true} />);
    expect(screen.getByText("Building a game...")).toBeDefined();
  });

  it("shows cursor when typing", async () => {
    const { useReducedMotion } = await import("@/hooks/useReducedMotion");
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { container } = render(<ComposerTypingDemo isActive={true} />);
    const cursor = container.querySelector(".bg-cyan-400");
    expect(cursor).toBeDefined();
    expect(cursor).not.toBeNull();
  });

  it("has pointer-events-none for click-through", async () => {
    const { useReducedMotion } = await import("@/hooks/useReducedMotion");
    vi.mocked(useReducedMotion).mockReturnValue(false);

    render(<ComposerTypingDemo isActive={true} />);
    const wrapper = screen.getByTestId("typing-demo");
    expect(wrapper.className).toContain("pointer-events-none");
  });
});
