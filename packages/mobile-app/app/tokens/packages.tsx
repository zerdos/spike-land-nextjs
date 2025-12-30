/**
 * Token Packages Screen
 * In-App Purchase flow for token packages via RevenueCat
 */

import { ENHANCEMENT_COSTS } from "@spike-npm-land/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import {
  Button,
  Card,
  H2,
  H3,
  Paragraph,
  Separator,
  Spinner,
  Text,
  View,
  XStack,
  YStack,
} from "tamagui";

import { useTokenBalance } from "../../hooks";
import { purchasesService, TokenPackage } from "../../services/purchases";

// ============================================================================
// Component
// ============================================================================

export default function TokenPackagesScreen() {
  const router = useRouter();
  const { refetch: refetchBalance, balance } = useTokenBalance();

  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available packages on mount
  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const availablePackages = await purchasesService.getTokenPackages();
      setPackages(availablePackages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load packages",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = useCallback(
    async (pkg: TokenPackage) => {
      setIsPurchasing(pkg.id);

      try {
        const result = await purchasesService.purchasePackage(pkg.id);

        if (result.success) {
          Alert.alert(
            "Purchase Successful!",
            `${result.tokensAdded} tokens have been added to your account. Your new balance is ${result.newBalance} tokens.`,
            [
              {
                text: "OK",
                onPress: () => {
                  refetchBalance();
                  router.back();
                },
              },
            ],
          );
        } else if (result.error !== "Purchase cancelled") {
          Alert.alert(
            "Purchase Failed",
            result.error || "Unknown error occurred",
          );
        }
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Purchase failed",
        );
      } finally {
        setIsPurchasing(null);
      }
    },
    [refetchBalance, router],
  );

  const handleRestorePurchases = useCallback(async () => {
    setIsPurchasing("restore");

    try {
      const result = await purchasesService.restorePurchases();

      if (result.success) {
        if (result.restored > 0) {
          Alert.alert(
            "Purchases Restored",
            `${result.restored} purchase(s) have been restored.`,
          );
          refetchBalance();
        } else {
          Alert.alert(
            "No Purchases Found",
            "No previous purchases to restore.",
          );
        }
      } else {
        Alert.alert(
          "Restore Failed",
          result.error || "Failed to restore purchases",
        );
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Restore failed",
      );
    } finally {
      setIsPurchasing(null);
    }
  }, [refetchBalance]);

  // Calculate enhancement counts for a token amount
  const getEnhancementCounts = (tokens: number) => ({
    tier1K: Math.floor(tokens / ENHANCEMENT_COSTS.TIER_1K),
    tier2K: Math.floor(tokens / ENHANCEMENT_COSTS.TIER_2K),
    tier4K: Math.floor(tokens / ENHANCEMENT_COSTS.TIER_4K),
  });

  // Get package tier styling
  const getPackageTier = (
    tokens: number,
  ): { label: string; color: string; bgColor: string; } => {
    if (tokens >= 500) {
      return { label: "Best Value", color: "$green10", bgColor: "$green3" };
    }
    if (tokens >= 150) {
      return { label: "Most Popular", color: "$blue10", bgColor: "$blue3" };
    }
    return { label: "Starter", color: "$gray10", bgColor: "$gray3" };
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner size="large" color="$blue10" />
        <Paragraph marginTop="$4">Loading packages...</Paragraph>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Paragraph color="$red10" textAlign="center" marginBottom="$4">
          {error}
        </Paragraph>
        <Button onPress={loadPackages} theme="blue">
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current Balance */}
      <Card
        elevate
        bordered
        padding="$4"
        marginBottom="$4"
        backgroundColor="$gray2"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Paragraph color="$gray11">Current Balance</Paragraph>
          <H3 color="$blue10">{balance} tokens</H3>
        </XStack>
      </Card>

      {/* Package Cards */}
      <YStack gap="$4">
        {packages.map((pkg) => {
          const tier = getPackageTier(pkg.tokens);
          const enhancements = getEnhancementCounts(pkg.tokens);
          const isProcessing = isPurchasing === pkg.id;
          const pricePerToken = (pkg.priceValue / pkg.tokens).toFixed(3);

          return (
            <Card
              key={pkg.id}
              elevate
              bordered
              padding="$5"
              borderWidth={pkg.tokens >= 150 ? 2 : 1}
              borderColor={pkg.tokens >= 500
                ? "$green8"
                : pkg.tokens >= 150
                ? "$blue8"
                : "$gray6"}
            >
              {/* Badge */}
              <View
                position="absolute"
                top={-10}
                right={16}
                backgroundColor={tier.bgColor}
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$4"
              >
                <Text color={tier.color} fontSize="$2" fontWeight="600">
                  {tier.label}
                </Text>
              </View>

              {/* Package Info */}
              <YStack gap="$3">
                <YStack>
                  <H2>{pkg.tokens} Tokens</H2>
                  <XStack alignItems="baseline" gap="$1">
                    <H3 color="$blue10">{pkg.price}</H3>
                    <Paragraph color="$gray10" size="$2">
                      ({pkg.currencyCode} {pricePerToken}/token)
                    </Paragraph>
                  </XStack>
                </YStack>

                <Separator />

                {/* Enhancement Estimates */}
                <YStack gap="$2">
                  <Paragraph fontWeight="600" size="$3">
                    Enhance up to:
                  </Paragraph>
                  <XStack gap="$3">
                    <XStack alignItems="center" gap="$1" flex={1}>
                      <View
                        width={8}
                        height={8}
                        borderRadius={4}
                        backgroundColor="$green10"
                      />
                      <Paragraph size="$2">
                        <Text fontWeight="bold">{enhancements.tier1K}</Text> at 1K
                      </Paragraph>
                    </XStack>
                    <XStack alignItems="center" gap="$1" flex={1}>
                      <View
                        width={8}
                        height={8}
                        borderRadius={4}
                        backgroundColor="$green10"
                      />
                      <Paragraph size="$2">
                        <Text fontWeight="bold">{enhancements.tier2K}</Text> at 2K
                      </Paragraph>
                    </XStack>
                    <XStack alignItems="center" gap="$1" flex={1}>
                      <View
                        width={8}
                        height={8}
                        borderRadius={4}
                        backgroundColor="$green10"
                      />
                      <Paragraph size="$2">
                        <Text fontWeight="bold">{enhancements.tier4K}</Text> at 4K
                      </Paragraph>
                    </XStack>
                  </XStack>
                </YStack>

                {/* Purchase Button */}
                <Button
                  size="$5"
                  theme={pkg.tokens >= 500
                    ? "green"
                    : pkg.tokens >= 150
                    ? "blue"
                    : "gray"}
                  disabled={isPurchasing !== null}
                  onPress={() => handlePurchase(pkg)}
                  marginTop="$2"
                >
                  {isProcessing
                    ? (
                      <XStack alignItems="center" gap="$2">
                        <Spinner size="small" color="white" />
                        <Text color="white">Processing...</Text>
                      </XStack>
                    )
                    : (
                      `Buy for ${pkg.price}`
                    )}
                </Button>
              </YStack>
            </Card>
          );
        })}
      </YStack>

      {/* Restore Purchases */}
      <Button
        variant="outlined"
        size="$4"
        marginTop="$6"
        marginBottom="$4"
        disabled={isPurchasing !== null}
        onPress={handleRestorePurchases}
      >
        {isPurchasing === "restore"
          ? (
            <XStack alignItems="center" gap="$2">
              <Spinner size="small" />
              <Text>Restoring...</Text>
            </XStack>
          )
          : (
            "Restore Previous Purchases"
          )}
      </Button>

      {/* Info Text */}
      <Paragraph
        size="$2"
        color="$gray10"
        textAlign="center"
        paddingHorizontal="$4"
      >
        Tokens are used to enhance your images with AI. Purchased tokens never expire and are added
        to your existing balance.
      </Paragraph>
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
    padding: 20,
  },
});
