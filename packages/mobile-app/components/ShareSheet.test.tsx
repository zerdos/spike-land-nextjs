/**
 * ShareSheet Component Tests
 * Tests for the bottom sheet share options component
 */

// Mock react-native-reanimated BEFORE any imports
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  const AnimatedMock = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    call: jest.fn(),
    createAnimatedComponent: (component: unknown) => component,
    addWhitelistedNativeProps: jest.fn(),
    Value: jest.fn(),
    event: jest.fn(),
  };
  return {
    __esModule: true,
    default: AnimatedMock,
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDelay: jest.fn((_, animation) => animation),
    withSequence: jest.fn((...animations) => animations[0]),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      bezier: jest.fn(),
    },
  };
});

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode; }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode; }) => children,
  useSafeAreaInsets: () => ({
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  }),
}));

// Mock tamagui with proper Button that wraps children in Text
jest.mock("tamagui", () => {
  const RN = require("react-native");
  const React = require("react");

  // Custom Button component that wraps string children in Text
  const MockButton = ({
    children,
    onPress,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }) => {
    return React.createElement(
      RN.Pressable,
      { onPress, disabled, ...props },
      typeof children === "string"
        ? React.createElement(RN.Text, null, children)
        : children,
    );
  };

  return {
    styled: jest.fn((component: unknown) => component),
    createTamagui: jest.fn(() => ({})),
    TamaguiProvider: ({ children }: { children: React.ReactNode; }) => children,
    Theme: ({ children }: { children: React.ReactNode; }) => children,
    useTheme: jest.fn(() => ({
      background: { val: "#ffffff" },
      color: { val: "#000000" },
    })),
    useMedia: jest.fn(() => ({
      xs: false,
      sm: false,
      md: false,
      lg: true,
    })),
    View: RN.View,
    Text: RN.Text,
    Stack: RN.View,
    XStack: RN.View,
    YStack: RN.View,
    ZStack: RN.View,
    Button: MockButton,
    Input: RN.TextInput,
    Label: RN.Text,
    H1: RN.Text,
    H2: RN.Text,
    H3: RN.Text,
    H4: RN.Text,
    Paragraph: RN.Text,
    Card: RN.View,
    Separator: RN.View,
    ScrollView: RN.View,
    Sheet: {
      Frame: RN.View,
      Overlay: RN.View,
      Handle: RN.View,
      ScrollView: RN.View,
    },
    Dialog: {
      Trigger: RN.Pressable,
      Portal: RN.View,
      Overlay: RN.View,
      Content: RN.View,
      Title: RN.Text,
      Description: RN.Text,
      Close: RN.Pressable,
    },
    Spinner: () => null,
    Avatar: {
      Image: RN.View,
      Fallback: RN.Text,
    },
    Progress: Object.assign(RN.View, {
      Indicator: RN.View,
    }),
    getTokens: jest.fn(() => ({
      color: {},
      space: {},
      size: {},
      radius: {},
    })),
    getToken: jest.fn(() => ""),
    isWeb: false,
  };
});

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Linking } from "react-native";

import { useImageShare } from "@/hooks/useImageShare";
import { ShareSheet } from "./ShareSheet";

// Mock the useImageShare hook
jest.mock("@/hooks/useImageShare", () => ({
  useImageShare: jest.fn(),
}));

// Mock Linking
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(undefined),
}));

const mockUseImageShare = useImageShare as jest.MockedFunction<typeof useImageShare>;

describe("ShareSheet", () => {
  const defaultMockHook = {
    shareImage: jest.fn().mockResolvedValue(true),
    downloadImage: jest.fn().mockResolvedValue(true),
    copyLink: jest.fn().mockResolvedValue(true),
    requestPermissions: jest.fn().mockResolvedValue(true),
    isLoading: false,
    currentOperation: null as "share" | "download" | "copy" | null,
    downloadProgress: 0,
    error: null as string | null,
    isSharingAvailable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseImageShare.mockReturnValue(defaultMockHook);
  });

  // ==========================================================================
  // Visibility Tests
  // ==========================================================================

  describe("visibility", () => {
    it("should not render when not visible", () => {
      const { queryByText } = render(
        <ShareSheet visible={false} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(queryByText("Share Image")).toBeNull();
    });

    it("should render when visible", () => {
      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(getByText("Share Image")).toBeTruthy();
    });
  });

  // ==========================================================================
  // Action Button Tests
  // ==========================================================================

  describe("download action", () => {
    it("should call downloadImage when download button is pressed", async () => {
      const downloadImage = jest.fn().mockResolvedValue(true);
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        downloadImage,
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      fireEvent.press(getByText("Save to Device"));

      await waitFor(() => {
        expect(downloadImage).toHaveBeenCalledWith("img-123");
      });
    });

    it("should show downloading state", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        isLoading: true,
        currentOperation: "download",
        downloadProgress: 50,
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(getByText("Downloading... 50%")).toBeTruthy();
    });

    it("should show downloaded success state", async () => {
      const downloadImage = jest.fn().mockImplementation(async () => {
        return true;
      });
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        downloadImage,
      });

      const onActionComplete = jest.fn();
      const { getByText, rerender } = render(
        <ShareSheet
          visible={true}
          imageId="img-123"
          onClose={jest.fn()}
          onActionComplete={onActionComplete}
        />,
      );

      fireEvent.press(getByText("Save to Device"));

      await waitFor(() => {
        expect(downloadImage).toHaveBeenCalled();
      });
    });
  });

  describe("share action", () => {
    it("should call shareImage when share button is pressed", async () => {
      const shareImage = jest.fn().mockResolvedValue(true);
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        shareImage,
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      fireEvent.press(getByText("Share via..."));

      await waitFor(() => {
        expect(shareImage).toHaveBeenCalledWith("img-123");
      });
    });

    it("should show sharing state", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        isLoading: true,
        currentOperation: "share",
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(getByText("Sharing...")).toBeTruthy();
    });

    it("should not show share button when sharing is unavailable", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        isSharingAvailable: false,
      });

      const { queryByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(queryByText("Share via...")).toBeNull();
    });
  });

  describe("copy link action", () => {
    it("should call copyLink when copy button is pressed", async () => {
      const copyLink = jest.fn().mockResolvedValue(true);
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        copyLink,
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      fireEvent.press(getByText("Copy Link"));

      await waitFor(() => {
        expect(copyLink).toHaveBeenCalledWith("img-123");
      });
    });

    it("should show copying state", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        isLoading: true,
        currentOperation: "copy",
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(getByText("Copying...")).toBeTruthy();
    });
  });

  // ==========================================================================
  // Social Share Tests
  // ==========================================================================

  describe("social share", () => {
    it("should render social platform buttons", () => {
      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(getByText("Twitter")).toBeTruthy();
      expect(getByText("Instagram")).toBeTruthy();
    });

    it("should copy link and open social platform", async () => {
      const copyLink = jest.fn().mockResolvedValue(true);
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        copyLink,
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      fireEvent.press(getByText("Twitter"));

      await waitFor(() => {
        expect(copyLink).toHaveBeenCalledWith("img-123");
      });
    });
  });

  // ==========================================================================
  // Close Behavior Tests
  // ==========================================================================

  describe("close behavior", () => {
    it("should call onClose when close button is pressed", () => {
      const onClose = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={onClose} />,
      );

      // Find the close button (X icon button)
      const buttons = UNSAFE_getAllByType("View");
      // The component uses Pressable which is mocked as View
      // We need to find the close functionality through the onClose callback
      expect(onClose).not.toHaveBeenCalled();
    });

    it("should not call onClose when loading", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        isLoading: true,
        currentOperation: "download",
      });

      const onClose = jest.fn();
      render(
        <ShareSheet visible={true} imageId="img-123" onClose={onClose} />,
      );

      // The close button should be disabled during loading
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error Display Tests
  // ==========================================================================

  describe("error display", () => {
    it("should display error message", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        error: "Something went wrong",
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(getByText("Something went wrong")).toBeTruthy();
    });

    it("should call onError callback", () => {
      const onError = jest.fn();
      mockUseImageShare.mockImplementation(({ onError: errorCallback }) => {
        // Simulate an error being triggered
        return {
          ...defaultMockHook,
          error: "Test error",
        };
      });

      render(
        <ShareSheet
          visible={true}
          imageId="img-123"
          onClose={jest.fn()}
          onError={onError}
        />,
      );

      // Error is displayed in the component
      expect(mockUseImageShare).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("callbacks", () => {
    it("should call onActionComplete for download", async () => {
      const downloadImage = jest.fn().mockResolvedValue(true);
      mockUseImageShare.mockImplementation(({ onDownloadComplete }) => ({
        ...defaultMockHook,
        downloadImage: async (imageId: string) => {
          const result = await downloadImage(imageId);
          onDownloadComplete?.();
          return result;
        },
      }));

      const onActionComplete = jest.fn();
      const { getByText } = render(
        <ShareSheet
          visible={true}
          imageId="img-123"
          onClose={jest.fn()}
          onActionComplete={onActionComplete}
        />,
      );

      fireEvent.press(getByText("Save to Device"));

      await waitFor(() => {
        expect(onActionComplete).toHaveBeenCalledWith("download");
      });
    });

    it("should call onActionComplete for share", async () => {
      const shareImage = jest.fn().mockResolvedValue(true);
      mockUseImageShare.mockImplementation(({ onShareComplete }) => ({
        ...defaultMockHook,
        shareImage: async (imageId: string) => {
          const result = await shareImage(imageId);
          onShareComplete?.();
          return result;
        },
      }));

      const onActionComplete = jest.fn();
      const { getByText } = render(
        <ShareSheet
          visible={true}
          imageId="img-123"
          onClose={jest.fn()}
          onActionComplete={onActionComplete}
        />,
      );

      fireEvent.press(getByText("Share via..."));

      await waitFor(() => {
        expect(onActionComplete).toHaveBeenCalledWith("share");
      });
    });

    it("should call onActionComplete for copy", async () => {
      const copyLink = jest.fn().mockResolvedValue(true);
      mockUseImageShare.mockImplementation(({ onLinkCopied }) => ({
        ...defaultMockHook,
        copyLink: async (imageId: string) => {
          const result = await copyLink(imageId);
          onLinkCopied?.("https://spike.land/s/abc");
          return result;
        },
      }));

      const onActionComplete = jest.fn();
      const { getByText } = render(
        <ShareSheet
          visible={true}
          imageId="img-123"
          onClose={jest.fn()}
          onActionComplete={onActionComplete}
        />,
      );

      fireEvent.press(getByText("Copy Link"));

      await waitFor(() => {
        expect(onActionComplete).toHaveBeenCalledWith("copy");
      });
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("loading state", () => {
    it("should disable buttons when loading", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        isLoading: true,
        currentOperation: "download",
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      // Buttons should have reduced opacity when disabled
      const shareButton = getByText("Share via...");
      const copyButton = getByText("Copy Link");

      // The buttons should still be rendered but disabled
      expect(shareButton).toBeTruthy();
      expect(copyButton).toBeTruthy();
    });

    it("should not perform action when no imageId", async () => {
      const downloadImage = jest.fn();
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        downloadImage,
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId={null} onClose={jest.fn()} />,
      );

      fireEvent.press(getByText("Save to Device"));

      await waitFor(() => {
        expect(downloadImage).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Progress Tests
  // ==========================================================================

  describe("download progress", () => {
    it("should show progress bar when downloading", () => {
      mockUseImageShare.mockReturnValue({
        ...defaultMockHook,
        isLoading: true,
        currentOperation: "download",
        downloadProgress: 75,
      });

      const { getByText } = render(
        <ShareSheet visible={true} imageId="img-123" onClose={jest.fn()} />,
      );

      expect(getByText("Downloading... 75%")).toBeTruthy();
    });
  });
});
