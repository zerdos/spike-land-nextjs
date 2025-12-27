/**
 * Voucher Redemption Screen
 * Allows users to redeem voucher codes for tokens
 */

import { Gift, Ticket } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Input, Spinner, Text, XStack, YStack } from "tamagui";

import { useTokenStore } from "@/stores";

export default function VoucherRedemptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [result, setResult] = useState<
    { success: boolean; tokens?: number; message?: string; } | null
  >(null);

  const { redeemVoucher } = useTokenStore();

  const handleRedeem = useCallback(async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a voucher code");
      return;
    }

    setIsRedeeming(true);
    setResult(null);

    try {
      const response = await redeemVoucher(code.trim().toUpperCase());
      if (response.success) {
        setResult({
          success: true,
          tokens: response.tokens,
          message: `Successfully redeemed ${response.tokens} tokens!`,
        });
        setCode("");
      } else {
        setResult({
          success: false,
          message: response.error || "Failed to redeem voucher",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "An unexpected error occurred",
      });
    } finally {
      setIsRedeeming(false);
    }
  }, [code, redeemVoucher]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <YStack flex={1} backgroundColor="$background" paddingHorizontal="$4">
        <YStack paddingTop={insets.top + 16} paddingBottom="$4">
          <Text fontSize="$8" fontWeight="700">
            Redeem Voucher
          </Text>
          <Text color="$gray10" marginTop="$2">
            Enter your voucher code below to receive tokens
          </Text>
        </YStack>

        {/* Voucher Icon */}
        <YStack alignItems="center" paddingVertical="$6">
          <YStack
            width={100}
            height={100}
            borderRadius={50}
            backgroundColor="$blue2"
            justifyContent="center"
            alignItems="center"
          >
            <Gift size={48} color="$blue10" />
          </YStack>
        </YStack>

        {/* Input */}
        <YStack gap="$4">
          <Input
            size="$5"
            placeholder="Enter voucher code"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="center"
            fontWeight="600"
            letterSpacing={2}
          />

          <Button
            size="$5"
            theme="active"
            disabled={!code.trim() || isRedeeming}
            onPress={handleRedeem}
            icon={isRedeeming ? Spinner : Ticket}
          >
            {isRedeeming ? "Redeeming..." : "Redeem Code"}
          </Button>
        </YStack>

        {/* Result */}
        {result && (
          <Card
            marginTop="$4"
            padding="$4"
            backgroundColor={result.success ? "$green2" : "$red2"}
            borderRadius="$4"
          >
            <XStack alignItems="center" gap="$3">
              {result.success
                ? <Gift size={24} color="$green10" />
                : <Ticket size={24} color="$red10" />}
              <YStack flex={1}>
                <Text
                  fontWeight="600"
                  color={result.success ? "$green11" : "$red11"}
                >
                  {result.success ? "Success!" : "Error"}
                </Text>
                <Text
                  fontSize="$3"
                  color={result.success ? "$green10" : "$red10"}
                >
                  {result.message}
                </Text>
              </YStack>
            </XStack>
          </Card>
        )}

        {/* Info */}
        <YStack marginTop="auto" paddingBottom={insets.bottom + 16}>
          <Card padding="$4" backgroundColor="$gray2" borderRadius="$4">
            <Text fontSize="$2" color="$gray10" textAlign="center">
              Voucher codes are case-insensitive and can only be used once. Contact support if you
              have issues redeeming your code.
            </Text>
          </Card>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
