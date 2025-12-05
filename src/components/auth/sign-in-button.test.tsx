import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInButton } from "./sign-in-button";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

describe("SignInButton Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render button with default content", () => {
    render(<SignInButton />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("should render LogIn icon with default content", () => {
    render(<SignInButton />);
    const button = screen.getByRole("button");
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render custom children when provided", () => {
    render(<SignInButton>Custom Sign In Text</SignInButton>);
    expect(screen.getByRole("button", { name: "Custom Sign In Text" })).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<SignInButton className="custom-class">Sign In</SignInButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should apply default variant", () => {
    render(<SignInButton />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-primary");
  });

  it("should call signIn without provider when clicked without provider prop", async () => {
    const user = userEvent.setup();
    render(<SignInButton />);

    await user.click(screen.getByRole("button"));
    expect(signIn).toHaveBeenCalledWith();
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("should call signIn with provider when clicked with provider prop", async () => {
    const user = userEvent.setup();
    render(<SignInButton provider="github" />);

    await user.click(screen.getByRole("button"));
    expect(signIn).toHaveBeenCalledWith("github");
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("should call signIn with google provider", async () => {
    const user = userEvent.setup();
    render(<SignInButton provider="google" />);

    await user.click(screen.getByRole("button"));
    expect(signIn).toHaveBeenCalledWith("google");
  });

  it("should handle multiple provider types", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SignInButton provider="github" />);

    await user.click(screen.getByRole("button"));
    expect(signIn).toHaveBeenCalledWith("github");

    rerender(<SignInButton provider="credentials" />);
    await user.click(screen.getByRole("button"));
    expect(signIn).toHaveBeenCalledWith("credentials");
  });

  it("should render children and custom className together", () => {
    render(
      <SignInButton className="custom-style" provider="github">
        Login with GitHub
      </SignInButton>,
    );
    const button = screen.getByRole("button", { name: "Login with GitHub" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("custom-style");
  });
});
