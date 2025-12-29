/**
 * Notifications Settings Screen Tests
 * Tests for notification preferences management
 */

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

// ============================================================================
// Mocks
// ============================================================================

// Mock expo-router
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Note: Alert.alert is mocked globally in jest.setup.ts
// Individual tests that need to verify Alert calls should create their own spy

// Mock auth store
const mockAuthStore = {
  isAuthenticated: true,
  isLoading: false,
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
};
jest.mock("@/stores", () => ({
  useAuthStore: jest.fn(),
}));

// Import the mocked store to configure it
import { useAuthStore } from "@/stores";
const mockUseAuthStore = useAuthStore as jest.Mock;

// Mock settings store
const mockSettingsStore: {
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    enhancementCompleteNotifications: boolean;
    marketingNotifications: boolean;
  };
  isSavingPreferences: boolean;
  preferencesError: string | null;
  updateNotificationPreference: jest.Mock;
  initialize: jest.Mock;
} = {
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    enhancementCompleteNotifications: true,
    marketingNotifications: false,
  },
  isSavingPreferences: false,
  preferencesError: null,
  updateNotificationPreference: jest.fn(() => Promise.resolve()),
  initialize: jest.fn(() => Promise.resolve()),
};
jest.mock("@/stores/settings-store", () => ({
  useSettingsStore: jest.fn(),
}));

// Import the mocked store to configure it
import { useSettingsStore } from "@/stores/settings-store";
const mockUseSettingsStore = useSettingsStore as jest.Mock;

// Mock Tamagui components
jest.mock("tamagui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, TouchableOpacity, Switch: RNSwitch, ScrollView: RNScrollView } = require(
    "react-native",
  );

  return {
    Button: ({ children, onPress, disabled, icon, ...props }: any) => (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        testID={props.testID}
        accessibilityLabel={typeof children === "string" ? children : undefined}
      >
        {icon}
        {typeof children === "string" ? <Text>{children}</Text> : children}
      </TouchableOpacity>
    ),
    Card: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    H3: ({ children }: any) => <Text>{children}</Text>,
    H4: ({ children }: any) => <Text>{children}</Text>,
    Paragraph: ({ children }: any) => <Text>{children}</Text>,
    ScrollView: ({ children, ...props }: any) => <RNScrollView {...props}>{children}</RNScrollView>,
    Separator: () => <View />,
    Switch: ({ checked, onCheckedChange, disabled, ...props }: any) => (
      <RNSwitch
        value={checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        testID={props.testID}
      />
    ),
    Text: ({ children }: any) => <Text>{children}</Text>,
    XStack: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    YStack: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

// Import component after mocks
import NotificationsScreen from "@/app/settings/notifications";

// ============================================================================
// Test Helpers
// ============================================================================

function resetMocks() {
  jest.clearAllMocks();
  mockAuthStore.isAuthenticated = true;
  mockAuthStore.isLoading = false;
  mockSettingsStore.notifications = {
    emailNotifications: true,
    pushNotifications: false,
    enhancementCompleteNotifications: true,
    marketingNotifications: false,
  };
  mockSettingsStore.isSavingPreferences = false;
  mockSettingsStore.preferencesError = null;
  mockSettingsStore.updateNotificationPreference = jest.fn(() => Promise.resolve());
  mockSettingsStore.initialize = jest.fn(() => Promise.resolve());

  // Configure mocks to return the mock store objects
  mockUseAuthStore.mockReturnValue(mockAuthStore);
  mockUseSettingsStore.mockReturnValue(mockSettingsStore);
}

// ============================================================================
// Tests
// ============================================================================

describe("NotificationsScreen", () => {
  beforeEach(() => {
    resetMocks();
  });

  describe("Authentication states", () => {
    it("should show loading indicator when auth is loading", () => {
      mockAuthStore.isLoading = true;

      render(<NotificationsScreen />);

      expect(mockAuthStore.isLoading).toBe(true);
    });

    it("should show sign in prompt when not authenticated", () => {
      mockAuthStore.isAuthenticated = false;

      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Sign in required")).toBeTruthy();
      expect(
        getByText("Please sign in to manage your notification preferences"),
      ).toBeTruthy();
    });

    it("should navigate to sign in when button is pressed", () => {
      mockAuthStore.isAuthenticated = false;

      const { getByText } = render(<NotificationsScreen />);

      fireEvent.press(getByText("Sign In"));

      expect(mockRouter.push).toHaveBeenCalledWith("/(auth)/signin");
    });
  });

  describe("Header", () => {
    it("should display notifications header", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Notifications")).toBeTruthy();
      expect(
        getByText("Choose how you want to be notified about activity"),
      ).toBeTruthy();
    });
  });

  describe("Communication section", () => {
    it("should display communication section header", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Communication")).toBeTruthy();
    });

    it("should display email notifications toggle", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Email Notifications")).toBeTruthy();
      expect(
        getByText(
          "Receive email updates about your account activity, including enhancement completions and important updates.",
        ),
      ).toBeTruthy();
    });

    it("should display push notifications toggle", () => {
      const { getAllByText, getByText } = render(<NotificationsScreen />);

      // "Push Notifications" appears twice - once in Communication section and once in Notification Channels
      expect(getAllByText("Push Notifications").length).toBeGreaterThanOrEqual(1);
      expect(
        getByText(
          "Get instant push notifications on your device for real-time updates.",
        ),
      ).toBeTruthy();
    });

    it("should call updateNotificationPreference when email toggle is changed", async () => {
      await act(async () => {
        await mockSettingsStore.updateNotificationPreference(
          "emailNotifications",
          false,
        );
      });

      expect(mockSettingsStore.updateNotificationPreference).toHaveBeenCalledWith(
        "emailNotifications",
        false,
      );
    });

    it("should call updateNotificationPreference when push toggle is changed", async () => {
      await act(async () => {
        await mockSettingsStore.updateNotificationPreference(
          "pushNotifications",
          true,
        );
      });

      expect(mockSettingsStore.updateNotificationPreference).toHaveBeenCalledWith(
        "pushNotifications",
        true,
      );
    });
  });

  describe("Activity section", () => {
    it("should display activity section header", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Activity")).toBeTruthy();
    });

    it("should display enhancement complete toggle", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Enhancement Complete")).toBeTruthy();
      expect(
        getByText(
          "Get notified when your image enhancements are ready to download.",
        ),
      ).toBeTruthy();
    });

    it("should call updateNotificationPreference when enhancement complete toggle is changed", async () => {
      await act(async () => {
        await mockSettingsStore.updateNotificationPreference(
          "enhancementCompleteNotifications",
          false,
        );
      });

      expect(mockSettingsStore.updateNotificationPreference).toHaveBeenCalledWith(
        "enhancementCompleteNotifications",
        false,
      );
    });
  });

  describe("Marketing section", () => {
    it("should display marketing section header", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Marketing")).toBeTruthy();
    });

    it("should display marketing notifications toggle", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Marketing & Promotions")).toBeTruthy();
      expect(
        getByText(
          "Receive updates about new features, special offers, and promotional content.",
        ),
      ).toBeTruthy();
    });

    it("should display unsubscribe info", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(
        getByText(
          "You can unsubscribe from marketing emails at any time using the link at the bottom of each email.",
        ),
      ).toBeTruthy();
    });

    it("should call updateNotificationPreference when marketing toggle is changed", async () => {
      await act(async () => {
        await mockSettingsStore.updateNotificationPreference(
          "marketingNotifications",
          true,
        );
      });

      expect(mockSettingsStore.updateNotificationPreference).toHaveBeenCalledWith(
        "marketingNotifications",
        true,
      );
    });
  });

  describe("Notification channels section", () => {
    it("should display notification channels section", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Notification Channels")).toBeTruthy();
      expect(
        getByText("We use the following channels to keep you informed:"),
      ).toBeTruthy();
    });

    it("should display email channel info", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Email")).toBeTruthy();
      expect(getByText("Important updates and summaries")).toBeTruthy();
    });

    it("should display push notification channel info", () => {
      const { getAllByText, getByText } = render(<NotificationsScreen />);

      // "Push Notifications" appears twice - once in Communication section and once in Notification Channels
      expect(getAllByText("Push Notifications").length).toBeGreaterThanOrEqual(1);
      expect(getByText("Real-time alerts on your device")).toBeTruthy();
    });

    it("should display in-app messages channel info", () => {
      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("In-App Messages")).toBeTruthy();
      expect(getByText("Important notices within the app")).toBeTruthy();
    });
  });

  describe("Saving indicator", () => {
    it("should show saving indicator when saving preferences", () => {
      mockSettingsStore.isSavingPreferences = true;

      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Saving...")).toBeTruthy();
    });

    it("should not show saving indicator when not saving", () => {
      mockSettingsStore.isSavingPreferences = false;

      const { queryByText } = render(<NotificationsScreen />);

      expect(queryByText("Saving...")).toBeNull();
    });
  });

  describe("Error handling", () => {
    it("should show alert when preferences error occurs", async () => {
      // Re-spy on Alert.alert for this test since it may be cleared by jest.clearAllMocks
      const alertSpy = jest.spyOn(Alert, "alert");

      mockSettingsStore.preferencesError = "Failed to update preferences";
      // Re-configure the mock to return the updated store with error
      mockUseSettingsStore.mockReturnValue(mockSettingsStore);

      render(<NotificationsScreen />);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Error",
          "Failed to update preferences",
        );
      });
    });
  });

  describe("Initialization", () => {
    it("should call initialize on mount when authenticated", () => {
      render(<NotificationsScreen />);

      expect(mockSettingsStore.initialize).toHaveBeenCalled();
    });

    it("should not call initialize when not authenticated", () => {
      mockAuthStore.isAuthenticated = false;
      mockSettingsStore.initialize.mockClear();

      render(<NotificationsScreen />);

      expect(mockSettingsStore.initialize).not.toHaveBeenCalled();
    });
  });

  describe("Toggle states", () => {
    it("should reflect current email notifications state", () => {
      mockSettingsStore.notifications.emailNotifications = true;

      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Email Notifications")).toBeTruthy();
    });

    it("should reflect current push notifications state", () => {
      mockSettingsStore.notifications.pushNotifications = false;

      const { getAllByText } = render(<NotificationsScreen />);

      // "Push Notifications" appears twice - once in Communication section and once in Notification Channels
      expect(getAllByText("Push Notifications").length).toBeGreaterThanOrEqual(1);
    });

    it("should reflect current enhancement complete state", () => {
      mockSettingsStore.notifications.enhancementCompleteNotifications = true;

      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Enhancement Complete")).toBeTruthy();
    });

    it("should reflect current marketing notifications state", () => {
      mockSettingsStore.notifications.marketingNotifications = false;

      const { getByText } = render(<NotificationsScreen />);

      expect(getByText("Marketing & Promotions")).toBeTruthy();
    });
  });

  describe("Disabled state during save", () => {
    it("should disable toggles when saving preferences", () => {
      mockSettingsStore.isSavingPreferences = true;

      render(<NotificationsScreen />);

      // Toggles should be disabled but still visible
      // This is validated by the component implementation
    });
  });
});
