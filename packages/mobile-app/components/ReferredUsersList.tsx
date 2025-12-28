/**
 * ReferredUsersList Component
 * Displays a list of users referred by the current user
 */

import type { ReferralStatus } from "@spike-npm-land/shared";
import { CheckCircle, Clock, UserPlus, Users } from "@tamagui/lucide-icons";
import React, { useCallback } from "react";
import { FlatList, ListRenderItem, StyleSheet } from "react-native";
import { Button, Card, Paragraph, Text, View, XStack, YStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

export interface ReferredUser {
  id: string;
  email: string;
  name: string | null;
  status: ReferralStatus;
  createdAt: string;
  tokensGranted: number;
}

export interface ReferredUsersListProps {
  users: ReferredUser[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Mask email address for privacy
 * Example: john.doe@example.com -> j***e@e***e.com
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;

  const maskedLocal = localPart.length <= 2
    ? localPart[0] + "***"
    : localPart[0] + "***" + localPart[localPart.length - 1];

  const domainParts = domain.split(".");
  const maskedDomainParts = domainParts.map((part) => {
    if (part.length <= 2) return part[0] + "***";
    return part[0] + "***" + part[part.length - 1];
  });

  return `${maskedLocal}@${maskedDomainParts.join(".")}`;
}

/**
 * Mask name for privacy
 * Example: John Doe -> J*** D***
 */
function maskName(name: string | null): string | null {
  if (!name) return null;

  return name
    .split(" ")
    .map((part) => {
      if (part.length <= 1) return part + "***";
      return part[0] + "***";
    })
    .join(" ");
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get status color based on referral status
 */
function getStatusColor(status: ReferralStatus): string {
  switch (status) {
    case "COMPLETED":
      return "$green10";
    case "PENDING":
      return "$yellow10";
    default:
      return "$gray10";
  }
}

/**
 * Get status background color
 */
function getStatusBackgroundColor(status: ReferralStatus): string {
  switch (status) {
    case "COMPLETED":
      return "$green3";
    case "PENDING":
      return "$yellow3";
    default:
      return "$gray3";
  }
}

/**
 * Get display label for status
 */
function getStatusLabel(status: ReferralStatus): string {
  switch (status) {
    case "COMPLETED":
      return "Verified";
    case "PENDING":
      return "Pending";
    default:
      return status;
  }
}

// ============================================================================
// ReferredUserItem Component
// ============================================================================

interface ReferredUserItemProps {
  user: ReferredUser;
}

function ReferredUserItem({ user }: ReferredUserItemProps) {
  const maskedEmail = maskEmail(user.email);
  const maskedName = maskName(user.name);
  const statusColor = getStatusColor(user.status);
  const statusBgColor = getStatusBackgroundColor(user.status);
  const statusLabel = getStatusLabel(user.status);
  const formattedDate = formatDate(user.createdAt);

  const StatusIcon = user.status === "COMPLETED" ? CheckCircle : Clock;

  return (
    <Card
      elevate
      bordered
      padding="$4"
      marginBottom="$2"
      testID={`referred-user-${user.id}`}
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        {/* User Info */}
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            <UserPlus size={16} color="$gray10" />
            <Paragraph
              fontWeight="600"
              numberOfLines={1}
              testID={`user-email-${user.id}`}
            >
              {maskedEmail}
            </Paragraph>
          </XStack>

          {maskedName && (
            <Paragraph
              size="$2"
              color="$gray10"
              testID={`user-name-${user.id}`}
            >
              {maskedName}
            </Paragraph>
          )}

          <Paragraph
            size="$2"
            color="$gray9"
            testID={`user-date-${user.id}`}
          >
            Joined {formattedDate}
          </Paragraph>
        </YStack>

        {/* Status and Tokens */}
        <YStack alignItems="flex-end" gap="$2">
          {/* Status Badge */}
          <XStack
            backgroundColor={statusBgColor}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            alignItems="center"
            gap="$1"
            testID={`user-status-${user.id}`}
          >
            <StatusIcon size={12} color={statusColor} />
            <Text
              color={statusColor}
              fontSize="$1"
              fontWeight="600"
            >
              {statusLabel}
            </Text>
          </XStack>

          {/* Tokens Granted */}
          {user.tokensGranted > 0 && (
            <Paragraph
              size="$2"
              color="$green10"
              fontWeight="600"
              testID={`user-tokens-${user.id}`}
            >
              +{user.tokensGranted} tokens
            </Paragraph>
          )}
        </YStack>
      </XStack>
    </Card>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <Card elevate bordered padding="$6" testID="empty-state">
      <YStack alignItems="center" gap="$3">
        <View
          backgroundColor="$gray3"
          padding="$4"
          borderRadius={100}
        >
          <Users size={48} color="$gray8" />
        </View>
        <Paragraph
          color="$gray11"
          textAlign="center"
          fontWeight="500"
          fontSize="$5"
        >
          No referrals yet
        </Paragraph>
        <Paragraph
          size="$3"
          color="$gray9"
          textAlign="center"
          maxWidth={280}
        >
          Share your referral link with friends to start earning tokens!
        </Paragraph>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Loading State Component
// ============================================================================

function LoadingState() {
  return (
    <YStack gap="$2" testID="loading-state">
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          elevate
          bordered
          padding="$4"
          opacity={0.5}
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} gap="$2">
              <View
                backgroundColor="$gray4"
                height={16}
                width="60%"
                borderRadius="$2"
              />
              <View
                backgroundColor="$gray4"
                height={12}
                width="40%"
                borderRadius="$2"
              />
            </YStack>
            <View
              backgroundColor="$gray4"
              height={24}
              width={60}
              borderRadius="$2"
            />
          </XStack>
        </Card>
      ))}
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ReferredUsersList({
  users,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onRefresh,
  isRefreshing = false,
}: ReferredUsersListProps) {
  // Render individual user item
  const renderItem: ListRenderItem<ReferredUser> = useCallback(
    ({ item }) => <ReferredUserItem user={item} />,
    [],
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: ReferredUser) => item.id, []);

  // Render empty component
  const renderEmpty = useCallback(() => {
    if (isLoading) return <LoadingState />;
    return <EmptyState />;
  }, [isLoading]);

  // Render footer with load more button
  const renderFooter = useCallback(() => {
    if (!hasMore || isLoading) return null;

    return (
      <Button
        variant="outlined"
        marginTop="$2"
        onPress={onLoadMore}
        testID="load-more-button"
      >
        Load More
      </Button>
    );
  }, [hasMore, isLoading, onLoadMore]);

  // Show loading state on initial load
  if (isLoading && users.length === 0) {
    return <LoadingState />;
  }

  return (
    <FlatList
      data={users}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
      testID="referred-users-list"
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
});

export default ReferredUsersList;
