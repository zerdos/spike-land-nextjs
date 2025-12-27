/**
 * Profile Screen
 * Displays user info and provides access to settings
 */

import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { Avatar, Button, Card, H3, Paragraph, Separator, Text, XStack, YStack } from "tamagui";

import { useAuthStore, useTokenStore } from "../../stores";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore();
  const { balance, isLoading: isTokenLoading } = useTokenStore();

  // Handle sign out
  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/signin");
          },
        },
      ],
      { cancelable: true },
    );
  }, [signOut, router]);

  // Handle sign in navigation
  const handleSignIn = useCallback(() => {
    router.push("/(auth)/signin");
  }, [router]);

  // Get user initials for avatar fallback
  const getUserInitials = (name?: string | null): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Loading state
  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <ActivityIndicator size="large" />
        <Text marginTop="$4" color="$gray11">
          Loading...
        </Text>
      </YStack>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <YStack flex={1} justifyContent="center" padding="$4" backgroundColor="$background">
        <Card elevate size="$4" bordered padding="$6" alignItems="center">
          <Ionicons name="person-circle-outline" size={80} color="#999" />
          <H3 marginTop="$4" textAlign="center">
            Sign in to your account
          </H3>
          <Paragraph color="$gray11" textAlign="center" marginTop="$2">
            Access your photos, settings, and more
          </Paragraph>
          <Button
            size="$4"
            theme="active"
            onPress={handleSignIn}
            marginTop="$6"
            width="100%"
          >
            <Text color="white" fontWeight="600">
              Sign In
            </Text>
          </Button>
          <Link href="/(auth)/signup" asChild>
            <Button size="$4" chromeless marginTop="$2" width="100%">
              <Text color="$blue10" fontWeight="500">
                Create Account
              </Text>
            </Button>
          </Link>
        </Card>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* User Info Card */}
      <Card margin="$4" elevate size="$4" bordered>
        <XStack padding="$4" space="$4" alignItems="center">
          <Avatar circular size="$8">
            {user.image
              ? <Avatar.Image source={{ uri: user.image }} />
              : (
                <Avatar.Fallback backgroundColor="$blue10">
                  <Text color="white" fontSize="$6" fontWeight="bold">
                    {getUserInitials(user.name)}
                  </Text>
                </Avatar.Fallback>
              )}
          </Avatar>
          <YStack flex={1}>
            <Text fontSize="$5" fontWeight="bold">
              {user.name || "User"}
            </Text>
            <Text fontSize="$3" color="$gray11">
              {user.email}
            </Text>
          </YStack>
        </XStack>
      </Card>

      {/* Token Balance Card */}
      <Card marginHorizontal="$4" marginBottom="$4" elevate size="$4" bordered>
        <YStack padding="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <XStack space="$2" alignItems="center">
              <Ionicons name="sparkles" size={24} color="#F59E0B" />
              <Text fontSize="$4" fontWeight="600">
                Token Balance
              </Text>
            </XStack>
            {isTokenLoading
              ? <ActivityIndicator size="small" />
              : (
                <Text fontSize="$5" fontWeight="bold" color="$blue10">
                  {balance?.toLocaleString() ?? 0}
                </Text>
              )}
          </XStack>
          <Separator marginVertical="$3" />
          <Link href="/settings" asChild>
            <Button size="$3" chromeless alignSelf="flex-start">
              <XStack space="$2" alignItems="center">
                <Text color="$blue10">Manage tokens</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </XStack>
            </Button>
          </Link>
        </YStack>
      </Card>

      {/* Menu Items */}
      <Card marginHorizontal="$4" marginBottom="$4" elevate size="$4" bordered>
        <YStack>
          {/* Settings */}
          <Link href="/settings" asChild>
            <XStack
              padding="$4"
              space="$3"
              alignItems="center"
              pressStyle={{ backgroundColor: "$gray3" }}
            >
              <Ionicons name="settings-outline" size={24} color="#666" />
              <Text flex={1} fontSize="$4">
                Settings
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </XStack>
          </Link>
          <Separator marginHorizontal="$4" />

          {/* API Keys */}
          <Link href="/settings?tab=api-keys" asChild>
            <XStack
              padding="$4"
              space="$3"
              alignItems="center"
              pressStyle={{ backgroundColor: "$gray3" }}
            >
              <Ionicons name="key-outline" size={24} color="#666" />
              <Text flex={1} fontSize="$4">
                API Keys
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </XStack>
          </Link>
          <Separator marginHorizontal="$4" />

          {/* Help & Support */}
          <XStack
            padding="$4"
            space="$3"
            alignItems="center"
            pressStyle={{ backgroundColor: "$gray3" }}
          >
            <Ionicons name="help-circle-outline" size={24} color="#666" />
            <Text flex={1} fontSize="$4">
              Help & Support
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </XStack>
          <Separator marginHorizontal="$4" />

          {/* About */}
          <XStack
            padding="$4"
            space="$3"
            alignItems="center"
            pressStyle={{ backgroundColor: "$gray3" }}
          >
            <Ionicons name="information-circle-outline" size={24} color="#666" />
            <Text flex={1} fontSize="$4">
              About
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </XStack>
        </YStack>
      </Card>

      {/* Sign Out Button */}
      <Card marginHorizontal="$4" elevate size="$4" bordered>
        <Button
          size="$4"
          chromeless
          onPress={handleSignOut}
          icon={<Ionicons name="log-out-outline" size={20} color="#EF4444" />}
        >
          <Text color="$red10" fontWeight="500">
            Sign Out
          </Text>
        </Button>
      </Card>

      {/* App Version */}
      <YStack alignItems="center" padding="$4" marginTop="auto">
        <Text color="$gray10" fontSize="$2">
          Spike Land v1.0.0
        </Text>
      </YStack>
    </YStack>
  );
}
