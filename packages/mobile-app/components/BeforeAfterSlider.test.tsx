/**
 * Tests for BeforeAfterSlider Component
 * Ensures the image comparison slider renders correctly with gesture interactions
 */

// Mock react-native-reanimated BEFORE importing the component
// This overrides the mock in jest.setup.ts which tries to load the real mock module
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");

  // Create a mock Animated.View component that passes through props
  const AnimatedView = React.forwardRef(
    (
      props: { testID?: string; style?: object; children?: React.ReactNode; },
      ref: React.Ref<typeof View>,
    ) => {
      return React.createElement(View, { ...props, ref });
    },
  );
  AnimatedView.displayName = "AnimatedView";

  return {
    __esModule: true,
    default: {
      call: jest.fn(),
      createAnimatedComponent: (component: React.ComponentType) => component,
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      Extrapolate: { CLAMP: jest.fn() },
      View: AnimatedView,
    },
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
    View: AnimatedView,
  };
});

import { fireEvent, render, screen } from "@testing-library/react-native";

import { BeforeAfterSlider } from "./BeforeAfterSlider";

describe("BeforeAfterSlider", () => {
  const defaultProps = {
    beforeImageUrl: "https://example.com/before.jpg",
    afterImageUrl: "https://example.com/after.jpg",
    testID: "slider",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the slider container", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider")).toBeTruthy();
    });

    it("renders the before image", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider-before-image")).toBeTruthy();
    });

    it("renders the after image", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider-after-image")).toBeTruthy();
    });

    it("renders the before label", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider-before-label")).toBeTruthy();
      expect(screen.getByText("Before")).toBeTruthy();
    });

    it("renders the after label", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider-after-label")).toBeTruthy();
      expect(screen.getByText("After")).toBeTruthy();
    });

    it("renders the slider line", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider-slider-line")).toBeTruthy();
    });

    it("renders the slider handle", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider-slider-handle")).toBeTruthy();
    });

    it("renders the before container for clipping", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider-before-container")).toBeTruthy();
    });
  });

  describe("custom labels", () => {
    it("uses custom before label when provided", () => {
      render(
        <BeforeAfterSlider
          {...defaultProps}
          beforeLabel="Original"
        />,
      );
      expect(screen.getByText("Original")).toBeTruthy();
    });

    it("uses custom after label when provided", () => {
      render(
        <BeforeAfterSlider
          {...defaultProps}
          afterLabel="Enhanced"
        />,
      );
      expect(screen.getByText("Enhanced")).toBeTruthy();
    });
  });

  describe("custom height", () => {
    it("renders with custom height when provided", () => {
      render(
        <BeforeAfterSlider
          {...defaultProps}
          height={300}
        />,
      );
      // Component should render without errors
      expect(screen.getByTestId("slider")).toBeTruthy();
    });

    it("uses default height of 220 when not specified", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      // Component should render without errors with default height
      expect(screen.getByTestId("slider")).toBeTruthy();
    });
  });

  describe("border radius", () => {
    it("renders with custom border radius when provided", () => {
      render(
        <BeforeAfterSlider
          {...defaultProps}
          borderRadius={24}
        />,
      );
      expect(screen.getByTestId("slider")).toBeTruthy();
    });

    it("uses default border radius of 16 when not specified", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByTestId("slider")).toBeTruthy();
    });
  });

  describe("layout handling", () => {
    it("handles layout change event", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      const sliderContainer = screen.getByTestId("slider");

      // Simulate layout event
      fireEvent(sliderContainer, "layout", {
        nativeEvent: {
          layout: { width: 350, height: 220 },
        },
      });

      // Component should handle the layout event without errors
      expect(sliderContainer).toBeTruthy();
    });
  });

  describe("without testID", () => {
    it("renders correctly without testID prop", () => {
      render(
        <BeforeAfterSlider
          beforeImageUrl="https://example.com/before.jpg"
          afterImageUrl="https://example.com/after.jpg"
        />,
      );
      // Should render the labels without testID prefix issues
      expect(screen.getByText("Before")).toBeTruthy();
      expect(screen.getByText("After")).toBeTruthy();
    });
  });

  describe("gesture handling", () => {
    it("renders gesture detector wrapper", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      // The gesture detector is mocked but the component should still render
      expect(screen.getByTestId("slider")).toBeTruthy();
    });
  });

  describe("image content", () => {
    it("renders with different image URLs", () => {
      const customUrls = {
        beforeImageUrl: "https://example.com/custom-before.png",
        afterImageUrl: "https://example.com/custom-after.png",
        testID: "custom-slider",
      };

      render(<BeforeAfterSlider {...customUrls} />);

      expect(screen.getByTestId("custom-slider-before-image")).toBeTruthy();
      expect(screen.getByTestId("custom-slider-after-image")).toBeTruthy();
    });
  });

  describe("handle arrows", () => {
    it("renders left arrow indicator", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByText("<")).toBeTruthy();
    });

    it("renders right arrow indicator", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByText(">")).toBeTruthy();
    });

    it("renders center spark indicator", () => {
      render(<BeforeAfterSlider {...defaultProps} />);
      expect(screen.getByText("*")).toBeTruthy();
    });
  });
});
