/**
 * Home/Landing Screen
 * Main screen with hero section, features, before/after comparison, and quick actions
 */

import { Ionicons } from "@expo/vector-icons";
import { ENHANCEMENT_COSTS } from "@spike-npm-land/shared";
import { Clock, Coins, Image as ImageIcon, Layers } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { type Href, router } from "expo-router";
import { useCallback, useEffect } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H2,
  H4,
  Paragraph,
  ScrollView,
  Separator,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";

import { BeforeAfterSlider } from "../../components/BeforeAfterSlider";
import { createFeatureCards, FeatureCard } from "../../components/FeatureCard";
import { HeroSection } from "../../components/HeroSection";
import { useEnhancementStore, useTokenStore } from "../../stores";

// Sample before/after images for demo
const SAMPLE_IMAGES = {
  beforeUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=60",
  afterUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=95",
};

// Pre-generate feature cards data
const FEATURE_CARDS = createFeatureCards({ Clock, Image: ImageIcon, Layers, Coins });

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
          onPress={() => router.push("/pricing" as Href)}
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
// Features Section Component
// ============================================================================

function FeaturesSection() {
  return (
    <YStack marginTop="$6" paddingHorizontal="$4" gap="$4">
      <YStack alignItems="center" gap="$2">
        <H4 textAlign="center">Why Pixel?</H4>
        <Paragraph textAlign="center" color="$gray11" fontSize="$3">
          The fastest way to restore your memories
        </Paragraph>
      </YStack>

      <YStack gap="$3">
        <XStack gap="$3">
          <View flex={1}>
            <FeatureCard
              icon={FEATURE_CARDS[0].icon}
              title={FEATURE_CARDS[0].title}
              description={FEATURE_CARDS[0].description}
              variant={FEATURE_CARDS[0].variant}
              testID="feature-card-0"
            />
          </View>
          <View flex={1}>
            <FeatureCard
              icon={FEATURE_CARDS[1].icon}
              title={FEATURE_CARDS[1].title}
              description={FEATURE_CARDS[1].description}
              variant={FEATURE_CARDS[1].variant}
              testID="feature-card-1"
            />
          </View>
        </XStack>
        <XStack gap="$3">
          <View flex={1}>
            <FeatureCard
              icon={FEATURE_CARDS[2].icon}
              title={FEATURE_CARDS[2].title}
              description={FEATURE_CARDS[2].description}
              variant={FEATURE_CARDS[2].variant}
              testID="feature-card-2"
            />
          </View>
          <View flex={1}>
            <FeatureCard
              icon={FEATURE_CARDS[3].icon}
              title={FEATURE_CARDS[3].title}
              description={FEATURE_CARDS[3].description}
              variant={FEATURE_CARDS[3].variant}
              testID="feature-card-3"
            />
          </View>
        </XStack>
      </YStack>
    </YStack>
  );
}

// ============================================================================
// Before/After Section Component
// ============================================================================

function BeforeAfterSection() {
  return (
    <YStack marginTop="$6" paddingHorizontal="$4" gap="$4">
      <YStack alignItems="center" gap="$2">
        <H4 textAlign="center">See the Transformation</H4>
        <Paragraph textAlign="center" color="$gray11" fontSize="$3">
          Slide to compare before and after
        </Paragraph>
      </YStack>

      <BeforeAfterSlider
        beforeImageUrl={SAMPLE_IMAGES.beforeUrl}
        afterImageUrl={SAMPLE_IMAGES.afterUrl}
        height={200}
        beforeLabel="Original"
        afterLabel="Enhanced"
        testID="before-after-slider"
      />
    </YStack>
  );
}

// ============================================================================
// Quick Actions Section Component
// ============================================================================

function QuickActionsSection() {
  const handleEnhance = useCallback(() => {
    router.push("/enhance/upload" as Href);
  }, []);

  const handleAlbums = useCallback(() => {
    router.push("/albums" as Href);
  }, []);

  return (
    <YStack marginTop="$6" paddingHorizontal="$4" gap="$3">
      <H4>Quick Actions</H4>

      <XStack gap="$3">
        <Card
          flex={1}
          elevate
          bordered
          padding="$4"
          backgroundColor="$blue2"
          pressStyle={{ scale: 0.98 }}
          onPress={handleEnhance}
        >
          <YStack alignItems="center" gap="$2">
            <View
              backgroundColor="$blue5"
              borderRadius="$10"
              padding="$3"
            >
              <Ionicons name="sparkles" size={28} color="#3B82F6" />
            </View>
            <Text fontWeight="600" textAlign="center">
              Enhance Photo
            </Text>
          </YStack>
        </Card>

        <Card
          flex={1}
          elevate
          bordered
          padding="$4"
          backgroundColor="$purple2"
          pressStyle={{ scale: 0.98 }}
          onPress={handleAlbums}
        >
          <YStack alignItems="center" gap="$2">
            <View
              backgroundColor="$purple5"
              borderRadius="$10"
              padding="$3"
            >
              <Ionicons name="albums" size={28} color="#A855F7" />
            </View>
            <Text fontWeight="600" textAlign="center">
              View Albums
            </Text>
          </YStack>
        </Card>
      </XStack>
    </YStack>
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
    router.push(`/enhance/${id}` as Href);
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
    return null; // Hide section when no images
  }

  return (
    <YStack marginTop="$6">
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$4">
        <H4>Recent Enhancements</H4>
        <Button
          size="$2"
          chromeless
          onPress={() => router.push("/gallery" as Href)}
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
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoadingHistory}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Hero Section */}
        <HeroSection testID="hero-section" />

        {/* Before/After Comparison */}
        <BeforeAfterSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* Token Balance */}
        <TokenBalanceCard />

        {/* Quick Actions */}
        <QuickActionsSection />

        {/* Recent Enhancements */}
        <RecentEnhancementsSection />

        {/* Bottom padding */}
        <View height={40} />
      </ScrollView>
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
