/**
 * Tests for Push Notifications Service
 */

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { apiClient } from "./api-client";

// Define PermissionStatus values locally since the module is mocked
const PermissionStatus = {
  GRANTED: "granted",
  DENIED: "denied",
  UNDETERMINED: "undetermined",
} as const;
import {
  cancelAllNotifications,
  cancelNotification,
  clearBadge,
  deleteNotification,
  fetchNotifications,
  getBadgeCount,
  handleNotificationResponse,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  navigateFromNotification,
  type NotificationData,
  type NotificationType,
  registerDeviceWithServer,
  registerForPushNotifications,
  scheduleDelayedNotification,
  scheduleLocalNotification,
  setBadgeCount,
} from "./notifications";

// Use mocks from jest.setup.ts, override specific ones for these tests
jest.mock("./api-client", () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockRouter = router as jest.Mocked<typeof router>;

function createMockNotificationResponse(
  data?: NotificationData,
): Notifications.NotificationResponse {
  return {
    notification: {
      request: {
        content: {
          title: "Test Title",
          body: "Test Body",
          sound: null,
          badge: null,
          subtitle: null,
          data: data as Record<string, unknown>,
          categoryIdentifier: null,
          launchImageName: null,
          attachments: [],
        },
        trigger: null,
        identifier: "test-id",
      },
      date: Date.now(),
    },
    actionIdentifier: "default",
  } as unknown as Notifications.NotificationResponse;
}

// ============================================================================
// Tests
// ============================================================================

describe("notifications service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Device.isDevice to default true
    Object.defineProperty(Device, "isDevice", {
      value: true,
      writable: true,
      configurable: true,
    });
    // Reset Platform.OS to default ios
    Object.defineProperty(Platform, "OS", {
      value: "ios",
      writable: true,
      configurable: true,
    });
  });

  describe("registerForPushNotifications", () => {
    it("returns null when not running on physical device", async () => {
      Object.defineProperty(Device, "isDevice", {
        value: false,
        writable: true,
        configurable: true,
      });

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
    });

    it("returns null when permissions are not granted", async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.DENIED,
        expires: "never",
        granted: false,
        canAskAgain: true,
      });
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.DENIED,
        expires: "never",
        granted: false,
        canAskAgain: false,
      });

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
    });

    it("requests permissions when not already granted", async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.UNDETERMINED,
        expires: "never",
        granted: false,
        canAskAgain: true,
      });
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        expires: "never",
        granted: true,
        canAskAgain: true,
      });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: "ExponentPushToken[test123]",
        type: "expo",
      });

      const result = await registerForPushNotifications();

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(result).toBe("ExponentPushToken[test123]");
    });

    it("returns push token when permissions are already granted", async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        expires: "never",
        granted: true,
        canAskAgain: true,
      });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: "ExponentPushToken[test456]",
        type: "expo",
      });

      const result = await registerForPushNotifications();

      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(result).toBe("ExponentPushToken[test456]");
    });

    it("configures Android notification channel on Android", async () => {
      Object.defineProperty(Platform, "OS", {
        value: "android",
        writable: true,
        configurable: true,
      });
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        expires: "never",
        granted: true,
        canAskAgain: true,
      });
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: "ExponentPushToken[android123]",
        type: "expo",
      });

      await registerForPushNotifications();

      expect(mockNotifications.setNotificationChannelAsync)
        .toHaveBeenCalledWith(
          "default",
          expect.objectContaining({
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
          }),
        );
    });

    it("returns null when getExpoPushTokenAsync fails", async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: PermissionStatus.GRANTED,
        expires: "never",
        granted: true,
        canAskAgain: true,
      });
      mockNotifications.getExpoPushTokenAsync.mockRejectedValue(
        new Error("Token fetch failed"),
      );

      const result = await registerForPushNotifications();

      expect(result).toBeNull();
    });
  });

  describe("registerDeviceWithServer", () => {
    it("sends push token to server successfully", async () => {
      mockApiClient.post.mockResolvedValue({
        data: { success: true, deviceId: "device-123" },
        error: null,
        status: 200,
      });

      const result = await registerDeviceWithServer("ExponentPushToken[test]");

      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/notifications/register",
        expect.objectContaining({
          token: "ExponentPushToken[test]",
          platform: "ios",
          deviceName: "Test Device",
        }),
      );
      expect(result).toBe(true);
    });

    it("returns false when server registration fails", async () => {
      mockApiClient.post.mockResolvedValue({
        data: null,
        error: "Server error",
        status: 500,
      });

      const result = await registerDeviceWithServer("ExponentPushToken[test]");

      expect(result).toBe(false);
    });

    it("returns false when server returns success: false", async () => {
      mockApiClient.post.mockResolvedValue({
        data: { success: false },
        error: null,
        status: 200,
      });

      const result = await registerDeviceWithServer("ExponentPushToken[test]");

      expect(result).toBe(false);
    });
  });

  describe("scheduleLocalNotification", () => {
    it("schedules immediate notification with correct parameters", async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue(
        "notif-123",
      );

      const result = await scheduleLocalNotification(
        "Test Title",
        "Test Body",
        { type: "enhancement_complete" as NotificationType },
      );

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Test Title",
          body: "Test Body",
          data: { type: "enhancement_complete" },
          sound: true,
        },
        trigger: null,
      });
      expect(result).toBe("notif-123");
    });

    it("schedules notification without data", async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue(
        "notif-456",
      );

      const result = await scheduleLocalNotification("Title", "Body");

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Title",
          body: "Body",
          data: undefined,
          sound: true,
        },
        trigger: null,
      });
      expect(result).toBe("notif-456");
    });
  });

  describe("scheduleDelayedNotification", () => {
    it("schedules notification with time interval trigger", async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue(
        "delayed-123",
      );

      const result = await scheduleDelayedNotification(
        "Delayed Title",
        "Delayed Body",
        60,
        { type: "token_low" as NotificationType },
      );

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Delayed Title",
          body: "Delayed Body",
          data: { type: "token_low" },
          sound: true,
        },
        trigger: {
          type: "timeInterval",
          seconds: 60,
        },
      });
      expect(result).toBe("delayed-123");
    });
  });

  describe("cancelNotification", () => {
    it("cancels a specific scheduled notification", async () => {
      await cancelNotification("notif-to-cancel");

      expect(mockNotifications.cancelScheduledNotificationAsync)
        .toHaveBeenCalledWith(
          "notif-to-cancel",
        );
    });
  });

  describe("cancelAllNotifications", () => {
    it("cancels all scheduled notifications", async () => {
      await cancelAllNotifications();

      expect(mockNotifications.cancelAllScheduledNotificationsAsync)
        .toHaveBeenCalled();
    });
  });

  describe("handleNotificationResponse", () => {
    it("returns targetRoute when present in data", () => {
      const response = createMockNotificationResponse({
        type: "marketing",
        targetRoute: "/custom/route",
      });

      const result = handleNotificationResponse(response);

      expect(result).toBe("/custom/route");
    });

    it("returns gallery route for enhancement_complete type", () => {
      const response = createMockNotificationResponse({
        type: "enhancement_complete",
      });

      const result = handleNotificationResponse(response);

      expect(result).toBe("/(tabs)/gallery");
    });

    it("returns tokens route for token_low type", () => {
      const response = createMockNotificationResponse({
        type: "token_low",
      });

      const result = handleNotificationResponse(response);

      expect(result).toBe("/tokens");
    });

    it("returns notifications route for marketing type", () => {
      const response = createMockNotificationResponse({
        type: "marketing",
      });

      const result = handleNotificationResponse(response);

      expect(result).toBe("/notifications");
    });

    it("returns notifications route for unknown type", () => {
      const response = createMockNotificationResponse({
        type: "unknown" as NotificationType,
      });

      const result = handleNotificationResponse(response);

      expect(result).toBe("/notifications");
    });

    it("returns null when no data is present", () => {
      const response = createMockNotificationResponse(undefined);

      const result = handleNotificationResponse(response);

      expect(result).toBeNull();
    });
  });

  describe("navigateFromNotification", () => {
    it("navigates to the determined route", () => {
      const response = createMockNotificationResponse({
        type: "enhancement_complete",
      });

      navigateFromNotification(response);

      expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/gallery");
    });

    it("does not navigate when no route is determined", () => {
      const response = createMockNotificationResponse(undefined);

      navigateFromNotification(response);

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe("fetchNotifications", () => {
    it("fetches notifications from server successfully", async () => {
      const mockNotificationsData = {
        notifications: [
          {
            id: "1",
            type: "enhancement_complete" as NotificationType,
            title: "Test",
            body: "Body",
            read: false,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
        unreadCount: 1,
      };
      mockApiClient.get.mockResolvedValue({
        data: mockNotificationsData,
        error: null,
        status: 200,
      });

      const result = await fetchNotifications(1, 20);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/notifications?page=1&limit=20",
      );
      expect(result).toEqual(mockNotificationsData);
    });

    it("returns null when fetch fails", async () => {
      mockApiClient.get.mockResolvedValue({
        data: null,
        error: "Failed to fetch",
        status: 500,
      });

      const result = await fetchNotifications();

      expect(result).toBeNull();
    });

    it("uses default pagination values", async () => {
      mockApiClient.get.mockResolvedValue({
        data: { notifications: [], total: 0, unreadCount: 0 },
        error: null,
        status: 200,
      });

      await fetchNotifications();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/notifications?page=1&limit=20",
      );
    });
  });

  describe("markNotificationAsRead", () => {
    it("marks notification as read successfully", async () => {
      mockApiClient.patch.mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const result = await markNotificationAsRead("notif-123");

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        "/api/notifications/notif-123/read",
      );
      expect(result).toBe(true);
    });

    it("returns false when marking fails", async () => {
      mockApiClient.patch.mockResolvedValue({
        data: null,
        error: "Failed",
        status: 500,
      });

      const result = await markNotificationAsRead("notif-123");

      expect(result).toBe(false);
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("marks all notifications as read successfully", async () => {
      mockApiClient.post.mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const result = await markAllNotificationsAsRead();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/notifications/mark-all-read",
      );
      expect(result).toBe(true);
    });

    it("returns false when marking all fails", async () => {
      mockApiClient.post.mockResolvedValue({
        data: null,
        error: "Failed",
        status: 500,
      });

      const result = await markAllNotificationsAsRead();

      expect(result).toBe(false);
    });
  });

  describe("deleteNotification", () => {
    it("deletes notification successfully", async () => {
      mockApiClient.delete.mockResolvedValue({
        data: { success: true },
        error: null,
        status: 200,
      });

      const result = await deleteNotification("notif-to-delete");

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        "/api/notifications/notif-to-delete",
      );
      expect(result).toBe(true);
    });

    it("returns false when deletion fails", async () => {
      mockApiClient.delete.mockResolvedValue({
        data: null,
        error: "Failed",
        status: 500,
      });

      const result = await deleteNotification("notif-to-delete");

      expect(result).toBe(false);
    });
  });

  describe("badge management", () => {
    describe("setBadgeCount", () => {
      it("sets badge count correctly", async () => {
        await setBadgeCount(5);

        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
      });
    });

    describe("clearBadge", () => {
      it("clears badge by setting count to 0", async () => {
        await clearBadge();

        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
      });
    });

    describe("getBadgeCount", () => {
      it("returns current badge count", async () => {
        mockNotifications.getBadgeCountAsync.mockResolvedValue(3);

        const result = await getBadgeCount();

        expect(result).toBe(3);
      });
    });
  });
});
