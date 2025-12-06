import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthHeader, AuthSection } from "./auth-header";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("./auth-buttons", () => ({
  AuthButtons: ({ className }: { className?: string; }) => (
    <div data-testid="auth-buttons" className={className}>
      Auth Buttons Component
    </div>
  ),
}));

vi.mock("./user-avatar", () => ({
  UserAvatar: () => <div data-testid="user-avatar">User Avatar Component</div>,
}));

vi.mock("@/components/theme/mode-toggle", () => ({
  ModeToggle: () => <button data-testid="mode-toggle">Mode Toggle</button>,
}));

describe("AuthHeader Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state when status is loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { container } = render(<AuthHeader />);
    const loadingElement = container.querySelector(".animate-pulse");
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveClass("animate-pulse", "rounded-full", "bg-white/10");
    expect(screen.getByTestId("mode-toggle")).toBeInTheDocument();
  });

  it("should render loading state with correct dimensions", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { container } = render(<AuthHeader />);
    const loadingElement = container.querySelector(".animate-pulse");
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveClass("h-10", "w-10");
  });

  it("should render loading state in fixed position", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { container } = render(<AuthHeader />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("fixed", "top-4", "right-4", "z-50");
  });

  it("should render UserAvatar when user is authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AuthHeader />);
    expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
    expect(screen.getByTestId("mode-toggle")).toBeInTheDocument();
  });

  it("should render UserAvatar in fixed position when authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const { container } = render(<AuthHeader />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("fixed", "top-4", "right-4", "z-50");
  });

  it("should render ModeToggle when not authenticated and not loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<AuthHeader />);
    expect(screen.getByTestId("mode-toggle")).toBeInTheDocument();
  });

  it("should render only ModeToggle when session data is null", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<AuthHeader />);
    expect(screen.getByTestId("mode-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
  });
});

describe("AuthSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when status is loading", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    const { container } = render(<AuthSection />);
    expect(container.firstChild).toBeNull();
  });

  it("should render AuthButtons when not authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<AuthSection />);
    expect(screen.getByTestId("auth-buttons")).toBeInTheDocument();
  });

  it("should render AuthButtons with correct className when not authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<AuthSection />);
    const authButtons = screen.getByTestId("auth-buttons");
    expect(authButtons).toHaveClass("w-full", "max-w-sm", "mx-auto");
  });

  it("should return null when user is authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const { container } = render(<AuthSection />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when session exists", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "Test User",
          email: "test@example.com",
        },
        expires: "2024-12-31",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    const { container } = render(<AuthSection />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render AuthButtons when authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<AuthSection />);
    expect(screen.queryByTestId("auth-buttons")).not.toBeInTheDocument();
  });

  it("should handle transition from loading to unauthenticated", () => {
    const { rerender } = render(<AuthSection />);

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });
    rerender(<AuthSection />);
    expect(screen.queryByTestId("auth-buttons")).not.toBeInTheDocument();

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    rerender(<AuthSection />);
    expect(screen.getByTestId("auth-buttons")).toBeInTheDocument();
  });

  it("should handle transition from unauthenticated to authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { rerender } = render(<AuthSection />);
    expect(screen.getByTestId("auth-buttons")).toBeInTheDocument();

    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        expires: "2024-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });
    rerender(<AuthSection />);
    expect(screen.queryByTestId("auth-buttons")).not.toBeInTheDocument();
  });
});
