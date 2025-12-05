import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthButtons } from "./auth-buttons";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("./sign-in-button", () => ({
  SignInButton: ({ className }: { className?: string; }) => (
    <button className={className}>Sign In Button</button>
  ),
}));

describe("AuthButtons Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all authentication buttons", () => {
    render(<AuthButtons />);
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in button/i })).toBeInTheDocument();
  });

  it("should render GitHub button with icon", () => {
    render(<AuthButtons />);
    const githubButton = screen.getByRole("button", { name: /continue with github/i });
    const icon = githubButton.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render Google button with icon", () => {
    render(<AuthButtons />);
    const googleButton = screen.getByRole("button", { name: /continue with google/i });
    const icon = googleButton.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render separator with text", () => {
    render(<AuthButtons />);
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
  });

  it("should apply custom className to container", () => {
    const { container } = render(<AuthButtons className="custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should apply default classes when no className provided", () => {
    const { container } = render(<AuthButtons />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("flex", "flex-col", "gap-3", "w-full", "max-w-sm");
  });

  it("should call signIn with github when GitHub button is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthButtons />);

    await user.click(screen.getByRole("button", { name: /continue with github/i }));
    expect(signIn).toHaveBeenCalledWith("github");
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("should call signIn with google when Google button is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthButtons />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(signIn).toHaveBeenCalledWith("google");
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("should have correct button variants", () => {
    render(<AuthButtons />);
    const githubButton = screen.getByRole("button", { name: /continue with github/i });
    const googleButton = screen.getByRole("button", { name: /continue with google/i });

    expect(githubButton).toHaveClass("bg-primary");
    expect(googleButton).toHaveClass("border");
  });

  it("should have correct button sizes", () => {
    render(<AuthButtons />);
    const githubButton = screen.getByRole("button", { name: /continue with github/i });
    const googleButton = screen.getByRole("button", { name: /continue with google/i });

    expect(githubButton).toHaveClass("h-10");
    expect(googleButton).toHaveClass("h-10");
  });

  it("should have full width buttons", () => {
    render(<AuthButtons />);
    const githubButton = screen.getByRole("button", { name: /continue with github/i });
    const googleButton = screen.getByRole("button", { name: /continue with google/i });

    expect(githubButton).toHaveClass("w-full");
    expect(googleButton).toHaveClass("w-full");
  });

  it("should pass correct className to SignInButton", () => {
    render(<AuthButtons />);
    const signInButton = screen.getByRole("button", { name: /sign in button/i });
    expect(signInButton).toHaveClass("w-full");
  });

  it("should handle multiple button clicks", async () => {
    const user = userEvent.setup();
    render(<AuthButtons />);

    await user.click(screen.getByRole("button", { name: /continue with github/i }));
    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(signIn).toHaveBeenNthCalledWith(1, "github");
    expect(signIn).toHaveBeenNthCalledWith(2, "google");
  });

  it("should render separator with correct styling", () => {
    const { container } = render(<AuthButtons />);
    const separator = container.querySelector(".border-t");
    expect(separator).toBeInTheDocument();
  });

  it("should render separator text with correct styling", () => {
    render(<AuthButtons />);
    const separatorText = screen.getByText(/or continue with/i);
    expect(separatorText).toHaveClass("bg-background", "px-2", "text-muted-foreground");
  });
});
