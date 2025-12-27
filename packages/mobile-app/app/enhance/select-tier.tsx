/**
 * Tier Selection Screen
 * Display tier options with costs and token balance check
 */

import { Ionicons } from "@expo/vector-icons";
import type { EnhancementTier } from "@spike-npm-land/shared";
import { ENHANCEMENT_COSTS, IMAGE_CONSTRAINTS } from "@spike-npm-land/shared";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H3,
  H4,
  Paragraph,
  Progress,
  ScrollView,
  Separator,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";

import { useEnhancement } from "../../hooks";
import { useEnhancementStore, useTokenStore } from "../../stores";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PREVIEW_WIDTH = SCREEN_WIDTH - 64;
const PREVIEW_HEIGHT = 180;

// ============================================================================
// Types
// ============================================================================

type SelectableTier = "TIER_1K" | "TIER_2K" | "TIER_4K";

interface TierOption {
  tier: SelectableTier;
  name: string;
  resolution: string;
  dimension: number;
  cost: number;
  description: string;
  badge?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TIER_OPTIONS: TierOption[] = [
  {
    tier: "TIER_1K",
    name: "1K Quality",
    resolution: "1024px",
    dimension: IMAGE_CONSTRAINTS.TIER_DIMENSIONS.TIER_1K,
    cost: ENHANCEMENT_COSTS.TIER_1K,
    description: "Good for social media and web use",
  },
  {
    tier: "TIER_2K",
    name: "2K Quality",
    resolution: "2048px",
    dimension: IMAGE_CONSTRAINTS.TIER_DIMENSIONS.TIER_2K,
    cost: ENHANCEMENT_COSTS.TIER_2K,
    description: "Great for prints and high-res displays",
    badge: "Popular",
  },
  {
    tier: "TIER_4K",
    name: "4K Quality",
    resolution: "4096px",
    dimension: IMAGE_CONSTRAINTS.TIER_DIMENSIONS.TIER_4K,
    cost: ENHANCEMENT_COSTS.TIER_4K,
    description: "Maximum quality for professional use",
    badge: "Best",
  },
];

// ============================================================================
// Tier Card Component
// ============================================================================

interface TierCardProps {
  option: TierOption;
  isSelected: boolean;
  canAfford: boolean;
  onSelect: () => void;
}

function TierCard({ option, isSelected, canAfford, onSelect }: TierCardProps) {
  const isDisabled = !canAfford;

  return (
    <Card
      elevate={isSelected}
      bordered
      borderColor={isSelected ? "$blue8" : "$gray6"}
      borderWidth={isSelected ? 2 : 1}
      backgroundColor={isSelected ? "$blue2" : "$background"}
      padding="$4"
      opacity={isDisabled ? 0.6 : 1}
      pressStyle={isDisabled ? {} : { scale: 0.98, opacity: 0.9 }}
      onPress={isDisabled ? undefined : onSelect}
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            <Text fontSize="$5" fontWeight="700">
              {option.name}
            </Text>
            {option.badge && (
              <View
                backgroundColor={option.badge === "Best" ? "$green5" : "$blue5"}
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
              >
                <Text
                  fontSize="$1"
                  fontWeight="600"
                  color={option.badge === "Best" ? "$green11" : "$blue11"}
                >
                  {option.badge}
                </Text>
              </View>
            )}
          </XStack>

          <Text fontSize="$2" color="$gray10">
            Up to {option.resolution} max dimension
          </Text>

          <Text fontSize="$2" color="$gray11" marginTop="$1">
            {option.description}
          </Text>
        </YStack>

        <YStack alignItems="flex-end" gap="$1">
          <XStack alignItems="center" gap="$1">
            <Ionicons name="wallet-outline" size={16} color="#EAB308" />
            <Text fontSize="$5" fontWeight="700">
              {option.cost}
            </Text>
          </XStack>
          <Text fontSize="$1" color="$gray10">
            tokens
          </Text>

          {!canAfford && (
            <Text fontSize="$1" color="$red10" marginTop="$1">
              Insufficient
            </Text>
          )}
        </YStack>
      </XStack>

      {/* Selection indicator */}
      {isSelected && (
        <View
          position="absolute"
          top="$2"
          left="$2"
          backgroundColor="$blue9"
          borderRadius="$10"
          padding="$1"
        >
          <Ionicons name="checkmark" size={14} color="white" />
        </View>
      )}
    </Card>
  );
}

// ============================================================================
// Enhancement Progress Component
// ============================================================================

interface EnhancementProgressProps {
  progress: number;
  message: string;
  onCancel: () => void;
}

function EnhancementProgress({ progress, message, onCancel }: EnhancementProgressProps) {
  return (
    <Card elevate bordered padding="$5" marginHorizontal="$4">
      <YStack alignItems="center" gap="$4">
        <Spinner size="large" color="$blue10" />

        <YStack alignItems="center" gap="$2" width="100%">
          <Text fontSize="$4" fontWeight="600">
            Enhancing...
          </Text>
          <Text fontSize="$2" color="$gray10">
            {message}
          </Text>

          <Progress value={progress} width="100%" marginTop="$2">
            <Progress.Indicator animation="bouncy" backgroundColor="$blue9" />
          </Progress>

          <Text fontSize="$1" color="$gray10">
            {Math.round(progress)}% complete
          </Text>
        </YStack>

        <Button
          size="$3"
          variant="outlined"
          theme="red"
          onPress={onCancel}
        >
          Cancel
        </Button>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Main Tier Selection Screen Component
// ============================================================================

export default function SelectTierScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    imageUri: string;
    fileName: string;
    width: string;
    height: string;
  }>();

  const [selectedTier, setSelectedTier] = useState<SelectableTier>("TIER_2K");
  const { balance } = useTokenStore();
  const { setSelectedTier: storeSetTier } = useEnhancementStore();

  const {
    status,
    progress,
    progressMessage,
    error,
    startUpload,
    selectTier,
    startEnhancement,
    cancelEnhancement,
    canAffordTier,
  } = useEnhancement();

  const isProcessing = status === "uploading" || status === "enhancing" || status === "polling";

  const handleTierSelect = useCallback((tier: SelectableTier) => {
    setSelectedTier(tier);
    selectTier(tier);
    storeSetTier(tier);
  }, [selectTier, storeSetTier]);

  const handleStartEnhancement = useCallback(async () => {
    if (!params.imageUri) {
      Alert.alert("Error", "No image selected");
      return;
    }

    if (!canAffordTier(selectedTier)) {
      Alert.alert(
        "Insufficient Tokens",
        `You need ${
          ENHANCEMENT_COSTS[selectedTier]
        } tokens for ${selectedTier} quality. Would you like to get more tokens?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Get Tokens", onPress: () => router.push("/pricing") },
        ],
      );
      return;
    }

    // Start the upload
    const uploaded = await startUpload({
      uri: params.imageUri,
      fileName: params.fileName || `image_${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      width: parseInt(params.width || "0", 10),
      height: parseInt(params.height || "0", 10),
    });

    if (!uploaded) {
      Alert.alert("Upload Failed", error || "Failed to upload image. Please try again.");
      return;
    }

    // Select tier and start enhancement
    selectTier(selectedTier);
    const success = await startEnhancement();

    if (success) {
      // Navigate to the enhancement detail screen
      router.replace("/enhance/processing");
    }
  }, [
    params,
    selectedTier,
    canAffordTier,
    startUpload,
    selectTier,
    startEnhancement,
    error,
  ]);

  const handleGoBack = useCallback(() => {
    if (isProcessing) {
      Alert.alert(
        "Cancel Enhancement?",
        "Your enhancement is in progress. Are you sure you want to cancel?",
        [
          { text: "Continue", style: "cancel" },
          {
            text: "Cancel Enhancement",
            style: "destructive",
            onPress: () => {
              cancelEnhancement();
              router.back();
            },
          },
        ],
      );
    } else {
      router.back();
    }
  }, [isProcessing, cancelEnhancement]);

  const totalCost = ENHANCEMENT_COSTS[selectedTier];
  const canAfford = balance >= totalCost;

  return (
    <View flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingBottom="$3"
        paddingHorizontal="$4"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$background"
      >
        <Button
          size="$3"
          chromeless
          icon={<Ionicons name="arrow-back" size={24} color="#666" />}
          onPress={handleGoBack}
          disabled={isProcessing}
        />
        <H3>Select Quality</H3>
        <View width={40} />
      </XStack>

      <ScrollView flex={1} contentContainerStyle={styles.scrollContent}>
        {/* Image Preview */}
        {params.imageUri && (
          <Card
            elevate
            bordered
            overflow="hidden"
            marginHorizontal="$4"
            marginBottom="$4"
          >
            <Image
              source={{ uri: params.imageUri }}
              style={styles.previewImage}
              contentFit="cover"
              transition={200}
            />
          </Card>
        )}

        {/* Processing state */}
        {isProcessing
          ? (
            <EnhancementProgress
              progress={progress}
              message={progressMessage}
              onCancel={cancelEnhancement}
            />
          )
          : (
            <>
              {/* Error message */}
              {error && (
                <Card
                  backgroundColor="$red2"
                  borderColor="$red6"
                  bordered
                  marginHorizontal="$4"
                  marginBottom="$4"
                  padding="$3"
                >
                  <XStack alignItems="center" gap="$2">
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text color="$red11" flex={1}>
                      {error}
                    </Text>
                  </XStack>
                </Card>
              )}

              {/* Token Balance */}
              <Card
                bordered
                backgroundColor="$gray2"
                marginHorizontal="$4"
                marginBottom="$4"
                padding="$3"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap="$2">
                    <Ionicons name="wallet-outline" size={20} color="#EAB308" />
                    <Text fontSize="$3" fontWeight="600">
                      Your Balance
                    </Text>
                  </XStack>
                  <Text fontSize="$4" fontWeight="700">
                    {balance} tokens
                  </Text>
                </XStack>
              </Card>

              {/* Tier Options */}
              <YStack paddingHorizontal="$4" gap="$3">
                <H4>Choose Enhancement Quality</H4>

                {TIER_OPTIONS.map((option) => (
                  <TierCard
                    key={option.tier}
                    option={option}
                    isSelected={selectedTier === option.tier}
                    canAfford={canAffordTier(option.tier)}
                    onSelect={() => handleTierSelect(option.tier)}
                  />
                ))}
              </YStack>

              <Separator marginVertical="$4" />

              {/* Summary and CTA */}
              <YStack paddingHorizontal="$4" gap="$3">
                <Card bordered padding="$3" backgroundColor="$gray2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$3" color="$gray11">
                      Enhancement Cost
                    </Text>
                    <XStack alignItems="center" gap="$1">
                      <Ionicons name="wallet-outline" size={16} color="#EAB308" />
                      <Text fontSize="$4" fontWeight="700">
                        {totalCost} tokens
                      </Text>
                    </XStack>
                  </XStack>

                  {!canAfford && (
                    <XStack alignItems="center" gap="$1" marginTop="$2">
                      <Ionicons name="warning-outline" size={14} color="#EF4444" />
                      <Text fontSize="$2" color="$red10">
                        You need {totalCost - balance} more tokens
                      </Text>
                    </XStack>
                  )}
                </Card>

                <Button
                  size="$5"
                  theme={canAfford ? "blue" : "gray"}
                  disabled={!canAfford}
                  onPress={handleStartEnhancement}
                  icon={<Ionicons name="sparkles" size={20} color="white" />}
                >
                  {canAfford ? "Start Enhancement" : "Insufficient Tokens"}
                </Button>

                {!canAfford && (
                  <Button
                    size="$4"
                    variant="outlined"
                    theme="blue"
                    onPress={() => router.push("/pricing")}
                  >
                    Get More Tokens
                  </Button>
                )}
              </YStack>
            </>
          )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  previewImage: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
  },
});
