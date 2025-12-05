import { render, screen } from "@testing-library/react";
import { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "./session-provider";

vi.mock("next-auth/react", () => ({
  SessionProvider: vi.fn(({ children }) => <div data-testid="next-auth-provider">{children}</div>),
}));

describe("SessionProvider Component", () => {
  beforeEach(() => {
    vi.mocked(NextAuthSessionProvider).mockClear();
  });

  it("should render children", () => {
    render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>,
    );
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("should wrap children with NextAuthSessionProvider", () => {
    render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>,
    );
    expect(screen.getByTestId("next-auth-provider")).toBeInTheDocument();
  });

  it("should pass session prop to NextAuthSessionProvider", () => {
    const mockSession: Session = {
      user: {
        name: "Test User",
        email: "test@example.com",
      },
      expires: "2024-01-01",
    };

    render(
      <SessionProvider session={mockSession}>
        <div>Test Child</div>
      </SessionProvider>,
    );

    expect(NextAuthSessionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        session: mockSession,
        children: expect.anything(),
      }),
      undefined,
    );
  });

  it("should pass null session to NextAuthSessionProvider", () => {
    render(
      <SessionProvider session={null}>
        <div>Test Child</div>
      </SessionProvider>,
    );

    expect(NextAuthSessionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        session: null,
        children: expect.anything(),
      }),
      undefined,
    );
  });

  it("should pass undefined session to NextAuthSessionProvider", () => {
    render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>,
    );

    expect(NextAuthSessionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        session: undefined,
        children: expect.anything(),
      }),
      undefined,
    );
  });

  it("should render multiple children", () => {
    render(
      <SessionProvider>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </SessionProvider>,
    );
    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Child 3")).toBeInTheDocument();
  });

  it("should pass complete session with user details", () => {
    const mockSession: Session = {
      user: {
        name: "John Doe",
        email: "john@example.com",
        image: "https://example.com/avatar.jpg",
      },
      expires: "2024-12-31T23:59:59.999Z",
    };

    render(
      <SessionProvider session={mockSession}>
        <div>Test Child</div>
      </SessionProvider>,
    );

    expect(NextAuthSessionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        session: mockSession,
        children: expect.anything(),
      }),
      undefined,
    );
  });

  it("should handle nested components", () => {
    render(
      <SessionProvider>
        <div>
          <div>
            <span>Nested Content</span>
          </div>
        </div>
      </SessionProvider>,
    );
    expect(screen.getByText("Nested Content")).toBeInTheDocument();
  });

  it("should work with complex session object", () => {
    const complexSession: Session = {
      user: {
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.jpg",
      },
      expires: "2024-01-01",
    };

    render(
      <SessionProvider session={complexSession}>
        <div>Complex Session Test</div>
      </SessionProvider>,
    );

    expect(screen.getByText("Complex Session Test")).toBeInTheDocument();
    expect(NextAuthSessionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        session: complexSession,
        children: expect.anything(),
      }),
      undefined,
    );
  });
});
