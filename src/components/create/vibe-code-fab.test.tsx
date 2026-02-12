import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockOpenPanel = vi.fn();
let mockIsOpen = false;

vi.mock("./vibe-code-provider", () => ({
  useVibeCode: () => ({
    openPanel: mockOpenPanel,
    isOpen: mockIsOpen,
  }),
}));

vi.mock("lucide-react", () => ({
  Sparkles: ({ className }: { className?: string }) => (
    <span data-testid="sparkles-icon" className={className} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

import { VibeCodeFAB } from "./vibe-code-fab";

describe("VibeCodeFAB", () => {
  beforeEach(() => {
    mockIsOpen = false;
    mockOpenPanel.mockClear();
  });

  it("renders when panel is closed", () => {
    mockIsOpen = false;
    render(<VibeCodeFAB />);

    expect(screen.getByText("Vibe Code")).toBeInTheDocument();
    expect(screen.getByTestId("sparkles-icon")).toBeInTheDocument();
  });

  it("returns null when panel is open", () => {
    mockIsOpen = true;
    const { container } = render(<VibeCodeFAB />);

    expect(container.innerHTML).toBe("");
  });

  it("calls openPanel on click", () => {
    mockIsOpen = false;
    render(<VibeCodeFAB />);

    fireEvent.click(screen.getByText("Vibe Code"));
    expect(mockOpenPanel).toHaveBeenCalledTimes(1);
  });
});
