/**
 * Token Balance Screen
 * Displays current balance, regeneration timer, and quick actions
 */

import { ENHANCEMENT_COSTS, TOKEN_REGENERATION } from "@spike-npm-land/shared";
import { Link, useRouter } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import {
  Button,
  Card,
  H1,
  H3,
  H4,
  Paragraph,
  Separator,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";

import { useTokenBalance } from "../../hooks";

// ============================================================================
// Component
// ============================================================================

export default function TokensScreen() {
  const router = useRouter();
  const {
    balance,
    maxBalance,
    tier,
    isLoading,
    error,
    formattedTimeUntilRegen,
    estimatedEnhancements,
    refetch,
  } = useTokenBalance();

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (isLoading && balance === 0) {
    return (
      <View style={styles.centered}>
        <Spinner size="large" color="$blue10" />
        <Paragraph marginTop="$4">Loading your tokens...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
    >
      {/* Balance Card */}
      <Card
        elevate
        bordered
        padding="$6"
        marginBottom="$4"
        backgroundColor="$blue2"
      >
        <YStack alignItems="center" gap="$2">
          <Paragraph color="$gray11" size="$4">
            Current Balance
          </Paragraph>
          <H1 size="$12" color="$blue10" fontWeight="bold">
            {balance}
          </H1>
          <Paragraph color="$gray10" size="$3">
            tokens available
          </Paragraph>

          {formattedTimeUntilRegen && balance < maxBalance && (
            <XStack
              alignItems="center"
              gap="$2"
              marginTop="$2"
              backgroundColor="$gray3"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$4"
            >
              <Text color="$gray11" fontSize="$2">
                Next free token in: {formattedTimeUntilRegen}
              </Text>
            </XStack>
          )}

          {balance >= maxBalance && (
            <XStack
              alignItems="center"
              gap="$2"
              marginTop="$2"
              backgroundColor="$green3"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$4"
            >
              <Text color="$green11" fontSize="$2">
                Balance at maximum
              </Text>
            </XStack>
          )}
        </YStack>
      </Card>

      {/* Action Buttons */}
      <XStack gap="$3" marginBottom="$4">
        <Button
          flex={1}
          size="$5"
          theme="blue"
          onPress={() => router.push("/tokens/packages")}
        >
          Buy Tokens
        </Button>
        <Link href="/voucher" asChild>
          <Button flex={1} size="$5" variant="outlined" theme="gray">
            Redeem Code
          </Button>
        </Link>
      </XStack>

      {/* Estimated Enhancements */}
      <Card elevate bordered padding="$4" marginBottom="$4">
        <H4 marginBottom="$3">What You Can Do</H4>
        <Paragraph color="$gray11" size="$3" marginBottom="$3">
          Estimated image enhancements with your current balance:
        </Paragraph>

        <XStack justifyContent="space-around" gap="$3">
          <YStack alignItems="center" flex={1}>
            <View
              backgroundColor="$blue3"
              borderRadius="$10"
              width={56}
              height={56}
              alignItems="center"
              justifyContent="center"
              marginBottom="$2"
            >
              <H3 color="$blue10">{estimatedEnhancements.tier1K}</H3>
            </View>
            <Paragraph size="$2" fontWeight="600">
              1K Quality
            </Paragraph>
            <Paragraph size="$1" color="$gray10">
              {ENHANCEMENT_COSTS.TIER_1K} tokens each
            </Paragraph>
          </YStack>

          <YStack alignItems="center" flex={1}>
            <View
              backgroundColor="$purple3"
              borderRadius="$10"
              width={56}
              height={56}
              alignItems="center"
              justifyContent="center"
              marginBottom="$2"
            >
              <H3 color="$purple10">{estimatedEnhancements.tier2K}</H3>
            </View>
            <Paragraph size="$2" fontWeight="600">
              2K Quality
            </Paragraph>
            <Paragraph size="$1" color="$gray10">
              {ENHANCEMENT_COSTS.TIER_2K} tokens each
            </Paragraph>
          </YStack>

          <YStack alignItems="center" flex={1}>
            <View
              backgroundColor="$orange3"
              borderRadius="$10"
              width={56}
              height={56}
              alignItems="center"
              justifyContent="center"
              marginBottom="$2"
            >
              <H3 color="$orange10">{estimatedEnhancements.tier4K}</H3>
            </View>
            <Paragraph size="$2" fontWeight="600">
              4K Quality
            </Paragraph>
            <Paragraph size="$1" color="$gray10">
              {ENHANCEMENT_COSTS.TIER_4K} tokens each
            </Paragraph>
          </YStack>
        </XStack>
      </Card>

      {/* Free Token Info */}
      <Card elevate bordered padding="$4" marginBottom="$4">
        <H4 marginBottom="$3">Free Token Regeneration</H4>
        <YStack gap="$2">
          <XStack justifyContent="space-between">
            <Paragraph color="$gray11">Regeneration Rate</Paragraph>
            <Paragraph fontWeight="600">
              {TOKEN_REGENERATION.TOKENS_PER_REGEN} token / 15 minutes
            </Paragraph>
          </XStack>
          <XStack justifyContent="space-between">
            <Paragraph color="$gray11">Maximum Free Tokens</Paragraph>
            <Paragraph fontWeight="600">
              {TOKEN_REGENERATION.MAX_FREE_TOKENS}
            </Paragraph>
          </XStack>
          <XStack justifyContent="space-between">
            <Paragraph color="$gray11">Your Tier</Paragraph>
            <Paragraph fontWeight="600">{tier}</Paragraph>
          </XStack>
        </YStack>
      </Card>

      {/* Quick Links */}
      <Card elevate bordered padding="$4" marginBottom="$4">
        <H4 marginBottom="$3">Quick Links</H4>
        <YStack gap="$2">
          <Link href="/tokens/history" asChild>
            <Button variant="outlined" size="$4" justifyContent="flex-start">
              View Transaction History
            </Button>
          </Link>
          <Link href="/referrals" asChild>
            <Button variant="outlined" size="$4" justifyContent="flex-start">
              Refer Friends (Earn 50 Tokens)
            </Button>
          </Link>
        </YStack>
      </Card>

      {/* Error Display */}
      {error && (
        <Card
          elevate
          bordered
          padding="$4"
          marginBottom="$4"
          backgroundColor="$red2"
        >
          <Paragraph color="$red10">{error}</Paragraph>
          <Button
            marginTop="$2"
            size="$3"
            theme="red"
            onPress={handleRefresh}
          >
            Retry
          </Button>
        </Card>
      )}
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
