/**
 * Verify Email Screen
 * Handles email verification with token from deep link
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Button, Card, H2, Input, Paragraph, Text, YStack } from "tamagui";

import { authService } from "../../services";
import { useAuthStore } from "../../stores";

type ScreenState = "loading" | "success" | "error" | "resend";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string; }>();
  const { user, refreshSession } = useAuthStore();

  // State
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState(params.email || user?.email || "");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Verify email on mount if token is present
  useEffect(() => {
    const verifyEmail = async () => {
      if (!params.token) {
        // No token - show resend form
        setScreenState("resend");
        return;
      }

      const result = await authService.verifyEmail(params.token);

      if (result.success) {
        // Refresh the session to update emailVerified state
        await refreshSession();
        setScreenState("success");
      } else {
        setError(result.error || "Failed to verify email");
        setScreenState("error");
      }
    };

    verifyEmail();
  }, [params.token, refreshSession]);

  // Handle resend verification email
  const handleResend = useCallback(async () => {
    if (!resendEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resendEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    const result = await authService.resendVerification(resendEmail.trim());

    setIsResending(false);

    if (result.success) {
      setResendSuccess(true);
    } else {
      setError(result.error || "Failed to send verification email");
    }
  }, [resendEmail]);

  // Handle navigation
  const handleGoHome = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  const handleGoToSignIn = useCallback(() => {
    router.replace("/(auth)/signin");
  }, [router]);

  // Loading state while verifying
  if (screenState === "loading") {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" color="#3B82F6" testID="loading-indicator" />
        <Paragraph color="$gray11" marginTop="$4">
          Verifying your email...
        </Paragraph>
      </YStack>
    );
  }

  return (
    <YStack flex={1} justifyContent="center" padding="$4" backgroundColor="$background">
      <Card
        elevate
        size="$4"
        bordered
        paddingHorizontal="$4"
        paddingVertical="$6"
      >
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
              <Ionicons name="checkmark-circle-outline" size={40} color="#22C55E" />
            </YStack>
            <H2 fontWeight="bold" textAlign="center">Email Verified!</H2>
            <Paragraph color="$gray11" textAlign="center" paddingHorizontal="$2">
              Your email has been successfully verified. You can now access all features of your
              account.
            </Paragraph>

            <Button
              size="$4"
              theme="active"
              onPress={handleGoHome}
              width="100%"
              marginTop="$4"
              color="white"
              fontWeight="600"
              testID="go-home-button"
            >
              Continue to App
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
              <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            </YStack>
            <H2 fontWeight="bold" textAlign="center">Verification Failed</H2>
            <Paragraph color="$gray11" textAlign="center" paddingHorizontal="$2">
              {error || "This verification link is invalid or has expired."}
            </Paragraph>

            <YStack space="$3" width="100%" marginTop="$4">
              <Button
                size="$4"
                theme="active"
                onPress={() => setScreenState("resend")}
                color="white"
                fontWeight="600"
                testID="resend-verification-button"
              >
                Resend Verification Email
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

        {screenState === "resend" && (
          <YStack space="$4">
            {/* Header */}
            <YStack space="$2" alignItems="center" marginBottom="$2">
              <YStack
                width={64}
                height={64}
                borderRadius={32}
                backgroundColor="$blue3"
                alignItems="center"
                justifyContent="center"
                marginBottom="$2"
              >
                <Ionicons name="mail-outline" size={32} color="#3B82F6" />
              </YStack>
              <H2 fontWeight="bold">Verify Your Email</H2>
              <Paragraph color="$gray11" textAlign="center">
                Enter your email address to receive a verification link.
              </Paragraph>
            </YStack>

            {/* Success message */}
            {resendSuccess && (
              <Card
                backgroundColor="$green3"
                borderColor="$green7"
                borderWidth={1}
                padding="$3"
              >
                <Text color="$green11" fontSize="$3">
                  Verification email sent! Please check your inbox.
                </Text>
              </Card>
            )}

            {/* Error display */}
            {error && !resendSuccess && (
              <Card
                backgroundColor="$red3"
                borderColor="$red7"
                borderWidth={1}
                padding="$3"
              >
                <Text color="$red11" fontSize="$3">
                  {error}
                </Text>
              </Card>
            )}

            {/* Email input */}
            <YStack space="$3">
              <Input
                size="$4"
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={resendEmail}
                onChangeText={(text) => {
                  setResendEmail(text);
                  setError(null);
                  setResendSuccess(false);
                }}
                onSubmitEditing={handleResend}
                returnKeyType="send"
                testID="email-input"
              />
              <Button
                size="$4"
                theme="active"
                onPress={handleResend}
                disabled={isResending}
                icon={isResending
                  ? <ActivityIndicator size="small" color="white" />
                  : undefined}
                color="white"
                fontWeight="600"
                testID="send-verification-button"
              >
                Send Verification Email
              </Button>
            </YStack>

            {/* Back to sign in */}
            <Button
              size="$4"
              variant="outlined"
              onPress={handleGoToSignIn}
              marginTop="$2"
              testID="back-to-signin-link"
            >
              Back to Sign In
            </Button>
          </YStack>
        )}
      </Card>
    </YStack>
  );
}
