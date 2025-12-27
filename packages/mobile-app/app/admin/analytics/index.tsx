/**
 * Admin Analytics Screen
 * Shows platform analytics and metrics
 */

import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Text, XStack, YStack } from "tamagui";

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$background" paddingHorizontal="$4">
      <YStack paddingTop={insets.top + 16} paddingBottom="$4">
        <Text fontSize="$8" fontWeight="700">
          Analytics
        </Text>
        <Text color="$gray10" marginTop="$2">
          Platform performance metrics
        </Text>
      </YStack>

      <YStack gap="$4">
        <XStack gap="$4">
          <Card flex={1} padding="$4" bordered>
            <Text color="$gray10" fontSize="$2">Daily Active Users</Text>
            <Text fontSize="$8" fontWeight="700">1,247</Text>
          </Card>
          <Card flex={1} padding="$4" bordered>
            <Text color="$gray10" fontSize="$2">Enhancements Today</Text>
            <Text fontSize="$8" fontWeight="700">3,582</Text>
          </Card>
        </XStack>

        <XStack gap="$4">
          <Card flex={1} padding="$4" bordered>
            <Text color="$gray10" fontSize="$2">Revenue (MTD)</Text>
            <Text fontSize="$8" fontWeight="700">$12.4K</Text>
          </Card>
          <Card flex={1} padding="$4" bordered>
            <Text color="$gray10" fontSize="$2">Conversion Rate</Text>
            <Text fontSize="$8" fontWeight="700">4.2%</Text>
          </Card>
        </XStack>

        <Card padding="$4" bordered>
          <Text fontSize="$5" fontWeight="600">Top Features</Text>
          <YStack marginTop="$3" gap="$2">
            <XStack justifyContent="space-between">
              <Text>Image Enhancement</Text>
              <Text fontWeight="600">68%</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text>Gallery Management</Text>
              <Text fontWeight="600">22%</Text>
            </XStack>
            <XStack justifyContent="space-between">
              <Text>Merchandise</Text>
              <Text fontWeight="600">10%</Text>
            </XStack>
          </YStack>
        </Card>
      </YStack>
    </YStack>
  );
}
