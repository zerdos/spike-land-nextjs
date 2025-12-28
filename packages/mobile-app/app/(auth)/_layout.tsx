/**
 * Auth Stack Layout
 * Handles authentication flow screens with a dedicated stack navigator
 */

import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Stack.Screen
        name="signin"
        options={{
          title: "Sign In",
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: "Sign Up",
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Forgot Password",
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: "Reset Password",
        }}
      />
      <Stack.Screen
        name="verify-email"
        options={{
          title: "Verify Email",
        }}
      />
    </Stack>
  );
}
