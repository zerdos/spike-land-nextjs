/**
 * Referral Dashboard Screen
 * Displays referral code, stats, share buttons, and referred users
 */

import { REFERRAL_CONFIG } from "@spike-npm-land/shared";
import { HelpCircle } from "@tamagui/lucide-icons";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet } from "react-native";
import {
  Button,
  Card,
  H1,
  H4,
  Paragraph,
  Separator,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";

import { ReferralStats } from "../../components/ReferralStats";
import { ReferredUsersList } from "../../components/ReferredUsersList";
import { ShareButtons } from "../../components/ShareButtons";
import { useReferralStats } from "../../hooks";

// ============================================================================
// How It Works Component
// ============================================================================

function HowItWorks() {
  return (
    <Card elevate bordered padding="$4" testID="how-it-works">
      <XStack alignItems="center" gap="$2" marginBottom="$3">
        <HelpCircle size={20} color="$blue10" />
        <H4>How It Works</H4>
      </XStack>
      <YStack gap="$4">
        {/* Step 1 */}
        <XStack gap="$3" testID="step-1">
          <View
            backgroundColor="$blue10"
            width={32}
            height={32}
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
          >
            <Text color="white" fontWeight="bold">
              1
            </Text>
          </View>
          <YStack flex={1}>
            <Paragraph fontWeight="600">Share Your Link</Paragraph>
            <Paragraph size="$2" color="$gray10">
              Copy your referral link and share it with friends via social media, email, or
              messaging apps.
            </Paragraph>
          </YStack>
        </XStack>

        {/* Step 2 */}
        <XStack gap="$3" testID="step-2">
          <View
            backgroundColor="$blue10"
            width={32}
            height={32}
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
          >
            <Text color="white" fontWeight="bold">
              2
            </Text>
          </View>
          <YStack flex={1}>
            <Paragraph fontWeight="600">Friend Signs Up</Paragraph>
            <Paragraph size="$2" color="$gray10">
              When your friend creates an account using your link, they get{" "}
              {REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} free tokens to start.
            </Paragraph>
          </YStack>
        </XStack>

        {/* Step 3 */}
        <XStack gap="$3" testID="step-3">
          <View
            backgroundColor="$blue10"
            width={32}
            height={32}
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
          >
            <Text color="white" fontWeight="bold">
              3
            </Text>
          </View>
          <YStack flex={1}>
            <Paragraph fontWeight="600">Both Earn Tokens</Paragraph>
            <Paragraph size="$2" color="$gray10">
              After your friend verifies their email, you both receive{" "}
              {REFERRAL_CONFIG.TOKENS_PER_REFERRAL} tokens!
            </Paragraph>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Referral Link Card Component
// ============================================================================

interface ReferralLinkCardProps {
  referralUrl: string | null;
  referralCode: string | null;
  onCopyCode: () => void;
  isCopied: boolean;
}

function ReferralLinkCard({
  referralUrl,
  referralCode,
  onCopyCode,
  isCopied,
}: ReferralLinkCardProps) {
  return (
    <Card elevate bordered padding="$4" testID="referral-link-card">
      <H4 marginBottom="$3">Your Referral Link</H4>

      {/* Referral URL Display */}
      <Card
        backgroundColor="$gray3"
        padding="$3"
        borderRadius="$3"
        marginBottom="$3"
        testID="referral-url-display"
      >
        <Paragraph
          fontSize="$2"
          numberOfLines={1}
          color="$gray11"
        >
          {referralUrl || "Loading..."}
        </Paragraph>
      </Card>

      {/* Referral Code Display */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        testID="referral-code-section"
      >
        <YStack>
          <Paragraph size="$2" color="$gray10">
            Referral Code
          </Paragraph>
          <Text fontWeight="600" fontSize="$4">
            {referralCode || "..."}
          </Text>
        </YStack>
        <Button
          size="$3"
          variant="outlined"
          onPress={onCopyCode}
          disabled={!referralCode}
          testID="copy-code-button"
        >
          {isCopied ? "Copied!" : "Copy Code"}
        </Button>
      </XStack>
    </Card>
  );
}

// ============================================================================
// Hero Section Component
// ============================================================================

function HeroSection() {
  return (
    <Card
      elevate
      bordered
      padding="$5"
      backgroundColor="$blue2"
      testID="hero-section"
    >
      <YStack alignItems="center" gap="$3">
        <H1 size="$8" textAlign="center">
          Earn {REFERRAL_CONFIG.TOKENS_PER_REFERRAL} Tokens
        </H1>
        <Paragraph textAlign="center" color="$gray11" maxWidth={300}>
          Invite friends and earn {REFERRAL_CONFIG.TOKENS_PER_REFERRAL}{" "}
          tokens for each successful referral. Your friends get{" "}
          {REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} tokens too!
        </Paragraph>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ReferralsScreen() {
  const {
    referralCode,
    referralUrl,
    stats,
    referredUsers,
    isLoading,
    error,
    refetch,
    loadMoreUsers,
    hasMoreUsers,
  } = useReferralStats();

  const [codeCopied, setCodeCopied] = useState(false);

  // Copy referral code to clipboard
  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;

    try {
      await Clipboard.setStringAsync(referralCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (_err) {
      Alert.alert("Error", "Failed to copy code to clipboard");
    }
  }, [referralCode]);

  // Handle share success
  const handleShareSuccess = useCallback(() => {
    // Could track analytics here
  }, []);

  // Handle share error
  const handleShareError = useCallback((error: Error) => {
    console.error("Share error:", error);
  }, []);

  // Loading state
  if (isLoading && !stats) {
    return (
      <View style={styles.centered} testID="loading-container">
        <Spinner size="large" color="$blue10" />
        <Paragraph marginTop="$4" color="$gray10">
          Loading referral data...
        </Paragraph>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered} testID="error-container">
        <Paragraph color="$red10" textAlign="center" marginBottom="$4">
          {error}
        </Paragraph>
        <Button onPress={refetch} testID="retry-button">
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          testID="refresh-control"
        />
      }
      showsVerticalScrollIndicator={false}
      testID="referrals-screen"
    >
      {/* Hero Section */}
      <HeroSection />

      {/* Referral Stats */}
      {stats && (
        <ReferralStats
          stats={stats}
          isLoading={isLoading && !stats}
          animationDuration={1000}
        />
      )}

      {/* Referral Link Card */}
      <ReferralLinkCard
        referralUrl={referralUrl}
        referralCode={referralCode}
        onCopyCode={handleCopyCode}
        isCopied={codeCopied}
      />

      {/* Share Buttons */}
      <Card elevate bordered padding="$4" testID="share-buttons-card">
        <H4 marginBottom="$3">Share Your Link</H4>
        <ShareButtons
          referralUrl={referralUrl || ""}
          referralCode={referralCode || ""}
          onCopySuccess={handleShareSuccess}
          onShareSuccess={handleShareSuccess}
          onShareError={handleShareError}
        />
      </Card>

      {/* How It Works */}
      <HowItWorks />

      {/* Referred Users Section */}
      <Separator marginVertical="$4" />

      <YStack gap="$3" testID="referred-users-section">
        <H4>Your Referrals</H4>
        <ReferredUsersList
          users={referredUsers}
          isLoading={isLoading}
          hasMore={hasMoreUsers}
          onLoadMore={loadMoreUsers}
          onRefresh={refetch}
          isRefreshing={isLoading}
        />
      </YStack>
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
    gap: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
