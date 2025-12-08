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

    expect(githubButton).toHaveClass("bg-gradient-primary");
    expect(googleButton).toHaveClass("border");
  });

  it("should have correct button sizes", () => {
    render(<AuthButtons />);
    const githubButton = screen.getByRole("button", { name: /continue with github/i });
    const googleButton = screen.getByRole("button", { name: /continue with google/i });

    expect(githubButton).toHaveClass("h-12");
    expect(googleButton).toHaveClass("h-12");
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

  describe("Email/Password Form", () => {
    it("should show email button initially, not the form", () => {
      render(<AuthButtons />);
      expect(screen.getByRole("button", { name: /continue with email/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    });

    it("should show email form when Continue with Email is clicked", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in with email/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /continue with email/i })).not
        .toBeInTheDocument();
    });

    it("should hide form and show email button when Back is clicked", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      // Open form
      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

      // Click back
      await user.click(screen.getByRole("button", { name: /back to other options/i }));

      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with email/i })).toBeInTheDocument();
    });

    it("should clear form and error when Back is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(signIn).mockResolvedValue({
        error: "CredentialsSignin",
        status: 401,
        ok: false,
        url: null,
      });

      render(<AuthButtons />);

      // Open form and fill it
      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      // Submit to trigger error
      await user.click(screen.getByRole("button", { name: /sign in with email/i }));

      // Click back
      await user.click(screen.getByRole("button", { name: /back to other options/i }));

      // Re-open form
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      // Form should be cleared
      expect(screen.getByLabelText(/email/i)).toHaveValue("");
      expect(screen.getByLabelText(/password/i)).toHaveValue("");
      expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
    });

    it("should call signIn with credentials on form submission", async () => {
      const user = userEvent.setup();
      vi.mocked(signIn).mockResolvedValue({ ok: true, error: null, status: 200, url: "/" });

      // Mock window.location
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: { ...originalLocation, href: "", search: "" },
      });

      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "testpassword");
      await user.click(screen.getByRole("button", { name: /sign in with email/i }));

      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "testpassword",
        redirect: false,
      });

      // Restore window.location
      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should display error message on invalid credentials", async () => {
      const user = userEvent.setup();
      vi.mocked(signIn).mockResolvedValue({
        error: "CredentialsSignin",
        status: 401,
        ok: false,
        url: null,
      });

      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in with email/i }));

      expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    });

    it("should display generic error on unexpected error", async () => {
      const user = userEvent.setup();
      vi.mocked(signIn).mockRejectedValue(new Error("Network error"));

      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password");
      await user.click(screen.getByRole("button", { name: /sign in with email/i }));

      expect(await screen.findByText(/an error occurred during sign in/i)).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should disable inputs during loading", async () => {
      const user = userEvent.setup();
      // Create a promise that doesn't resolve immediately
      let resolveSignIn: (value: unknown) => void;
      vi.mocked(signIn).mockImplementation(() =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password");

      // Click submit (don't await)
      const submitButton = screen.getByRole("button", { name: /sign in with email/i });
      await user.click(submitButton);

      // Check that inputs are disabled during loading
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();

      // Resolve the promise to clean up
      resolveSignIn!({ ok: false, error: "test" });
    });

    it("should show loading spinner during submission", async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: unknown) => void;
      vi.mocked(signIn).mockImplementation(() =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password");

      const submitButton = screen.getByRole("button", { name: /sign in with email/i });
      await user.click(submitButton);

      // Check for loading state text
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      // Resolve to clean up
      resolveSignIn!({ ok: false, error: "test" });
    });

    it("should redirect to callback URL on successful sign in", async () => {
      const user = userEvent.setup();
      vi.mocked(signIn).mockResolvedValue({ ok: true, error: null, status: 200, url: "/" });

      // Mock window.location with callbackUrl
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: { ...originalLocation, href: "", search: "?callbackUrl=/dashboard" },
      });

      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password");
      await user.click(screen.getByRole("button", { name: /sign in with email/i }));

      // Wait for async operations
      await vi.waitFor(() => {
        expect(window.location.href).toBe("/dashboard");
      });

      // Restore window.location
      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should redirect to home if no callback URL", async () => {
      const user = userEvent.setup();
      vi.mocked(signIn).mockResolvedValue({ ok: true, error: null, status: 200, url: "/" });

      // Mock window.location without callbackUrl
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: { ...originalLocation, href: "", search: "" },
      });

      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password");
      await user.click(screen.getByRole("button", { name: /sign in with email/i }));

      // Wait for async operations
      await vi.waitFor(() => {
        expect(window.location.href).toBe("/");
      });

      // Restore window.location
      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should have required email field", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute("required");
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("should have required password field with minLength", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("minLength", "1");
    });

    it("should render email button with mail icon", async () => {
      render(<AuthButtons />);

      const emailButton = screen.getByRole("button", { name: /continue with email/i });
      const icon = emailButton.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("should update email input on change", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "newuser@test.com");
      expect(emailInput).toHaveValue("newuser@test.com");
    });

    it("should update password input on change", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, "secretpass");
      expect(passwordInput).toHaveValue("secretpass");
    });
  });
});
