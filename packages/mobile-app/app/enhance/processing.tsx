/**
 * Enhancement Processing Screen
 * Shows progress while an image is being enhanced
 */

import { Check, Clock, Sparkles, Zap } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Progress, Spinner, Text, YStack } from "tamagui";

import { useEnhancementStore } from "@/stores";

const STAGES = [
  { key: "queued", label: "Queued", icon: Clock },
  { key: "analyzing", label: "Analyzing Image", icon: Sparkles },
  { key: "enhancing", label: "Enhancing", icon: Zap },
  { key: "completed", label: "Complete", icon: Check },
];

export default function EnhancementProcessingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const { currentJobId, checkJobStatus } = useEnhancementStore();

  useEffect(() => {
    if (!currentJobId) return;

    const pollInterval = setInterval(async () => {
      const status = await checkJobStatus(currentJobId);

      if (status === "COMPLETED") {
        setCurrentStageIndex(3);
        clearInterval(pollInterval);
      } else if (status === "PROCESSING") {
        setCurrentStageIndex(2);
      } else if (status === "ANALYZING") {
        setCurrentStageIndex(1);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentJobId, checkJobStatus]);

  const progress = ((currentStageIndex + 1) / STAGES.length) * 100;
  const isComplete = currentStageIndex === STAGES.length - 1;

  return (
    <YStack flex={1} backgroundColor="$background" paddingHorizontal="$4">
      <YStack paddingTop={insets.top + 16} paddingBottom="$4" alignItems="center">
        <Text fontSize="$8" fontWeight="700">
          {isComplete ? "Enhancement Complete!" : "Enhancing..."}
        </Text>
      </YStack>

      <YStack flex={1} justifyContent="center" alignItems="center" gap="$6">
        <YStack
          width={120}
          height={120}
          borderRadius={60}
          backgroundColor={isComplete ? "$green2" : "$blue2"}
          justifyContent="center"
          alignItems="center"
        >
          {isComplete
            ? <Check size={64} color="$green10" />
            : <Spinner size="large" color="$blue10" />}
        </YStack>

        <YStack width="100%" gap="$4">
          <Progress value={progress} backgroundColor="$gray4">
            <Progress.Indicator backgroundColor="$blue10" animation="bouncy" />
          </Progress>

          <YStack gap="$3">
            {STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const isActive = index === currentStageIndex;
              const isDone = index < currentStageIndex;

              return (
                <YStack
                  key={stage.key}
                  flexDirection="row"
                  alignItems="center"
                  gap="$3"
                  opacity={index > currentStageIndex ? 0.4 : 1}
                >
                  <YStack
                    width={32}
                    height={32}
                    borderRadius={16}
                    backgroundColor={isDone ? "$green10" : isActive ? "$blue10" : "$gray4"}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Icon size={16} color={isDone || isActive ? "white" : "$gray10"} />
                  </YStack>
                  <Text
                    fontWeight={isActive ? "600" : "400"}
                    color={isActive ? "$color" : "$gray10"}
                  >
                    {stage.label}
                  </Text>
                </YStack>
              );
            })}
          </YStack>
        </YStack>
      </YStack>

      <YStack paddingBottom={insets.bottom + 16}>
        {isComplete
          ? (
            <Button size="$5" theme="active" onPress={() => router.push("/(tabs)/gallery")}>
              View in Gallery
            </Button>
          )
          : (
            <Button size="$5" chromeless onPress={() => router.back()}>
              Process in Background
            </Button>
          )}
      </YStack>
    </YStack>
  );
}
