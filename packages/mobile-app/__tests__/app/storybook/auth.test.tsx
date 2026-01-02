/**
 * Tests for Auth Storybook Page
 * Ensures all authentication components render correctly
 */

import { fireEvent, render } from "@testing-library/react-native";

import AuthPage from "../../../app/storybook/auth";

describe("AuthPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Auth")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<AuthPage />);
      expect(
        getByText("Authentication components, buttons, and user avatars"),
      ).toBeTruthy();
    });
  });

  describe("Login Form section", () => {
    it("should render Login Form section title", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Login Form")).toBeTruthy();
    });

    it("should render Login Form description", () => {
      const { getByText } = render(<AuthPage />);
      expect(
        getByText("Standard login form with email and password fields."),
      ).toBeTruthy();
    });

    it("should render Welcome back title", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Welcome back")).toBeTruthy();
    });

    it("should render sign in subtitle", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Sign in to your spike.land account")).toBeTruthy();
    });

    it("should render email input", () => {
      const { getByTestId } = render(<AuthPage />);
      expect(getByTestId("login-email")).toBeTruthy();
    });

    it("should render password input", () => {
      const { getByTestId } = render(<AuthPage />);
      expect(getByTestId("login-password")).toBeTruthy();
    });

    it("should allow entering email", () => {
      const { getByTestId } = render(<AuthPage />);
      const emailInput = getByTestId("login-email");
      fireEvent.changeText(emailInput, "test@example.com");
      expect(emailInput).toBeTruthy();
    });

    it("should allow entering password", () => {
      const { getByTestId } = render(<AuthPage />);
      const passwordInput = getByTestId("login-password");
      fireEvent.changeText(passwordInput, "password123");
      expect(passwordInput).toBeTruthy();
    });

    it("should render Forgot password link", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Forgot password?")).toBeTruthy();
    });

    it("should render Sign In button", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Sign In")).toBeTruthy();
    });

    it("should render Sign up link", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Don't have an account?")).toBeTruthy();
      expect(getByText("Sign up")).toBeTruthy();
    });
  });

  describe("Social Authentication section", () => {
    it("should render Social Authentication section title", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Social Authentication")).toBeTruthy();
    });

    it("should render Social Authentication description", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("OAuth providers for quick sign-in.")).toBeTruthy();
    });

    it("should render Google auth button", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Continue with Google")).toBeTruthy();
    });

    it("should render Apple auth button", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Continue with Apple")).toBeTruthy();
    });

    it("should render GitHub auth button", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Continue with GitHub")).toBeTruthy();
    });
  });

  describe("User Avatars section", () => {
    it("should render User Avatars section title", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("User Avatars")).toBeTruthy();
    });

    it("should render User Avatars description", () => {
      const { getByText } = render(<AuthPage />);
      expect(
        getByText("Avatar display with various sizes and fallback states."),
      ).toBeTruthy();
    });

    it("should render avatar initials", () => {
      const { getAllByText } = render(<AuthPage />);
      const initials = getAllByText("JD");
      expect(initials.length).toBeGreaterThan(0);
    });

    it("should render With Status Indicators label", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("With Status Indicators")).toBeTruthy();
    });
  });

  describe("User Menu section", () => {
    it("should render User Menu section title", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("User Menu")).toBeTruthy();
    });

    it("should render User Menu description", () => {
      const { getByText } = render(<AuthPage />);
      expect(
        getByText("Dropdown menu for user profile actions."),
      ).toBeTruthy();
    });

    it("should render user name", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("John Doe")).toBeTruthy();
    });

    it("should render user email", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("john@example.com")).toBeTruthy();
    });

    it("should render Profile menu item", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Profile")).toBeTruthy();
    });

    it("should render Settings menu item", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Settings")).toBeTruthy();
    });

    it("should render Tokens menu item", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Tokens")).toBeTruthy();
    });

    it("should render Sign Out menu item", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Sign Out")).toBeTruthy();
    });
  });

  describe("Auth States section", () => {
    it("should render Auth States section title", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Auth States")).toBeTruthy();
    });

    it("should render Auth States description", () => {
      const { getByText } = render(<AuthPage />);
      expect(
        getByText("Visual indicators for authentication status."),
      ).toBeTruthy();
    });

    it("should render Authenticated state", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Authenticated")).toBeTruthy();
      expect(getByText("User is signed in")).toBeTruthy();
    });

    it("should render Session Expiring state", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Session Expiring")).toBeTruthy();
      expect(getByText("Token refresh needed")).toBeTruthy();
    });

    it("should render Unauthenticated state", () => {
      const { getByText } = render(<AuthPage />);
      expect(getByText("Unauthenticated")).toBeTruthy();
      expect(getByText("Login required")).toBeTruthy();
    });
  });
});
