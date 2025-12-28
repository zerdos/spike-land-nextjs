/**
 * Notifications Screen
 * Displays list of user notifications with pull-to-refresh and mark all as read
 */

import { Bell, CheckCheck, Inbox } from "@tamagui/lucide-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack as ExpoStack } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, type ListRenderItemInfo, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Spinner, Stack, Text, XStack, YStack } from "tamagui";
import { NotificationItem } from "../components/NotificationItem";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type ServerNotification,
} from "../services/notifications";

// ============================================================================
// Types
// ============================================================================

interface NotificationsData {
  notifications: ServerNotification[];
  total: number;
  unreadCount: number;
}

// ============================================================================
// Screen Component
// ============================================================================

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch notifications
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<NotificationsData | null>({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousData = queryClient.getQueryData<NotificationsData>(["notifications"]);

      if (previousData) {
        queryClient.setQueryData<NotificationsData>(["notifications"], {
          ...previousData,
          unreadCount: Math.max(0, previousData.unreadCount - 1),
          notifications: previousData.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        });
      }

      return { previousData };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["notifications"], context.previousData);
      }
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousData = queryClient.getQueryData<NotificationsData>(["notifications"]);

      if (previousData) {
        queryClient.setQueryData<NotificationsData>(["notifications"], {
          ...previousData,
          unreadCount: 0,
          notifications: previousData.notifications.map((n) => ({ ...n, read: true })),
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["notifications"], context.previousData);
      }
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousData = queryClient.getQueryData<NotificationsData>(["notifications"]);

      if (previousData) {
        const notification = previousData.notifications.find((n) => n.id === notificationId);
        const wasUnread = notification && !notification.read;

        queryClient.setQueryData<NotificationsData>(["notifications"], {
          ...previousData,
          total: previousData.total - 1,
          unreadCount: wasUnread
            ? Math.max(0, previousData.unreadCount - 1)
            : previousData.unreadCount,
          notifications: previousData.notifications.filter((n) => n.id !== notificationId),
        });
      }

      return { previousData };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["notifications"], context.previousData);
      }
    },
  });

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // Handle notification press
  const handleNotificationPress = useCallback(
    (notification: ServerNotification) => {
      if (!notification.read) {
        markAsReadMutation.mutate(notification.id);
      }
      // Navigation is handled by the notification data
    },
    [markAsReadMutation],
  );

  // Handle notification dismiss
  const handleNotificationDismiss = useCallback(
    (notification: ServerNotification) => {
      deleteNotificationMutation.mutate(notification.id);
    },
    [deleteNotificationMutation],
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  // Check if there are unread notifications
  const hasUnread = useMemo(() => {
    return (data?.unreadCount ?? 0) > 0;
  }, [data?.unreadCount]);

  // Render notification item
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ServerNotification>) => (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        onDismiss={handleNotificationDismiss}
        testID={`notification-${index}`}
      />
    ),
    [handleNotificationPress, handleNotificationDismiss],
  );

  // Key extractor
  const keyExtractor = useCallback((item: ServerNotification) => item.id, []);

  // Empty state component
  const EmptyState = useMemo(
    () => (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$6"
        gap="$4"
        testID="empty-state"
      >
        <Stack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="$gray4"
          alignItems="center"
          justifyContent="center"
        >
          <Inbox size={40} color="$gray10" />
        </Stack>
        <YStack alignItems="center" gap="$2">
          <Text fontSize="$6" fontWeight="600" color="$gray12">
            No Notifications
          </Text>
          <Text
            fontSize="$4"
            color="$gray10"
            textAlign="center"
            maxWidth={280}
          >
            You're all caught up! We'll notify you when something important happens.
          </Text>
        </YStack>
      </YStack>
    ),
    [],
  );

  // Loading state
  if (isLoading && !data) {
    return (
      <>
        <ExpoStack.Screen
          options={{
            title: "Notifications",
            headerShown: true,
          }}
        />
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$background"
          testID="loading-state"
        >
          <Spinner size="large" color="$blue9" />
          <Text color="$gray10" marginTop="$4">
            Loading notifications...
          </Text>
        </YStack>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <ExpoStack.Screen
          options={{
            title: "Notifications",
            headerShown: true,
          }}
        />
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$background"
          padding="$6"
          testID="error-state"
        >
          <Stack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="$red4"
            alignItems="center"
            justifyContent="center"
          >
            <Bell size={40} color="$red10" />
          </Stack>
          <YStack alignItems="center" gap="$2" marginTop="$4">
            <Text fontSize="$6" fontWeight="600" color="$gray12">
              Failed to Load
            </Text>
            <Text
              fontSize="$4"
              color="$gray10"
              textAlign="center"
              maxWidth={280}
            >
              We couldn't load your notifications. Please try again.
            </Text>
          </YStack>
          <Button
            marginTop="$4"
            onPress={() => refetch()}
            testID="retry-button"
          >
            Try Again
          </Button>
        </YStack>
      </>
    );
  }

  const notifications = data?.notifications ?? [];

  return (
    <>
      <ExpoStack.Screen
        options={{
          title: "Notifications",
          headerShown: true,
          headerRight: () =>
            hasUnread
              ? (
                <Button
                  size="$3"
                  chromeless
                  onPress={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  testID="mark-all-read-button"
                >
                  <XStack gap="$1" alignItems="center">
                    <CheckCheck size={18} color="$blue9" />
                    <Text color="$blue9" fontSize="$3">
                      Mark all read
                    </Text>
                  </XStack>
                </Button>
              )
              : null,
        }}
      />
      <YStack flex={1} backgroundColor="$background">
        {/* Unread count header */}
        {hasUnread && (
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            backgroundColor="$blue2"
            borderBottomWidth={1}
            borderBottomColor="$blue4"
            testID="unread-count-header"
          >
            <Text color="$blue11" fontSize="$3">
              {data?.unreadCount} unread notification{data?.unreadCount !== 1 ? "s" : ""}
            </Text>
          </XStack>
        )}

        {/* Notifications list */}
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent,
            { paddingBottom: insets.bottom },
          ]}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
              testID="refresh-control"
            />
          }
          testID="notifications-list"
        />
      </YStack>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  emptyListContent: {
    flex: 1,
  },
});
