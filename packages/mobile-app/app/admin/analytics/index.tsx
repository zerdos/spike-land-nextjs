/**
 * Admin Analytics Screen
 * Shows platform analytics and metrics with real data from API
 */

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { Card, H4, Separator, Text, View, XStack, YStack } from "tamagui";
import {
  getTokenAnalytics,
  getUserAnalytics,
  TokenAnalytics,
  UserAnalytics,
} from "../../../services/api/admin";

// ============================================================================
// Types
// ============================================================================

type DateRange = "7d" | "30d" | "90d";

// ============================================================================
// Components
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

function StatCard({ title, value, subtitle, color = "$blue10" }: StatCardProps) {
  return (
    <Card elevate bordered padding="$3" flex={1} backgroundColor="$background">
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

interface DateRangeSelectorProps {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
}

function DateRangeSelector({ selected, onSelect }: DateRangeSelectorProps) {
  const options: Array<{ key: DateRange; label: string; }> = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
  ];

  return (
    <XStack gap="$2">
      {options.map(({ key, label }) => (
        <TouchableOpacity key={key} onPress={() => onSelect(key)}>
          <View
            backgroundColor={selected === key ? "$blue10" : "$gray3"}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$3"
          >
            <Text
              fontSize="$2"
              fontWeight="500"
              color={selected === key ? "white" : "$gray11"}
            >
              {label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </XStack>
  );
}

interface ChartBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

function ChartBar({ label, value, maxValue, color }: ChartBarProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <YStack marginBottom="$2">
      <XStack justifyContent="space-between" marginBottom="$1">
        <Text fontSize="$1" color="$gray10">
          {label}
        </Text>
        <Text fontSize="$1" fontWeight="600" color="$gray12">
          {value.toLocaleString()}
        </Text>
      </XStack>
      <View backgroundColor="$gray4" height={8} borderRadius="$1" overflow="hidden">
        <View
          backgroundColor={color}
          height="100%"
          width={`${percentage}%`}
          borderRadius="$1"
        />
      </View>
    </YStack>
  );
}

interface DailyChartProps {
  data: Array<{ date: string; purchased: number; spent: number; }>;
  title: string;
}

function DailyTokenChart({ data, title }: DailyChartProps) {
  const last7Days = data.slice(-7);
  const maxValue = Math.max(...last7Days.flatMap((d) => [d.purchased, d.spent]), 1);

  return (
    <Card elevate bordered padding="$4" backgroundColor="$background">
      <Text fontSize="$4" fontWeight="600" color="$gray12" marginBottom="$3">
        {title}
      </Text>

      <XStack marginBottom="$3" gap="$3">
        <XStack alignItems="center" gap="$1">
          <View width={12} height={12} backgroundColor="$green10" borderRadius="$1" />
          <Text fontSize="$1" color="$gray10">
            Purchased
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <View width={12} height={12} backgroundColor="$orange10" borderRadius="$1" />
          <Text fontSize="$1" color="$gray10">
            Spent
          </Text>
        </XStack>
      </XStack>

      {last7Days.length === 0
        ? (
          <Text color="$gray9" fontSize="$2">
            No data available
          </Text>
        )
        : (
          last7Days.map((day) => {
            const dateStr = new Date(day.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            return (
              <YStack key={day.date} marginBottom="$3">
                <Text fontSize="$2" color="$gray11" marginBottom="$1">
                  {dateStr}
                </Text>
                <XStack gap="$2">
                  <View flex={1}>
                    <View
                      backgroundColor="$green3"
                      height={24}
                      borderRadius="$1"
                      overflow="hidden"
                    >
                      <View
                        backgroundColor="$green10"
                        height="100%"
                        width={`${(day.purchased / maxValue) * 100}%`}
                        justifyContent="center"
                        paddingLeft="$2"
                      >
                        <Text fontSize="$1" color="white" fontWeight="500">
                          {day.purchased > 0 ? day.purchased.toLocaleString() : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View flex={1}>
                    <View
                      backgroundColor="$orange3"
                      height={24}
                      borderRadius="$1"
                      overflow="hidden"
                    >
                      <View
                        backgroundColor="$orange10"
                        height="100%"
                        width={`${(day.spent / maxValue) * 100}%`}
                        justifyContent="center"
                        paddingLeft="$2"
                      >
                        <Text fontSize="$1" color="white" fontWeight="500">
                          {day.spent > 0 ? day.spent.toLocaleString() : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                </XStack>
              </YStack>
            );
          })
        )}
    </Card>
  );
}

interface UserGrowthChartProps {
  data: Array<{ date: string; count: number; }>;
}

function UserGrowthChart({ data }: UserGrowthChartProps) {
  const last7Days = data.slice(-7);
  const maxValue = Math.max(...last7Days.map((d) => d.count), 1);

  return (
    <Card elevate bordered padding="$4" backgroundColor="$background">
      <Text fontSize="$4" fontWeight="600" color="$gray12" marginBottom="$3">
        Daily Signups
      </Text>

      {last7Days.length === 0
        ? (
          <Text color="$gray9" fontSize="$2">
            No signup data available
          </Text>
        )
        : (
          last7Days.map((day) => {
            const dateStr = new Date(day.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            return (
              <ChartBar
                key={day.date}
                label={dateStr}
                value={day.count}
                maxValue={maxValue}
                color="$blue10"
              />
            );
          })
        )}
    </Card>
  );
}

interface AuthProviderChartProps {
  data: Array<{ provider: string; count: number; }>;
}

function AuthProviderChart({ data }: AuthProviderChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const getProviderLabel = (provider: string): string => {
    const labels: Record<string, string> = {
      google: "Google",
      email: "Email",
      github: "GitHub",
      apple: "Apple",
    };
    return labels[provider.toLowerCase()] || provider;
  };

  return (
    <Card elevate bordered padding="$4" backgroundColor="$background">
      <Text fontSize="$4" fontWeight="600" color="$gray12" marginBottom="$3">
        Users by Auth Provider
      </Text>

      {data.length === 0
        ? (
          <Text color="$gray9" fontSize="$2">
            No auth provider data available
          </Text>
        )
        : (
          data.map((item, index) => {
            const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
            const colors = ["$blue10", "$green10", "$purple10", "$orange10"];
            return (
              <XStack
                key={item.provider}
                justifyContent="space-between"
                alignItems="center"
                paddingVertical="$2"
                borderBottomWidth={index < data.length - 1 ? 1 : 0}
                borderBottomColor="$gray4"
              >
                <XStack alignItems="center" gap="$2">
                  <View
                    width={12}
                    height={12}
                    backgroundColor={colors[index % colors.length]}
                    borderRadius="$1"
                  />
                  <Text fontSize="$3" color="$gray12">
                    {getProviderLabel(item.provider)}
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <Text fontSize="$3" fontWeight="600" color="$gray12">
                    {item.count.toLocaleString()}
                  </Text>
                  <Text fontSize="$2" color="$gray9">
                    ({percentage}%)
                  </Text>
                </XStack>
              </XStack>
            );
          })
        )}
    </Card>
  );
}

interface PackageSalesChartProps {
  data: Array<{ name: string; tokens: number; sales: number; }>;
}

function PackageSalesChart({ data }: PackageSalesChartProps) {
  const maxSales = Math.max(...data.map((d) => d.sales), 1);

  return (
    <Card elevate bordered padding="$4" backgroundColor="$background">
      <Text fontSize="$4" fontWeight="600" color="$gray12" marginBottom="$3">
        Package Sales
      </Text>

      {data.length === 0
        ? (
          <Text color="$gray9" fontSize="$2">
            No package sales data available
          </Text>
        )
        : (
          data.map((pkg) => (
            <YStack key={pkg.name} marginBottom="$3">
              <XStack justifyContent="space-between" marginBottom="$1">
                <Text fontSize="$2" color="$gray11">
                  {pkg.name} ({pkg.tokens} tokens)
                </Text>
                <Text fontSize="$2" fontWeight="600" color="$green11">
                  {pkg.sales} sales
                </Text>
              </XStack>
              <View
                backgroundColor="$gray4"
                height={8}
                borderRadius="$1"
                overflow="hidden"
              >
                <View
                  backgroundColor="$purple10"
                  height="100%"
                  width={`${(pkg.sales / maxSales) * 100}%`}
                  borderRadius="$1"
                />
              </View>
            </YStack>
          ))
        )}
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminAnalyticsScreen() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const {
    data: tokenAnalytics,
    isLoading: tokenLoading,
    error: tokenError,
    refetch: refetchTokens,
    isRefetching: isRefetchingTokens,
  } = useQuery({
    queryKey: ["admin", "analytics", "tokens"],
    queryFn: async () => {
      const response = await getTokenAnalytics();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data as TokenAnalytics;
    },
  });

  const {
    data: userAnalytics,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUsers,
    isRefetching: isRefetchingUsers,
  } = useQuery({
    queryKey: ["admin", "analytics", "users"],
    queryFn: async () => {
      const response = await getUserAnalytics();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data as UserAnalytics;
    },
  });

  const isLoading = tokenLoading || userLoading;
  const isRefetching = isRefetchingTokens || isRefetchingUsers;
  const error = tokenError || userError;

  const handleRefresh = () => {
    refetchTokens();
    refetchUsers();
  };

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$gray11">Loading analytics...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10" marginBottom="$2">
          Failed to load analytics
        </Text>
        <Text color="$gray10" fontSize="$2" textAlign="center">
          {error instanceof Error ? error.message : "Unknown error"}
        </Text>
        <TouchableOpacity onPress={handleRefresh}>
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
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
    >
      <YStack gap="$4">
        {/* Date Range Selector */}
        <XStack justifyContent="space-between" alignItems="center">
          <H4 color="$gray12">Analytics</H4>
          <DateRangeSelector selected={dateRange} onSelect={setDateRange} />
        </XStack>

        {/* User Stats Overview */}
        <YStack>
          <H4 marginBottom="$3" color="$gray12">
            User Metrics
          </H4>
          <XStack flexWrap="wrap" gap="$3">
            <StatCard
              title="Total Users"
              value={userAnalytics?.totalUsers?.toLocaleString() || "0"}
              color="$blue10"
            />
            <StatCard
              title="Active (30d)"
              value={userAnalytics?.activeUsersLast30Days?.toLocaleString() || "0"}
              subtitle={`${
                userAnalytics?.totalUsers
                  ? Math.round(
                    (userAnalytics.activeUsersLast30Days / userAnalytics.totalUsers) * 100,
                  )
                  : 0
              }% of total`}
              color="$green10"
            />
          </XStack>
          <XStack flexWrap="wrap" gap="$3" marginTop="$3">
            <StatCard
              title="New Users (30d)"
              value={userAnalytics?.newUsersLast30Days?.toLocaleString() || "0"}
              color="$purple10"
            />
            <StatCard
              title="Avg Daily Signups"
              value={userAnalytics?.dailySignups && userAnalytics.dailySignups.length > 0
                ? Math.round(
                  userAnalytics.dailySignups.reduce((sum, d) => sum + d.count, 0) /
                    userAnalytics.dailySignups.length,
                ).toString()
                : "0"}
              color="$orange10"
            />
          </XStack>
        </YStack>

        <Separator />

        {/* Token Stats Overview */}
        <YStack>
          <H4 marginBottom="$3" color="$gray12">
            Token Metrics
          </H4>
          <XStack flexWrap="wrap" gap="$3">
            <StatCard
              title="Revenue"
              value={`$${tokenAnalytics?.revenue?.total?.toLocaleString() || "0"}`}
              color="$green10"
            />
            <StatCard
              title="Tokens in Circulation"
              value={tokenAnalytics?.circulation?.total?.toLocaleString() || "0"}
              subtitle={`Avg: ${tokenAnalytics?.circulation?.average?.toFixed(1) || "0"} per user`}
              color="$blue10"
            />
          </XStack>
          <XStack flexWrap="wrap" gap="$3" marginTop="$3">
            <StatCard
              title="Regenerations"
              value={tokenAnalytics?.regenerationCount?.toLocaleString() || "0"}
              color="$purple10"
            />
          </XStack>
        </YStack>

        <Separator />

        {/* Token Usage Chart */}
        <DailyTokenChart
          data={tokenAnalytics?.dailyTokens || []}
          title="Daily Token Activity"
        />

        {/* User Growth Chart */}
        <UserGrowthChart data={userAnalytics?.dailySignups || []} />

        {/* Auth Provider Distribution */}
        <AuthProviderChart data={userAnalytics?.usersByAuthProvider || []} />

        {/* Package Sales */}
        <PackageSalesChart data={tokenAnalytics?.packageSales || []} />

        {/* Token Types Breakdown */}
        <Card elevate bordered padding="$4" backgroundColor="$background">
          <Text fontSize="$4" fontWeight="600" color="$gray12" marginBottom="$3">
            Token Transactions by Type
          </Text>

          {(!tokenAnalytics?.tokensByType || tokenAnalytics.tokensByType.length === 0)
            ? (
              <Text color="$gray9" fontSize="$2">
                No transaction data available
              </Text>
            )
            : (
              tokenAnalytics.tokensByType.map((item) => {
                const isNegative = item.total < 0;
                const displayValue = Math.abs(item.total);
                return (
                  <XStack
                    key={item.type}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$2"
                    borderBottomWidth={1}
                    borderBottomColor="$gray4"
                  >
                    <Text fontSize="$3" color="$gray12">
                      {item.type.replace(/_/g, " ")}
                    </Text>
                    <Text
                      fontSize="$3"
                      fontWeight="600"
                      color={isNegative ? "$red10" : "$green10"}
                    >
                      {isNegative ? "-" : "+"}
                      {displayValue.toLocaleString()}
                    </Text>
                  </XStack>
                );
              })
            )}
        </Card>

        {/* Last Updated */}
        <Text fontSize="$1" color="$gray9" textAlign="center" marginTop="$2">
          Pull down to refresh data
        </Text>
      </YStack>
    </ScrollView>
  );
}
