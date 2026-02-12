import { fireEvent, render, screen } from "@testing-library/react";
import { signIn, useSession } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";

const mockOpenPanel = vi.fn();
let mockIsOpen = false;

vi.mock("./vibe-code-provider", () => ({
  useVibeCode: () => ({
    openPanel: mockOpenPanel,
    isOpen: mockIsOpen,
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
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
    vi.mocked(signIn).mockClear();
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
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

  it("calls signIn on click when not authenticated", () => {
    mockIsOpen = false;
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    
    render(<VibeCodeFAB />);

    fireEvent.click(screen.getByText("Vibe Code"));
    expect(vi.mocked(signIn)).toHaveBeenCalledTimes(1);
    expect(mockOpenPanel).not.toHaveBeenCalled();
  });

  it("calls openPanel on click when authenticated", () => {
    mockIsOpen = false;
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: "Test User", id: "test-id", role: "USER" }, expires: "1" },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<VibeCodeFAB />);

    fireEvent.click(screen.getByText("Vibe Code"));
    expect(mockOpenPanel).toHaveBeenCalledTimes(1);
    expect(vi.mocked(signIn)).not.toHaveBeenCalled();
  });
});
