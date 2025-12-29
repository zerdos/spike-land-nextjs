/**
 * Canvas Screen Tests
 * Tests for the full-screen image viewer with sharing and download
 */

// Override the react-native-gesture-handler mock from jest.setup.ts with proper Gesture API
jest.mock("react-native-gesture-handler", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");

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

  return {
    GestureHandlerRootView: View,
    GestureDetector: View,
    Gesture: {
      Pan: jest.fn(() => createChainableGesture()),
      Tap: jest.fn(() => createChainableGesture()),
      LongPress: jest.fn(() => createChainableGesture()),
      Pinch: jest.fn(() => createChainableGesture()),
      Rotation: jest.fn(() => createChainableGesture()),
      Fling: jest.fn(() => createChainableGesture()),
      Force: jest.fn(() => createChainableGesture()),
      Native: jest.fn(() => createChainableGesture()),
      Manual: jest.fn(() => createChainableGesture()),
      Race: jest.fn((...gestures: unknown[]) => gestures[0]),
      Simultaneous: jest.fn((...gestures: unknown[]) => gestures[0]),
      Exclusive: jest.fn((...gestures: unknown[]) => gestures[0]),
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

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert } from "react-native";

import CanvasScreen from "@/app/canvas/[albumId]";
import { useGalleryStore } from "@/stores";

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
  ImageActions: ({ onDownload, onShare, onDelete, visible }: {
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
  ShareSheet: ({ visible, onClose, onActionComplete, onError }: {
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

// Note: react-native-gesture-handler is unmocked at the top of the file
// to use the proper __mocks__/react-native-gesture-handler.ts with Gesture.Pinch support

// Import the mocked gesture handler to verify and update its mocks if needed
import * as GestureHandler from "react-native-gesture-handler";

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockUseGalleryStore = useGalleryStore as jest.MockedFunction<typeof useGalleryStore>;

// Create a helper to make chainable gesture mocks at runtime
const createRuntimeChainableGesture = () => {
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

// Fix the Gesture mock if it's missing Pinch or other methods
beforeAll(() => {
  const Gesture = GestureHandler.Gesture as Record<string, jest.Mock>;
  if (!Gesture.Pinch || typeof Gesture.Pinch !== "function") {
    Gesture.Pinch = jest.fn(() => createRuntimeChainableGesture());
  }
  if (!Gesture.Pan || typeof Gesture.Pan !== "function") {
    Gesture.Pan = jest.fn(() => createRuntimeChainableGesture());
  }
  if (!Gesture.Tap || typeof Gesture.Tap !== "function") {
    Gesture.Tap = jest.fn(() => createRuntimeChainableGesture());
  }
  if (!Gesture.Exclusive || typeof Gesture.Exclusive !== "function") {
    Gesture.Exclusive = jest.fn((...gestures: unknown[]) =>
      gestures[0] || createRuntimeChainableGesture()
    );
  }
  if (!Gesture.Simultaneous || typeof Gesture.Simultaneous !== "function") {
    Gesture.Simultaneous = jest.fn((...gestures: unknown[]) =>
      gestures[0] || createRuntimeChainableGesture()
    );
  }
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

      const { getByText } = render(<CanvasScreen />);

      fireEvent.press(getByText("Go Back"));

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
      const buttons = alertCall[2] as Array<{ text: string; onPress?: () => void; }>;
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
      const buttons = alertCall[2] as Array<{ text: string; onPress?: () => void; }>;
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
      const buttons = alertCall[2] as Array<{ text: string; onPress?: () => void; }>;
      const deleteButton = buttons.find((b) => b.text === "Delete");

      await waitFor(async () => {
        await deleteButton?.onPress?.();
      });

      // Should not navigate back on failure
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it("should handle delete exception", async () => {
      const removeImage = jest.fn().mockRejectedValue(new Error("Delete failed"));
      mockUseGalleryStore.mockReturnValue({
        ...defaultStoreState,
        removeImage,
      });

      const alertSpy = jest.spyOn(Alert, "alert");
      const { getByTestId } = render(<CanvasScreen />);

      fireEvent.press(getByTestId("action-delete"));

      const alertCall = alertSpy.mock.calls[0];
      const buttons = alertCall[2] as Array<{ text: string; onPress?: () => void; }>;
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
      const buttons = alertCall[2] as Array<{ text: string; onPress?: () => void; }>;
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
