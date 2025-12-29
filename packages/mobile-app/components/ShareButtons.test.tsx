/**
 * ShareButtons Component Tests
 */

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import React from "react";
import { Linking } from "react-native";

import { ShareButtons } from "./ShareButtons";

// Mock dependencies
jest.mock("expo-clipboard");
jest.mock("expo-sharing");

// Mock Tamagui components
jest.mock("tamagui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText, TouchableOpacity, View: RNView } = require("react-native");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMod = require("react");

  return {
    Button: ({
      children,
      onPress,
      testID,
      disabled,
      icon,
      ...props
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      disabled?: boolean;
      icon?: React.ReactNode;
    }) =>
      ReactMod.createElement(
        TouchableOpacity,
        { onPress, testID, disabled, ...props },
        icon && ReactMod.createElement(RNView, null, icon),
        ReactMod.createElement(RNText, null, children),
      ),
    XStack: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactMod.createElement(RNView, { testID, ...props }, children),
    YStack: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactMod.createElement(RNView, { testID, ...props }, children),
  };
});

// Mock Tamagui icons
jest.mock("@tamagui/lucide-icons", () => ({
  Copy: () => null,
  Facebook: () => null,
  MessageCircle: () => null,
  Share2: () => null,
  Twitter: () => null,
}));

// Note: Linking and Alert are globally mocked in jest.setup.ts

const mockedClipboard = Clipboard as jest.Mocked<typeof Clipboard>;
const mockedSharing = Sharing as jest.Mocked<typeof Sharing>;

const defaultProps = {
  referralUrl: "https://spike.land/ref/ABC123",
  referralCode: "ABC123",
};

describe("ShareButtons Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClipboard.setStringAsync.mockResolvedValue(true);
    mockedSharing.isAvailableAsync.mockResolvedValue(true);
    mockedSharing.shareAsync.mockResolvedValue(undefined);
    (Linking.openURL as jest.Mock).mockResolvedValue(true);
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render all share buttons", () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      expect(getByTestId("share-buttons")).toBeTruthy();
      expect(getByTestId("primary-actions")).toBeTruthy();
      expect(getByTestId("social-actions")).toBeTruthy();
    });

    it("should render copy button", () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);
      expect(getByTestId("copy-button")).toBeTruthy();
    });

    it("should render share button", () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);
      expect(getByTestId("share-button")).toBeTruthy();
    });

    it("should render social media buttons", () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      expect(getByTestId("twitter-button")).toBeTruthy();
      expect(getByTestId("facebook-button")).toBeTruthy();
      expect(getByTestId("whatsapp-button")).toBeTruthy();
    });
  });

  describe("Copy to Clipboard", () => {
    it("should copy referral URL to clipboard on button press", async () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("copy-button"));

      await waitFor(() => {
        expect(mockedClipboard.setStringAsync).toHaveBeenCalledWith(
          defaultProps.referralUrl,
        );
      });
    });

    it("should call onCopySuccess callback when copy succeeds", async () => {
      const onCopySuccess = jest.fn();
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onCopySuccess={onCopySuccess} />,
      );

      fireEvent.press(getByTestId("copy-button"));

      await waitFor(() => {
        expect(onCopySuccess).toHaveBeenCalled();
      });
    });

    it("should show 'Copied!' text after copying", async () => {
      const { getByTestId, getByText } = render(
        <ShareButtons {...defaultProps} />,
      );

      fireEvent.press(getByTestId("copy-button"));

      await waitFor(() => {
        expect(getByText("Copied!")).toBeTruthy();
      });
    });

    it("should reset copied state after 2 seconds", async () => {
      jest.useFakeTimers();

      const { getByTestId, getByText } = render(
        <ShareButtons {...defaultProps} />,
      );

      // Press the copy button and flush all pending microtasks
      await act(async () => {
        fireEvent.press(getByTestId("copy-button"));
        // Flush all microtasks to allow the async handler to complete
        await Promise.resolve();
      });

      // Should show "Copied!" after clipboard operation completes
      expect(getByText("Copied!")).toBeTruthy();

      // Advance time by 2 seconds to trigger the timeout
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should reset back to "Copy Link"
      expect(getByText("Copy Link")).toBeTruthy();
    });

    it("should handle copy error", async () => {
      mockedClipboard.setStringAsync.mockRejectedValue(
        new Error("Copy failed"),
      );
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("copy-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalledWith(expect.any(Error));
        // Alert.alert is called to show error - verify onShareError was called with correct error
        expect(onShareError).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Copy failed" }),
        );
      });
    });

    it("should not copy if referralUrl is empty", async () => {
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} referralUrl="" />,
      );

      fireEvent.press(getByTestId("copy-button"));

      await waitFor(() => {
        expect(mockedClipboard.setStringAsync).not.toHaveBeenCalled();
      });
    });

    it("should handle non-Error objects in copy error", async () => {
      mockedClipboard.setStringAsync.mockRejectedValue("String error");
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("copy-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Failed to copy" }),
        );
      });
    });
  });

  describe("Native Share", () => {
    it("should open native share sheet when available", async () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("share-button"));

      await waitFor(() => {
        expect(mockedSharing.isAvailableAsync).toHaveBeenCalled();
        expect(mockedSharing.shareAsync).toHaveBeenCalledWith(
          defaultProps.referralUrl,
          {
            dialogTitle: "Share your referral link",
            UTI: "public.url",
          },
        );
      });
    });

    it("should call onShareSuccess when share succeeds", async () => {
      const onShareSuccess = jest.fn();
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareSuccess={onShareSuccess} />,
      );

      fireEvent.press(getByTestId("share-button"));

      await waitFor(() => {
        expect(onShareSuccess).toHaveBeenCalled();
      });
    });

    it("should fallback to clipboard when sharing is not available", async () => {
      mockedSharing.isAvailableAsync.mockResolvedValue(false);

      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("share-button"));

      await waitFor(() => {
        expect(mockedClipboard.setStringAsync).toHaveBeenCalledWith(
          defaultProps.referralUrl,
        );
        // Alert.alert is called to notify user - verified by clipboard being called
      });
    });

    it("should not share if referralUrl is empty", async () => {
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} referralUrl="" />,
      );

      fireEvent.press(getByTestId("share-button"));

      await waitFor(() => {
        expect(mockedSharing.isAvailableAsync).not.toHaveBeenCalled();
      });
    });

    it("should handle share cancellation gracefully", async () => {
      mockedSharing.shareAsync.mockRejectedValue(
        new Error("User cancelled sharing"),
      );
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("share-button"));

      await waitFor(() => {
        // Should not call onShareError for cancellation
        expect(onShareError).not.toHaveBeenCalled();
      });
    });

    it("should handle share error", async () => {
      mockedSharing.shareAsync.mockRejectedValue(new Error("Share failed"));
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("share-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it("should handle non-Error objects in share error", async () => {
      mockedSharing.shareAsync.mockRejectedValue("String error");
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("share-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Share failed" }),
        );
      });
    });
  });

  describe("Twitter Share", () => {
    it("should open Twitter share URL", async () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("twitter-button"));

      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalled();
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining("twitter.com"),
        );
      });
    });

    it("should call onShareSuccess on Twitter share", async () => {
      const onShareSuccess = jest.fn();
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareSuccess={onShareSuccess} />,
      );

      fireEvent.press(getByTestId("twitter-button"));

      await waitFor(() => {
        expect(onShareSuccess).toHaveBeenCalled();
      });
    });

    it("should fallback to web URL if Twitter app is not available", async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("twitter-button"));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining("twitter.com"),
        );
      });
    });

    it("should handle Twitter share error", async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to open"),
      );
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("twitter-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalled();
        // Alert.alert is called to show error
      });
    });

    it("should not share if referralUrl is empty", async () => {
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} referralUrl="" />,
      );

      fireEvent.press(getByTestId("twitter-button"));

      await waitFor(() => {
        expect(Linking.openURL).not.toHaveBeenCalled();
      });
    });

    it("should handle non-Error in Twitter share error", async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce("String error");
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("twitter-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Twitter share failed" }),
        );
      });
    });
  });

  describe("Facebook Share", () => {
    it("should open Facebook share URL", async () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("facebook-button"));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining("facebook.com/sharer"),
        );
      });
    });

    it("should call onShareSuccess on Facebook share", async () => {
      const onShareSuccess = jest.fn();
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareSuccess={onShareSuccess} />,
      );

      fireEvent.press(getByTestId("facebook-button"));

      await waitFor(() => {
        expect(onShareSuccess).toHaveBeenCalled();
      });
    });

    it("should handle Facebook share error", async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to open"),
      );
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("facebook-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalled();
        // Alert.alert is called to show error
      });
    });

    it("should not share if referralUrl is empty", async () => {
      (Linking.openURL as jest.Mock).mockClear();
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} referralUrl="" />,
      );

      fireEvent.press(getByTestId("facebook-button"));

      await waitFor(() => {
        expect(Linking.openURL).not.toHaveBeenCalled();
      });
    });

    it("should handle non-Error in Facebook share error", async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce("String error");
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("facebook-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Facebook share failed" }),
        );
      });
    });
  });

  describe("WhatsApp Share", () => {
    it("should open WhatsApp with message", async () => {
      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("whatsapp-button"));

      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalledWith(
          expect.stringContaining("whatsapp://"),
        );
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining("whatsapp://"),
        );
      });
    });

    it("should call onShareSuccess on WhatsApp share", async () => {
      const onShareSuccess = jest.fn();
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareSuccess={onShareSuccess} />,
      );

      fireEvent.press(getByTestId("whatsapp-button"));

      await waitFor(() => {
        expect(onShareSuccess).toHaveBeenCalled();
      });
    });

    it("should fallback to web WhatsApp if app is not available", async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      const { getByTestId } = render(<ShareButtons {...defaultProps} />);

      fireEvent.press(getByTestId("whatsapp-button"));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining("wa.me"),
        );
      });
    });

    it("should handle WhatsApp share error", async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to open"),
      );
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("whatsapp-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalled();
        // Alert.alert is called to show error
      });
    });

    it("should not share if referralUrl is empty", async () => {
      (Linking.canOpenURL as jest.Mock).mockClear();
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} referralUrl="" />,
      );

      fireEvent.press(getByTestId("whatsapp-button"));

      await waitFor(() => {
        expect(Linking.canOpenURL).not.toHaveBeenCalled();
      });
    });

    it("should handle non-Error in WhatsApp share error", async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce("String error");
      const onShareError = jest.fn();

      const { getByTestId } = render(
        <ShareButtons {...defaultProps} onShareError={onShareError} />,
      );

      fireEvent.press(getByTestId("whatsapp-button"));

      await waitFor(() => {
        expect(onShareError).toHaveBeenCalledWith(
          expect.objectContaining({ message: "WhatsApp share failed" }),
        );
      });
    });
  });

  describe("Disabled State", () => {
    it("should disable buttons when referralUrl is empty", () => {
      const { getByTestId } = render(
        <ShareButtons {...defaultProps} referralUrl="" />,
      );

      expect(getByTestId("copy-button").props.accessibilityState?.disabled).toBe(true);
      expect(getByTestId("share-button").props.accessibilityState?.disabled).toBe(true);
      expect(getByTestId("twitter-button").props.accessibilityState?.disabled).toBe(true);
      expect(getByTestId("facebook-button").props.accessibilityState?.disabled).toBe(true);
      expect(getByTestId("whatsapp-button").props.accessibilityState?.disabled).toBe(true);
    });
  });
});
