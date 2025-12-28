/**
 * Admin Layout
 *
 * Protected admin area layout with role check and navigation.
 * Only users with ADMIN or SUPER_ADMIN role can access.
 */

import { Redirect, Stack, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Text, YStack } from "tamagui";
import { useAuthStore } from "../../stores";

export default function AdminLayout() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
        <Text marginTop="$4" color="$gray10">
          Checking permissions...
        </Text>
      </View>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Redirect href="/(tabs)" />;
  }

  // Check if user has admin role
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  if (!isAdmin) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontSize="$6" fontWeight="bold" color="$red10" marginBottom="$2">
          Access Denied
        </Text>
        <Text color="$gray11" textAlign="center" marginBottom="$4">
          You don't have permission to access the admin dashboard.
        </Text>
        <Text
          color="$blue10"
          onPress={() => router.replace("/(tabs)")}
          textDecorationLine="underline"
        >
          Go back to Home
        </Text>
      </YStack>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#18181b",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Admin Dashboard",
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="users/index"
        options={{
          title: "User Management",
        }}
      />
      <Stack.Screen
        name="users/[userId]"
        options={{
          title: "User Details",
        }}
      />
      <Stack.Screen
        name="jobs/index"
        options={{
          title: "Job Queue",
        }}
      />
      <Stack.Screen
        name="vouchers/index"
        options={{
          title: "Vouchers",
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          title: "Analytics",
        }}
      />
    </Stack>
  );
}
