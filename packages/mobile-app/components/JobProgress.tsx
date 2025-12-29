/**
 * JobProgress Component
 * Displays job progress with circular indicator and status text
 */

import type { JobStatus, PipelineStage } from "@spike-npm-land/shared";
import { AlertCircle, Check, Clock, Image, Sparkles, Zap } from "@tamagui/lucide-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { Button, Circle, Spinner, Text, XStack, YStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

export interface JobProgressProps {
  /** Current job status */
  status: JobStatus | null;
  /** Current pipeline stage */
  stage: PipelineStage | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  statusMessage: string;
  /** Error message if job failed */
  error: string | null;
  /** Whether the job is complete */
  isComplete: boolean;
  /** Whether the job failed */
  isFailed: boolean;
  /** Callback when retry is pressed */
  onRetry?: () => void;
  /** Whether to show the retry button on error */
  showRetryButton?: boolean;
  /** Size variant */
  size?: "small" | "medium" | "large";
}

// ============================================================================
// Stage Configuration
// ============================================================================

interface StageConfig {
  key: string;
  label: string;
  icon: typeof Clock;
  stage: PipelineStage | null;
}

const STAGES: StageConfig[] = [
  { key: "queued", label: "Queued", icon: Clock, stage: null },
  { key: "analyzing", label: "Analyzing", icon: Image, stage: "ANALYZING" },
  { key: "enhancing", label: "Enhancing", icon: Sparkles, stage: "GENERATING" },
  { key: "complete", label: "Complete", icon: Check, stage: null },
];

// ============================================================================
// Size Configuration
// ============================================================================

const SIZE_CONFIG = {
  small: {
    circleSize: 80,
    iconSize: 40,
    stepIconSize: 12,
    stepCircleSize: 24,
    fontSize: "$3" as const,
    stepFontSize: "$2" as const,
  },
  medium: {
    circleSize: 120,
    iconSize: 64,
    stepIconSize: 16,
    stepCircleSize: 32,
    fontSize: "$5" as const,
    stepFontSize: "$3" as const,
  },
  large: {
    circleSize: 160,
    iconSize: 80,
    stepIconSize: 20,
    stepCircleSize: 40,
    fontSize: "$7" as const,
    stepFontSize: "$4" as const,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function getStageIndex(stage: PipelineStage | null, status: JobStatus | null): number {
  if (status === "COMPLETED") return 3;
  if (status === "FAILED" || status === "CANCELLED") return -1;

  switch (stage) {
    case "ANALYZING":
    case "CROPPING":
      return 1;
    case "PROMPTING":
    case "GENERATING":
      return 2;
    default:
      return 0;
  }
}

function getStatusColor(status: JobStatus | null, isFailed: boolean, isComplete: boolean): string {
  if (isComplete) return "$green10";
  if (isFailed) return "$red10";
  if (status === "PROCESSING") return "$blue10";
  return "$gray10";
}

// ============================================================================
// Animated Circle Component
// ============================================================================

interface AnimatedCircleProps {
  size: number;
  progress: number;
  isComplete: boolean;
  isFailed: boolean;
  children: React.ReactNode;
}

function AnimatedProgressCircle({
  size,
  progress,
  isComplete,
  isFailed,
  children,
}: AnimatedCircleProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress / 100,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress, animatedValue]);

  useEffect(() => {
    if (!isComplete && !isFailed && progress > 0 && progress < 100) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseValue.setValue(1);
    }
  }, [isComplete, isFailed, progress, pulseValue]);

  const backgroundColor = isComplete
    ? "#22c55e"
    : isFailed
    ? "#ef4444"
    : "#3b82f6";

  const backgroundOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });

  return (
    <Animated.View
      style={[
        styles.progressCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: pulseValue }],
        },
      ]}
      testID="animated-progress-circle"
    >
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            opacity: backgroundOpacity,
          },
        ]}
        testID="progress-fill"
      />
      <YStack
        position="absolute"
        width={size}
        height={size}
        justifyContent="center"
        alignItems="center"
      >
        {children}
      </YStack>
    </Animated.View>
  );
}

// ============================================================================
// Progress Steps Component
// ============================================================================

interface ProgressStepsProps {
  currentStageIndex: number;
  isComplete: boolean;
  isFailed: boolean;
  sizeConfig: typeof SIZE_CONFIG.medium;
}

function ProgressSteps(
  { currentStageIndex, isComplete, isFailed, sizeConfig }: ProgressStepsProps,
) {
  return (
    <YStack gap="$3" width="100%">
      {STAGES.map((stage, index) => {
        const Icon = stage.icon;
        const isActive = index === currentStageIndex;
        const isDone = index < currentStageIndex || (isComplete && index === STAGES.length - 1);
        const isError = isFailed && index === currentStageIndex;

        let backgroundColor = "$gray4";
        let iconColor: string = "$gray10";

        if (isDone) {
          backgroundColor = "$green10";
          iconColor = "white";
        } else if (isActive && !isFailed) {
          backgroundColor = "$blue10";
          iconColor = "white";
        } else if (isError) {
          backgroundColor = "$red10";
          iconColor = "white";
        }

        return (
          <XStack
            key={stage.key}
            alignItems="center"
            gap="$3"
            opacity={index > currentStageIndex && !isDone ? 0.4 : 1}
            testID={`progress-step-${stage.key}`}
          >
            <Circle
              size={sizeConfig.stepCircleSize}
              backgroundColor={backgroundColor}
              justifyContent="center"
              alignItems="center"
            >
              <Icon size={sizeConfig.stepIconSize} color={iconColor} />
            </Circle>
            <Text
              fontSize={sizeConfig.stepFontSize}
              fontWeight={isActive ? "600" : "400"}
              color={isActive ? "$color" : "$gray10"}
            >
              {stage.label}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JobProgress({
  status,
  stage,
  progress,
  statusMessage,
  error,
  isComplete,
  isFailed,
  onRetry,
  showRetryButton = true,
  size = "medium",
}: JobProgressProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const currentStageIndex = getStageIndex(stage, status);
  const statusColor = getStatusColor(status, isFailed, isComplete);

  return (
    <YStack
      alignItems="center"
      gap="$6"
      padding="$4"
      testID="job-progress"
    >
      {/* Main Progress Circle */}
      <AnimatedProgressCircle
        size={sizeConfig.circleSize}
        progress={progress}
        isComplete={isComplete}
        isFailed={isFailed}
      >
        {isComplete
          ? <Check size={sizeConfig.iconSize} color="white" testID="complete-icon" />
          : isFailed
          ? <AlertCircle size={sizeConfig.iconSize} color="white" testID="error-icon" />
          : <Spinner size="large" color="white" testID="loading-spinner" />}
      </AnimatedProgressCircle>

      {/* Status Text */}
      <YStack alignItems="center" gap="$2">
        <Text
          fontSize={sizeConfig.fontSize}
          fontWeight="600"
          color={statusColor}
          textAlign="center"
          testID="status-text"
        >
          {isFailed
            ? "Enhancement Failed"
            : isComplete
            ? "Enhancement Complete!"
            : statusMessage || "Processing..."}
        </Text>

        {/* Progress Percentage */}
        {!isComplete && !isFailed && (
          <Text
            fontSize="$3"
            color="$gray10"
            testID="progress-percentage"
          >
            {Math.round(progress)}%
          </Text>
        )}

        {/* Error Message */}
        {isFailed && error && (
          <Text
            fontSize="$3"
            color="$red10"
            textAlign="center"
            testID="error-message"
          >
            {error}
          </Text>
        )}
      </YStack>

      {/* Progress Steps */}
      <ProgressSteps
        currentStageIndex={currentStageIndex}
        isComplete={isComplete}
        isFailed={isFailed}
        sizeConfig={sizeConfig}
      />

      {/* Retry Button */}
      {isFailed && showRetryButton && onRetry && (
        <Button
          size="$4"
          theme="red"
          onPress={onRetry}
          marginTop="$4"
          testID="retry-button"
        >
          <Button.Icon>
            <Zap size={16} />
          </Button.Icon>
          <Button.Text>Try Again</Button.Text>
        </Button>
      )}
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  progressCircle: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  progressFill: {
    position: "absolute",
  },
});
