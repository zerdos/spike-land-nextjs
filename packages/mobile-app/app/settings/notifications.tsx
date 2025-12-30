/**
 * Notifications Settings Screen
 * Manage email and push notification preferences
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, Alert } from "react-native";
import {
  Button,
  Card,
  H3,
  H4,
  Paragraph,
  ScrollView,
  Separator,
  Switch,
  Text,
  XStack,
  YStack,
} from "tamagui";

import { useAuthStore } from "../../stores";
import { useSettingsStore } from "../../stores/settings-store";

// ============================================================================
// Types
// ============================================================================

interface NotificationToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

// ============================================================================
// Components
// ============================================================================

function NotificationToggle({
  icon,
  iconColor,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: NotificationToggleProps) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start">
      <XStack space="$3" flex={1} marginRight="$4">
        <YStack paddingTop="$1">
          <Ionicons name={icon} size={24} color={iconColor} />
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="500">
            {title}
          </Text>
          <Paragraph color="$gray10" fontSize="$2" marginTop="$1">
            {description}
          </Paragraph>
        </YStack>
      </XStack>
      <Switch
        checked={value}
        onCheckedChange={onValueChange}
        disabled={disabled}
      />
    </XStack>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const {
    notifications,
    isSavingPreferences,
    preferencesError,
    updateNotificationPreference,
    initialize,
  } = useSettingsStore();

  // Initialize settings on mount
  useEffect(() => {
    if (isAuthenticated) {
      initialize();
    }
  }, [isAuthenticated, initialize]);

  // Handle toggle changes
  const handleEmailNotificationsChange = useCallback(
    async (value: boolean) => {
      await updateNotificationPreference("emailNotifications", value);
    },
    [updateNotificationPreference],
  );

  const handlePushNotificationsChange = useCallback(
    async (value: boolean) => {
      await updateNotificationPreference("pushNotifications", value);
    },
    [updateNotificationPreference],
  );

  const handleEnhancementCompleteChange = useCallback(
    async (value: boolean) => {
      await updateNotificationPreference(
        "enhancementCompleteNotifications",
        value,
      );
    },
    [updateNotificationPreference],
  );

  const handleMarketingNotificationsChange = useCallback(
    async (value: boolean) => {
      await updateNotificationPreference("marketingNotifications", value);
    },
    [updateNotificationPreference],
  );

  // Show error alert
  useEffect(() => {
    if (preferencesError) {
      Alert.alert("Error", preferencesError);
    }
  }, [preferencesError]);

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
  if (!isAuthenticated) {
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
            Please sign in to manage your notification preferences
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
        <YStack marginBottom="$4">
          <XStack alignItems="center" space="$3">
            <Button
              size="$3"
              circular
              chromeless
              onPress={() => router.back()}
              icon={<Ionicons name="arrow-back" size={24} color="#666" />}
            />
            <H3>Notifications</H3>
          </XStack>
          <Paragraph color="$gray11" marginTop="$2" marginLeft="$6">
            Choose how you want to be notified about activity
          </Paragraph>
        </YStack>

        {/* Communication Preferences */}
        <Card elevate size="$4" bordered marginBottom="$4">
          <YStack padding="$4" space="$4">
            <H4>Communication</H4>

            <NotificationToggle
              icon="mail-outline"
              iconColor="#3B82F6"
              title="Email Notifications"
              description="Receive email updates about your account activity, including enhancement completions and important updates."
              value={notifications.emailNotifications}
              onValueChange={handleEmailNotificationsChange}
              disabled={isSavingPreferences}
            />

            <Separator />

            <NotificationToggle
              icon="notifications-outline"
              iconColor="#8B5CF6"
              title="Push Notifications"
              description="Get instant push notifications on your device for real-time updates."
              value={notifications.pushNotifications}
              onValueChange={handlePushNotificationsChange}
              disabled={isSavingPreferences}
            />
          </YStack>
        </Card>

        {/* Activity Notifications */}
        <Card elevate size="$4" bordered marginBottom="$4">
          <YStack padding="$4" space="$4">
            <H4>Activity</H4>

            <NotificationToggle
              icon="sparkles-outline"
              iconColor="#F59E0B"
              title="Enhancement Complete"
              description="Get notified when your image enhancements are ready to download."
              value={notifications.enhancementCompleteNotifications}
              onValueChange={handleEnhancementCompleteChange}
              disabled={isSavingPreferences}
            />
          </YStack>
        </Card>

        {/* Marketing Preferences */}
        <Card elevate size="$4" bordered marginBottom="$4">
          <YStack padding="$4" space="$4">
            <H4>Marketing</H4>

            <NotificationToggle
              icon="megaphone-outline"
              iconColor="#22C55E"
              title="Marketing & Promotions"
              description="Receive updates about new features, special offers, and promotional content."
              value={notifications.marketingNotifications}
              onValueChange={handleMarketingNotificationsChange}
              disabled={isSavingPreferences}
            />

            <XStack
              backgroundColor="$gray3"
              padding="$3"
              borderRadius="$3"
              space="$2"
              alignItems="flex-start"
            >
              <Ionicons name="information-circle" size={20} color="#666" />
              <Text fontSize="$2" color="$gray11" flex={1}>
                You can unsubscribe from marketing emails at any time using the link at the bottom
                of each email.
              </Text>
            </XStack>
          </YStack>
        </Card>

        {/* Notification Channels Info */}
        <Card elevate size="$4" bordered marginBottom="$4">
          <YStack padding="$4" space="$3">
            <H4>Notification Channels</H4>
            <Paragraph color="$gray11" fontSize="$2">
              We use the following channels to keep you informed:
            </Paragraph>

            <XStack space="$2" alignItems="flex-start">
              <Ionicons name="mail" size={18} color="#3B82F6" />
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="500">
                  Email
                </Text>
                <Text fontSize="$2" color="$gray10">
                  Important updates and summaries
                </Text>
              </YStack>
            </XStack>

            <XStack space="$2" alignItems="flex-start">
              <Ionicons name="phone-portrait" size={18} color="#8B5CF6" />
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="500">
                  Push Notifications
                </Text>
                <Text fontSize="$2" color="$gray10">
                  Real-time alerts on your device
                </Text>
              </YStack>
            </XStack>

            <XStack space="$2" alignItems="flex-start">
              <Ionicons name="chatbubble" size={18} color="#22C55E" />
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="500">
                  In-App Messages
                </Text>
                <Text fontSize="$2" color="$gray10">
                  Important notices within the app
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </Card>

        {/* Saving indicator */}
        {isSavingPreferences && (
          <XStack
            position="absolute"
            top="$4"
            right="$4"
            space="$2"
            alignItems="center"
            backgroundColor="$background"
            padding="$2"
            borderRadius="$2"
          >
            <ActivityIndicator size="small" />
            <Text fontSize="$2" color="$gray11">
              Saving...
            </Text>
          </XStack>
        )}
      </YStack>
    </ScrollView>
  );
}
