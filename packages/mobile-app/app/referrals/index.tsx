/**
 * Referral Dashboard Screen
 * Displays referral code, stats, and referred users
 */

import { REFERRAL_CONFIG } from "@spike-npm-land/shared";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import { Alert, FlatList, Linking, RefreshControl, StyleSheet } from "react-native";
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

import { useReferralStats } from "../../hooks";
import { ReferredUser } from "../../services/api/referrals";

// ============================================================================
// Types
// ============================================================================

interface ReferredUserItemProps {
  user: ReferredUser;
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  label,
  value,
  color = "$foreground",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <Card elevate bordered padding="$3" flex={1}>
      <YStack alignItems="center">
        <H3 color={color}>{value}</H3>
        <Paragraph size="$2" color="$gray10" textAlign="center">
          {label}
        </Paragraph>
      </YStack>
    </Card>
  );
}

function ReferredUserItem({ user }: ReferredUserItemProps) {
  const statusColor = user.status === "COMPLETED"
    ? "$green10"
    : user.status === "PENDING"
    ? "$yellow10"
    : "$red10";

  return (
    <Card elevate bordered padding="$4" marginBottom="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1}>
          <Paragraph fontWeight="600" numberOfLines={1}>
            {user.email}
          </Paragraph>
          {user.name && (
            <Paragraph size="$2" color="$gray10">
              {user.name}
            </Paragraph>
          )}
          <Paragraph size="$2" color="$gray9">
            {new Date(user.createdAt).toLocaleDateString()}
          </Paragraph>
        </YStack>

        <YStack alignItems="flex-end">
          <View
            backgroundColor={statusColor}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text color="white" fontSize="$1" fontWeight="600">
              {user.status}
            </Text>
          </View>
          {user.tokensGranted > 0 && (
            <Paragraph size="$2" color="$green10" marginTop="$1">
              +{user.tokensGranted} tokens
            </Paragraph>
          )}
        </YStack>
      </XStack>
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

  const [copied, setCopied] = useState(false);

  // Copy referral link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!referralUrl) return;

    try {
      await Clipboard.setStringAsync(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  }, [referralUrl]);

  // Native share
  const handleShare = useCallback(async () => {
    if (!referralUrl) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(referralUrl, {
          dialogTitle: "Share your referral link",
          UTI: "public.url",
        });
      } else {
        // Fallback to clipboard
        handleCopyLink();
        Alert.alert(
          "Link Copied",
          "Sharing is not available, but the link has been copied to your clipboard.",
        );
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  }, [referralUrl, handleCopyLink]);

  // Social share handlers
  const shareOnTwitter = useCallback(() => {
    if (!referralUrl) return;

    const text =
      `Join me on Spike and get ${REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} free tokens! Use my referral link:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${
      encodeURIComponent(referralUrl)
    }`;
    Linking.openURL(twitterUrl);
  }, [referralUrl]);

  const shareOnFacebook = useCallback(() => {
    if (!referralUrl) return;

    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${
      encodeURIComponent(referralUrl)
    }`;
    Linking.openURL(facebookUrl);
  }, [referralUrl]);

  const shareOnWhatsApp = useCallback(() => {
    if (!referralUrl) return;

    const text =
      `Join me on Spike and get ${REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} free tokens! ${referralUrl}`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    Linking.openURL(whatsappUrl);
  }, [referralUrl]);

  // Render header
  const renderHeader = () => (
    <YStack gap="$4" paddingBottom="$4">
      {/* Hero Section */}
      <Card elevate bordered padding="$5" backgroundColor="$blue2">
        <YStack alignItems="center" gap="$3">
          <H1 size="$8" textAlign="center">
            Earn {REFERRAL_CONFIG.TOKENS_PER_REFERRAL} Tokens
          </H1>
          <Paragraph textAlign="center" color="$gray11">
            Invite friends and earn {REFERRAL_CONFIG.TOKENS_PER_REFERRAL}{" "}
            tokens for each successful referral. Your friends get{" "}
            {REFERRAL_CONFIG.SIGNUP_BONUS_TOKENS} tokens too!
          </Paragraph>
        </YStack>
      </Card>

      {/* Referral Code Card */}
      <Card elevate bordered padding="$4">
        <H4 marginBottom="$3">Your Referral Link</H4>

        <Card
          backgroundColor="$gray3"
          padding="$3"
          borderRadius="$3"
          marginBottom="$3"
        >
          <Paragraph
            fontFamily="$mono"
            fontSize="$2"
            numberOfLines={1}
            color="$gray11"
          >
            {referralUrl || "Loading..."}
          </Paragraph>
        </Card>

        <XStack gap="$2" marginBottom="$3">
          <Button flex={1} theme="blue" onPress={handleCopyLink}>
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button flex={1} theme="green" onPress={handleShare}>
            Share
          </Button>
        </XStack>

        <YStack gap="$2">
          <Paragraph size="$2" color="$gray10">
            Referral Code:{" "}
            <Text fontFamily="$mono" fontWeight="600">
              {referralCode || "..."}
            </Text>
          </Paragraph>
        </YStack>
      </Card>

      {/* Social Share Buttons */}
      <Card elevate bordered padding="$4">
        <H4 marginBottom="$3">Share on Social Media</H4>
        <XStack gap="$2" flexWrap="wrap">
          <Button
            flex={1}
            size="$4"
            backgroundColor="$blue9"
            onPress={shareOnTwitter}
          >
            Twitter
          </Button>
          <Button
            flex={1}
            size="$4"
            backgroundColor="$blue8"
            onPress={shareOnFacebook}
          >
            Facebook
          </Button>
          <Button
            flex={1}
            size="$4"
            backgroundColor="$green9"
            onPress={shareOnWhatsApp}
          >
            WhatsApp
          </Button>
        </XStack>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <YStack gap="$2">
          <H4>Your Stats</H4>
          <XStack gap="$2">
            <StatCard label="Total" value={stats.totalReferrals} />
            <StatCard
              label="Completed"
              value={stats.completedReferrals}
              color="$green10"
            />
            <StatCard
              label="Pending"
              value={stats.pendingReferrals}
              color="$yellow10"
            />
          </XStack>
          <Card elevate bordered padding="$4" marginTop="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Paragraph color="$gray11">Total Tokens Earned</Paragraph>
              <H3 color="$blue10">{stats.tokensEarned}</H3>
            </XStack>
          </Card>
        </YStack>
      )}

      {/* How It Works */}
      <Card elevate bordered padding="$4">
        <H4 marginBottom="$3">How It Works</H4>
        <YStack gap="$4">
          <XStack gap="$3">
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

          <XStack gap="$3">
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

          <XStack gap="$3">
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

      {/* Referred Users Header */}
      <Separator marginVertical="$2" />
      <H4>Your Referrals</H4>
    </YStack>
  );

  // Render empty state for referred users
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <Card elevate bordered padding="$6">
        <YStack alignItems="center" gap="$2">
          <Paragraph color="$gray10" textAlign="center">
            No referrals yet
          </Paragraph>
          <Paragraph size="$2" color="$gray9" textAlign="center">
            Share your link to get started and earn tokens!
          </Paragraph>
        </YStack>
      </Card>
    );
  };

  // Render footer
  const renderFooter = () => {
    if (!hasMoreUsers) return null;

    return (
      <Button
        variant="outlined"
        marginTop="$2"
        onPress={loadMoreUsers}
      >
        Load More
      </Button>
    );
  };

  if (isLoading && !stats) {
    return (
      <View style={styles.centered}>
        <Spinner size="large" color="$blue10" />
        <Paragraph marginTop="$4">Loading referral data...</Paragraph>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Paragraph color="$red10" textAlign="center" marginBottom="$4">
          {error}
        </Paragraph>
        <Button onPress={refetch} theme="blue">
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      data={referredUsers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ReferredUserItem user={item} />}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
