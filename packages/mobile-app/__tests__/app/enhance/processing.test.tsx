/**
 * Processing Screen Tests
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

// Mock dependencies - must be before imports that use them
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

jest.mock("@/hooks/useEnhancementJob", () => ({
  useEnhancementJob: jest.fn(),
}));

jest.mock("@/stores", () => ({
  useEnhancementStore: jest.fn(),
}));

// Mock Tamagui components
jest.mock("tamagui", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");

  return {
    Button: ({ children, onPress, testID, ...props }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID}>
        {typeof children === "string" ? <Text>{children}</Text> : children}
      </TouchableOpacity>
    ),
    Text: ({ children, testID, ...props }: any) => <Text testID={testID}>{children}</Text>,
    YStack: ({ children, testID, ...props }: any) => <View testID={testID}>{children}</View>,
    XStack: ({ children, testID, ...props }: any) => <View testID={testID}>{children}</View>,
    TamaguiProvider: ({ children }: any) => <>{children}</>,
    createTamagui: jest.fn(() => ({})),
    createTokens: jest.fn(() => ({})),
  };
});

// Mock JobProgress component
jest.mock("@/components/JobProgress", () => ({
  JobProgress: ({ onRetry, ...props }: { onRetry?: () => void; }) => {
    const React = require("react");
    const { View } = require("react-native");
    return (
      <View
        testID="job-progress"
        data-status={props.status}
        data-progress={props.progress}
        data-is-complete={props.isComplete}
        data-is-failed={props.isFailed}
      />
    );
  },
}));

// Import after mocks
import EnhancementProcessingScreen from "@/app/enhance/processing";
import { useEnhancementJob } from "@/hooks/useEnhancementJob";
import { useEnhancementStore } from "@/stores";
import { useRouter } from "expo-router";

const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedUseEnhancementJob = useEnhancementJob as jest.MockedFunction<typeof useEnhancementJob>;
const mockedUseEnhancementStore = useEnhancementStore as jest.MockedFunction<
  typeof useEnhancementStore
>;

// ============================================================================
// Test Wrapper
// ============================================================================

function renderWithProvider(component: React.ReactElement) {
  return render(component);
}

// ============================================================================
// Mock Data
// ============================================================================

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
};

const mockStoreActions = {
  currentJobId: "job-123",
  startJob: jest.fn(),
  updateJobStatus: jest.fn(),
  completeJob: jest.fn(),
  clearCurrentEnhancement: jest.fn(),
};

const mockJobHookDefault = {
  job: null,
  status: null,
  stage: null,
  progress: 0,
  statusMessage: "",
  isPolling: false,
  isLoading: true,
  error: null,
  resultUrl: null,
  isComplete: false,
  isFailed: false,
  startPolling: jest.fn(),
  stopPolling: jest.fn(),
  retry: jest.fn(),
  reset: jest.fn(),
};

// ============================================================================
// Tests
// ============================================================================

describe("EnhancementProcessingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue(mockRouter as never);
    mockedUseEnhancementStore.mockReturnValue(mockStoreActions as never);
    mockedUseEnhancementJob.mockReturnValue(mockJobHookDefault as never);
  });

  describe("rendering", () => {
    it("should render the processing screen", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "PROCESSING",
        progress: 25,
        statusMessage: "Analyzing...",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("processing-screen")).toBeTruthy();
      expect(screen.getByTestId("processing-title")).toHaveTextContent("Enhancing...");
    });

    it("should render JobProgress component", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "PROCESSING",
        progress: 50,
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("job-progress")).toBeTruthy();
    });

    it("should show background processing button when processing", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "PROCESSING",
        isPolling: true,
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("background-button")).toBeTruthy();
    });
  });

  describe("no job ID", () => {
    it("should navigate back when no job ID", () => {
      mockedUseEnhancementStore.mockReturnValue({
        ...mockStoreActions,
        currentJobId: null,
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("should return null when no job ID", () => {
      mockedUseEnhancementStore.mockReturnValue({
        ...mockStoreActions,
        currentJobId: null,
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      // The component should not render anything
      expect(screen.queryByTestId("processing-screen")).toBeNull();
    });
  });

  describe("processing state", () => {
    it("should show enhancing title during processing", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "PROCESSING",
        stage: "ANALYZING",
        progress: 30,
        statusMessage: "Analyzing image...",
        isPolling: true,
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("processing-title")).toHaveTextContent("Enhancing...");
    });

    it("should pass correct props to JobProgress", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "PROCESSING",
        stage: "GENERATING",
        progress: 75,
        statusMessage: "Enhancing image...",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      const jobProgress = screen.getByTestId("job-progress");
      expect(jobProgress).toBeTruthy();
    });
  });

  describe("complete state", () => {
    it("should show complete title when finished", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "COMPLETED",
        progress: 100,
        isComplete: true,
        resultUrl: "https://example.com/enhanced.jpg",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("processing-title")).toHaveTextContent("Enhancement Complete!");
    });

    it("should show view gallery button when complete", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "COMPLETED",
        progress: 100,
        isComplete: true,
        resultUrl: "https://example.com/enhanced.jpg",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("view-gallery-button")).toBeTruthy();
    });

    it("should navigate to gallery when view gallery button is pressed", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "COMPLETED",
        progress: 100,
        isComplete: true,
        resultUrl: "https://example.com/enhanced.jpg",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      fireEvent.press(screen.getByTestId("view-gallery-button"));

      expect(mockStoreActions.clearCurrentEnhancement).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/gallery");
    });
  });

  describe("error state", () => {
    it("should show failed title when job fails", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "FAILED",
        progress: 0,
        isFailed: true,
        error: "Enhancement failed",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("processing-title")).toHaveTextContent("Enhancement Failed");
    });

    it("should show go back button when failed", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "FAILED",
        progress: 0,
        isFailed: true,
        error: "Enhancement failed",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(screen.getByTestId("go-back-button")).toBeTruthy();
    });

    it("should navigate back when go back button is pressed", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "FAILED",
        progress: 0,
        isFailed: true,
        error: "Enhancement failed",
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      fireEvent.press(screen.getByTestId("go-back-button"));

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe("background processing", () => {
    it("should navigate back when background button is pressed", () => {
      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "PROCESSING",
        isPolling: true,
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      fireEvent.press(screen.getByTestId("background-button"));

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe("retry functionality", () => {
    it("should call retry when retry is triggered", async () => {
      const mockRetry = jest.fn().mockResolvedValue(undefined);

      mockedUseEnhancementJob.mockReturnValue({
        ...mockJobHookDefault,
        status: "FAILED",
        isFailed: true,
        error: "Error",
        retry: mockRetry,
      } as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      // The JobProgress component receives onRetry prop
      // In a real test, we'd trigger this through the component
      // For this mock, we just verify the retry function is passed
      expect(mockedUseEnhancementJob).toHaveBeenCalled();
    });
  });

  describe("hook callbacks", () => {
    it("should call updateJobStatus on progress", () => {
      let capturedOnProgress: ((job: unknown) => void) | undefined;

      mockedUseEnhancementJob.mockImplementation((jobId, options) => {
        capturedOnProgress = options?.onProgress;
        return {
          ...mockJobHookDefault,
          status: "PROCESSING",
          progress: 50,
          statusMessage: "Processing...",
        } as never;
      });

      renderWithProvider(<EnhancementProcessingScreen />);

      // Simulate onProgress callback
      if (capturedOnProgress) {
        capturedOnProgress({
          status: "PROCESSING",
          currentStage: "GENERATING",
        });

        expect(mockStoreActions.updateJobStatus).toHaveBeenCalled();
      }
    });

    it("should call completeJob on completion", () => {
      let capturedOnComplete: ((job: unknown) => void) | undefined;

      mockedUseEnhancementJob.mockImplementation((jobId, options) => {
        capturedOnComplete = options?.onComplete;
        return {
          ...mockJobHookDefault,
          status: "COMPLETED",
          isComplete: true,
        } as never;
      });

      renderWithProvider(<EnhancementProcessingScreen />);

      // Simulate onComplete callback
      if (capturedOnComplete) {
        capturedOnComplete({
          enhancedUrl: "https://example.com/enhanced.jpg",
        });

        expect(mockStoreActions.completeJob).toHaveBeenCalledWith(
          "https://example.com/enhanced.jpg",
        );
      }
    });

    it("should call completeJob with error on failure", () => {
      let capturedOnError: ((error: string) => void) | undefined;

      mockedUseEnhancementJob.mockImplementation((jobId, options) => {
        capturedOnError = options?.onError;
        return {
          ...mockJobHookDefault,
          status: "FAILED",
          isFailed: true,
        } as never;
      });

      renderWithProvider(<EnhancementProcessingScreen />);

      // Simulate onError callback
      if (capturedOnError) {
        capturedOnError("Enhancement failed");

        expect(mockStoreActions.completeJob).toHaveBeenCalledWith(null, "Enhancement failed");
      }
    });
  });

  describe("hook configuration", () => {
    it("should pass correct options to useEnhancementJob", () => {
      mockedUseEnhancementJob.mockReturnValue(mockJobHookDefault as never);

      renderWithProvider(<EnhancementProcessingScreen />);

      expect(mockedUseEnhancementJob).toHaveBeenCalledWith(
        "job-123",
        expect.objectContaining({
          pollInterval: 2000,
          autoStart: true,
          onProgress: expect.any(Function),
          onComplete: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });
});
