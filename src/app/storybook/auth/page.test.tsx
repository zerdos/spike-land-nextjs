import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthPage from "./page";

// Mock the components since we only want to test the page layout/structure
vi.mock("@/components/auth/auth-buttons", () => ({
  AuthButtons: () => <div data-testid="auth-buttons">Auth Buttons</div>,
}));

vi.mock("@/components/auth/sign-in-button", () => ({
  SignInButton: () => <button data-testid="sign-in-button">Sign In</button>,
}));

vi.mock("@/components/auth/sign-out-button", () => ({
  SignOutButton: () => <button data-testid="sign-out-button">Sign Out</button>,
}));

vi.mock("@/components/auth/user-avatar", () => ({
  UserAvatar: ({ user }: { user: any; }) => (
    <div data-testid="user-avatar">{user?.name || "No Name"}</div>
  ),
}));

describe("AuthPage", () => {
  it("renders the auth page correctly", () => {
    render(<AuthPage />);

    // Check for section title and description
    expect(screen.getByText("Authentication")).toBeDefined();
    expect(
      screen.getByText("Components for handling user authentication and identity"),
    ).toBeDefined();

    // Check for component cards
    expect(screen.getAllByText("Auth Buttons")).toBeDefined();
    expect(screen.getByText("Individual Buttons")).toBeDefined();
    expect(screen.getByText("User Avatar")).toBeDefined();

    // Check for mocked components
    expect(screen.getByTestId("auth-buttons")).toBeDefined();
    expect(screen.getByTestId("sign-in-button")).toBeDefined();
    expect(screen.getByTestId("sign-out-button")).toBeDefined();
    expect(screen.getAllByTestId("user-avatar")).toHaveLength(3);
  });
});
