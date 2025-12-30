/**
 * Reset Password Screen
 * Handles password reset with token from deep link
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button, Card, H2, Input, Label, Paragraph, Progress, Text, XStack, YStack } from "tamagui";

import { authService } from "../../services";

type ScreenState = "form" | "success" | "error" | "loading";

// Password strength calculation
interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length === 0) {
    return { score: 0, label: "", color: "$gray6" };
  }

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 0.5;
  if (/[A-Z]/.test(password)) score += 0.5;
  if (/[0-9]/.test(password)) score += 0.5;
  if (/[^a-zA-Z0-9]/.test(password)) score += 0.5;

  // Normalize to 0-4
  const normalizedScore = Math.min(4, Math.floor(score));

  const labels: Record<number, { label: string; color: string; }> = {
    0: { label: "Very Weak", color: "$red10" },
    1: { label: "Weak", color: "$orange10" },
    2: { label: "Fair", color: "$yellow10" },
    3: { label: "Good", color: "$blue10" },
    4: { label: "Strong", color: "$green10" },
  };

  return {
    score: normalizedScore,
    ...labels[normalizedScore],
  };
}

// Password validation
function validatePassword(
  password: string,
): { valid: boolean; message: string; } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain an uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain a lowercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain a number" };
  }
  return { valid: true, message: "" };
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; }>();

  // Form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("loading");

  // Validate token on mount
  useEffect(() => {
    if (!params.token) {
      setError(
        "Invalid or missing reset token. Please request a new password reset link.",
      );
      setScreenState("error");
    } else {
      setScreenState("form");
    }
  }, [params.token]);

  // Calculate password strength
  const passwordStrength = calculatePasswordStrength(newPassword);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setError(null);
    setPasswordError(null);

    // Validate password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPasswordError(validation.message);
      return;
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!params.token) {
      setError("Invalid reset token");
      return;
    }

    setIsLoading(true);

    const result = await authService.resetPassword(params.token, newPassword);

    setIsLoading(false);

    if (result.success) {
      setScreenState("success");
    } else {
      setError(result.error || "Failed to reset password");
    }
  }, [newPassword, confirmPassword, params.token]);

  // Handle navigation to sign in
  const handleGoToSignIn = useCallback(() => {
    router.replace("/(auth)/signin");
  }, [router]);

  // Handle request new reset link
  const handleRequestNewLink = useCallback(() => {
    router.replace("/(auth)/forgot-password");
  }, [router]);

  // Loading state
  if (screenState === "loading") {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Paragraph color="$gray11" marginTop="$4">
          Validating reset link...
        </Paragraph>
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack
          flex={1}
          justifyContent="center"
          padding="$4"
          backgroundColor="$background"
        >
          <Card
            elevate
            size="$4"
            bordered
            paddingHorizontal="$4"
            paddingVertical="$6"
          >
            {screenState === "form" && (
              <>
                {/* Header */}
                <YStack space="$2" alignItems="center" marginBottom="$6">
                  <YStack
                    width={64}
                    height={64}
                    borderRadius={32}
                    backgroundColor="$blue3"
                    alignItems="center"
                    justifyContent="center"
                    marginBottom="$2"
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={32}
                      color="#3B82F6"
                    />
                  </YStack>
                  <H2 fontWeight="bold">Reset Password</H2>
                  <Paragraph color="$gray11" textAlign="center">
                    Create a new password for your account.
                  </Paragraph>
                </YStack>

                {/* Error display */}
                {error && (
                  <Card
                    backgroundColor="$red3"
                    borderColor="$red7"
                    borderWidth={1}
                    padding="$3"
                    marginBottom="$4"
                  >
                    <Text color="$red11" fontSize="$3">
                      {error}
                    </Text>
                  </Card>
                )}

                <YStack space="$4">
                  {/* New password input */}
                  <YStack space="$2">
                    <Label htmlFor="newPassword" fontSize="$2" color="$gray11">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      size="$4"
                      placeholder="Enter new password"
                      secureTextEntry
                      autoComplete="password-new"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setPasswordError(null);
                      }}
                      returnKeyType="next"
                      testID="new-password-input"
                    />
                    {passwordError && (
                      <Text color="$red10" fontSize="$2">
                        {passwordError}
                      </Text>
                    )}

                    {/* Password strength indicator */}
                    {newPassword.length > 0 && (
                      <YStack space="$1" marginTop="$1">
                        <Progress
                          value={(passwordStrength.score / 4) * 100}
                          backgroundColor="$gray4"
                        >
                          <Progress.Indicator
                            animation="bouncy"
                            backgroundColor={passwordStrength.color}
                          />
                        </Progress>
                        <XStack justifyContent="space-between">
                          <Text fontSize="$1" color="$gray10">
                            Password strength:
                          </Text>
                          <Text
                            fontSize="$1"
                            color={passwordStrength.color}
                            fontWeight="500"
                          >
                            {passwordStrength.label}
                          </Text>
                        </XStack>
                      </YStack>
                    )}
                  </YStack>

                  {/* Confirm password input */}
                  <YStack space="$2">
                    <Label
                      htmlFor="confirmPassword"
                      fontSize="$2"
                      color="$gray11"
                    >
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      size="$4"
                      placeholder="Confirm new password"
                      secureTextEntry
                      autoComplete="password-new"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onSubmitEditing={handleSubmit}
                      returnKeyType="done"
                      testID="confirm-password-input"
                    />
                  </YStack>

                  {/* Submit button */}
                  <Button
                    size="$4"
                    theme="active"
                    onPress={handleSubmit}
                    disabled={isLoading}
                    marginTop="$2"
                    icon={isLoading
                      ? <ActivityIndicator size="small" color="white" />
                      : undefined}
                    color="white"
                    fontWeight="600"
                    testID="submit-button"
                  >
                    Reset Password
                  </Button>

                  {/* Password requirements */}
                  <Paragraph color="$gray10" fontSize="$1" textAlign="center">
                    Password must be at least 8 characters with uppercase, lowercase, and a number.
                  </Paragraph>
                </YStack>
              </>
            )}

            {screenState === "success" && (
              <YStack space="$4" alignItems="center">
                <YStack
                  width={80}
                  height={80}
                  borderRadius={40}
                  backgroundColor="$green3"
                  alignItems="center"
                  justifyContent="center"
                  marginBottom="$2"
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={40}
                    color="#22C55E"
                  />
                </YStack>
                <H2 fontWeight="bold" textAlign="center">Password Reset!</H2>
                <Paragraph
                  color="$gray11"
                  textAlign="center"
                  paddingHorizontal="$2"
                >
                  Your password has been successfully reset. You can now sign in with your new
                  password.
                </Paragraph>

                <Button
                  size="$4"
                  theme="active"
                  onPress={handleGoToSignIn}
                  width="100%"
                  marginTop="$4"
                  color="white"
                  fontWeight="600"
                  testID="go-to-signin-button"
                >
                  Go to Sign In
                </Button>
              </YStack>
            )}

            {screenState === "error" && (
              <YStack space="$4" alignItems="center">
                <YStack
                  width={80}
                  height={80}
                  borderRadius={40}
                  backgroundColor="$red3"
                  alignItems="center"
                  justifyContent="center"
                  marginBottom="$2"
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={40}
                    color="#EF4444"
                  />
                </YStack>
                <H2 fontWeight="bold" textAlign="center">Link Invalid</H2>
                <Paragraph
                  color="$gray11"
                  textAlign="center"
                  paddingHorizontal="$2"
                >
                  {error ||
                    "This password reset link is invalid or has expired."}
                </Paragraph>

                <YStack space="$3" width="100%" marginTop="$4">
                  <Button
                    size="$4"
                    theme="active"
                    onPress={handleRequestNewLink}
                    color="white"
                    fontWeight="600"
                    testID="request-new-link-button"
                  >
                    Request New Link
                  </Button>
                  <Button
                    size="$4"
                    variant="outlined"
                    onPress={handleGoToSignIn}
                    testID="back-to-signin-button"
                  >
                    Back to Sign In
                  </Button>
                </YStack>
              </YStack>
            )}
          </Card>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
