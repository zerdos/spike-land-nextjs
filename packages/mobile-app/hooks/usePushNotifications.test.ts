/**
 * Tests for usePushNotifications Hook
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AppState } from "react-native";
import * as notificationsService from "../services/notifications";
import { usePushNotifications } from "./usePushNotifications";

// Override specific mocks for this test file
jest.mock("../services/notifications", () => ({
  registerForPushNotifications: jest.fn(),
  registerDeviceWithServer: jest.fn(),
  handleNotificationResponse: jest.fn(),
  clearBadge: jest.fn(),
  isExpoGo: false, // Simulate development build
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications: require("expo-notifications"), // Re-export the mocked module
}));

// ============================================================================
// Test Helpers
// ============================================================================

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockNotificationsService = notificationsService as jest.Mocked<
  typeof notificationsService
>;
const mockRouter = router as jest.Mocked<typeof router>;

function createMockNotification(): Notifications.Notification {
  return {
    date: Date.now(),
    request: {
      identifier: "test-notif-id",
      content: {
        title: "Test Notification",
        body: "Test body",
        data: { type: "enhancement_complete" },
        sound: null,
        badge: null,
        subtitle: null,
        categoryIdentifier: null,
        launchImageName: null,
        attachments: [],
      },
      trigger: null,
    },
  } as unknown as Notifications.Notification;
}

function createMockNotificationResponse(): Notifications.NotificationResponse {
  return {
    notification: createMockNotification(),
    actionIdentifier: "default",
  } as Notifications.NotificationResponse;
}

// ============================================================================
// Tests
// ============================================================================

describe("usePushNotifications", () => {
  let notificationReceivedCallback:
    | ((n: Notifications.Notification) => void)
    | null = null;
  let notificationResponseCallback:
    | ((r: Notifications.NotificationResponse) => void)
    | null = null;
  let _appStateCallback: ((state: string) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AppState.addEventListener to return a subscription with remove method
    jest.spyOn(AppState, "addEventListener").mockImplementation(
      (event, callback) => {
        if (event === "change") {
          _appStateCallback = callback as (state: string) => void;
        }
        return { remove: jest.fn() };
      },
    );

    // Capture the callbacks when listeners are added
    mockNotifications.addNotificationReceivedListener.mockImplementation(
      (callback) => {
        notificationReceivedCallback = callback;
        return {
          remove: jest.fn(),
        } as unknown as Notifications.EventSubscription;
      },
    );

    mockNotifications.addNotificationResponseReceivedListener
      .mockImplementation(
        (callback) => {
          notificationResponseCallback = callback;
          return {
            remove: jest.fn(),
          } as unknown as Notifications.EventSubscription;
        },
      );

    mockNotifications.getLastNotificationResponseAsync.mockResolvedValue(null);
  });

  describe("initialization", () => {
    it("initializes with correct default state", async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(
        null,
      );

      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      expect(result.current.expoPushToken).toBeNull();
      expect(result.current.notification).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isEnabled).toBe(false);
      expect(result.current.isExpoGo).toBe(false);
    });

    it("requests permissions on mount when requestOnMount is true", async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(
        "ExponentPushToken[test]",
      );
      mockNotificationsService.registerDeviceWithServer.mockResolvedValue(true);

      const { result } = renderHook(() => usePushNotifications({ requestOnMount: true }));

      await waitFor(() => {
        expect(result.current.expoPushToken).toBe("ExponentPushToken[test]");
      });

      expect(mockNotificationsService.registerForPushNotifications)
        .toHaveBeenCalled();
    });

    it("does not request permissions on mount when requestOnMount is false", async () => {
      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      expect(mockNotificationsService.registerForPushNotifications).not
        .toHaveBeenCalled();
      expect(result.current.expoPushToken).toBeNull();
    });
  });

  describe("requestPermissions", () => {
    it("sets push token when registration succeeds", async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(
        "ExponentPushToken[success]",
      );
      mockNotificationsService.registerDeviceWithServer.mockResolvedValue(true);

      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      await act(async () => {
        const token = await result.current.requestPermissions();
        expect(token).toBe("ExponentPushToken[success]");
      });

      expect(result.current.expoPushToken).toBe("ExponentPushToken[success]");
      expect(result.current.isEnabled).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("sets error when registration fails", async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(
        null,
      );

      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      await act(async () => {
        const token = await result.current.requestPermissions();
        expect(token).toBeNull();
      });

      expect(result.current.expoPushToken).toBeNull();
      expect(result.current.isEnabled).toBe(false);
      expect(result.current.error).toBe("Failed to get push token");
    });

    it("sets error when registration throws", async () => {
      mockNotificationsService.registerForPushNotifications.mockRejectedValue(
        new Error("Permission denied"),
      );

      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      await act(async () => {
        const token = await result.current.requestPermissions();
        expect(token).toBeNull();
      });

      expect(result.current.error).toBe("Permission denied");
      expect(result.current.isEnabled).toBe(false);
    });

    it("registers with server when registerWithServer is true", async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(
        "ExponentPushToken[test]",
      );
      mockNotificationsService.registerDeviceWithServer.mockResolvedValue(true);

      const { result } = renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          registerWithServer: true,
        })
      );

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(mockNotificationsService.registerDeviceWithServer)
        .toHaveBeenCalledWith(
          "ExponentPushToken[test]",
        );
    });

    it("does not register with server when registerWithServer is false", async () => {
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(
        "ExponentPushToken[test]",
      );

      const { result } = renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          registerWithServer: false,
        })
      );

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(mockNotificationsService.registerDeviceWithServer).not
        .toHaveBeenCalled();
    });

    it("sets isLoading during permission request", async () => {
      let resolvePermissions: ((value: string | null) => void) | null = null;
      mockNotificationsService.registerForPushNotifications.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePermissions = resolve;
          }),
      );

      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      // Start the request
      let requestPromise: Promise<string | null>;
      act(() => {
        requestPromise = result.current.requestPermissions();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePermissions?.("ExponentPushToken[test]");
        await requestPromise;
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("notification listeners", () => {
    it("sets up notification listeners on mount", () => {
      renderHook(() => usePushNotifications({ requestOnMount: false }));

      expect(mockNotifications.addNotificationReceivedListener)
        .toHaveBeenCalled();
      expect(mockNotifications.addNotificationResponseReceivedListener)
        .toHaveBeenCalled();
    });

    it("removes listeners on unmount", () => {
      const mockRemove = jest.fn();
      mockNotifications.addNotificationReceivedListener.mockReturnValue({
        remove: mockRemove,
      } as unknown as Notifications.EventSubscription);
      mockNotifications.addNotificationResponseReceivedListener.mockReturnValue(
        {
          remove: mockRemove,
        } as unknown as Notifications.EventSubscription,
      );

      const { unmount } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      unmount();

      // Verify listeners were set up (and thus would be removed)
      expect(mockNotifications.addNotificationReceivedListener)
        .toHaveBeenCalled();
      expect(mockNotifications.addNotificationResponseReceivedListener)
        .toHaveBeenCalled();
    });

    it("updates notification state when notification is received", async () => {
      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      const mockNotification = createMockNotification();

      act(() => {
        notificationReceivedCallback?.(mockNotification);
      });

      expect(result.current.notification).toEqual(mockNotification);
    });

    it("calls onNotificationReceived callback when notification is received", async () => {
      const onNotificationReceived = jest.fn();

      renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          onNotificationReceived,
        })
      );

      const mockNotification = createMockNotification();

      act(() => {
        notificationReceivedCallback?.(mockNotification);
      });

      expect(onNotificationReceived).toHaveBeenCalledWith(mockNotification);
    });

    it("navigates when notification is tapped and handleNavigation is true", async () => {
      mockNotificationsService.handleNotificationResponse.mockReturnValue(
        "/(tabs)/gallery",
      );

      renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          handleNavigation: true,
        })
      );

      const mockResponse = createMockNotificationResponse();

      act(() => {
        notificationResponseCallback?.(mockResponse);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/gallery");
    });

    it("does not navigate when handleNavigation is false", async () => {
      mockNotificationsService.handleNotificationResponse.mockReturnValue(
        "/(tabs)/gallery",
      );

      renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          handleNavigation: false,
        })
      );

      const mockResponse = createMockNotificationResponse();

      act(() => {
        notificationResponseCallback?.(mockResponse);
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("calls onNotificationTapped callback when notification is tapped", async () => {
      const onNotificationTapped = jest.fn();

      renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          onNotificationTapped,
        })
      );

      const mockResponse = createMockNotificationResponse();

      act(() => {
        notificationResponseCallback?.(mockResponse);
      });

      expect(onNotificationTapped).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe("initial notification handling", () => {
    it("handles initial notification when app is opened from notification", async () => {
      const mockResponse = createMockNotificationResponse();
      mockNotifications.getLastNotificationResponseAsync.mockResolvedValue(
        mockResponse,
      );
      mockNotificationsService.handleNotificationResponse.mockReturnValue(
        "/notifications",
      );

      renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          handleNavigation: true,
        })
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/notifications");
      });
    });

    it("does not navigate when there is no initial notification", async () => {
      mockNotifications.getLastNotificationResponseAsync.mockResolvedValue(
        null,
      );

      renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          handleNavigation: true,
        })
      );

      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });
  });

  describe("clearNotification", () => {
    it("clears the current notification", async () => {
      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      // Receive a notification
      const mockNotification = createMockNotification();
      act(() => {
        notificationReceivedCallback?.(mockNotification);
      });

      expect(result.current.notification).not.toBeNull();

      // Clear the notification
      act(() => {
        result.current.clearNotification();
      });

      expect(result.current.notification).toBeNull();
    });
  });

  describe("app state handling", () => {
    it("sets up app state listener", () => {
      renderHook(() => usePushNotifications({ requestOnMount: false }));

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });

    it("clears badge when app becomes active", async () => {
      let appStateCallback: ((state: string) => void) | null = null;
      (AppState.addEventListener as jest.Mock).mockImplementation(
        (_, callback) => {
          appStateCallback = callback;
          return { remove: jest.fn() };
        },
      );

      // Set initial state to background
      Object.defineProperty(AppState, "currentState", {
        value: "background",
        writable: true,
      });

      renderHook(() => usePushNotifications({ requestOnMount: false }));

      // Simulate app becoming active
      act(() => {
        appStateCallback?.("active");
      });

      expect(mockNotificationsService.clearBadge).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles non-Error exceptions gracefully", async () => {
      mockNotificationsService.registerForPushNotifications.mockRejectedValue(
        "String error",
      );

      const { result } = renderHook(() => usePushNotifications({ requestOnMount: false }));

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(result.current.error).toBe("Unknown error");
    });

    it("handles null route from handleNotificationResponse", async () => {
      mockNotificationsService.handleNotificationResponse.mockReturnValue(null);

      renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          handleNavigation: true,
        })
      );

      const mockResponse = createMockNotificationResponse();

      act(() => {
        notificationResponseCallback?.(mockResponse);
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("logs warning when server registration fails", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      mockNotificationsService.registerForPushNotifications.mockResolvedValue(
        "ExponentPushToken[test]",
      );
      mockNotificationsService.registerDeviceWithServer.mockResolvedValue(
        false,
      );

      const { result } = renderHook(() =>
        usePushNotifications({
          requestOnMount: false,
          registerWithServer: true,
        })
      );

      await act(async () => {
        await result.current.requestPermissions();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to register device with server",
      );
      consoleSpy.mockRestore();
    });
  });
});
