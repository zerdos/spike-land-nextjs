/**
 * Home/Enhance Screen
 * Main screen with image upload, token balance, and recent enhancements
 */

import { Ionicons } from "@expo/vector-icons";
import { ENHANCEMENT_COSTS } from "@spike-npm-land/shared";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H2,
  H4,
  Paragraph,
  Separator,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";

import { useEnhancementStore, useTokenStore } from "../../stores";

// ============================================================================
// Token Balance Card Component
// ============================================================================

function TokenBalanceCard() {
  const { balance, isLoading, fetchBalance } = useTokenStore();

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const estimatedEnhancements = {
    tier1K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_1K),
    tier2K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_2K),
    tier4K: Math.floor(balance / ENHANCEMENT_COSTS.TIER_4K),
  };

  return (
    <Card elevate bordered padding="$4" marginHorizontal="$4" marginTop="$4">
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$2">
          <Ionicons name="wallet-outline" size={24} color="#EAB308" />
          <YStack>
            {isLoading ? <Spinner size="small" /> : (
              <Text fontSize="$6" fontWeight="700">
                {balance} tokens
              </Text>
            )}
            <Text fontSize="$2" color="$gray10">
              Available balance
            </Text>
          </YStack>
        </XStack>

        <Button
          size="$3"
          theme="blue"
          onPress={() => router.push("/pricing")}
          icon={<Ionicons name="add-circle-outline" size={18} color="white" />}
        >
          Top Up
        </Button>
      </XStack>

      <Separator marginVertical="$3" />

      <YStack gap="$2">
        <Text fontSize="$2" color="$gray10">
          Estimated enhancements
        </Text>
        <XStack justifyContent="space-around">
          <YStack alignItems="center">
            <Text fontSize="$5" fontWeight="600">
              {estimatedEnhancements.tier1K}
            </Text>
            <Text fontSize="$1" color="$gray10">
              1K quality
            </Text>
          </YStack>
          <YStack alignItems="center">
            <Text fontSize="$5" fontWeight="600">
              {estimatedEnhancements.tier2K}
            </Text>
            <Text fontSize="$1" color="$gray10">
              2K quality
            </Text>
          </YStack>
          <YStack alignItems="center">
            <Text fontSize="$5" fontWeight="600">
              {estimatedEnhancements.tier4K}
            </Text>
            <Text fontSize="$1" color="$gray10">
              4K quality
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Quick Enhance CTA Component
// ============================================================================

function QuickEnhanceCTA() {
  const handleEnhance = useCallback(() => {
    router.push("/enhance/upload");
  }, []);

  return (
    <Card
      elevate
      bordered
      padding="$5"
      marginHorizontal="$4"
      marginTop="$4"
      backgroundColor="$blue2"
      pressStyle={{ scale: 0.98 }}
      onPress={handleEnhance}
    >
      <YStack alignItems="center" gap="$3">
        <View
          backgroundColor="$blue5"
          borderRadius="$10"
          padding="$4"
        >
          <Ionicons name="sparkles" size={40} color="#3B82F6" />
        </View>

        <YStack alignItems="center" gap="$1">
          <H4>Enhance Your Photos</H4>
          <Paragraph textAlign="center" color="$gray11" fontSize="$3">
            Transform your images with AI-powered enhancement
          </Paragraph>
        </YStack>

        <Button
          size="$4"
          theme="blue"
          width="100%"
          icon={<Ionicons name="camera-outline" size={20} color="white" />}
        >
          Start Enhancing
        </Button>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Recent Enhancement Item Component
// ============================================================================

interface RecentEnhancementItemProps {
  id: string;
  imageUrl: string;
  name: string;
  createdAt: Date;
}

function RecentEnhancementItem({ id, imageUrl, name, createdAt }: RecentEnhancementItemProps) {
  const handlePress = useCallback(() => {
    router.push(`/enhance/${id}`);
  }, [id]);

  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable onPress={handlePress} style={styles.recentItem}>
      <Card elevate bordered overflow="hidden" width={140}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.recentImage}
          contentFit="cover"
          transition={200}
        />
        <YStack padding="$2">
          <Text fontSize="$2" fontWeight="500" numberOfLines={1}>
            {name}
          </Text>
          <Text fontSize="$1" color="$gray10">
            {formattedDate}
          </Text>
        </YStack>
      </Card>
    </Pressable>
  );
}

// ============================================================================
// Recent Enhancements Section Component
// ============================================================================

function RecentEnhancementsSection() {
  const { recentImages, isLoadingHistory, fetchRecentImages } = useEnhancementStore();

  useEffect(() => {
    fetchRecentImages();
  }, [fetchRecentImages]);

  if (isLoadingHistory && recentImages.length === 0) {
    return (
      <YStack padding="$4" alignItems="center">
        <Spinner size="large" />
        <Text marginTop="$2" color="$gray10">
          Loading recent images...
        </Text>
      </YStack>
    );
  }

  if (recentImages.length === 0) {
    return (
      <YStack padding="$6" alignItems="center" gap="$2">
        <Ionicons name="images-outline" size={48} color="#9CA3AF" />
        <Text color="$gray10" textAlign="center">
          No enhanced images yet.{"\n"}Start by enhancing your first photo!
        </Text>
      </YStack>
    );
  }

  return (
    <YStack marginTop="$4">
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$4">
        <H4>Recent Enhancements</H4>
        <Button
          size="$2"
          chromeless
          onPress={() => router.push("/gallery")}
        >
          <Text color="$blue10" fontSize="$2">
            See All
          </Text>
        </Button>
      </XStack>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentList}
        data={recentImages.slice(0, 10)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecentEnhancementItem
            id={item.id}
            imageUrl={item.originalUrl}
            name={item.name}
            createdAt={item.createdAt}
          />
        )}
      />
    </YStack>
  );
}

// ============================================================================
// Main Home Screen Component
// ============================================================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { fetchRecentImages, isLoadingHistory } = useEnhancementStore();
  const { fetchBalance } = useTokenStore();

  const handleRefresh = useCallback(() => {
    fetchBalance();
    fetchRecentImages(true);
  }, [fetchBalance, fetchRecentImages]);

  return (
    <View flex={1} backgroundColor="$background">
      <FlatList
        data={[{ key: "content" }]}
        renderItem={() => (
          <YStack paddingBottom={insets.bottom + 20}>
            {/* Header */}
            <YStack paddingHorizontal="$4" paddingTop="$4">
              <H2>Pixel Enhance</H2>
              <Paragraph color="$gray11">
                AI-powered image enhancement
              </Paragraph>
            </YStack>

            {/* Token Balance */}
            <TokenBalanceCard />

            {/* Quick Enhance CTA */}
            <QuickEnhanceCTA />

            {/* Recent Enhancements */}
            <RecentEnhancementsSection />
          </YStack>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingHistory}
            onRefresh={handleRefresh}
          />
        }
        keyExtractor={(item) => item.key}
      />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  recentList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  recentItem: {
    marginRight: 12,
  },
  recentImage: {
    width: 140,
    height: 100,
  },
});
