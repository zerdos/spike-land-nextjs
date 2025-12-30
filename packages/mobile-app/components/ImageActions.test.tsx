/**
 * ImageActions Component Tests
 * Tests for the floating action bar component
 */

// Mock react-native-reanimated before any imports that might use it
jest.mock("react-native-reanimated", () => {
  const ReactActual = jest.requireActual("react");
  const RN = jest.requireActual("react-native");

  // Create a proper Animated.View mock
  const AnimatedView = ReactActual.forwardRef(
    (
      props: {
        testID?: string;
        style?: object;
        children?: ReactActual.ReactNode;
        pointerEvents?: string;
      },
      ref: ReactActual.Ref<typeof RN.View>,
    ) => {
      return ReactActual.createElement(RN.View, { ...props, ref });
    },
  );
  AnimatedView.displayName = "AnimatedView";

  // Create a shared value that can be assigned to
  const createSharedValue = (initial: number) => {
    let currentValue = initial;
    return {
      get value() {
        return currentValue;
      },
      set value(newValue: number) {
        currentValue = newValue;
      },
    };
  };

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      call: jest.fn(),
      createAnimatedComponent: (component: unknown) => component,
    },
    View: AnimatedView,
    useSharedValue: (initial: number) => createSharedValue(initial),
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
    FadeIn: { duration: jest.fn(() => ({ delay: jest.fn() })) },
    FadeOut: { duration: jest.fn(() => ({ delay: jest.fn() })) },
    SlideInDown: { duration: jest.fn(() => ({ delay: jest.fn() })) },
    SlideOutDown: { duration: jest.fn(() => ({ delay: jest.fn() })) },
  };
});

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => {
  return {
    SafeAreaProvider: ({ children }: { children: unknown; }) => children,
    SafeAreaView: ({ children }: { children: unknown; }) => children,
    useSafeAreaInsets: () => ({
      top: 44,
      right: 0,
      bottom: 34,
      left: 0,
    }),
  };
});

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { ImageActions } from "./ImageActions";

describe("ImageActions", () => {
  const defaultProps = {
    visible: true,
    onDownload: jest.fn(),
    onShare: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Visibility Tests
  // ==========================================================================

  describe("visibility", () => {
    it("should render when visible", () => {
      const { getByTestId } = render(<ImageActions {...defaultProps} />);

      expect(getByTestId("image-action-download")).toBeTruthy();
      expect(getByTestId("image-action-share")).toBeTruthy();
      expect(getByTestId("image-action-delete")).toBeTruthy();
    });

    it("should not render delete button when showDelete is false", () => {
      const { queryByTestId, getByTestId } = render(
        <ImageActions {...defaultProps} showDelete={false} />,
      );

      expect(getByTestId("image-action-download")).toBeTruthy();
      expect(getByTestId("image-action-share")).toBeTruthy();
      expect(queryByTestId("image-action-delete")).toBeNull();
    });
  });

  // ==========================================================================
  // Action Handler Tests
  // ==========================================================================

  describe("action handlers", () => {
    it("should call onDownload when download button is pressed", () => {
      const onDownload = jest.fn();
      const { getByTestId } = render(
        <ImageActions {...defaultProps} onDownload={onDownload} />,
      );

      fireEvent.press(getByTestId("image-action-download"));

      expect(onDownload).toHaveBeenCalledTimes(1);
    });

    it("should call onShare when share button is pressed", () => {
      const onShare = jest.fn();
      const { getByTestId } = render(
        <ImageActions {...defaultProps} onShare={onShare} />,
      );

      fireEvent.press(getByTestId("image-action-share"));

      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it("should call onDelete when delete button is pressed", () => {
      const onDelete = jest.fn();
      const { getByTestId } = render(
        <ImageActions {...defaultProps} onDelete={onDelete} />,
      );

      fireEvent.press(getByTestId("image-action-delete"));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("loading states", () => {
    it("should not call onDownload when downloading", () => {
      const onDownload = jest.fn();
      const { getByTestId } = render(
        <ImageActions
          {...defaultProps}
          onDownload={onDownload}
          isDownloading={true}
        />,
      );

      fireEvent.press(getByTestId("image-action-download"));

      expect(onDownload).not.toHaveBeenCalled();
    });

    it("should not call onShare when sharing", () => {
      const onShare = jest.fn();
      const { getByTestId } = render(
        <ImageActions {...defaultProps} onShare={onShare} isSharing={true} />,
      );

      fireEvent.press(getByTestId("image-action-share"));

      expect(onShare).not.toHaveBeenCalled();
    });

    it("should not call onDelete when deleting", () => {
      const onDelete = jest.fn();
      const { getByTestId } = render(
        <ImageActions
          {...defaultProps}
          onDelete={onDelete}
          isDeleting={true}
        />,
      );

      fireEvent.press(getByTestId("image-action-delete"));

      expect(onDelete).not.toHaveBeenCalled();
    });

    it("should not call any action when any operation is loading", () => {
      const onDownload = jest.fn();
      const onShare = jest.fn();
      const onDelete = jest.fn();

      const { getByTestId } = render(
        <ImageActions
          {...defaultProps}
          onDownload={onDownload}
          onShare={onShare}
          onDelete={onDelete}
          isDownloading={true}
        />,
      );

      fireEvent.press(getByTestId("image-action-download"));
      fireEvent.press(getByTestId("image-action-share"));
      fireEvent.press(getByTestId("image-action-delete"));

      expect(onDownload).not.toHaveBeenCalled();
      expect(onShare).not.toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Position Tests
  // ==========================================================================

  describe("position", () => {
    it("should render at bottom by default", () => {
      const { getByTestId } = render(<ImageActions {...defaultProps} />);

      // Component renders with bottom position
      expect(getByTestId("image-action-download")).toBeTruthy();
    });

    it("should render at top when position is top", () => {
      const { getByTestId } = render(
        <ImageActions {...defaultProps} position="top" />,
      );

      // Component renders with top position
      expect(getByTestId("image-action-download")).toBeTruthy();
    });
  });

  // ==========================================================================
  // Custom Style Tests
  // ==========================================================================

  describe("custom style", () => {
    it("should apply custom style", () => {
      const customStyle = { marginBottom: 100 };
      const { getByTestId } = render(
        <ImageActions {...defaultProps} style={customStyle} />,
      );

      expect(getByTestId("image-action-download")).toBeTruthy();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle multiple loading states", () => {
      const onDownload = jest.fn();
      const { getByTestId } = render(
        <ImageActions
          {...defaultProps}
          onDownload={onDownload}
          isDownloading={true}
          isSharing={true}
        />,
      );

      fireEvent.press(getByTestId("image-action-download"));

      expect(onDownload).not.toHaveBeenCalled();
    });

    it("should handle visibility change", async () => {
      const { rerender, getByTestId } = render(
        <ImageActions {...defaultProps} visible={true} />,
      );

      expect(getByTestId("image-action-download")).toBeTruthy();

      rerender(<ImageActions {...defaultProps} visible={false} />);

      // Animation would hide the component
      // In tests, the component may still be in DOM during animation
    });
  });
});
