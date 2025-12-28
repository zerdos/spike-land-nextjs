/**
 * NotificationItem Component
 * Individual notification display with icon, content, and swipe-to-dismiss
 */

import { Bell, CheckCircle, Coins, Megaphone, Trash2 } from "@tamagui/lucide-icons";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Stack, Text, XStack, YStack } from "tamagui";
import type { NotificationType, ServerNotification } from "../services/notifications";

// ============================================================================
// Types
// ============================================================================

export interface NotificationItemProps {
  notification: ServerNotification;
  onPress?: (notification: ServerNotification) => void;
  onDismiss?: (notification: ServerNotification) => void;
  testID?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const SWIPE_THRESHOLD = -100;
const DELETE_THRESHOLD = -150;

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "enhancement_complete":
      return <CheckCircle size={24} color="$green10" />;
    case "token_low":
      return <Coins size={24} color="$yellow10" />;
    case "marketing":
      return <Megaphone size={24} color="$blue10" />;
    default:
      return <Bell size={24} color="$gray10" />;
  }
}

function getNotificationIconBackground(type: NotificationType): string {
  switch (type) {
    case "enhancement_complete":
      return "$green4";
    case "token_low":
      return "$yellow4";
    case "marketing":
      return "$blue4";
    default:
      return "$gray4";
  }
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

// ============================================================================
// Component
// ============================================================================

export function NotificationItem({
  notification,
  onPress,
  onDismiss,
  testID,
}: NotificationItemProps) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(80);
  const opacity = useSharedValue(1);

  const handlePress = useCallback(() => {
    onPress?.(notification);
  }, [notification, onPress]);

  const handleDismiss = useCallback(() => {
    onDismiss?.(notification);
  }, [notification, onDismiss]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow swiping left
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < DELETE_THRESHOLD) {
        // Delete the item
        translateX.value = withTiming(-500, { duration: 200 });
        itemHeight.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(handleDismiss)();
        });
      } else {
        // Snap back
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: itemHeight.value,
    opacity: opacity.value,
  }));

  const deleteBackgroundStyle = useAnimatedStyle(() => {
    const showDelete = translateX.value < SWIPE_THRESHOLD;
    return {
      opacity: showDelete ? 1 : 0,
    };
  });

  const formattedTime = useMemo(
    () => formatTimestamp(notification.createdAt),
    [notification.createdAt],
  );

  const iconBackground = useMemo(
    () => getNotificationIconBackground(notification.type),
    [notification.type],
  );

  return (
    <GestureHandlerRootView>
      <Animated.View style={containerAnimatedStyle} testID={testID}>
        <Stack flex={1} position="relative">
          {/* Delete Background */}
          <Animated.View style={[styles.deleteBackground, deleteBackgroundStyle]}>
            <Stack
              flex={1}
              backgroundColor="$red9"
              justifyContent="center"
              alignItems="flex-end"
              paddingRight="$4"
            >
              <Trash2 size={24} color="white" />
            </Stack>
          </Animated.View>

          {/* Main Content */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.content, animatedStyle]}>
              <Pressable
                onPress={handlePress}
                style={styles.pressable}
                testID={testID ? `${testID}-pressable` : undefined}
              >
                <XStack
                  flex={1}
                  backgroundColor="$background"
                  padding="$3"
                  gap="$3"
                  alignItems="center"
                  borderBottomWidth={1}
                  borderBottomColor="$gray4"
                >
                  {/* Unread Indicator */}
                  {!notification.read && (
                    <Stack
                      width={8}
                      height={8}
                      borderRadius={4}
                      backgroundColor="$blue9"
                      testID={testID ? `${testID}-unread-indicator` : undefined}
                    />
                  )}
                  {notification.read && <Stack width={8} />}

                  {/* Icon */}
                  <Stack
                    width={48}
                    height={48}
                    borderRadius={24}
                    backgroundColor={iconBackground}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {getNotificationIcon(notification.type)}
                  </Stack>

                  {/* Content */}
                  <YStack flex={1} gap="$1">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text
                        fontSize="$4"
                        fontWeight={notification.read ? "400" : "600"}
                        color="$gray12"
                        numberOfLines={1}
                        flex={1}
                      >
                        {notification.title}
                      </Text>
                      <Text
                        fontSize="$2"
                        color="$gray9"
                        marginLeft="$2"
                        testID={testID ? `${testID}-timestamp` : undefined}
                      >
                        {formattedTime}
                      </Text>
                    </XStack>
                    <Text
                      fontSize="$3"
                      color="$gray10"
                      numberOfLines={2}
                    >
                      {notification.body}
                    </Text>
                  </YStack>
                </XStack>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </Stack>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  pressable: {
    flex: 1,
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default NotificationItem;
