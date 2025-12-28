/**
 * Enhancement Processing Screen
 * Shows progress while an image is being enhanced with real-time polling
 */

import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, YStack } from "tamagui";

import { JobProgress } from "@/components/JobProgress";
import { useEnhancementJob } from "@/hooks/useEnhancementJob";
import { useEnhancementStore } from "@/stores";

export default function EnhancementProcessingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Get job ID and store actions
  const {
    currentJobId,
    updateJobStatus,
    completeJob,
    clearCurrentEnhancement,
  } = useEnhancementStore();

  // Hook for polling job status
  const {
    status,
    stage,
    progress,
    statusMessage,
    error,
    isComplete,
    isFailed,
    retry,
  } = useEnhancementJob(currentJobId, {
    pollInterval: 2000,
    autoStart: true,
    onProgress: (job) => {
      // Sync with store
      updateJobStatus({
        status: job.status,
        stage: job.currentStage,
        progress,
        statusMessage,
      });
    },
    onComplete: (job) => {
      completeJob(job.enhancedUrl);
    },
    onError: (errorMessage) => {
      completeJob(null, errorMessage);
    },
  });

  // Handle navigation to gallery on completion
  const handleViewInGallery = useCallback(() => {
    clearCurrentEnhancement();
    router.push("/(tabs)/gallery");
  }, [clearCurrentEnhancement, router]);

  // Handle background processing
  const handleProcessInBackground = useCallback(() => {
    router.back();
  }, [router]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  // Handle no job ID scenario
  useEffect(() => {
    if (!currentJobId) {
      // No job to process, go back
      router.back();
    }
  }, [currentJobId, router]);

  // Don't render if no job ID
  if (!currentJobId) {
    return null;
  }

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingHorizontal="$4"
      testID="processing-screen"
    >
      {/* Header */}
      <YStack
        paddingTop={insets.top + 16}
        paddingBottom="$4"
        alignItems="center"
      >
        <Text
          fontSize="$8"
          fontWeight="700"
          testID="processing-title"
        >
          {isComplete
            ? "Enhancement Complete!"
            : isFailed
            ? "Enhancement Failed"
            : "Enhancing..."}
        </Text>
      </YStack>

      {/* Progress Content */}
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
      >
        <JobProgress
          status={status}
          stage={stage}
          progress={progress}
          statusMessage={statusMessage}
          error={error}
          isComplete={isComplete}
          isFailed={isFailed}
          onRetry={handleRetry}
          showRetryButton={true}
          size="large"
        />
      </YStack>

      {/* Bottom Actions */}
      <YStack
        paddingBottom={insets.bottom + 16}
        gap="$3"
      >
        {isComplete
          ? (
            <Button
              size="$5"
              theme="active"
              onPress={handleViewInGallery}
              testID="view-gallery-button"
            >
              View in Gallery
            </Button>
          )
          : isFailed
          ? (
            <Button
              size="$5"
              chromeless
              onPress={handleProcessInBackground}
              testID="go-back-button"
            >
              Go Back
            </Button>
          )
          : (
            <Button
              size="$5"
              chromeless
              onPress={handleProcessInBackground}
              testID="background-button"
            >
              Process in Background
            </Button>
          )}
      </YStack>
    </YStack>
  );
}
