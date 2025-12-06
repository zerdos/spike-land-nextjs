import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./sign-out-button";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("SignOutButton Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render button with default content", () => {
    render(<SignOutButton />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("should render LogOut icon with default content", () => {
    render(<SignOutButton />);
    const button = screen.getByRole("button");
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render custom children when provided", () => {
    render(<SignOutButton>Custom Sign Out Text</SignOutButton>);
    expect(screen.getByRole("button", { name: "Custom Sign Out Text" })).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<SignOutButton className="custom-class">Sign Out</SignOutButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should apply outline variant", () => {
    render(<SignOutButton />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("border");
  });

  it("should call signOut with default callback URL when clicked", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button"));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("should call signOut with custom callback URL when provided", async () => {
    const user = userEvent.setup();
    render(<SignOutButton callbackUrl="/login" />);

    await user.click(screen.getByRole("button"));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("should call signOut with complex callback URL", async () => {
    const user = userEvent.setup();
    render(<SignOutButton callbackUrl="/auth/signin?error=SessionExpired" />);

    await user.click(screen.getByRole("button"));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/auth/signin?error=SessionExpired" });
  });

  it("should render children and custom className together", () => {
    render(
      <SignOutButton className="custom-style" callbackUrl="/goodbye">
        Logout
      </SignOutButton>,
    );
    const button = screen.getByRole("button", { name: "Logout" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("custom-style");
  });

  it("should handle multiple clicks", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);
    const button = screen.getByRole("button");

    await user.click(button);
    await user.click(button);
    expect(signOut).toHaveBeenCalledTimes(2);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
