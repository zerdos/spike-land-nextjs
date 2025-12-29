/**
 * Verify Email Screen Tests
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

import { authService } from "@/services/auth";
import { useAuthStore } from "@/stores/auth-store";

// Mock modules before importing the component
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  authService: {
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
  },
}));

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("tamagui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text: RNText, TextInput, View } = require("react-native");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMod = require("react");

  return {
    Button: (
      { children, onPress, disabled, testID, ...props }: {
        children?: React.ReactNode;
        onPress?: () => void;
        disabled?: boolean;
        testID?: string;
      },
    ) =>
      ReactMod.createElement(
        Pressable,
        { onPress: disabled ? undefined : onPress, testID, ...props },
        typeof children === "string" ? ReactMod.createElement(RNText, null, children) : children,
      ),
    Card: ({ children, ...props }: { children?: React.ReactNode; }) =>
      ReactMod.createElement(View, props, children),
    H2: ({ children, ...props }: { children?: React.ReactNode; }) =>
      ReactMod.createElement(RNText, props, children),
    Input: (
      { value, onChangeText, placeholder, testID, onSubmitEditing, ...props }: {
        value?: string;
        onChangeText?: (text: string) => void;
        placeholder?: string;
        testID?: string;
        onSubmitEditing?: () => void;
      },
    ) =>
      ReactMod.createElement(TextInput, {
        value,
        onChangeText,
        placeholder,
        testID,
        onSubmitEditing,
        ...props,
      }),
    Paragraph: ({ children, ...props }: { children?: React.ReactNode; }) =>
      ReactMod.createElement(RNText, props, children),
    Text: ({ children, ...props }: { children?: React.ReactNode; }) =>
      ReactMod.createElement(RNText, props, children),
    YStack: ({ children, ...props }: { children?: React.ReactNode; }) =>
      ReactMod.createElement(View, props, children),
  };
});

import VerifyEmailScreen from "@/app/(auth)/verify-email";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockRefreshSession = jest.fn();

const mockUseRouter = useRouter as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseAuthStore.mockReturnValue({
      user: null,
      refreshSession: mockRefreshSession,
    });
  });

  describe("Loading State", () => {
    it("should show loading state when verifying with token", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      let resolveVerify: ((value: { success: boolean; }) => void) | undefined;
      mockAuthService.verifyEmail.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveVerify = resolve;
          }),
      );

      render(<VerifyEmailScreen />);

      expect(screen.getByTestId("loading-indicator")).toBeTruthy();
      expect(screen.getByText("Verifying your email...")).toBeTruthy();

      // Cleanup
      await waitFor(() => {
        resolveVerify?.({ success: true });
      });
    });
  });

  describe("Success State", () => {
    it("should show success state when verification succeeds", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: true,
        message: "Email verified",
      });
      mockRefreshSession.mockResolvedValueOnce(undefined);

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByText("Email Verified!")).toBeTruthy();
      });
    });

    it("should call refreshSession on successful verification", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: true,
        message: "Email verified",
      });
      mockRefreshSession.mockResolvedValueOnce(undefined);

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(mockRefreshSession).toHaveBeenCalled();
      });
    });

    it("should navigate to home when continue button pressed", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: true,
        message: "Email verified",
      });
      mockRefreshSession.mockResolvedValueOnce(undefined);

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("go-home-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("go-home-button"));

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  describe("Error State", () => {
    it("should show error state when verification fails", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "invalid-token" });
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: false,
        error: "Invalid token",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByText("Verification Failed")).toBeTruthy();
        expect(screen.getByText("Invalid token")).toBeTruthy();
      });
    });

    it("should show default error when no error message provided", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "invalid-token" });
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: false,
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByText("Verification Failed")).toBeTruthy();
      });
    });

    it("should allow switching to resend form from error state", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "invalid-token" });
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: false,
        error: "Token expired",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("resend-verification-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("resend-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Verify Your Email")).toBeTruthy();
      });
    });

    it("should navigate to sign in from error state", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "invalid-token" });
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: false,
        error: "Token expired",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("back-to-signin-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("back-to-signin-button"));

      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/signin");
    });
  });

  describe("Resend Form", () => {
    it("should show resend form when no token provided", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByText("Verify Your Email")).toBeTruthy();
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });
    });

    it("should prefill email from params", async () => {
      mockUseLocalSearchParams.mockReturnValue({ email: "user@example.com" });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        const emailInput = screen.getByTestId("email-input");
        expect(emailInput.props.value).toBe("user@example.com");
      });
    });

    it("should prefill email from user store", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockUseAuthStore.mockReturnValue({
        user: { email: "stored@example.com" },
        refreshSession: mockRefreshSession,
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        const emailInput = screen.getByTestId("email-input");
        expect(emailInput.props.value).toBe("stored@example.com");
      });
    });

    it("should show error for empty email", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("send-verification-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Please enter your email address")).toBeTruthy();
      });
    });

    it("should show error for invalid email", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "invalid-email");
      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Please enter a valid email address")).toBeTruthy();
      });
    });

    it("should call resendVerification on submit", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockAuthService.resendVerification.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "user@example.com");
      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(mockAuthService.resendVerification).toHaveBeenCalledWith("user@example.com");
      });
    });

    it("should show success message after resending", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockAuthService.resendVerification.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "user@example.com");
      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Verification email sent! Please check your inbox.")).toBeTruthy();
      });
    });

    it("should show error message on resend failure", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockAuthService.resendVerification.mockResolvedValueOnce({
        success: false,
        error: "Too many requests",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "user@example.com");
      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Too many requests")).toBeTruthy();
      });
    });

    it("should show default error when no error message provided on resend", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockAuthService.resendVerification.mockResolvedValueOnce({
        success: false,
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "user@example.com");
      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Failed to send verification email")).toBeTruthy();
      });
    });

    it("should clear error when typing in email field", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("send-verification-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Please enter your email address")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "t");

      await waitFor(() => {
        expect(screen.queryByText("Please enter your email address")).toBeNull();
      });
    });

    it("should clear success when typing in email field", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockAuthService.resendVerification.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "user@example.com");
      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(screen.getByText("Verification email sent! Please check your inbox.")).toBeTruthy();
      });

      fireEvent.changeText(emailInput, "new@example.com");

      await waitFor(() => {
        expect(screen.queryByText("Verification email sent! Please check your inbox.")).toBeNull();
      });
    });

    it("should navigate to sign in from resend form", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("back-to-signin-link")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("back-to-signin-link"));

      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/signin");
    });

    it("should submit on enter key press", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockAuthService.resendVerification.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "user@example.com");
      fireEvent(emailInput, "submitEditing");

      await waitFor(() => {
        expect(mockAuthService.resendVerification).toHaveBeenCalledWith("user@example.com");
      });
    });

    it("should trim email before submission", async () => {
      mockUseLocalSearchParams.mockReturnValue({});
      mockAuthService.resendVerification.mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("email-input")).toBeTruthy();
      });

      const emailInput = screen.getByTestId("email-input");
      fireEvent.changeText(emailInput, "  user@example.com  ");
      fireEvent.press(screen.getByTestId("send-verification-button"));

      await waitFor(() => {
        expect(mockAuthService.resendVerification).toHaveBeenCalledWith("user@example.com");
      });
    });
  });
});
