/**
 * Forgot Password Screen Tests
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";

import { authService } from "@/services/auth";

// Mock modules before importing the component
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  Link: ({ children }: { children: React.ReactNode; }) => children,
}));

jest.mock("@/services/auth", () => ({
  authService: {
    requestPasswordReset: jest.fn(),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("tamagui", () => {
  const { View, Text: RNText, TextInput, Pressable, ScrollView } = require("react-native");
  return {
    Button: (
      { children, onPress, disabled, testID, ...props }: React.PropsWithChildren<
        { onPress?: () => void; disabled?: boolean; testID?: string; }
      >,
    ) => (
      <Pressable onPress={disabled ? undefined : onPress} testID={testID} {...props}>
        {typeof children === "string" ? <RNText>{children}</RNText> : children}
      </Pressable>
    ),
    Card: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    H2: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    Input: (
      { value, onChangeText, placeholder, testID, onSubmitEditing, ...props }: {
        value?: string;
        onChangeText?: (text: string) => void;
        placeholder?: string;
        testID?: string;
        onSubmitEditing?: () => void;
      },
    ) => (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID={testID}
        onSubmitEditing={onSubmitEditing}
        {...props}
      />
    ),
    Paragraph: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    Text: (
      { children, onPress, testID, ...props }: React.PropsWithChildren<
        { onPress?: () => void; testID?: string; }
      >,
    ) => <RNText onPress={onPress} testID={testID} {...props}>{children}</RNText>,
    XStack: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    YStack: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    ScrollView: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  };
});

import ForgotPasswordScreen from "@/app/(auth)/forgot-password";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockUseRouter = useRouter as jest.Mock;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Initial Render", () => {
    it("should render the forgot password form", () => {
      render(<ForgotPasswordScreen />);

      expect(screen.getByText("Forgot Password?")).toBeTruthy();
      expect(screen.getByPlaceholderText("Email address")).toBeTruthy();
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });

    it("should render the description text", () => {
      render(<ForgotPasswordScreen />);

      expect(screen.getByText(/Enter your email address and we'll send you a link/)).toBeTruthy();
    });

    it("should render back to sign in link", () => {
      render(<ForgotPasswordScreen />);

      expect(screen.getByText("Back to Sign In")).toBeTruthy();
    });
  });

  describe("Form Validation", () => {
    it("should show error for empty email", async () => {
      render(<ForgotPasswordScreen />);

      const submitButton = screen.getByTestId("submit-button");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Please enter your email address")).toBeTruthy();
      });
    });

    it("should show error for invalid email format", async () => {
      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "invalid-email");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Please enter a valid email address")).toBeTruthy();
      });
    });

    it("should clear error when typing in email field", async () => {
      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      // Trigger error first
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Please enter your email address")).toBeTruthy();
      });

      // Type to clear error
      fireEvent.changeText(emailInput, "t");

      await waitFor(() => {
        expect(screen.queryByText("Please enter your email address")).toBeNull();
      });
    });
  });

  describe("Form Submission", () => {
    it("should call requestPasswordReset with email on submit", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
      });
    });

    it("should show success state after successful submission", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Check Your Email")).toBeTruthy();
      });

      expect(screen.getByText(/We've sent a password reset link/)).toBeTruthy();
    });

    it("should show error message on failed submission", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: false,
        error: "Email not found",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "unknown@example.com");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Email not found")).toBeTruthy();
      });
    });

    it("should show default error when no error message provided", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: false,
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to send reset email")).toBeTruthy();
      });
    });

    it("should trim email before submission", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "  test@example.com  ");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
      });
    });
  });

  describe("Success State", () => {
    it("should navigate back to sign in when button pressed", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Check Your Email")).toBeTruthy();
      });

      const backToSignInButton = screen.getByTestId("back-to-signin-button");
      fireEvent.press(backToSignInButton);

      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/signin");
    });

    it("should allow trying again from success state", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Check Your Email")).toBeTruthy();
      });

      const tryAgainLink = screen.getByTestId("try-again-link");
      fireEvent.press(tryAgainLink);

      await waitFor(() => {
        expect(screen.getByText("Forgot Password?")).toBeTruthy();
      });
    });

    it("should display the email address in success message", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeTruthy();
      });
    });
  });

  describe("Submit on Enter", () => {
    it("should submit form when pressing enter on email input", async () => {
      mockAuthService.requestPasswordReset.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<ForgotPasswordScreen />);

      const emailInput = screen.getByTestId("email-input");

      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent(emailInput, "submitEditing");

      await waitFor(() => {
        expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith("test@example.com");
      });
    });
  });
});
