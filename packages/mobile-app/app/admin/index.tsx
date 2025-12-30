/**
 * Admin Dashboard Home
 *
 * Overview page showing key metrics and quick links to admin sections.
 */

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { Card, H4, Paragraph, Separator, Text, View, XStack, YStack } from "tamagui";
import { DashboardStats, getDashboardStats } from "../../services/api/admin";

// ============================================================================
// Components
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

function StatCard(
  { title, value, subtitle, color = "$blue10" }: StatCardProps,
) {
  return (
    <Card
      elevate
      bordered
      padding="$3"
      flex={1}
      minWidth={140}
      backgroundColor="$background"
    >
      <YStack>
        <Text fontSize="$2" color="$gray11" textTransform="uppercase">
          {title}
        </Text>
        <Text fontSize="$7" fontWeight="bold" color={color} marginVertical="$1">
          {value}
        </Text>
        {subtitle && (
          <Text fontSize="$1" color="$gray10">
            {subtitle}
          </Text>
        )}
      </YStack>
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}

function QuickAction({ title, description, icon, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        elevate
        bordered
        padding="$4"
        backgroundColor="$background"
        marginBottom="$3"
      >
        <XStack alignItems="center" gap="$3">
          <View
            backgroundColor="$gray3"
            padding="$3"
            borderRadius="$4"
            width={48}
            height={48}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="$5">{icon}</Text>
          </View>
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              {title}
            </Text>
            <Text fontSize="$2" color="$gray10">
              {description}
            </Text>
          </YStack>
          <Text fontSize="$4" color="$gray8">
            {">"}
          </Text>
        </XStack>
      </Card>
    </TouchableOpacity>
  );
}

interface JobStatusBadgeProps {
  status: string;
  count: number;
}

function JobStatusBadge({ status, count }: JobStatusBadgeProps) {
  const getColor = () => {
    switch (status) {
      case "pending":
        return { bg: "$yellow3", text: "$yellow11" };
      case "processing":
        return { bg: "$blue3", text: "$blue11" };
      case "completed":
        return { bg: "$green3", text: "$green11" };
      case "failed":
        return { bg: "$red3", text: "$red11" };
      default:
        return { bg: "$gray3", text: "$gray11" };
    }
  };

  const colors = getColor();

  return (
    <XStack
      backgroundColor={colors.bg}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$2"
      alignItems="center"
      gap="$1"
    >
      <Text fontSize="$1" color={colors.text} fontWeight="500">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
      <Text fontSize="$2" fontWeight="bold" color={colors.text}>
        {count}
      </Text>
    </XStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminDashboard() {
  const router = useRouter();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const response = await getDashboardStats();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data as DashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$gray11">Loading dashboard...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10" marginBottom="$2">
          Failed to load dashboard
        </Text>
        <Text color="$gray10" fontSize="$2" textAlign="center">
          {error instanceof Error ? error.message : "Unknown error"}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
        >
          <Text color="$blue10" marginTop="$4">
            Try Again
          </Text>
        </TouchableOpacity>
      </YStack>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f5f5f5" }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <YStack gap="$4">
        {/* Overview Stats */}
        <YStack>
          <H4 marginBottom="$3" color="$gray12">
            Overview
          </H4>
          <XStack flexWrap="wrap" gap="$3">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              subtitle={`${stats?.adminCount || 0} admins`}
            />
            <StatCard
              title="Enhancements"
              value={stats?.totalEnhancements || 0}
              color="$purple10"
            />
          </XStack>
          <XStack flexWrap="wrap" gap="$3" marginTop="$3">
            <StatCard
              title="Tokens Purchased"
              value={stats?.totalTokensPurchased?.toLocaleString() || 0}
              color="$green10"
            />
            <StatCard
              title="Tokens Spent"
              value={stats?.totalTokensSpent?.toLocaleString() || 0}
              color="$orange10"
            />
          </XStack>
        </YStack>

        <Separator />

        {/* Job Status */}
        <YStack>
          <H4 marginBottom="$3" color="$gray12">
            Job Status
          </H4>
          <Card elevate bordered padding="$4" backgroundColor="$background">
            <XStack flexWrap="wrap" gap="$2">
              <JobStatusBadge
                status="pending"
                count={stats?.jobStatus?.pending || 0}
              />
              <JobStatusBadge
                status="processing"
                count={stats?.jobStatus?.processing || 0}
              />
              <JobStatusBadge
                status="completed"
                count={stats?.jobStatus?.completed || 0}
              />
              <JobStatusBadge
                status="failed"
                count={stats?.jobStatus?.failed || 0}
              />
            </XStack>
            {(stats?.jobStatus?.pending || 0) +
                    (stats?.jobStatus?.processing || 0) > 0 && (
              <Paragraph marginTop="$3" fontSize="$2" color="$blue10">
                {(stats?.jobStatus?.pending || 0) +
                  (stats?.jobStatus?.processing || 0)} active jobs
              </Paragraph>
            )}
          </Card>
        </YStack>

        <Separator />

        {/* Quick Actions */}
        <YStack>
          <H4 marginBottom="$3" color="$gray12">
            Quick Actions
          </H4>

          <QuickAction
            title="User Management"
            description="Search and manage users, roles, tokens"
            icon="U"
            onPress={() => router.push("/admin/users")}
          />

          <QuickAction
            title="Job Queue"
            description={`${stats?.jobStatus?.active || 0} active jobs`}
            icon="J"
            onPress={() => router.push("/admin/jobs")}
          />

          <QuickAction
            title="Vouchers"
            description={`${stats?.activeVouchers || 0} active vouchers`}
            icon="V"
            onPress={() => router.push("/admin/vouchers")}
          />

          <QuickAction
            title="Analytics"
            description="Token usage and user growth"
            icon="A"
            onPress={() => router.push("/admin/analytics")}
          />
        </YStack>

        {/* Last Updated */}
        <Text fontSize="$1" color="$gray9" textAlign="center" marginTop="$2">
          Last updated: {stats?.timestamp
            ? new Date(stats.timestamp).toLocaleTimeString()
            : "N/A"}
        </Text>
      </YStack>
    </ScrollView>
  );
}
