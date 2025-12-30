/**
 * Push Notifications Service
 * Handles push notification registration, scheduling, and response handling
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { apiClient } from "./api-client";

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | "enhancement_complete"
  | "token_low"
  | "marketing";

export interface NotificationData {
  type: NotificationType;
  targetRoute?: string;
  [key: string]: unknown;
}

export interface ServerNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface RegisterDeviceResponse {
  success: boolean;
  deviceId?: string;
}

export interface NotificationsListResponse {
  notifications: ServerNotification[];
  total: number;
  unreadCount: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Configure notification behavior (only on native platforms)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ============================================================================
// Push Token Registration
// ============================================================================

/**
 * Register for push notifications and get the Expo push token
 * Returns null if registration fails or is not supported
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications are not available on web
  if (Platform.OS === "web") {
    console.warn("Push notifications are not available on web");
    return null;
  }

  // Check if running on physical device
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permissions not granted");
    return null;
  }

  // Configure Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // Get the Expo push token
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ??
      Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

/**
 * Send the push token to the server for registration
 */
export async function registerDeviceWithServer(
  expoPushToken: string,
): Promise<boolean> {
  const response = await apiClient.post<RegisterDeviceResponse>(
    "/api/notifications/register",
    {
      token: expoPushToken,
      platform: Platform.OS,
      deviceName: Device.deviceName || "Unknown Device",
    },
  );

  if (response.error) {
    console.error("Failed to register device:", response.error);
    return false;
  }

  return response.data?.success ?? false;
}

// ============================================================================
// Local Notifications
// ============================================================================

/**
 * Schedule a local notification immediately
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
): Promise<string> {
  // Local notifications are not available on web
  if (Platform.OS === "web") {
    console.warn("Local notifications are not available on web");
    return "";
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, unknown>,
      sound: true,
    },
    trigger: null, // Immediate delivery
  });

  return notificationId;
}

/**
 * Schedule a local notification with a delay
 */
export async function scheduleDelayedNotification(
  title: string,
  body: string,
  delaySeconds: number,
  data?: NotificationData,
): Promise<string> {
  // Local notifications are not available on web
  if (Platform.OS === "web") {
    console.warn("Local notifications are not available on web");
    return "";
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, unknown>,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
    },
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ============================================================================
// Notification Response Handling
// ============================================================================

/**
 * Handle notification response (when user taps on a notification)
 * Returns the route to navigate to, or null if no navigation needed
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data as
    | NotificationData
    | undefined;

  if (!data) {
    return null;
  }

  // Check for explicit target route
  if (data.targetRoute) {
    return data.targetRoute;
  }

  // Route based on notification type
  switch (data.type) {
    case "enhancement_complete":
      return "/(tabs)/gallery";
    case "token_low":
      return "/tokens";
    case "marketing":
      return "/notifications";
    default:
      return "/notifications";
  }
}

/**
 * Navigate based on notification response
 */
export function navigateFromNotification(
  response: Notifications.NotificationResponse,
): void {
  const route = handleNotificationResponse(response);
  if (route) {
    router.push(route as never);
  }
}

// ============================================================================
// Server Notification API
// ============================================================================

/**
 * Fetch notifications from server
 */
export async function fetchNotifications(
  page = 1,
  limit = 20,
): Promise<NotificationsListResponse | null> {
  const response = await apiClient.get<NotificationsListResponse>(
    `/api/notifications?page=${page}&limit=${limit}`,
  );

  if (response.error) {
    console.error("Failed to fetch notifications:", response.error);
    return null;
  }

  return response.data;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<boolean> {
  const response = await apiClient.patch<{ success: boolean; }>(
    `/api/notifications/${notificationId}/read`,
  );

  return response.data?.success ?? false;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const response = await apiClient.post<{ success: boolean; }>(
    "/api/notifications/mark-all-read",
  );

  return response.data?.success ?? false;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
): Promise<boolean> {
  const response = await apiClient.delete<{ success: boolean; }>(
    `/api/notifications/${notificationId}`,
  );

  return response.data?.success ?? false;
}

// ============================================================================
// Badge Management
// ============================================================================

/**
 * Set the app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear the app badge
 */
export async function clearBadge(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  if (Platform.OS === "web") return 0;
  return await Notifications.getBadgeCountAsync();
}
