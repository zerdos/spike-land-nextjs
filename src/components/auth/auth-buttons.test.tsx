import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SignInResponse } from "next-auth/react";
import { signIn } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthButtons } from "./auth-buttons";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Helper to create properly typed SignInResponse mock
const createSignInResponse = (
  overrides: Partial<SignInResponse> = {},
): SignInResponse => ({
  ok: true,
  error: undefined,
  code: undefined,
  status: 200,
  url: "/",
  ...overrides,
});

// Mock fetch for email check API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AuthButtons Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Initial Email Step", () => {
    it("should render email input and continue button initially", () => {
      render(<AuthButtons />);
      expect(screen.getByPlaceholderText(/name@example.com/i))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with email/i }))
        .toBeInTheDocument();
    });

    it("should render Google, GitHub, and Apple social buttons", () => {
      render(<AuthButtons />);
      expect(screen.getByRole("button", { name: /continue with google/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with github/i }))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with apple/i }))
        .toBeInTheDocument();
    });

    it("should render social buttons in correct order: Google, GitHub, Apple", () => {
      render(<AuthButtons />);
      const buttons = screen.getAllByRole("button");
      const googleIndex = buttons.findIndex((b) => b.textContent?.includes("Google"));
      const githubIndex = buttons.findIndex((b) => b.textContent?.includes("GitHub"));
      const appleIndex = buttons.findIndex((b) => b.textContent?.includes("Apple"));
      expect(googleIndex).toBeLessThan(githubIndex);
      expect(githubIndex).toBeLessThan(appleIndex);
    });

    it("should render separator with text", () => {
      render(<AuthButtons />);
      expect(screen.getByText(/^or$/i)).toBeInTheDocument();
    });

    it("should apply custom className to container", () => {
      const { container } = render(<AuthButtons className="custom-class" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("should apply default classes when no className provided", () => {
      const { container } = render(<AuthButtons />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(
        "flex",
        "flex-col",
        "gap-4",
        "w-full",
        "max-w-sm",
      );
    });

    it("should have correct button variants - social buttons styling", () => {
      render(<AuthButtons />);
      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      const githubButton = screen.getByRole("button", {
        name: /continue with github/i,
      });
      const appleButton = screen.getByRole("button", {
        name: /continue with apple/i,
      });

      // Google and GitHub buttons should have neutral bg-card styling
      expect(googleButton).toHaveClass("bg-card");
      expect(githubButton).toHaveClass("bg-card");
      // Apple button should have black background with white text (Apple HIG)
      expect(appleButton).toHaveClass("bg-black", "text-white");
    });

    it("should have correct button sizes", () => {
      render(<AuthButtons />);
      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      const githubButton = screen.getByRole("button", {
        name: /continue with github/i,
      });
      const appleButton = screen.getByRole("button", {
        name: /continue with apple/i,
      });

      expect(googleButton).toHaveClass("h-12");
      expect(githubButton).toHaveClass("h-12");
      expect(appleButton).toHaveClass("h-12");
    });

    it("should disable continue button when email is empty", () => {
      render(<AuthButtons />);
      const continueButton = screen.getByRole("button", {
        name: /continue with email/i,
      });
      expect(continueButton).toBeDisabled();
    });

    it("should enable continue button when email is entered", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "test@example.com",
      );

      const continueButton = screen.getByRole("button", {
        name: /continue with email/i,
      });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe("Social Auth Buttons", () => {
    it("should call signIn with google and default callbackUrl when Google button is clicked", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(
        screen.getByRole("button", { name: /continue with google/i }),
      );
      expect(signIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/apps/pixel",
      });
      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it("should call signIn with github and default callbackUrl when GitHub button is clicked", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(
        screen.getByRole("button", { name: /continue with github/i }),
      );
      expect(signIn).toHaveBeenCalledWith("github", {
        callbackUrl: "/apps/pixel",
      });
      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it("should call signIn with apple and default callbackUrl when Apple button is clicked", async () => {
      const user = userEvent.setup();
      render(<AuthButtons />);

      await user.click(
        screen.getByRole("button", { name: /continue with apple/i }),
      );
      expect(signIn).toHaveBeenCalledWith("apple", {
        callbackUrl: "/apps/pixel",
      });
      expect(signIn).toHaveBeenCalledTimes(1);
    });

    it("should use callbackUrl from URL params for Google sign in", async () => {
      const user = userEvent.setup();
      // Mock window.location.search
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: "?callbackUrl=/my-dashboard",
          origin: "http://localhost",
        },
        writable: true,
      });

      render(<AuthButtons />);
      await user.click(
        screen.getByRole("button", { name: /continue with google/i }),
      );

      expect(signIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/my-dashboard",
      });

      // Reset
      Object.defineProperty(window, "location", {
        value: { ...window.location, search: "", origin: "http://localhost" },
        writable: true,
      });
    });

    it("should use callbackUrl from URL params for GitHub sign in", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: "?callbackUrl=/settings",
          origin: "http://localhost",
        },
        writable: true,
      });

      render(<AuthButtons />);
      await user.click(
        screen.getByRole("button", { name: /continue with github/i }),
      );

      expect(signIn).toHaveBeenCalledWith("github", {
        callbackUrl: "/settings",
      });

      // Reset
      Object.defineProperty(window, "location", {
        value: { ...window.location, search: "", origin: "http://localhost" },
        writable: true,
      });
    });

    it("should use callbackUrl from URL params for Apple sign in", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: "?callbackUrl=/profile",
          origin: "http://localhost",
        },
        writable: true,
      });

      render(<AuthButtons />);
      await user.click(
        screen.getByRole("button", { name: /continue with apple/i }),
      );

      expect(signIn).toHaveBeenCalledWith("apple", {
        callbackUrl: "/profile",
      });

      // Reset
      Object.defineProperty(window, "location", {
        value: { ...window.location, search: "", origin: "http://localhost" },
        writable: true,
      });
    });

    it("should reject external URLs in callbackUrl to prevent open redirect", async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: "?callbackUrl=https://evil.com/steal",
          origin: "http://localhost",
        },
        writable: true,
      });

      render(<AuthButtons />);
      await user.click(
        screen.getByRole("button", { name: /continue with google/i }),
      );

      // Should use default /apps/pixel instead of external URL
      expect(signIn).toHaveBeenCalledWith("google", {
        callbackUrl: "/apps/pixel",
      });

      // Reset
      Object.defineProperty(window, "location", {
        value: { ...window.location, search: "", origin: "http://localhost" },
        writable: true,
      });
    });

    it("should have full width buttons", () => {
      render(<AuthButtons />);
      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      const githubButton = screen.getByRole("button", {
        name: /continue with github/i,
      });
      const appleButton = screen.getByRole("button", {
        name: /continue with apple/i,
      });

      expect(googleButton).toHaveClass("w-full");
      expect(githubButton).toHaveClass("w-full");
      expect(appleButton).toHaveClass("w-full");
    });

    it("should render Google button with icon", () => {
      render(<AuthButtons />);
      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      const icon = googleButton.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("should render GitHub button with icon", () => {
      render(<AuthButtons />);
      const githubButton = screen.getByRole("button", {
        name: /continue with github/i,
      });
      const icon = githubButton.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("should render Apple button with icon", () => {
      render(<AuthButtons />);
      const appleButton = screen.getByRole("button", {
        name: /continue with apple/i,
      });
      const icon = appleButton.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Email Check Flow", () => {
    it("should show loading state when checking email", async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ exists: false, hasPassword: false }),
                }),
              100,
            )
          ),
      );

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "test@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      expect(screen.getByText(/checking/i)).toBeInTheDocument();
    });

    it("should call check-email API with correct email", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: false, hasPassword: false }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "TEST@EXAMPLE.COM",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
    });

    it("should show error message when API fails", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Too many requests" }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "test@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it("should show error message when fetch throws", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "test@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Password Step - Existing User with Password", () => {
    it("should show password field for existing user with password", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i))
          .toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /sign in/i }))
        .toBeInTheDocument();
    });

    it("should show disabled email field with entered email", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        const emailDisplay = screen.getByDisplayValue("existing@example.com");
        expect(emailDisplay).toBeDisabled();
      });
    });

    it("should show 'Use different email' button in password step", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /use different email/i }))
          .toBeInTheDocument();
      });
    });

    it("should go back to email step when 'Use different email' is clicked", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /use different email/i }))
          .toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /use different email/i }),
      );

      expect(screen.getByPlaceholderText(/name@example.com/i))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with email/i }))
        .toBeInTheDocument();
    });

    it("should call signIn with credentials on password form submission", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });
      vi.mocked(signIn).mockResolvedValue(createSignInResponse());

      // Mock window.location
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          ...originalLocation,
          href: "",
          search: "",
          origin: "http://localhost:3000",
        },
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "testpassword",
      );
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "existing@example.com",
        password: "testpassword",
        redirect: false,
      });

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should display error message on invalid credentials", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });
      vi.mocked(signIn).mockResolvedValue(
        createSignInResponse({
          error: "CredentialsSignin",
          status: 401,
          ok: false,
          url: null,
        }),
      );

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "wrongpassword",
      );
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i))
          .toBeInTheDocument();
      });
    });

    it("should show loading spinner during sign in", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });

      let resolveSignIn: (value: SignInResponse) => void;
      vi.mocked(signIn).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignIn = resolve;
          }),
      );

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "testpassword",
      );
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      resolveSignIn!(createSignInResponse({ ok: false, error: "test" }));
    });

    it("should redirect to callback URL on successful sign in", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });
      vi.mocked(signIn).mockResolvedValue(createSignInResponse());

      const originalLocation = window.location;
      const mockOrigin = "http://localhost:3000";
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          ...originalLocation,
          href: "",
          search: "?callbackUrl=/dashboard",
          origin: mockOrigin,
        },
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "testpassword",
      );
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(window.location.href).toBe(`${mockOrigin}/dashboard`);
      });

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should block external URLs and redirect to Pixel app (security)", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });
      vi.mocked(signIn).mockResolvedValue(createSignInResponse());

      const originalLocation = window.location;
      const mockOrigin = "http://localhost:3000";
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          ...originalLocation,
          href: "",
          search: "?callbackUrl=https://malicious-site.com/phishing",
          origin: mockOrigin,
        },
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "testpassword",
      );
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(window.location.href).toBe("/apps/pixel");
      });

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });
  });

  describe("Signup Step - New User", () => {
    it("should show signup form for new user", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: false, hasPassword: false }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });
      expect(screen.getByText(/create a password to set up your account/i))
        .toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i }))
        .toBeInTheDocument();
    });

    it("should require minimum 8 character password for signup", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: false, hasPassword: false }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "short",
      );

      const createButton = screen.getByRole("button", {
        name: /create account/i,
      });
      expect(createButton).toBeDisabled();

      await user.clear(screen.getByPlaceholderText(/create a password/i));
      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "longenoughpassword",
      );

      expect(createButton).not.toBeDisabled();
    });

    it("should show loading state during account creation", async () => {
      const user = userEvent.setup();
      // First call is check-email, subsequent calls will be signup
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasPassword: false }),
          });
        }
        // Signup call - return a delayed promise
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    success: true,
                    user: { id: "123", email: "newuser@example.com" },
                  }),
              }),
            100,
          )
        );
      });

      vi.mocked(signIn).mockResolvedValue(createSignInResponse());

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "newpassword123",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });

    it("should redirect to callback URL on successful signup", async () => {
      const user = userEvent.setup();
      // Mock check-email and signup API calls
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasPassword: false }),
          });
        }
        // Signup call
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: { id: "123", email: "newuser@example.com" },
            }),
        });
      });
      vi.mocked(signIn).mockResolvedValue(createSignInResponse());

      const originalLocation = window.location;
      const mockOrigin = "http://localhost:3000";
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          ...originalLocation,
          href: "",
          search: "?callbackUrl=/dashboard",
          origin: mockOrigin,
        },
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "newpassword123",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(window.location.href).toBe(`${mockOrigin}/dashboard`);
      });

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should block external callback URLs on signup (security)", async () => {
      const user = userEvent.setup();
      // Mock check-email and signup API calls
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasPassword: false }),
          });
        }
        // Signup call
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: { id: "123", email: "newuser@example.com" },
            }),
        });
      });
      vi.mocked(signIn).mockResolvedValue(createSignInResponse());

      const originalLocation = window.location;
      const mockOrigin = "http://localhost:3000";
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          ...originalLocation,
          href: "",
          search: "?callbackUrl=https://evil.com",
          origin: mockOrigin,
        },
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "newpassword123",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(window.location.href).toBe("/apps/pixel");
      });

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should display error on signup exception", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      // Mock check-email and signup API calls, signup throws exception
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasPassword: false }),
          });
        }
        // Signup call throws
        return Promise.reject(new Error("Network error"));
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "newpassword123",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/an error occurred during sign up/i))
          .toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it("should call signup API with correct data", async () => {
      const user = userEvent.setup();
      // Mock check-email and signup API calls
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasPassword: false }),
          });
        }
        // Signup call
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: { id: "123", email: "newuser@example.com" },
            }),
        });
      });
      vi.mocked(signIn).mockResolvedValue(createSignInResponse());

      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          ...originalLocation,
          href: "",
          search: "",
          origin: "http://localhost:3000",
        },
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "NewUser@Example.COM",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "newpassword123",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      // Check the signup API was called correctly
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "newuser@example.com",
            password: "newpassword123",
          }),
        });
      });

      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    });

    it("should display signup API error message", async () => {
      const user = userEvent.setup();
      // Mock check-email and signup API calls
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasPassword: false }),
          });
        }
        // Signup call returns error
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              error: "An account with this email already exists",
            }),
        });
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "newpassword123",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/an account with this email already exists/i))
          .toBeInTheDocument();
      });
    });
  });

  describe("OAuth Only Step", () => {
    it("should show OAuth message for user without password", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: false }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "oauth@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            /this account was created with google, apple, facebook, or github/i,
          ),
        ).toBeInTheDocument();
      });
    });

    it("should show 'Use different email' button in OAuth step", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: false }),
      });

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "oauth@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /use different email/i }))
          .toBeInTheDocument();
      });
    });
  });

  describe("Separator Styling", () => {
    it("should render separator with correct styling", () => {
      const { container } = render(<AuthButtons />);
      const separator = container.querySelector(".border-t");
      expect(separator).toBeInTheDocument();
    });

    it("should render separator text with correct styling", () => {
      render(<AuthButtons />);
      const separatorText = screen.getByText(/^or$/i);
      expect(separatorText).toHaveClass(
        "bg-background",
        "px-4",
        "text-muted-foreground",
      );
    });
  });

  describe("Error Handling", () => {
    it("should display generic error on sign in exception", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(
        () => {},
      );
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true, hasPassword: true }),
      });
      vi.mocked(signIn).mockRejectedValue(new Error("Network error"));

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "existing@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your password/i),
        "testpassword",
      );
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/an error occurred during sign in/i))
          .toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it("should display error when signin fails after signup", async () => {
      const user = userEvent.setup();
      // Mock check-email and signup API calls - signup succeeds but signin fails
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ exists: false, hasPassword: false }),
          });
        }
        // Signup call succeeds
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              user: { id: "123", email: "newuser@example.com" },
            }),
        });
      });
      vi.mocked(signIn).mockResolvedValue(
        createSignInResponse({
          error: "CredentialsSignin",
          status: 401,
          ok: false,
          url: null,
        }),
      );

      render(<AuthButtons />);

      await user.type(
        screen.getByPlaceholderText(/name@example.com/i),
        "newuser@example.com",
      );
      await user.click(screen.getByRole("button", { name: /continue with email/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/create a password/i))
          .toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/create a password/i),
        "newpassword123",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/account created but sign in failed/i),
        ).toBeInTheDocument();
      });
    });
  });
});
