/**
 * Forgot Password Screen
 * Handles password reset request via email
 */

import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button, Card, H2, Input, Paragraph, Text, XStack, YStack } from "tamagui";

import { authService } from "../../services";

type ScreenState = "form" | "success";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("form");

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Validate email
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await authService.requestPasswordReset(email.trim());

    setIsLoading(false);

    if (result.success) {
      setScreenState("success");
    } else {
      setError(result.error || "Failed to send reset email");
    }
  }, [email]);

  // Handle back to sign in
  const handleBackToSignIn = useCallback(() => {
    router.replace("/(auth)/signin");
  }, [router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack flex={1} justifyContent="center" padding="$4" backgroundColor="$background">
          <Card
            elevate
            size="$4"
            bordered
            paddingHorizontal="$4"
            paddingVertical="$6"
          >
            {screenState === "form"
              ? (
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
                      <Ionicons name="key-outline" size={32} color="#3B82F6" />
                    </YStack>
                    <H2 fontWeight="bold">Forgot Password?</H2>
                    <Paragraph color="$gray11" textAlign="center">
                      Enter your email address and we'll send you a link to reset your password.
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
                    {/* Email input */}
                    <YStack space="$3">
                      <Input
                        size="$4"
                        placeholder="Email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          setError(null);
                        }}
                        onSubmitEditing={handleSubmit}
                        returnKeyType="send"
                        testID="email-input"
                      />
                      <Button
                        size="$4"
                        theme="active"
                        onPress={handleSubmit}
                        disabled={isLoading}
                        icon={isLoading
                          ? <ActivityIndicator size="small" color="white" />
                          : undefined}
                        color="white"
                        fontWeight="600"
                        testID="submit-button"
                      >
                        Send Reset Link
                      </Button>
                    </YStack>

                    {/* Back to sign in link */}
                    <XStack justifyContent="center" space="$2" marginTop="$4">
                      <Ionicons name="arrow-back" size={16} color="#6B7280" />
                      <Link href="/(auth)/signin" asChild>
                        <Text color="$blue10" fontWeight="600" pressStyle={{ opacity: 0.7 }}>
                          Back to Sign In
                        </Text>
                      </Link>
                    </XStack>
                  </YStack>
                </>
              )
              : (
                <>
                  {/* Success state */}
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
                      <Ionicons name="mail-outline" size={40} color="#22C55E" />
                    </YStack>
                    <H2 fontWeight="bold" textAlign="center">Check Your Email</H2>
                    <Paragraph color="$gray11" textAlign="center" paddingHorizontal="$2">
                      We've sent a password reset link to{" "}
                      <Text fontWeight="600" color="$gray12">{email}</Text>. Please check your inbox
                      and follow the instructions.
                    </Paragraph>

                    <YStack space="$3" width="100%" marginTop="$4">
                      <Button
                        size="$4"
                        theme="active"
                        onPress={handleBackToSignIn}
                        color="white"
                        fontWeight="600"
                        testID="back-to-signin-button"
                      >
                        Back to Sign In
                      </Button>

                      <Paragraph color="$gray10" fontSize="$2" textAlign="center">
                        Didn't receive the email? Check your spam folder or{" "}
                        <Text
                          color="$blue10"
                          fontWeight="500"
                          pressStyle={{ opacity: 0.7 }}
                          onPress={() => {
                            setScreenState("form");
                            setError(null);
                          }}
                          testID="try-again-link"
                        >
                          try again
                        </Text>
                        .
                      </Paragraph>
                    </YStack>
                  </YStack>
                </>
              )}
          </Card>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
