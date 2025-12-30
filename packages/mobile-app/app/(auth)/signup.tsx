/**
 * Sign Up Screen
 * Handles new user registration with email/password
 */

import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import {
  Button,
  Card,
  H2,
  Input,
  Label,
  Paragraph,
  Separator,
  Text,
  XStack,
  YStack,
} from "tamagui";

import { type AuthProvider } from "../../services";
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

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; }>();
  const { signInWithProvider, signUp, isLoading, error, clearError } = useAuthStore();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showReferralInput, setShowReferralInput] = useState(false);

  // Validation state
  const [passwordError, setPasswordError] = useState("");

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

  // Handle form submission
  const handleSignUp = useCallback(async () => {
    clearError();
    setPasswordError("");

    // Validate name
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    // Validate email
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.message);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    // Sign up
    const success = await signUp(
      email.trim(),
      password,
      name.trim(),
      referralCode.trim() || undefined,
    );

    if (success) {
      router.replace("/(tabs)");
    }
  }, [
    name,
    email,
    password,
    confirmPassword,
    referralCode,
    signUp,
    clearError,
    router,
  ]);

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
            {/* Header */}
            <YStack space="$2" alignItems="center" marginBottom="$4">
              <H2 fontWeight="bold">Create Account</H2>
              <Paragraph color="$gray11" textAlign="center">
                Join Spike Land to restore your photos
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
                    icon={isLoading
                      ? <ActivityIndicator size="small" />
                      : (
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
                  or sign up with email
                </Text>
                <Separator flex={1} />
              </XStack>

              {/* Form fields */}
              <YStack space="$3">
                {/* Name */}
                <YStack space="$1">
                  <Label htmlFor="name" fontSize="$2" color="$gray11">
                    Name
                  </Label>
                  <Input
                    id="name"
                    size="$4"
                    placeholder="Your name"
                    autoCapitalize="words"
                    autoComplete="name"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                  />
                </YStack>

                {/* Email */}
                <YStack space="$1">
                  <Label htmlFor="email" fontSize="$2" color="$gray11">
                    Email
                  </Label>
                  <Input
                    id="email"
                    size="$4"
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={email}
                    onChangeText={setEmail}
                    returnKeyType="next"
                  />
                </YStack>

                {/* Password */}
                <YStack space="$1">
                  <Label htmlFor="password" fontSize="$2" color="$gray11">
                    Password
                  </Label>
                  <Input
                    id="password"
                    size="$4"
                    placeholder="Create a password"
                    secureTextEntry
                    autoComplete="password-new"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError("");
                    }}
                    returnKeyType="next"
                  />
                  {passwordError
                    ? (
                      <Text color="$red10" fontSize="$2">
                        {passwordError}
                      </Text>
                    )
                    : (
                      <Text color="$gray10" fontSize="$1">
                        Min 8 chars with uppercase, lowercase, and number
                      </Text>
                    )}
                </YStack>

                {/* Confirm Password */}
                <YStack space="$1">
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
                    placeholder="Confirm your password"
                    secureTextEntry
                    autoComplete="password-new"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="next"
                  />
                </YStack>

                {/* Referral Code - collapsible */}
                <YStack space="$1">
                  {!showReferralInput
                    ? (
                      <Button
                        size="$3"
                        chromeless
                        onPress={() => setShowReferralInput(true)}
                        alignSelf="flex-start"
                      >
                        <Text color="$blue10" fontSize="$2">
                          Have a referral code?
                        </Text>
                      </Button>
                    )
                    : (
                      <>
                        <Label
                          htmlFor="referralCode"
                          fontSize="$2"
                          color="$gray11"
                        >
                          Referral Code (optional)
                        </Label>
                        <Input
                          id="referralCode"
                          size="$4"
                          placeholder="Enter referral code"
                          autoCapitalize="characters"
                          value={referralCode}
                          onChangeText={setReferralCode}
                          returnKeyType="done"
                        />
                      </>
                    )}
                </YStack>

                {/* Submit button */}
                <Button
                  size="$4"
                  theme="active"
                  onPress={handleSignUp}
                  disabled={isLoading}
                  marginTop="$2"
                  icon={isLoading
                    ? <ActivityIndicator size="small" color="white" />
                    : undefined}
                >
                  <Text color="white" fontWeight="600">
                    Create Account
                  </Text>
                </Button>
              </YStack>

              {/* Sign in link */}
              <XStack justifyContent="center" space="$2" marginTop="$4">
                <Text color="$gray11">Already have an account?</Text>
                <Link href="/(auth)/signin" asChild>
                  <Text
                    color="$blue10"
                    fontWeight="600"
                    pressStyle={{ opacity: 0.7 }}
                  >
                    Sign in
                  </Text>
                </Link>
              </XStack>
            </YStack>

            {/* Footer */}
            <YStack alignItems="center" marginTop="$4" space="$2">
              <Paragraph color="$gray10" fontSize="$1" textAlign="center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </Paragraph>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
