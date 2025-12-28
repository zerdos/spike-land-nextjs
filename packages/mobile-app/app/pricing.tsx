/**
 * Pricing Screen
 * Shows subscription tiers and token packages
 */

import { useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Text, YStack } from "tamagui";

export default function PricingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$background" paddingHorizontal="$4">
      <YStack paddingTop={insets.top + 16} paddingBottom="$4">
        <Text fontSize="$8" fontWeight="700">
          Pricing
        </Text>
        <Text color="$gray10" marginTop="$2">
          Choose the plan that works for you
        </Text>
      </YStack>

      <YStack gap="$4" flex={1}>
        <Card padding="$4" bordered>
          <Text fontSize="$6" fontWeight="600">Free Tier</Text>
          <Text color="$gray10" marginTop="$2">10 tokens/day with regeneration</Text>
          <Button marginTop="$4" disabled>Current Plan</Button>
        </Card>

        <Card padding="$4" bordered>
          <Text fontSize="$6" fontWeight="600">Pro</Text>
          <Text color="$gray10" marginTop="$2">50 tokens/day + priority processing</Text>
          <Button marginTop="$4" theme="active" onPress={() => router.push("/tokens/packages")}>
            Upgrade
          </Button>
        </Card>

        <Card padding="$4" bordered>
          <Text fontSize="$6" fontWeight="600">Enterprise</Text>
          <Text color="$gray10" marginTop="$2">Unlimited tokens + API access</Text>
          <Button marginTop="$4" theme="active" onPress={() => router.push("/tokens/packages")}>
            Contact Sales
          </Button>
        </Card>
      </YStack>
    </YStack>
  );
}
