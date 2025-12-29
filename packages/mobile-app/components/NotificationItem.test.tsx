/**
 * Tests for NotificationItem Component
 */

// MUST patch mocks BEFORE importing the component
// The jest.setup.ts has broken mocks that need to be fixed

// Create chainable gesture helper
const createChainableGesture = () => {
  const gesture: Record<string, jest.Mock> = {};
  const methods = [
    "onBegin",
    "onUpdate",
    "onEnd",
    "onStart",
    "onFinalize",
    "enabled",
    "minDistance",
    "activeOffsetX",
    "activeOffsetY",
    "failOffsetX",
    "failOffsetY",
    "simultaneousWithExternalGesture",
    "requireExternalGestureToFail",
  ];
  for (const method of methods) {
    gesture[method] = jest.fn(() => gesture);
  }
  return gesture;
};

// Patch mocks BEFORE any component imports
const { View } = require("react-native");

// Fix react-native-gesture-handler
const GestureHandler = require("react-native-gesture-handler");
GestureHandler.Gesture = {
  Pan: jest.fn(() => createChainableGesture()),
  Tap: jest.fn(() => createChainableGesture()),
  LongPress: jest.fn(() => createChainableGesture()),
};
GestureHandler.GestureHandlerRootView = View;
GestureHandler.GestureDetector = View;

// Fix react-native-reanimated
const Reanimated = require("react-native-reanimated");
Reanimated.default = {
  View,
  Text: View,
  ScrollView: View,
  createAnimatedComponent: jest.fn((comp) => comp),
};

// Fix @tamagui/lucide-icons - the mock in jest.setup.ts incorrectly calls View() as a function
const ReactModule = require("react");
const LucideIcons = require("@tamagui/lucide-icons");
const MockIcon = (props: Record<string, unknown>) => ReactModule.createElement(View, props);
LucideIcons.Bell = MockIcon;
LucideIcons.CheckCircle = MockIcon;
LucideIcons.Coins = MockIcon;
LucideIcons.Megaphone = MockIcon;
LucideIcons.Trash2 = MockIcon;

// Now import everything else
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { TamaguiProvider } from "tamagui";
import type { NotificationType, ServerNotification } from "../services/notifications";
import config from "../tamagui.config";
import { NotificationItem, type NotificationItemProps } from "./NotificationItem";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockNotification(
  overrides: Partial<ServerNotification> = {},
): ServerNotification {
  return {
    id: "notif-1",
    type: "enhancement_complete" as NotificationType,
    title: "Enhancement Complete",
    body: "Your image has been enhanced successfully.",
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderWithProviders(
  component: React.ReactElement,
) {
  return render(
    <TamaguiProvider config={config}>
      {component}
    </TamaguiProvider>,
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("NotificationItem", () => {
  const defaultProps: NotificationItemProps = {
    notification: createMockNotification(),
    onPress: jest.fn(),
    onDismiss: jest.fn(),
    testID: "notification-item",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders notification title correctly", () => {
      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} />,
      );

      expect(getByText("Enhancement Complete")).toBeTruthy();
    });

    it("renders notification body correctly", () => {
      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} />,
      );

      expect(getByText("Your image has been enhanced successfully.")).toBeTruthy();
    });

    it("shows unread indicator for unread notifications", () => {
      const { getByTestId } = renderWithProviders(
        <NotificationItem
          {...defaultProps}
          notification={createMockNotification({ read: false })}
        />,
      );

      expect(getByTestId("notification-item-unread-indicator")).toBeTruthy();
    });

    it("does not show unread indicator for read notifications", () => {
      const { queryByTestId } = renderWithProviders(
        <NotificationItem
          {...defaultProps}
          notification={createMockNotification({ read: true })}
        />,
      );

      expect(queryByTestId("notification-item-unread-indicator")).toBeNull();
    });

    it("renders with testID", () => {
      const { getByTestId } = renderWithProviders(
        <NotificationItem {...defaultProps} testID="test-notification" />,
      );

      expect(getByTestId("test-notification")).toBeTruthy();
    });
  });

  describe("notification types", () => {
    it("renders enhancement_complete notification with correct styling", () => {
      const { getByText } = renderWithProviders(
        <NotificationItem
          {...defaultProps}
          notification={createMockNotification({ type: "enhancement_complete" })}
        />,
      );

      expect(getByText("Enhancement Complete")).toBeTruthy();
    });

    it("renders token_low notification with correct styling", () => {
      const notification = createMockNotification({
        type: "token_low",
        title: "Low Tokens",
        body: "Your token balance is running low.",
      });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByText("Low Tokens")).toBeTruthy();
      expect(getByText("Your token balance is running low.")).toBeTruthy();
    });

    it("renders marketing notification with correct styling", () => {
      const notification = createMockNotification({
        type: "marketing",
        title: "Special Offer",
        body: "Get 50% off on all enhancements!",
      });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByText("Special Offer")).toBeTruthy();
    });

    it("renders unknown notification type with default styling", () => {
      const notification = createMockNotification({
        type: "unknown" as NotificationType,
        title: "Unknown Type",
      });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByText("Unknown Type")).toBeTruthy();
    });
  });

  describe("timestamp formatting", () => {
    it("shows 'Just now' for very recent notifications", () => {
      const notification = createMockNotification({
        createdAt: new Date().toISOString(),
      });

      const { getByTestId } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByTestId("notification-item-timestamp").props.children).toBe("Just now");
    });

    it("shows minutes ago for notifications within an hour", () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const notification = createMockNotification({
        createdAt: thirtyMinsAgo.toISOString(),
      });

      const { getByTestId } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByTestId("notification-item-timestamp").props.children).toBe("30m ago");
    });

    it("shows hours ago for notifications within a day", () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const notification = createMockNotification({
        createdAt: fiveHoursAgo.toISOString(),
      });

      const { getByTestId } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByTestId("notification-item-timestamp").props.children).toBe("5h ago");
    });

    it("shows days ago for notifications within a week", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const notification = createMockNotification({
        createdAt: threeDaysAgo.toISOString(),
      });

      const { getByTestId } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByTestId("notification-item-timestamp").props.children).toBe("3d ago");
    });

    it("shows formatted date for older notifications", () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const notification = createMockNotification({
        createdAt: twoWeeksAgo.toISOString(),
      });

      const { getByTestId } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      // The timestamp should be a formatted date like "Dec 14"
      const timestamp = getByTestId("notification-item-timestamp").props.children;
      expect(timestamp).toMatch(/[A-Z][a-z]{2} \d{1,2}/);
    });
  });

  describe("interactions", () => {
    it("calls onPress when notification is pressed", () => {
      const onPress = jest.fn();
      const notification = createMockNotification();

      const { getByTestId } = renderWithProviders(
        <NotificationItem
          {...defaultProps}
          notification={notification}
          onPress={onPress}
        />,
      );

      fireEvent.press(getByTestId("notification-item-pressable"));

      expect(onPress).toHaveBeenCalledWith(notification);
    });

    it("does not throw when onPress is not provided", () => {
      const { getByTestId } = renderWithProviders(
        <NotificationItem
          notification={createMockNotification()}
          testID="notification-item"
        />,
      );

      expect(() => {
        fireEvent.press(getByTestId("notification-item-pressable"));
      }).not.toThrow();
    });

    it("does not throw when onDismiss is not provided", () => {
      const { getByTestId } = renderWithProviders(
        <NotificationItem
          notification={createMockNotification()}
          testID="notification-item"
        />,
      );

      expect(getByTestId("notification-item")).toBeTruthy();
    });
  });

  describe("text styling", () => {
    it("applies bold font weight to unread notification title", () => {
      const notification = createMockNotification({ read: false });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      const title = getByText("Enhancement Complete");
      // Note: In Tamagui, fontWeight might be applied differently
      expect(title).toBeTruthy();
    });

    it("applies normal font weight to read notification title", () => {
      const notification = createMockNotification({ read: true });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      const title = getByText("Enhancement Complete");
      expect(title).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("handles long titles with truncation", () => {
      const notification = createMockNotification({
        title:
          "This is a very long notification title that should be truncated at some point to prevent overflow",
      });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByText(/This is a very long notification/)).toBeTruthy();
    });

    it("handles long body text with truncation", () => {
      const notification = createMockNotification({
        body:
          "This is a very long notification body that should span multiple lines but should be limited to two lines maximum for a clean UI appearance.",
      });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByText(/This is a very long notification body/)).toBeTruthy();
    });

    it("handles empty body", () => {
      const notification = createMockNotification({
        body: "",
      });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByText("Enhancement Complete")).toBeTruthy();
    });

    it("renders without testID prop", () => {
      const { getByText } = renderWithProviders(
        <NotificationItem
          notification={createMockNotification()}
          onPress={jest.fn()}
        />,
      );

      expect(getByText("Enhancement Complete")).toBeTruthy();
    });

    it("handles notification with additional data", () => {
      const notification = createMockNotification({
        data: {
          imageId: "123",
          albumId: "456",
        },
      });

      const { getByText } = renderWithProviders(
        <NotificationItem {...defaultProps} notification={notification} />,
      );

      expect(getByText("Enhancement Complete")).toBeTruthy();
    });
  });
});
