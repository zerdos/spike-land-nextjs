/**
 * usePushNotifications Hook
 * Manages push notification registration, permissions, and incoming notifications
 */

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import {
  clearBadge,
  handleNotificationResponse,
  registerDeviceWithServer,
  registerForPushNotifications,
} from "../services/notifications";

// ============================================================================
// Types
// ============================================================================

export interface UsePushNotificationsOptions {
  /** Whether to request permissions on mount */
  requestOnMount?: boolean;
  /** Whether to register device with server after getting token */
  registerWithServer?: boolean;
  /** Whether to handle notification taps with navigation */
  handleNavigation?: boolean;
  /** Callback when a notification is received in foreground */
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  /** Callback when user taps on a notification */
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void;
}

export interface UsePushNotificationsReturn {
  /** The Expo push token for this device */
  expoPushToken: string | null;
  /** The most recent notification received */
  notification: Notifications.Notification | null;
  /** Whether the hook is currently loading (requesting permissions, etc.) */
  isLoading: boolean;
  /** Any error that occurred during setup */
  error: string | null;
  /** Whether push notifications are enabled */
  isEnabled: boolean;
  /** Manually request push notification permissions */
  requestPermissions: () => Promise<string | null>;
  /** Clear the current notification state */
  clearNotification: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function usePushNotifications(
  options: UsePushNotificationsOptions = {},
): UsePushNotificationsReturn {
  const {
    requestOnMount = true,
    registerWithServer = true,
    handleNavigation = true,
    onNotificationReceived,
    onNotificationTapped,
  } = options;

  // State
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<
    Notifications.Notification | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  // Refs for listeners
  const notificationListenerRef = useRef<
    Notifications.EventSubscription | null
  >(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Request permissions and get push token
  const requestPermissions = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await registerForPushNotifications();

      if (token) {
        setExpoPushToken(token);
        setIsEnabled(true);

        // Register with server if enabled
        if (registerWithServer) {
          const registered = await registerDeviceWithServer(token);
          if (!registered) {
            console.warn("Failed to register device with server");
          }
        }

        return token;
      } else {
        setError("Failed to get push token");
        setIsEnabled(false);
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setIsEnabled(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [registerWithServer]);

  // Clear notification state
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback(
    (receivedNotification: Notifications.Notification) => {
      setNotification(receivedNotification);
      onNotificationReceived?.(receivedNotification);
    },
    [onNotificationReceived],
  );

  // Handle notification tap
  const handleNotificationTap = useCallback(
    (response: Notifications.NotificationResponse) => {
      onNotificationTapped?.(response);

      if (handleNavigation) {
        const route = handleNotificationResponse(response);
        if (route) {
          router.push(route as never);
        }
      }
    },
    [handleNavigation, onNotificationTapped],
  );

  // Check for initial notification (app opened from notification)
  // This is only available on native platforms, not web
  useEffect(() => {
    // Skip on web - push notifications are not available
    if (Platform.OS === "web") {
      return;
    }

    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        handleNotificationTap(response);
      }
    };

    checkInitialNotification();
  }, [handleNotificationTap]);

  // Set up notification listeners
  // These are only available on native platforms
  useEffect(() => {
    // Skip on web - push notifications are not available
    if (Platform.OS === "web") {
      return;
    }

    // Foreground notification listener
    notificationListenerRef.current = Notifications
      .addNotificationReceivedListener(
        handleNotificationReceived,
      );

    // Notification tap listener
    responseListenerRef.current = Notifications
      .addNotificationResponseReceivedListener(
        handleNotificationTap,
      );

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [handleNotificationReceived, handleNotificationTap]);

  // Request permissions on mount if enabled
  // Only on native platforms
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    if (requestOnMount) {
      requestPermissions();
    }
  }, [requestOnMount, requestPermissions]);

  // Clear badge when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        clearBadge();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    expoPushToken,
    notification,
    isLoading,
    error,
    isEnabled,
    requestPermissions,
    clearNotification,
  };
}
