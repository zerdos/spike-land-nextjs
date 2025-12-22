import { useTokenBalance } from "@/hooks/useTokenBalance";
import { fireEvent, render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { vi } from "vitest";
import { PixelAppHeader } from "./PixelAppHeader";

// Mocks
vi.mock("next-auth/react");
vi.mock("@/hooks/useTokenBalance");
vi.mock("@/components/auth/user-avatar", () => ({
  UserAvatar: () => <div data-testid="user-avatar">Avatar</div>,
}));
vi.mock("@/components/brand", () => ({
  PixelLogo: () => <div data-testid="pixel-logo">Pixel Logo</div>,
}));

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("PixelAppHeader", () => {
  beforeEach(() => {
    (useTokenBalance as any).mockReturnValue({ balance: 100, isLoading: false });
  });

  it("renders correctly when unauthenticated", () => {
    (useSession as any).mockReturnValue({ data: null, status: "unauthenticated" });
    render(<PixelAppHeader />);

    // Check for Sign In button (desktop)
    const signInButtons = screen.getAllByText("Sign In");
    expect(signInButtons.length).toBeGreaterThan(0);
    expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
    expect(screen.queryByText("100 tokens")).not.toBeInTheDocument();
  });

  it("renders correctly when authenticated", () => {
    (useSession as any).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
    render(<PixelAppHeader />);

    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("user-avatar")[0]).toBeInTheDocument();
    expect(screen.getByText("100 tokens")).toBeInTheDocument();
  });

  it("shows loading state for balance", () => {
    (useSession as any).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
    (useTokenBalance as any).mockReturnValue({ balance: null, isLoading: true });

    render(<PixelAppHeader />);
    expect(screen.getByText("... tokens")).toBeInTheDocument();
  });

  it("opens mobile menu", () => {
    (useSession as any).mockReturnValue({ data: null, status: "unauthenticated" });
    render(<PixelAppHeader />);

    const menuButton = screen.getByLabelText("Open menu");
    fireEvent.click(menuButton);

    expect(screen.getByText("Navigation Menu")).toBeInTheDocument();
    expect(screen.getByText("Back to Pixel")).toBeInTheDocument();
  });
});
