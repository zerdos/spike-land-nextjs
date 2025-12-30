/**
 * JobProgress Component Tests
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { TamaguiProvider } from "tamagui";
import { config } from "../tamagui.config";
import { JobProgress, JobProgressProps } from "./JobProgress";

// ============================================================================
// Local Mocks - Override missing icons and components from global mocks
// ============================================================================

// Mock missing Tamagui lucide icons (AlertCircle, Zap)
jest.mock("@tamagui/lucide-icons", () => {
  const ReactMock = jest.requireActual("react");
  const RNMock = jest.requireActual("react-native");
  const MockIcon = ReactMock.forwardRef((
    props: { testID?: string; },
    ref: unknown,
  ) => ReactMock.createElement(RNMock.View, { ...props, ref }));
  MockIcon.displayName = "MockIcon";
  return {
    AlertCircle: MockIcon,
    Check: MockIcon,
    Clock: MockIcon,
    Image: MockIcon,
    Sparkles: MockIcon,
    Zap: MockIcon,
  };
});

// Mock tamagui with Circle component
jest.mock("tamagui", () => {
  const ReactMock = jest.requireActual("react");
  const RNMock = jest.requireActual("react-native");
  const {
    View: RNView,
    Text: RNText,
    Pressable: RNPressable,
    TextInput: RNTextInput,
  } = RNMock;

  // Create a Button mock that supports Button.Icon and Button.Text
  const ButtonIcon = ReactMock.forwardRef((
    props: { children?: React.ReactNode; },
    ref: unknown,
  ) => ReactMock.createElement(RNView, { ...props, ref }));
  ButtonIcon.displayName = "ButtonIcon";

  const ButtonText = ReactMock.forwardRef((
    props: { children?: React.ReactNode; },
    ref: unknown,
  ) => ReactMock.createElement(RNText, { ...props, ref }));
  ButtonText.displayName = "ButtonText";

  const ButtonMock = Object.assign(
    ReactMock.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onPress?: () => void;
          testID?: string;
        },
        ref: unknown,
      ) => ReactMock.createElement(RNPressable, { ...props, ref }),
    ),
    {
      Icon: ButtonIcon,
      Text: ButtonText,
    },
  );
  ButtonMock.displayName = "Button";

  const SpinnerMock = ReactMock.forwardRef((
    props: { testID?: string; },
    ref: unknown,
  ) => ReactMock.createElement(RNView, { ...props, ref }));
  SpinnerMock.displayName = "Spinner";

  return {
    styled: jest.fn((component) => component),
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
    // Component mocks
    View: RNView,
    Text: RNText,
    Stack: RNView,
    XStack: RNView,
    YStack: RNView,
    ZStack: RNView,
    Button: ButtonMock,
    Input: RNTextInput,
    Label: RNText,
    Circle: RNView,
    Spinner: SpinnerMock,
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

// ============================================================================
// Test Wrapper
// ============================================================================

function renderWithProvider(component: React.ReactElement) {
  return render(
    <TamaguiProvider config={config}>
      {component}
    </TamaguiProvider>,
  );
}

// ============================================================================
// Default Props
// ============================================================================

const defaultProps: JobProgressProps = {
  status: null,
  stage: null,
  progress: 0,
  statusMessage: "",
  error: null,
  isComplete: false,
  isFailed: false,
};

// ============================================================================
// Tests
// ============================================================================

describe("JobProgress", () => {
  describe("rendering", () => {
    it("should render the component", () => {
      renderWithProvider(<JobProgress {...defaultProps} />);

      expect(screen.getByTestId("job-progress")).toBeTruthy();
    });

    it("should render all progress steps", () => {
      renderWithProvider(<JobProgress {...defaultProps} />);

      expect(screen.getByTestId("progress-step-queued")).toBeTruthy();
      expect(screen.getByTestId("progress-step-analyzing")).toBeTruthy();
      expect(screen.getByTestId("progress-step-enhancing")).toBeTruthy();
      expect(screen.getByTestId("progress-step-complete")).toBeTruthy();
    });

    it("should render with different sizes", () => {
      const { rerender } = renderWithProvider(
        <JobProgress {...defaultProps} size="small" />,
      );

      expect(screen.getByTestId("job-progress")).toBeTruthy();

      rerender(
        <TamaguiProvider config={config}>
          <JobProgress {...defaultProps} size="medium" />
        </TamaguiProvider>,
      );

      expect(screen.getByTestId("job-progress")).toBeTruthy();

      rerender(
        <TamaguiProvider config={config}>
          <JobProgress {...defaultProps} size="large" />
        </TamaguiProvider>,
      );

      expect(screen.getByTestId("job-progress")).toBeTruthy();
    });
  });

  describe("loading state", () => {
    it("should show spinner when processing", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          stage="ANALYZING"
          progress={25}
          statusMessage="Analyzing image..."
        />,
      );

      expect(screen.getByTestId("loading-spinner")).toBeTruthy();
      expect(screen.getByTestId("status-text")).toHaveTextContent(
        "Analyzing image...",
      );
    });

    it("should show progress percentage when processing", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          progress={50}
          statusMessage="Processing..."
        />,
      );

      expect(screen.getByTestId("progress-percentage")).toHaveTextContent(
        "50%",
      );
    });

    it("should show default message when statusMessage is empty", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PENDING"
          progress={10}
          statusMessage=""
        />,
      );

      expect(screen.getByTestId("status-text")).toHaveTextContent(
        "Processing...",
      );
    });
  });

  describe("complete state", () => {
    it("should show check icon when complete", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="COMPLETED"
          progress={100}
          isComplete={true}
        />,
      );

      expect(screen.getByTestId("complete-icon")).toBeTruthy();
    });

    it("should show completion message", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="COMPLETED"
          progress={100}
          isComplete={true}
        />,
      );

      expect(screen.getByTestId("status-text")).toHaveTextContent(
        "Enhancement Complete!",
      );
    });

    it("should not show progress percentage when complete", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="COMPLETED"
          progress={100}
          isComplete={true}
        />,
      );

      expect(screen.queryByTestId("progress-percentage")).toBeNull();
    });
  });

  describe("error state", () => {
    it("should show error icon when failed", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error="Enhancement failed"
        />,
      );

      expect(screen.getByTestId("error-icon")).toBeTruthy();
    });

    it("should show failure message", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error="Something went wrong"
        />,
      );

      expect(screen.getByTestId("status-text")).toHaveTextContent(
        "Enhancement Failed",
      );
    });

    it("should show error message text", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error="Network timeout"
        />,
      );

      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Network timeout",
      );
    });

    it("should not show error message when error is null", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error={null}
        />,
      );

      expect(screen.queryByTestId("error-message")).toBeNull();
    });
  });

  describe("retry button", () => {
    it("should show retry button when failed and showRetryButton is true", () => {
      const onRetry = jest.fn();

      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error="Error"
          onRetry={onRetry}
          showRetryButton={true}
        />,
      );

      expect(screen.getByTestId("retry-button")).toBeTruthy();
    });

    it("should not show retry button when showRetryButton is false", () => {
      const onRetry = jest.fn();

      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error="Error"
          onRetry={onRetry}
          showRetryButton={false}
        />,
      );

      expect(screen.queryByTestId("retry-button")).toBeNull();
    });

    it("should not show retry button when onRetry is not provided", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error="Error"
          showRetryButton={true}
        />,
      );

      expect(screen.queryByTestId("retry-button")).toBeNull();
    });

    it("should not show retry button when not failed", () => {
      const onRetry = jest.fn();

      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          isFailed={false}
          onRetry={onRetry}
          showRetryButton={true}
        />,
      );

      expect(screen.queryByTestId("retry-button")).toBeNull();
    });

    it("should call onRetry when retry button is pressed", () => {
      const onRetry = jest.fn();

      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="FAILED"
          isFailed={true}
          error="Error"
          onRetry={onRetry}
          showRetryButton={true}
        />,
      );

      fireEvent.press(screen.getByTestId("retry-button"));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("progress stages", () => {
    it("should highlight queued stage for PENDING status", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PENDING"
          stage={null}
          progress={10}
        />,
      );

      // The first step (queued) should be active
      const queuedStep = screen.getByTestId("progress-step-queued");
      expect(queuedStep).toBeTruthy();
    });

    it("should highlight analyzing stage for ANALYZING stage", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          stage="ANALYZING"
          progress={25}
        />,
      );

      const analyzingStep = screen.getByTestId("progress-step-analyzing");
      expect(analyzingStep).toBeTruthy();
    });

    it("should highlight enhancing stage for GENERATING stage", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          stage="GENERATING"
          progress={80}
        />,
      );

      const enhancingStep = screen.getByTestId("progress-step-enhancing");
      expect(enhancingStep).toBeTruthy();
    });

    it("should highlight complete stage when completed", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="COMPLETED"
          progress={100}
          isComplete={true}
        />,
      );

      const completeStep = screen.getByTestId("progress-step-complete");
      expect(completeStep).toBeTruthy();
    });

    it("should handle CROPPING stage", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          stage="CROPPING"
          progress={40}
        />,
      );

      // CROPPING should map to the analyzing step
      const analyzingStep = screen.getByTestId("progress-step-analyzing");
      expect(analyzingStep).toBeTruthy();
    });

    it("should handle PROMPTING stage", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          stage="PROMPTING"
          progress={60}
        />,
      );

      // PROMPTING should map to the enhancing step
      const enhancingStep = screen.getByTestId("progress-step-enhancing");
      expect(enhancingStep).toBeTruthy();
    });
  });

  describe("cancelled state", () => {
    it("should show error state for cancelled jobs", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="CANCELLED"
          isFailed={true}
          error="Job was cancelled"
        />,
      );

      expect(screen.getByTestId("error-icon")).toBeTruthy();
      expect(screen.getByTestId("status-text")).toHaveTextContent(
        "Enhancement Failed",
      );
    });
  });

  describe("animated circle", () => {
    it("should render animated progress circle", () => {
      renderWithProvider(
        <JobProgress
          {...defaultProps}
          status="PROCESSING"
          progress={50}
        />,
      );

      expect(screen.getByTestId("animated-progress-circle")).toBeTruthy();
      expect(screen.getByTestId("progress-fill")).toBeTruthy();
    });
  });
});
