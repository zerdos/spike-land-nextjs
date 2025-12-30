/**
 * Checkout Screen
 * Handles payment processing for merchandise orders
 */

import { useRouter } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Separator, Text, YStack } from "tamagui";

import { calculateShippingCost, useCartStore } from "@/stores";
import type { CartItemWithDetails } from "@/stores/cart-store";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, getSubtotal, getTotal, getItemPrice, clearCart } = useCartStore();
  const items = cart?.items ?? [];
  const subtotal = getSubtotal();
  const shipping = calculateShippingCost(subtotal);
  const total = getTotal(shipping);

  const handlePlaceOrder = () => {
    // In a real app, this would process payment via RevenueCat/Stripe
    clearCart();
    router.replace("/(tabs)/merch");
  };

  return (
    <YStack flex={1} backgroundColor="$background" paddingHorizontal="$4">
      <YStack paddingTop={insets.top + 16} paddingBottom="$4">
        <Text fontSize="$8" fontWeight="700">
          Checkout
        </Text>
      </YStack>

      <Card padding="$4" bordered marginBottom="$4">
        <Text fontSize="$5" fontWeight="600">Order Summary</Text>
        <Separator marginVertical="$3" />

        {items.map((item: CartItemWithDetails) => (
          <YStack
            key={`${item.product.id}-${item.variantId}`}
            marginBottom="$2"
          >
            <Text>{item.product.name} x {item.quantity}</Text>
            <Text color="$gray10">
              £{(getItemPrice(item) * item.quantity).toFixed(2)}
            </Text>
          </YStack>
        ))}

        <Separator marginVertical="$3" />

        <YStack gap="$2">
          <YStack flexDirection="row" justifyContent="space-between">
            <Text>Subtotal</Text>
            <Text>£{subtotal.toFixed(2)}</Text>
          </YStack>
          <YStack flexDirection="row" justifyContent="space-between">
            <Text>Shipping</Text>
            <Text>£{shipping.toFixed(2)}</Text>
          </YStack>
          <Separator marginVertical="$2" />
          <YStack flexDirection="row" justifyContent="space-between">
            <Text fontWeight="600">Total</Text>
            <Text fontWeight="600">£{total.toFixed(2)}</Text>
          </YStack>
        </YStack>
      </Card>

      <YStack marginTop="auto" paddingBottom={insets.bottom + 16}>
        <Button size="$5" theme="active" onPress={handlePlaceOrder}>
          Place Order
        </Button>
      </YStack>
    </YStack>
  );
}
