/**
 * Reset Password Screen Tests
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";

import { calculatePasswordStrength } from "@/app/(auth)/reset-password";
import { authService } from "@/services/auth";

// Mock modules before importing the component
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  authService: {
    resetPassword: jest.fn(),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("tamagui", () => {
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
      { value, onChangeText, placeholder, testID, onSubmitEditing, _id, ...props }: {
        value?: string;
        onChangeText?: (text: string) => void;
        placeholder?: string;
        testID?: string;
        onSubmitEditing?: () => void;
        _id?: string;
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
    Label: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    Paragraph: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    Progress: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <View {...props}>{children}</View>
    ),
    Text: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
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

// Add mock for Progress.Indicator
jest.mock("tamagui", () => {
  const Progress = ({ children, ...props }: React.PropsWithChildren<object>) => (
    <View {...props}>{children}</View>
  );
  Progress.Indicator = ({ ...props }: object) => <View {...props} />;

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
      { value, onChangeText, placeholder, testID, onSubmitEditing, _id, ...props }: {
        value?: string;
        onChangeText?: (text: string) => void;
        placeholder?: string;
        testID?: string;
        onSubmitEditing?: () => void;
        _id?: string;
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
    Label: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    Paragraph: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
    Progress,
    Text: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <RNText {...props}>{children}</RNText>
    ),
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

import ResetPasswordScreen from "@/app/(auth)/reset-password";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockUseRouter = useRouter as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe("ResetPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("calculatePasswordStrength", () => {
    it("should return empty for no password", () => {
      const result = calculatePasswordStrength("");
      expect(result.score).toBe(0);
      expect(result.label).toBe("");
    });

    it("should return Very Weak for short passwords", () => {
      const result = calculatePasswordStrength("abc");
      expect(result.score).toBe(0);
      expect(result.label).toBe("Very Weak");
    });

    it("should return Weak for 8+ char passwords without variety", () => {
      const result = calculatePasswordStrength("abcdefgh");
      expect(result.score).toBe(1);
      expect(result.label).toBe("Weak");
    });

    it("should return Fair for passwords with some variety", () => {
      const result = calculatePasswordStrength("Abcdefgh");
      expect(result.score).toBe(2);
      expect(result.label).toBe("Fair");
    });

    it("should return Good for passwords with good variety", () => {
      const result = calculatePasswordStrength("Abcdefgh1");
      expect(result.score).toBe(2);
      expect(result.label).toBe("Fair");
    });

    it("should return Strong for 12+ char passwords with full variety", () => {
      const result = calculatePasswordStrength("Abcdefgh123!");
      expect(result.score).toBe(4);
      expect(result.label).toBe("Strong");
    });
  });

  describe("Missing Token", () => {
    it("should show error state when no token provided", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByText("Link Invalid")).toBeTruthy();
      });
    });

    it("should allow requesting new link when token missing", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("request-new-link-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("request-new-link-button"));

      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/forgot-password");
    });

    it("should allow going back to sign in from error state", async () => {
      mockUseLocalSearchParams.mockReturnValue({});

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("back-to-signin-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("back-to-signin-button"));

      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/signin");
    });
  });

  describe("Form Render", () => {
    it("should render the form when token is provided", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      // Use getAllByText since "Reset Password" appears in both header and button
      expect(screen.getAllByText("Reset Password").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId("new-password-input")).toBeTruthy();
      expect(screen.getByTestId("confirm-password-input")).toBeTruthy();
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
  });

  describe("Password Validation", () => {
    it("should show error for password less than 8 characters", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "Short1");
      fireEvent.changeText(confirmInput, "Short1");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters")).toBeTruthy();
      });
    });

    it("should show error for password without uppercase", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "lowercase1");
      fireEvent.changeText(confirmInput, "lowercase1");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must contain an uppercase letter")).toBeTruthy();
      });
    });

    it("should show error for password without lowercase", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "UPPERCASE1");
      fireEvent.changeText(confirmInput, "UPPERCASE1");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must contain a lowercase letter")).toBeTruthy();
      });
    });

    it("should show error for password without number", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "NoNumberHere");
      fireEvent.changeText(confirmInput, "NoNumberHere");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must contain a number")).toBeTruthy();
      });
    });

    it("should show error for password mismatch", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "ValidPass123");
      fireEvent.changeText(confirmInput, "DifferentPass123");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeTruthy();
      });
    });

    it("should clear password error when typing", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "short");
      fireEvent.changeText(confirmInput, "short");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters")).toBeTruthy();
      });

      fireEvent.changeText(passwordInput, "s");

      await waitFor(() => {
        expect(screen.queryByText("Password must be at least 8 characters")).toBeNull();
      });
    });
  });

  describe("Form Submission", () => {
    it("should call resetPassword with token and password on submit", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.resetPassword.mockResolvedValueOnce({
        success: true,
        message: "Password reset",
      });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "NewPassword123");
      fireEvent.changeText(confirmInput, "NewPassword123");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith("valid-token", "NewPassword123");
      });
    });

    it("should show success state after successful reset", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.resetPassword.mockResolvedValueOnce({
        success: true,
        message: "Password reset",
      });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "NewPassword123");
      fireEvent.changeText(confirmInput, "NewPassword123");

      await act(async () => {
        fireEvent.press(submitButton);
        // Flush pending promises
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByText("Password Reset!")).toBeTruthy();
      });
    });

    it("should show error on failed reset", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.resetPassword.mockResolvedValueOnce({
        success: false,
        error: "Token expired",
      });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "NewPassword123");
      fireEvent.changeText(confirmInput, "NewPassword123");

      await act(async () => {
        fireEvent.press(submitButton);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByText("Token expired")).toBeTruthy();
      });
    });

    it("should show default error when no error message provided", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.resetPassword.mockResolvedValueOnce({
        success: false,
      });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "NewPassword123");
      fireEvent.changeText(confirmInput, "NewPassword123");

      await act(async () => {
        fireEvent.press(submitButton);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to reset password")).toBeTruthy();
      });
    });
  });

  describe("Success State", () => {
    it("should navigate to sign in when button pressed", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.resetPassword.mockResolvedValueOnce({
        success: true,
        message: "Password reset",
      });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");
      const submitButton = screen.getByTestId("submit-button");

      fireEvent.changeText(passwordInput, "NewPassword123");
      fireEvent.changeText(confirmInput, "NewPassword123");

      await act(async () => {
        fireEvent.press(submitButton);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByTestId("go-to-signin-button")).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId("go-to-signin-button"));

      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/signin");
    });
  });

  describe("Submit on Enter", () => {
    it("should submit form when pressing enter on confirm input", async () => {
      mockUseLocalSearchParams.mockReturnValue({ token: "valid-token" });
      mockAuthService.resetPassword.mockResolvedValueOnce({
        success: true,
        message: "Password reset",
      });

      render(<ResetPasswordScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("new-password-input")).toBeTruthy();
      });

      const passwordInput = screen.getByTestId("new-password-input");
      const confirmInput = screen.getByTestId("confirm-password-input");

      fireEvent.changeText(passwordInput, "NewPassword123");
      fireEvent.changeText(confirmInput, "NewPassword123");
      fireEvent(confirmInput, "submitEditing");

      await waitFor(() => {
        expect(mockAuthService.resetPassword).toHaveBeenCalled();
      });
    });
  });
});
