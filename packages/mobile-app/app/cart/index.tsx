/**
 * Shopping Cart Screen
 * Displays cart items with quantity controls and checkout
 */

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";
import { Button, Card, H1, H3, Paragraph, Separator, Spinner, Text, XStack, YStack } from "tamagui";

import { getCart, removeCartItem, updateCartItem } from "@/services";
import {
  calculateShippingCost,
  type CartItemWithDetails,
  formatPrice,
  getRemainingForFreeShipping,
  MAX_QUANTITY_PER_ITEM,
  useCartStore,
} from "@/stores";

// ============================================================================
// Components
// ============================================================================

function QuantityControl({
  quantity,
  onIncrease,
  onDecrease,
  disabled,
}: {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  disabled: boolean;
}) {
  return (
    <XStack alignItems="center" gap="$2">
      <Button
        size="$2"
        circular
        backgroundColor="$gray4"
        disabled={disabled || quantity <= 1}
        onPress={onDecrease}
      >
        <FontAwesome name="minus" size={12} color="#374151" />
      </Button>
      <Text fontWeight="bold" minWidth={24} textAlign="center">
        {quantity}
      </Text>
      <Button
        size="$2"
        circular
        backgroundColor="$gray4"
        disabled={disabled || quantity >= MAX_QUANTITY_PER_ITEM}
        onPress={onIncrease}
      >
        <FontAwesome name="plus" size={12} color="#374151" />
      </Button>
    </XStack>
  );
}

function CartItem({
  item,
  onRemove,
  onUpdateQuantity,
  isUpdating,
}: {
  item: CartItemWithDetails;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
  isUpdating: boolean;
}) {
  const itemPrice = item.product.retailPrice + (item.variant?.priceDelta ?? 0);
  const totalPrice = itemPrice * item.quantity;
  const imageUrl = item.imageUrl || item.product.mockupTemplate;

  return (
    <Card bordered marginBottom="$3" opacity={isUpdating ? 0.5 : 1}>
      <Card.Header>
        <XStack gap="$3">
          {/* Image */}
          <YStack
            width={80}
            height={80}
            borderRadius="$3"
            overflow="hidden"
            backgroundColor="$gray4"
          >
            {imageUrl
              ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: 80, height: 80 }}
                  contentFit="cover"
                />
              )
              : (
                <YStack
                  flex={1}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={24}>image</Text>
                </YStack>
              )}
          </YStack>

          {/* Details */}
          <YStack flex={1} gap="$1">
            <Text fontWeight="bold" numberOfLines={2}>
              {item.product.name}
            </Text>
            {item.variant && (
              <Text fontSize="$2" color="$gray10">
                {item.variant.name}
              </Text>
            )}
            {item.customText && (
              <Text fontSize="$2" color="$gray10" numberOfLines={1}>
                Custom: {item.customText}
              </Text>
            )}
            <Text fontWeight="bold" color="$blue10">
              {formatPrice(itemPrice, item.product.currency)}
            </Text>
          </YStack>

          {/* Remove button */}
          <Button
            size="$2"
            circular
            backgroundColor="transparent"
            onPress={onRemove}
            disabled={isUpdating}
          >
            <FontAwesome name="trash" size={16} color="#ef4444" />
          </Button>
        </XStack>
      </Card.Header>

      <Card.Footer>
        <XStack
          flex={1}
          justifyContent="space-between"
          alignItems="center"
          paddingTop="$2"
        >
          <QuantityControl
            quantity={item.quantity}
            onIncrease={() => onUpdateQuantity(item.quantity + 1)}
            onDecrease={() => onUpdateQuantity(item.quantity - 1)}
            disabled={isUpdating}
          />
          <Text fontSize="$5" fontWeight="bold">
            {formatPrice(totalPrice, item.product.currency)}
          </Text>
        </XStack>
      </Card.Footer>
    </Card>
  );
}

function OrderSummary({
  subtotal,
  shippingCost,
  total,
  remainingForFreeShipping,
  onCheckout,
  isCheckingOut,
}: {
  subtotal: number;
  shippingCost: number;
  total: number;
  remainingForFreeShipping: number;
  onCheckout: () => void;
  isCheckingOut: boolean;
}) {
  return (
    <Card bordered padding="$4">
      <YStack gap="$3">
        <H3>Order Summary</H3>

        <XStack justifyContent="space-between">
          <Text color="$gray10">Subtotal</Text>
          <Text>{formatPrice(subtotal)}</Text>
        </XStack>

        <XStack justifyContent="space-between">
          <Text color="$gray10">Shipping</Text>
          {shippingCost === 0
            ? (
              <Text color="$green10" fontWeight="bold">
                FREE
              </Text>
            )
            : <Text>{formatPrice(shippingCost)}</Text>}
        </XStack>

        {remainingForFreeShipping > 0 && (
          <Card backgroundColor="$blue2" padding="$2" borderRadius="$2">
            <Text fontSize="$2" color="$blue11" textAlign="center">
              Add {formatPrice(remainingForFreeShipping)} more for free shipping!
            </Text>
          </Card>
        )}

        <Separator />

        <XStack justifyContent="space-between">
          <Text fontSize="$5" fontWeight="bold">
            Total
          </Text>
          <Text fontSize="$5" fontWeight="bold">
            {formatPrice(total)}
          </Text>
        </XStack>

        <Text fontSize="$1" color="$gray10" textAlign="center">
          VAT will be calculated at checkout for EU orders
        </Text>

        <Button
          size="$5"
          theme="blue"
          onPress={onCheckout}
          disabled={isCheckingOut}
          icon={isCheckingOut
            ? <Spinner size="small" color="white" />
            : <FontAwesome name="arrow-right" size={16} color="white" />}
        >
          Proceed to Checkout
        </Button>

        <Button
          size="$4"
          variant="outlined"
          onPress={() => router.push("/(tabs)/merch")}
        >
          Continue Shopping
        </Button>
      </YStack>
    </Card>
  );
}

function EmptyCart() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
      <FontAwesome name="shopping-bag" size={64} color="#9ca3af" />
      <H3 marginTop="$4" textAlign="center">
        Your cart is empty
      </H3>
      <Paragraph textAlign="center" color="$gray10" marginBottom="$4">
        Browse our merch collection and add some products!
      </Paragraph>
      <Button theme="blue" onPress={() => router.push("/(tabs)/merch")}>
        Browse Products
      </Button>
    </YStack>
  );
}

function LoadingState() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Spinner size="large" color="$blue10" />
      <Text marginTop="$4" color="$gray10">
        Loading cart...
      </Text>
    </YStack>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function CartScreen() {
  const queryClient = useQueryClient();
  const { cart, setCart, setLoading, setError } = useCartStore();
  const [updatingItemId, setUpdatingItemId] = React.useState<string | null>(null);

  // Fetch cart
  const cartQuery = useQuery({
    queryKey: ["merch", "cart"],
    queryFn: async () => {
      const response = await getCart();
      if (response.error) throw new Error(response.error);
      return response.data?.cart ?? null;
    },
  });

  // Sync cart with store
  useEffect(() => {
    if (cartQuery.data !== undefined) {
      setCart(cartQuery.data);
    }
    setLoading(cartQuery.isLoading);
    if (cartQuery.error) {
      setError(cartQuery.error.message);
    }
  }, [cartQuery.data, cartQuery.isLoading, cartQuery.error, setCart, setLoading, setError]);

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number; }) => {
      setUpdatingItemId(itemId);
      const response = await updateCartItem(itemId, quantity);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.cart) {
        setCart(data.cart);
      }
      queryClient.invalidateQueries({ queryKey: ["merch", "cart"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      setUpdatingItemId(itemId);
      const response = await removeCartItem(itemId);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merch", "cart"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    },
  });

  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      updateQuantityMutation.mutate({ itemId, quantity });
    },
    [updateQuantityMutation],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      Alert.alert(
        "Remove Item",
        "Are you sure you want to remove this item from your cart?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => removeItemMutation.mutate(itemId),
          },
        ],
      );
    },
    [removeItemMutation],
  );

  const handleCheckout = useCallback(() => {
    router.push("/checkout");
  }, []);

  const handleRefresh = useCallback(() => {
    cartQuery.refetch();
  }, [cartQuery]);

  // Calculate totals
  const subtotal = cart?.subtotal ?? 0;
  const shippingCost = calculateShippingCost(subtotal);
  const total = subtotal + shippingCost;
  const remainingForFreeShipping = getRemainingForFreeShipping(subtotal);

  // Loading state
  if (cartQuery.isLoading && !cart) {
    return (
      <>
        <Stack.Screen options={{ title: "Cart" }} />
        <YStack flex={1} backgroundColor="$background">
          <LoadingState />
        </YStack>
      </>
    );
  }

  // Empty cart
  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: "Cart" }} />
        <YStack flex={1} backgroundColor="$background">
          <EmptyCart />
        </YStack>
      </>
    );
  }

  const renderItem = ({ item }: { item: CartItemWithDetails; }) => (
    <CartItem
      item={item}
      onRemove={() => handleRemoveItem(item.id)}
      onUpdateQuantity={(quantity) => handleUpdateQuantity(item.id, quantity)}
      isUpdating={updatingItemId === item.id}
    />
  );

  return (
    <>
      <Stack.Screen options={{ title: `Cart (${cart.itemCount})` }} />
      <YStack flex={1} backgroundColor="$background" padding="$4">
        <H1 marginBottom="$4">Shopping Cart</H1>

        <FlatList
          data={cart.items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={cartQuery.isFetching}
              onRefresh={handleRefresh}
            />
          }
          ListFooterComponent={
            <OrderSummary
              subtotal={subtotal}
              shippingCost={shippingCost}
              total={total}
              remainingForFreeShipping={remainingForFreeShipping}
              onCheckout={handleCheckout}
              isCheckingOut={false}
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </YStack>
    </>
  );
}
