/**
 * Sign In Screen
 * Handles OAuth and email/password authentication
 */

import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button, Card, H2, Input, Paragraph, Separator, Text, XStack, YStack } from "tamagui";

import { type AuthProvider, authService } from "../../services";
import { useAuthStore } from "../../stores";

// OAuth provider configuration
const OAUTH_PROVIDERS: Array<{
  id: AuthProvider;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  { id: "google", name: "Google", icon: "logo-google", color: "#4285F4" },
  { id: "apple", name: "Apple", icon: "logo-apple", color: "#000000" },
  { id: "github", name: "GitHub", icon: "logo-github", color: "#24292F" },
];

// Email step flow
type AuthStep = "email" | "password";

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithProvider, signInWithCredentials, isLoading, error, clearError } =
    useAuthStore();

  // Form state
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [_emailInfo, setEmailInfo] = useState<
    {
      exists: boolean;
      hasPassword: boolean;
      providers: string[];
    } | null
  >(null);

  // Handle OAuth sign in
  const handleOAuthSignIn = useCallback(
    async (provider: AuthProvider) => {
      clearError();
      const success = await signInWithProvider(provider);
      if (success) {
        router.replace("/(tabs)");
      }
    },
    [signInWithProvider, clearError, router],
  );

  // Handle email continue
  const handleEmailContinue = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setEmailCheckLoading(true);
    clearError();

    try {
      const result = await authService.checkEmail(email.trim());
      setEmailInfo(result);

      if (result.exists && result.hasPassword) {
        // User exists with password, show password input
        setStep("password");
      } else if (result.exists && result.providers.length > 0) {
        // User exists but uses OAuth
        Alert.alert(
          "Account Found",
          `This account uses ${
            result.providers.join(", ")
          } to sign in. Please use that method instead.`,
        );
      } else {
        // New user - redirect to signup
        router.push({
          pathname: "/(auth)/signup",
          params: { email: email.trim() },
        });
      }
    } catch {
      Alert.alert("Error", "Failed to check email. Please try again.");
    } finally {
      setEmailCheckLoading(false);
    }
  }, [email, clearError, router]);

  // Handle password sign in
  const handlePasswordSignIn = useCallback(async () => {
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    clearError();
    const success = await signInWithCredentials(email.trim(), password);

    if (success) {
      router.replace("/(tabs)");
    } else {
      // Error is set in the store
    }
  }, [email, password, signInWithCredentials, clearError, router]);

  // Go back to email step
  const handleBackToEmail = useCallback(() => {
    setStep("email");
    setPassword("");
    setEmailInfo(null);
    clearError();
  }, [clearError]);

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
            {/* Header */}
            <YStack space="$2" alignItems="center" marginBottom="$6">
              <H2 fontWeight="bold">Welcome to Spike Land</H2>
              <Paragraph color="$gray11" textAlign="center">
                {step === "email"
                  ? "Sign in to restore your photos"
                  : `Signing in as ${email}`}
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

            {step === "email"
              ? (
                <YStack space="$4">
                  {/* OAuth buttons */}
                  <YStack space="$3">
                    {OAUTH_PROVIDERS.map((provider) => (
                      <Button
                        key={provider.id}
                        size="$4"
                        backgroundColor="$gray2"
                        borderColor="$gray6"
                        borderWidth={1}
                        pressStyle={{ backgroundColor: "$gray4" }}
                        onPress={() => handleOAuthSignIn(provider.id)}
                        disabled={isLoading}
                        icon={isLoading ? <ActivityIndicator size="small" /> : (
                          <Ionicons
                            name={provider.icon}
                            size={20}
                            color={provider.color}
                          />
                        )}
                      >
                        <Text fontWeight="500">Continue with {provider.name}</Text>
                      </Button>
                    ))}
                  </YStack>

                  {/* Divider */}
                  <XStack alignItems="center" space="$3" marginVertical="$2">
                    <Separator flex={1} />
                    <Text color="$gray10" fontSize="$2">
                      or
                    </Text>
                    <Separator flex={1} />
                  </XStack>

                  {/* Email input */}
                  <YStack space="$3">
                    <Input
                      size="$4"
                      placeholder="Email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      value={email}
                      onChangeText={setEmail}
                      onSubmitEditing={handleEmailContinue}
                      returnKeyType="next"
                    />
                    <Button
                      size="$4"
                      theme="active"
                      onPress={handleEmailContinue}
                      disabled={isLoading || emailCheckLoading}
                      icon={emailCheckLoading
                        ? <ActivityIndicator size="small" color="white" />
                        : undefined}
                    >
                      <Text color="white" fontWeight="600">
                        Continue
                      </Text>
                    </Button>
                  </YStack>

                  {/* Sign up link */}
                  <XStack justifyContent="center" space="$2" marginTop="$4">
                    <Text color="$gray11">Don't have an account?</Text>
                    <Link href="/(auth)/signup" asChild>
                      <Text color="$blue10" fontWeight="600" pressStyle={{ opacity: 0.7 }}>
                        Sign up
                      </Text>
                    </Link>
                  </XStack>
                </YStack>
              )
              : (
                <YStack space="$4">
                  {/* Back button */}
                  <Button
                    size="$3"
                    chromeless
                    onPress={handleBackToEmail}
                    icon={<Ionicons name="arrow-back" size={18} color="#666" />}
                    alignSelf="flex-start"
                  >
                    <Text color="$gray11">Change email</Text>
                  </Button>

                  {/* Password input */}
                  <YStack space="$3">
                    <Input
                      size="$4"
                      placeholder="Password"
                      secureTextEntry
                      autoComplete="password"
                      value={password}
                      onChangeText={setPassword}
                      onSubmitEditing={handlePasswordSignIn}
                      returnKeyType="done"
                      autoFocus
                    />
                    <Button
                      size="$4"
                      theme="active"
                      onPress={handlePasswordSignIn}
                      disabled={isLoading}
                      icon={isLoading
                        ? <ActivityIndicator size="small" color="white" />
                        : undefined}
                    >
                      <Text color="white" fontWeight="600">
                        Sign In
                      </Text>
                    </Button>
                  </YStack>

                  {/* Forgot password - placeholder for future */}
                  <XStack justifyContent="center" marginTop="$2">
                    <Text color="$blue10" fontWeight="500" pressStyle={{ opacity: 0.7 }}>
                      Forgot password?
                    </Text>
                  </XStack>
                </YStack>
              )}

            {/* Footer */}
            <YStack alignItems="center" marginTop="$6" space="$2">
              <Paragraph color="$gray10" fontSize="$1" textAlign="center">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </Paragraph>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
