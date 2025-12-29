/**
 * ReferralStats Component
 * Displays referral statistics with animated number counters
 */

import { Gift, Trophy, Users } from "@tamagui/lucide-icons";
import React, { useEffect, useState } from "react";
import { Card, H3, Paragraph, XStack, YStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

export interface ReferralStatsData {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  tokensEarned: number;
}

export interface ReferralStatsProps {
  stats: ReferralStatsData;
  isLoading?: boolean;
  animationDuration?: number;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  animationDuration: number;
  testID?: string;
}

// ============================================================================
// Helper Hook - Animated Counter
// ============================================================================

function useAnimatedCounter(
  targetValue: number,
  duration: number,
): number {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (targetValue === 0) {
      setDisplayValue(0);
      return;
    }

    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(
        startValue + (targetValue - startValue) * easeOutCubic,
      );

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [targetValue, duration]);

  return displayValue;
}

// ============================================================================
// StatCard Component
// ============================================================================

function StatCard({
  label,
  value,
  icon,
  color,
  animationDuration,
  testID,
}: StatCardProps) {
  const animatedValue = useAnimatedCounter(value, animationDuration);

  return (
    <Card
      elevate
      bordered
      padding="$3"
      flex={1}
      minWidth={100}
      testID={testID}
    >
      <YStack alignItems="center" gap="$2">
        {icon}
        <H3
          color={color}
          fontSize="$7"
          fontWeight="700"
          testID={testID ? `${testID}-value` : undefined}
        >
          {animatedValue}
        </H3>
        <Paragraph
          size="$2"
          color="$gray10"
          textAlign="center"
          numberOfLines={1}
        >
          {label}
        </Paragraph>
      </YStack>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ReferralStats({
  stats,
  isLoading = false,
  animationDuration = 1000,
}: ReferralStatsProps) {
  if (isLoading) {
    return (
      <YStack gap="$3" testID="referral-stats-loading">
        <XStack gap="$2">
          <Card elevate bordered padding="$3" flex={1} opacity={0.5}>
            <YStack alignItems="center" gap="$2">
              <Users size={24} color="$gray8" />
              <H3 color="$gray8">--</H3>
              <Paragraph size="$2" color="$gray8">
                Total
              </Paragraph>
            </YStack>
          </Card>
          <Card elevate bordered padding="$3" flex={1} opacity={0.5}>
            <YStack alignItems="center" gap="$2">
              <Trophy size={24} color="$gray8" />
              <H3 color="$gray8">--</H3>
              <Paragraph size="$2" color="$gray8">
                Verified
              </Paragraph>
            </YStack>
          </Card>
          <Card elevate bordered padding="$3" flex={1} opacity={0.5}>
            <YStack alignItems="center" gap="$2">
              <Users size={24} color="$gray8" />
              <H3 color="$gray8">--</H3>
              <Paragraph size="$2" color="$gray8">
                Pending
              </Paragraph>
            </YStack>
          </Card>
        </XStack>
        <Card elevate bordered padding="$4" opacity={0.5}>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$2" alignItems="center">
              <Gift size={24} color="$gray8" />
              <Paragraph color="$gray8">Tokens Earned</Paragraph>
            </XStack>
            <H3 color="$gray8">--</H3>
          </XStack>
        </Card>
      </YStack>
    );
  }

  return (
    <YStack gap="$3" testID="referral-stats">
      {/* Stats Row */}
      <XStack gap="$2" testID="stats-row">
        <StatCard
          label="Total"
          value={stats.totalReferrals}
          icon={<Users size={24} color="$blue10" />}
          color="$blue10"
          animationDuration={animationDuration}
          testID="stat-total"
        />
        <StatCard
          label="Verified"
          value={stats.completedReferrals}
          icon={<Trophy size={24} color="$green10" />}
          color="$green10"
          animationDuration={animationDuration}
          testID="stat-verified"
        />
        <StatCard
          label="Pending"
          value={stats.pendingReferrals}
          icon={<Users size={24} color="$yellow10" />}
          color="$yellow10"
          animationDuration={animationDuration}
          testID="stat-pending"
        />
      </XStack>

      {/* Tokens Earned Card */}
      <Card elevate bordered padding="$4" testID="tokens-earned-card">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Gift size={24} color="$purple10" />
            <Paragraph color="$gray11" fontWeight="500">
              Tokens Earned
            </Paragraph>
          </XStack>
          <TokensDisplay
            value={stats.tokensEarned}
            animationDuration={animationDuration}
          />
        </XStack>
      </Card>
    </YStack>
  );
}

// ============================================================================
// TokensDisplay Component
// ============================================================================

interface TokensDisplayProps {
  value: number;
  animationDuration: number;
}

function TokensDisplay({ value, animationDuration }: TokensDisplayProps) {
  const animatedValue = useAnimatedCounter(value, animationDuration);

  return (
    <H3 color="$purple10" fontSize="$7" fontWeight="700" testID="tokens-earned-value">
      {animatedValue}
    </H3>
  );
}
