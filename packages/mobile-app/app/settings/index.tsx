/**
 * Settings Screen
 * Main settings hub with navigation to sub-screens and quick toggles
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, Alert } from "react-native";
import {
  Avatar,
  Button,
  Card,
  H3,
  Paragraph,
  ScrollView,
  Separator,
  Text,
  XStack,
  YStack,
} from "tamagui";

import { useAuthStore, useTokenStore } from "../../stores";
import { useSettingsStore } from "../../stores/settings-store";

// ============================================================================
// Types
// ============================================================================

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

interface SectionHeaderProps {
  title: string;
}

// ============================================================================
// Components
// ============================================================================

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Text
      fontSize="$2"
      fontWeight="600"
      color="$gray10"
      textTransform="uppercase"
      letterSpacing={1}
      marginBottom="$2"
      marginTop="$4"
      marginLeft="$1"
    >
      {title}
    </Text>
  );
}

function SettingsRow({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightElement,
}: SettingsRowProps) {
  return (
    <Button
      size="$5"
      chromeless
      onPress={onPress}
      paddingHorizontal="$3"
      paddingVertical="$3"
      justifyContent="flex-start"
    >
      <XStack flex={1} alignItems="center" space="$3">
        <YStack
          width={36}
          height={36}
          borderRadius="$3"
          backgroundColor={`${iconColor}20`}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="500">
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="$2" color="$gray10">
              {subtitle}
            </Text>
          )}
        </YStack>
        {rightElement}
        {showChevron && <Ionicons name="chevron-forward" size={20} color="#999" />}
      </XStack>
    </Button>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, signOut } = useAuthStore();
  const { balance, isLoading: isTokenLoading, fetchBalance } = useTokenStore();
  const { apiKeys, fetchApiKeys, initialize } = useSettingsStore();

  // Initialize on mount
  useEffect(() => {
    if (isAuthenticated) {
      initialize();
      fetchApiKeys();
      fetchBalance();
    }
  }, [isAuthenticated, initialize, fetchApiKeys, fetchBalance]);

  // Get user initials
  const getUserInitials = (name?: string | null): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle sign out
  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
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

  // Loading state
  if (isAuthLoading) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <ActivityIndicator size="large" />
      </YStack>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        padding="$4"
        backgroundColor="$background"
      >
        <Card elevate size="$4" bordered padding="$6" alignItems="center">
          <Ionicons name="lock-closed-outline" size={64} color="#999" />
          <H3 marginTop="$4" textAlign="center">
            Sign in required
          </H3>
          <Paragraph color="$gray11" textAlign="center" marginTop="$2">
            Please sign in to access your settings
          </Paragraph>
          <Button
            size="$4"
            theme="active"
            onPress={() => router.push("/(auth)/signin")}
            marginTop="$6"
            width="100%"
          >
            <Text color="white" fontWeight="600">
              Sign In
            </Text>
          </Button>
        </Card>
      </YStack>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <YStack flex={1} padding="$4" backgroundColor="$background">
        {/* Header */}
        <YStack marginBottom="$2">
          <XStack alignItems="center" space="$3">
            <Button
              size="$3"
              circular
              chromeless
              onPress={() => router.back()}
              icon={<Ionicons name="arrow-back" size={24} color="#666" />}
            />
            <H3>Settings</H3>
          </XStack>
        </YStack>

        {/* User Profile Card */}
        <Card elevate size="$4" bordered marginTop="$3">
          <YStack padding="$4">
            <XStack space="$4" alignItems="center">
              <Avatar circular size="$6">
                {user.image
                  ? <Avatar.Image source={{ uri: user.image }} />
                  : (
                    <Avatar.Fallback backgroundColor="$blue10">
                      <Text color="white" fontSize="$5" fontWeight="bold">
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

            {/* Token Balance */}
            <XStack
              marginTop="$4"
              padding="$3"
              backgroundColor="$gray2"
              borderRadius="$3"
              justifyContent="space-between"
              alignItems="center"
            >
              <XStack space="$2" alignItems="center">
                <Ionicons name="sparkles" size={20} color="#F59E0B" />
                <Text fontSize="$3" color="$gray11">
                  Token Balance
                </Text>
              </XStack>
              {isTokenLoading
                ? <ActivityIndicator size="small" />
                : (
                  <Text fontSize="$4" fontWeight="bold" color="$blue10">
                    {balance?.toLocaleString() ?? 0}
                  </Text>
                )}
            </XStack>
          </YStack>
        </Card>

        {/* Account Section */}
        <SectionHeader title="Account" />
        <Card elevate size="$4" bordered>
          <YStack>
            <SettingsRow
              icon="person-outline"
              iconColor="#3B82F6"
              title="Profile"
              subtitle="Edit your profile information"
              onPress={() => router.push("/settings?tab=profile" as unknown as string)}
            />
            <Separator marginHorizontal="$3" />
            <SettingsRow
              icon="key-outline"
              iconColor="#8B5CF6"
              title="API Keys"
              subtitle={`${apiKeys.length} key${apiKeys.length !== 1 ? "s" : ""} configured`}
              onPress={() => router.push("/settings/api-keys")}
            />
            <Separator marginHorizontal="$3" />
            <SettingsRow
              icon="wallet-outline"
              iconColor="#F59E0B"
              title="Tokens & Billing"
              subtitle="Manage tokens and payment methods"
              onPress={() => router.push("/tokens")}
            />
          </YStack>
        </Card>

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <Card elevate size="$4" bordered>
          <YStack>
            <SettingsRow
              icon="notifications-outline"
              iconColor="#22C55E"
              title="Notifications"
              subtitle="Email and push notification settings"
              onPress={() => router.push("/settings/notifications")}
            />
            <Separator marginHorizontal="$3" />
            <SettingsRow
              icon="color-palette-outline"
              iconColor="#EC4899"
              title="Appearance"
              subtitle="Theme and display preferences"
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Appearance settings are coming soon!",
                )}
            />
            <Separator marginHorizontal="$3" />
            <SettingsRow
              icon="language-outline"
              iconColor="#06B6D4"
              title="Language"
              subtitle="English (US)"
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Language settings are coming soon!",
                )}
            />
          </YStack>
        </Card>

        {/* Privacy Section */}
        <SectionHeader title="Privacy & Security" />
        <Card elevate size="$4" bordered>
          <YStack>
            <SettingsRow
              icon="shield-outline"
              iconColor="#EF4444"
              title="Privacy"
              subtitle="Profile visibility and data settings"
              onPress={() => router.push("/settings/privacy")}
            />
            <Separator marginHorizontal="$3" />
            <SettingsRow
              icon="lock-closed-outline"
              iconColor="#6366F1"
              title="Security"
              subtitle="Password and authentication"
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Security settings are coming soon!",
                )}
            />
          </YStack>
        </Card>

        {/* Support Section */}
        <SectionHeader title="Support" />
        <Card elevate size="$4" bordered>
          <YStack>
            <SettingsRow
              icon="help-circle-outline"
              iconColor="#0EA5E9"
              title="Help Center"
              subtitle="FAQs and documentation"
              onPress={() => Alert.alert("Coming Soon", "Help center is coming soon!")}
            />
            <Separator marginHorizontal="$3" />
            <SettingsRow
              icon="chatbubble-outline"
              iconColor="#14B8A6"
              title="Contact Support"
              subtitle="Get help from our team"
              onPress={() => Alert.alert("Coming Soon", "Contact support is coming soon!")}
            />
            <Separator marginHorizontal="$3" />
            <SettingsRow
              icon="document-text-outline"
              iconColor="#64748B"
              title="Terms & Privacy"
              subtitle="Legal information"
              onPress={() => Alert.alert("Coming Soon", "Legal documents are coming soon!")}
            />
          </YStack>
        </Card>

        {/* Sign Out */}
        <Card elevate size="$4" bordered marginTop="$4">
          <Button size="$5" chromeless onPress={handleSignOut}>
            <XStack
              flex={1}
              space="$3"
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text color="$red10" fontWeight="500" fontSize="$4">
                Sign Out
              </Text>
            </XStack>
          </Button>
        </Card>

        {/* App Version */}
        <YStack alignItems="center" padding="$4" marginTop="$2">
          <Text color="$gray10" fontSize="$2">
            Spike Land Mobile v1.0.0
          </Text>
          <Text color="$gray9" fontSize="$1" marginTop="$1">
            Made with love in the UK
          </Text>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
