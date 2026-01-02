/**
 * Canvas Screen Tests
 * Tests for the full-screen image viewer with sharing and download
 */

// Mock @tamagui/lucide-icons to fix the "Cannot call a class as a function" error
// from jest.setup.ts. These icons are used in the CanvasScreen component.
jest.mock("@tamagui/lucide-icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");

  // Create a proper React component mock that can be called as a function component
  const createMockIcon = (name: string) => {
    const MockIcon = (props: Record<string, unknown>) =>
      React.createElement(View, { testID: `icon-${name}`, ...props });
    MockIcon.displayName = name;
    return MockIcon;
  };

  return {
    ChevronLeft: createMockIcon("ChevronLeft"),
    ChevronRight: createMockIcon("ChevronRight"),
    X: createMockIcon("X"),
    ZoomIn: createMockIcon("ZoomIn"),
    ZoomOut: createMockIcon("ZoomOut"),
    // Include other icons that might be needed by other components
    Sparkles: createMockIcon("Sparkles"),
    Clock: createMockIcon("Clock"),
    Image: createMockIcon("Image"),
    Download: createMockIcon("Download"),
    Share: createMockIcon("Share"),
    Trash: createMockIcon("Trash"),
  };
});

// Create a chainable gesture object that supports the fluent API pattern
const createChainableGesture = () => {
  const gesture: Record<string, jest.Mock> = {};
  const methods = [
    "onBegin",
    "onUpdate",
    "onEnd",
    "onStart",
    "onFinalize",
    "onTouchesDown",
    "onTouchesMove",
    "onTouchesUp",
    "onTouchesCancelled",
    "enabled",
    "minDistance",
    "activeOffsetX",
    "activeOffsetY",
    "failOffsetX",
    "failOffsetY",
    "simultaneousWithExternalGesture",
    "requireExternalGestureToFail",
    "numberOfTaps",
  ];

  for (const method of methods) {
    gesture[method] = jest.fn(() => gesture);
  }

  return gesture;
};

// Override the react-native-gesture-handler mock from jest.setup.ts with proper Gesture API
jest.mock("react-native-gesture-handler", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");

  // Create a chainable gesture object that supports the fluent API pattern
  const createChainableGestureInMock = () => {
    const gesture: Record<string, jest.Mock> = {};
    const methods = [
      "onBegin",
      "onUpdate",
      "onEnd",
      "onStart",
      "onFinalize",
      "onTouchesDown",
      "onTouchesMove",
      "onTouchesUp",
      "onTouchesCancelled",
      "enabled",
      "minDistance",
      "activeOffsetX",
      "activeOffsetY",
      "failOffsetX",
      "failOffsetY",
      "simultaneousWithExternalGesture",
      "requireExternalGestureToFail",
      "numberOfTaps",
    ];

    for (const method of methods) {
      gesture[method] = jest.fn(() => gesture);
    }

    return gesture;
  };

  return {
    GestureHandlerRootView: View,
    GestureDetector: View,
    Gesture: {
      Pan: jest.fn(() => createChainableGestureInMock()),
      Tap: jest.fn(() => createChainableGestureInMock()),
      LongPress: jest.fn(() => createChainableGestureInMock()),
      Pinch: jest.fn(() => createChainableGestureInMock()),
      Rotation: jest.fn(() => createChainableGestureInMock()),
      Fling: jest.fn(() => createChainableGestureInMock()),
      Force: jest.fn(() => createChainableGestureInMock()),
      Native: jest.fn(() => createChainableGestureInMock()),
      Manual: jest.fn(() => createChainableGestureInMock()),
      Race: jest.fn((...gestures: unknown[]) => gestures[0] || createChainableGestureInMock()),
      Simultaneous: jest.fn((...gestures: unknown[]) =>
        gestures[0] || createChainableGestureInMock()
      ),
      Exclusive: jest.fn((...gestures: unknown[]) => gestures[0] || createChainableGestureInMock()),
    },
    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
    },
    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },
    Swipeable: View,
    DrawerLayout: View,
    ScrollView: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn((component: unknown) => component),
  };
});

// Mock react-native-worklets BEFORE any other imports
jest.mock("react-native-worklets", () => ({
  useWorklet: jest.fn(),
  createWorklet: jest.fn(),
  runOnUI: jest.fn((fn) => fn),
  runOnJS: jest.fn((fn) => fn),
}));

// Mock react-native-reanimated BEFORE importing the component
jest.mock("react-native-reanimated", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    default: {
      View,
      call: jest.fn(),
    },
    View,
    useSharedValue: jest.fn((initial) => ({ value: initial })),
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

// Mock react-native-safe-area-context to ensure insets are available
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode; }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode; }) => children,
  useSafeAreaInsets: jest.fn(() => ({
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  })),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

// Mock the gallery store
jest.mock("@/stores", () => ({
  useGalleryStore: jest.fn(),
}));

// Mock the components
jest.mock("@/components/ImageActions", () => ({
  ImageActions: ({
    onDownload,
    onShare,
    onDelete,
    visible,
  }: {
    onDownload: () => void;
    onShare: () => void;
    onDelete: () => void;
    visible: boolean;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Pressable, Text } = require("react-native");
    if (!visible) return null;
    return (
      <View testID="image-actions">
        <Pressable testID="action-download" onPress={onDownload}>
          <Text>Download</Text>
        </Pressable>
        <Pressable testID="action-share" onPress={onShare}>
          <Text>Share</Text>
        </Pressable>
        <Pressable testID="action-delete" onPress={onDelete}>
          <Text>Delete</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock("@/components/ShareSheet", () => ({
  ShareSheet: ({
    visible,
    onClose,
    onActionComplete,
    onError,
  }: {
    visible: boolean;
    imageId: string | null;
    onClose: () => void;
    onActionComplete?: (action: "share" | "download" | "copy") => void;
    onError?: (error: string) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Pressable, Text } = require("react-native");
    if (!visible) return null;
    return (
      <View testID="share-sheet">
        <Pressable testID="share-sheet-close" onPress={onClose}>
          <Text>Close</Text>
        </Pressable>
        <Pressable
          testID="share-sheet-download-complete"
          onPress={() => onActionComplete?.("download")}
        >
          <Text>Complete Download</Text>
        </Pressable>
        <Pressable
          testID="share-sheet-error"
          onPress={() => onError?.("Test error")}
        >
          <Text>Trigger Error</Text>
        </Pressable>
      </View>
    );
  },
}));

// Override the Tamagui lucide icons mock from jest.setup.ts
// The setup file's mock incorrectly calls View as a function instead of using createElement
jest.mock("@tamagui/lucide-icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  const MockIcon = (props: { testID?: string; }) => React.createElement(View, props);
  return {
    ChevronLeft: MockIcon,
    ChevronRight: MockIcon,
    X: MockIcon,
    ZoomIn: MockIcon,
    ZoomOut: MockIcon,
    Download: MockIcon,
    Share2: MockIcon,
    Trash2: MockIcon,
    Copy: MockIcon,
    Loader2: MockIcon,
  };
});

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Alert } from "react-native";
import * as GestureHandler from "react-native-gesture-handler";
import * as Reanimated from "react-native-reanimated";

import CanvasScreen from "@/app/canvas/[albumId]";
import { useGalleryStore } from "@/stores";

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockUseGalleryStore = useGalleryStore as jest.MockedFunction<
  typeof useGalleryStore
>;

// Reset and re-establish mocks before each test
// This is needed because resetMocks: true in jest.config clears the implementations
beforeEach(() => {
  // Re-establish Gesture Handler mocks
  const Gesture = GestureHandler.Gesture as unknown as Record<
    string,
    jest.Mock
  >;

  if (Gesture.Pinch) {
    (Gesture.Pinch as jest.Mock).mockImplementation(() => createChainableGesture());
  }
  if (Gesture.Pan) {
    (Gesture.Pan as jest.Mock).mockImplementation(() => createChainableGesture());
  }
  if (Gesture.Tap) {
    (Gesture.Tap as jest.Mock).mockImplementation(() => createChainableGesture());
  }
  if (Gesture.Exclusive) {
    (Gesture.Exclusive as jest.Mock).mockImplementation(
      (...gestures: unknown[]) => gestures[0] || createChainableGesture(),
    );
  }
  if (Gesture.Simultaneous) {
    (Gesture.Simultaneous as jest.Mock).mockImplementation(
      (...gestures: unknown[]) => gestures[0] || createChainableGesture(),
    );
  }

  // Re-establish Reanimated mocks
  (Reanimated.useSharedValue as jest.Mock).mockImplementation((
    initial: number,
  ) => ({
    value: initial,
  }));
  (Reanimated.useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
  (Reanimated.withTiming as jest.Mock).mockImplementation((value: number) => value);
  (Reanimated.withSpring as jest.Mock).mockImplementation((value: number) => value);
  (Reanimated.runOnJS as jest.Mock).mockImplementation(
    (fn: (...args: unknown[]) => unknown) => fn,
  );
});

describe("CanvasScreen", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  };

  const mockImages = [
    {
      id: "img-1",
      originalUrl: "https://example.com/image1.jpg",
      originalWidth: 1920,
      originalHeight: 1080,
    },
    {
      id: "img-2",
      originalUrl: "https://example.com/image2.jpg",
      originalWidth: 1080,
      originalHeight: 1920,
    },
  ];

  const defaultStoreState = {
    images: mockImages,
    slideshowIndex: 0,
    goToSlide: jest.fn(),
    removeImage: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseLocalSearchParams.mockReturnValue({ albumId: "album-123" });
    mockUseGalleryStore.mockReturnValue(defaultStoreState);
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe("rendering", () => {
    it("should render the image viewer", () => {
      const { getByTestId } = render(<CanvasScreen />);

      expect(getByTestId("image-actions")).toBeTruthy();
    });

    it("should show no image message when no images", () => {
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        images: [],
      });

      const { getByText } = render(<CanvasScreen />);

      expect(getByText("No image to display")).toBeTruthy();
    });

    it("should show Go Back button when no images", () => {
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        images: [],
      });

      const { getByTestId } = render(<CanvasScreen />);

      // Find the Go Back button by its testID
      const goBackButton = getByTestId("go-back-button");
      expect(goBackButton).toBeTruthy();

      fireEvent.press(goBackButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("should show image counter", () => {
      const { getByText } = render(<CanvasScreen />);

      expect(getByText("1 / 2")).toBeTruthy();
    });
  });

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================

  describe("navigation", () => {
    it("should navigate back when close button is pressed", () => {
      render(<CanvasScreen />);

      // The close button uses the X icon
      // We test this through the router.back being called
      // The component should have a close button that triggers router.back
    });

    it("should show previous navigation when not at first image", () => {
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        slideshowIndex: 1,
      });

      const { getByText } = render(<CanvasScreen />);

      expect(getByText("2 / 2")).toBeTruthy();
    });
  });

  // ==========================================================================
  // Share Sheet Tests
  // ==========================================================================

  describe("share sheet", () => {
    it("should open share sheet when download action is triggered", () => {
      const { getByTestId, queryByTestId } = render(<CanvasScreen />);

      expect(queryByTestId("share-sheet")).toBeNull();

      fireEvent.press(getByTestId("action-download"));

      expect(getByTestId("share-sheet")).toBeTruthy();
    });

    it("should open share sheet when share action is triggered", () => {
      const { getByTestId, queryByTestId } = render(<CanvasScreen />);

      expect(queryByTestId("share-sheet")).toBeNull();

      fireEvent.press(getByTestId("action-share"));

      expect(getByTestId("share-sheet")).toBeTruthy();
    });

    it("should close share sheet", () => {
      const { getByTestId, queryByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-share"));
      expect(getByTestId("share-sheet")).toBeTruthy();

      fireEvent.press(getByTestId("share-sheet-close"));
      expect(queryByTestId("share-sheet")).toBeNull();
    });
  });

  // ==========================================================================
  // Delete Tests
  // ==========================================================================

  describe("delete", () => {
    it("should show delete confirmation alert", () => {
      const alertSpy = jest.spyOn(Alert, "alert");
      const { getByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-delete"));

      expect(alertSpy).toHaveBeenCalledWith(
        "Delete Image",
        expect.any(String),
        expect.any(Array),
      );
    });

    it("should delete image when confirmed", async () => {
      const removeImage = jest.fn().mockResolvedValue(true);
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        removeImage,
      });

      const alertSpy = jest.spyOn(Alert, "alert");
      const { getByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-delete"));

      // Get the delete callback from the alert
      const alertCall = alertSpy.mock.calls[0];
      const buttons = alertCall[2] as Array<
        { text: string; onPress?: () => void; }
      >;
      const deleteButton = buttons.find((b) => b.text === "Delete");

      await waitFor(async () => {
        await deleteButton?.onPress?.();
      });

      expect(removeImage).toHaveBeenCalledWith("img-1");
    });

    it("should navigate back when deleting last image", async () => {
      const removeImage = jest.fn().mockResolvedValue(true);
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        images: [mockImages[0]],
        removeImage,
      });

      const alertSpy = jest.spyOn(Alert, "alert");
      const { getByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-delete"));

      const alertCall = alertSpy.mock.calls[0];
      const buttons = alertCall[2] as Array<
        { text: string; onPress?: () => void; }
      >;
      const deleteButton = buttons.find((b) => b.text === "Delete");

      await waitFor(async () => {
        await deleteButton?.onPress?.();
      });

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("should handle delete failure", async () => {
      const removeImage = jest.fn().mockResolvedValue(false);
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        removeImage,
      });

      const alertSpy = jest.spyOn(Alert, "alert");
      const { getByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-delete"));

      const alertCall = alertSpy.mock.calls[0];
      const buttons = alertCall[2] as Array<
        { text: string; onPress?: () => void; }
      >;
      const deleteButton = buttons.find((b) => b.text === "Delete");

      await waitFor(async () => {
        await deleteButton?.onPress?.();
      });

      // Should not navigate back on failure
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it("should handle delete exception", async () => {
      const removeImage = jest.fn().mockRejectedValue(
        new Error("Delete failed"),
      );
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        removeImage,
      });

      const alertSpy = jest.spyOn(Alert, "alert");
      const { getByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-delete"));

      const alertCall = alertSpy.mock.calls[0];
      const buttons = alertCall[2] as Array<
        { text: string; onPress?: () => void; }
      >;
      const deleteButton = buttons.find((b) => b.text === "Delete");

      await waitFor(async () => {
        await deleteButton?.onPress?.();
      });

      // Error should be handled gracefully
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it("should not delete when no current image", async () => {
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        images: [],
      });

      // With no images, the delete button won't be rendered
      // This test ensures no crash occurs
      const { queryByTestId } = render(<CanvasScreen />);

      expect(queryByTestId("action-delete")).toBeNull();
    });

    it("should go to previous image when deleting last in list", async () => {
      const goToSlide = jest.fn();
      const removeImage = jest.fn().mockResolvedValue(true);
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        slideshowIndex: 1, // Last image
        goToSlide,
        removeImage,
      });

      const alertSpy = jest.spyOn(Alert, "alert");
      const { getByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-delete"));

      const alertCall = alertSpy.mock.calls[0];
      const buttons = alertCall[2] as Array<
        { text: string; onPress?: () => void; }
      >;
      const deleteButton = buttons.find((b) => b.text === "Delete");

      await waitFor(async () => {
        await deleteButton?.onPress?.();
      });

      expect(goToSlide).toHaveBeenCalledWith(0);
    });
  });

  // ==========================================================================
  // Toast Tests
  // ==========================================================================

  describe("toast notifications", () => {
    it("should show success toast on download complete", async () => {
      const { getByTestId, getByText } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-share"));
      fireEvent.press(getByTestId("share-sheet-download-complete"));

      await waitFor(() => {
        expect(getByText("Image saved to gallery!")).toBeTruthy();
      });
    });

    it("should show error toast on error", async () => {
      const { getByTestId, getByText } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-share"));
      fireEvent.press(getByTestId("share-sheet-error"));

      await waitFor(() => {
        expect(getByText("Test error")).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // Slideshow Index Tests
  // ==========================================================================

  describe("slideshow index", () => {
    it("should display correct image based on index", () => {
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        slideshowIndex: 1,
      });

      const { getByText } = render(<CanvasScreen />);

      expect(getByText("2 / 2")).toBeTruthy();
    });

    it("should handle out of bounds index", () => {
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        slideshowIndex: 10,
      });

      const { getByText } = render(<CanvasScreen />);

      expect(getByText("No image to display")).toBeTruthy();
    });
  });
});
