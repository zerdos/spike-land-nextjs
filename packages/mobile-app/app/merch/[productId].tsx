/**
 * Product Detail Screen
 * Displays product details with variant selection and add to cart
 */

import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { MerchVariant } from "@spike-npm-land/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Dimensions, ScrollView as RNScrollView, TextInput } from "react-native";
import {
  Button,
  Card,
  H1,
  H3,
  Paragraph,
  ScrollView,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";

import {
  addToCart,
  getCart,
  getProduct,
  getUserEnhancedImages,
  type ProductWithDetails,
  uploadMerchImage,
} from "@/services";
import { formatPrice, useCartStore } from "@/stores";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// Types
// ============================================================================

interface SelectedImage {
  type: "enhanced" | "upload";
  imageId?: string;
  imageUrl: string;
  width: number;
  height: number;
  r2Key?: string;
}

// ============================================================================
// Components
// ============================================================================

function VariantSelector({
  variants,
  basePrice,
  currency,
  selectedVariantId,
  onSelect,
}: {
  variants: Pick<MerchVariant, "id" | "name" | "priceDelta" | "attributes">[];
  basePrice: number;
  currency: string;
  selectedVariantId: string | undefined;
  onSelect: (variant: typeof variants[0]) => void;
}) {
  return (
    <YStack gap="$2">
      <Text fontWeight="bold" fontSize="$4">
        Select Size
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap="$2">
          {variants.map((variant) => {
            const isSelected = variant.id === selectedVariantId;
            const price = basePrice + variant.priceDelta;

            return (
              <Button
                key={variant.id}
                size="$4"
                theme={isSelected ? "active" : undefined}
                backgroundColor={isSelected ? "$blue10" : "$gray4"}
                color={isSelected ? "white" : "$gray11"}
                onPress={() => onSelect(variant)}
                borderRadius="$4"
                minWidth={100}
              >
                <YStack alignItems="center">
                  <Text
                    fontWeight="bold"
                    color={isSelected ? "white" : "$gray12"}
                  >
                    {variant.name}
                  </Text>
                  {variant.priceDelta !== 0 && (
                    <Text fontSize="$2" color={isSelected ? "white" : "$gray10"}>
                      {variant.priceDelta > 0 ? "+" : ""}
                      {formatPrice(variant.priceDelta, currency)}
                    </Text>
                  )}
                </YStack>
              </Button>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
}

function ImageSelector({
  minWidth,
  minHeight,
  selectedImage,
  onSelect,
}: {
  minWidth: number;
  minHeight: number;
  selectedImage: SelectedImage | null;
  onSelect: (image: SelectedImage | null) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user's enhanced images
  const imagesQuery = useQuery({
    queryKey: ["user", "images"],
    queryFn: async () => {
      const response = await getUserEnhancedImages({ limit: 20 });
      if (response.error) throw new Error(response.error);
      return response.data?.images ?? [];
    },
  });

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        exif: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];

      // Check minimum dimensions
      if (asset.width < minWidth || asset.height < minHeight) {
        Alert.alert(
          "Image Too Small",
          `Please select an image at least ${minWidth}x${minHeight} pixels.`,
        );
        return;
      }

      setIsUploading(true);

      // Upload the image
      const uploadResult = await uploadMerchImage({
        uri: asset.uri,
        name: asset.fileName || "image.jpg",
        type: asset.mimeType || "image/jpeg",
      });

      if (uploadResult.error) {
        Alert.alert("Upload Failed", uploadResult.error);
        return;
      }

      if (uploadResult.data) {
        onSelect({
          type: "upload",
          imageUrl: uploadResult.data.imageUrl,
          r2Key: uploadResult.data.r2Key,
          width: uploadResult.data.width,
          height: uploadResult.data.height,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    } finally {
      setIsUploading(false);
    }
  }, [minWidth, minHeight, onSelect]);

  const handleSelectEnhancedImage = useCallback(
    (
      image: {
        id: string;
        originalUrl: string;
        enhancedUrl: string | null;
        width: number;
        height: number;
      },
    ) => {
      onSelect({
        type: "enhanced",
        imageId: image.id,
        imageUrl: image.enhancedUrl || image.originalUrl,
        width: image.width,
        height: image.height,
      });
    },
    [onSelect],
  );

  return (
    <YStack gap="$3">
      <Text fontWeight="bold" fontSize="$4">
        Your Image
      </Text>

      {/* Selected image preview */}
      {selectedImage && (
        <Card bordered padding="$3">
          <XStack gap="$3" alignItems="center">
            <Image
              source={{ uri: selectedImage.imageUrl }}
              style={{ width: 80, height: 80, borderRadius: 8 }}
              contentFit="cover"
            />
            <YStack flex={1}>
              <Text fontWeight="bold">
                {selectedImage.type === "enhanced" ? "Enhanced Image" : "Uploaded Image"}
              </Text>
              <Text fontSize="$2" color="$gray10">
                {selectedImage.width} x {selectedImage.height}
              </Text>
            </YStack>
            <Button
              size="$2"
              circular
              theme="red"
              onPress={() => onSelect(null)}
            >
              <FontAwesome name="times" size={14} color="white" />
            </Button>
          </XStack>
        </Card>
      )}

      {/* Upload button */}
      <Button
        size="$4"
        theme="blue"
        onPress={handlePickImage}
        disabled={isUploading}
        icon={isUploading
          ? <Spinner size="small" color="white" />
          : <FontAwesome name="upload" size={16} color="white" />}
      >
        {isUploading ? "Uploading..." : "Upload New Image"}
      </Button>

      {/* Enhanced images */}
      {imagesQuery.data && imagesQuery.data.length > 0 && (
        <YStack gap="$2">
          <Text fontSize="$3" color="$gray10">
            Or choose from your enhanced images:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap="$2">
              {imagesQuery.data.map((image) => {
                const isSelected = selectedImage?.imageId === image.id;
                return (
                  <Button
                    key={image.id}
                    unstyled
                    onPress={() => handleSelectEnhancedImage(image)}
                  >
                    <YStack
                      borderWidth={2}
                      borderColor={isSelected ? "$blue10" : "transparent"}
                      borderRadius="$3"
                      overflow="hidden"
                    >
                      <Image
                        source={{ uri: image.enhancedUrl || image.originalUrl }}
                        style={{ width: 80, height: 80 }}
                        contentFit="cover"
                      />
                    </YStack>
                  </Button>
                );
              })}
            </XStack>
          </ScrollView>
        </YStack>
      )}
    </YStack>
  );
}

function LoadingState() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Spinner size="large" color="$blue10" />
      <Text marginTop="$4" color="$gray10">
        Loading product...
      </Text>
    </YStack>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
      <Text fontSize={48} marginBottom="$4">
        error
      </Text>
      <H3 textAlign="center">Something went wrong</H3>
      <Paragraph textAlign="center" color="$gray10" marginBottom="$4">
        {message}
      </Paragraph>
      <Button onPress={onRetry} theme="active">
        Try Again
      </Button>
    </YStack>
  );
}

// ============================================================================
// Main Screen
// ============================================================================

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string; }>();
  const queryClient = useQueryClient();
  const setCart = useCartStore((state) => state.setCart);

  // State
  const [selectedVariant, setSelectedVariant] = useState<
    Pick<MerchVariant, "id" | "name" | "priceDelta" | "attributes"> | null
  >(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [customText, setCustomText] = useState("");

  // Fetch product
  const productQuery = useQuery({
    queryKey: ["merch", "product", productId],
    queryFn: async () => {
      const response = await getProduct(productId!);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: !!productId,
  });

  // Set default variant
  React.useEffect(() => {
    if (productQuery.data?.variants[0] && !selectedVariant) {
      setSelectedVariant(productQuery.data.variants[0]);
    }
  }, [productQuery.data, selectedVariant]);

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!productQuery.data || !selectedImage) {
        throw new Error("Please select an image");
      }

      const response = await addToCart({
        productId: productQuery.data.id,
        variantId: selectedVariant?.id,
        imageId: selectedImage.type === "enhanced" ? selectedImage.imageId : undefined,
        uploadedImageUrl: selectedImage.type === "upload" ? selectedImage.imageUrl : undefined,
        quantity: 1,
        customText: customText.trim() || undefined,
      });

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.cart) {
        setCart(data.cart);
      }
      queryClient.invalidateQueries({ queryKey: ["merch", "cart"] });
      Alert.alert(
        "Added to Cart",
        "Item has been added to your cart.",
        [
          { text: "Continue Shopping", style: "cancel" },
          {
            text: "View Cart",
            onPress: () => router.push("/cart"),
          },
        ],
      );
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleAddToCart = useCallback(() => {
    if (!selectedImage) {
      Alert.alert("Select Image", "Please select an image for your product.");
      return;
    }
    addToCartMutation.mutate();
  }, [addToCartMutation, selectedImage]);

  const product = productQuery.data;
  const totalPrice = useMemo(() => {
    if (!product) return 0;
    return product.retailPrice + (selectedVariant?.priceDelta ?? 0);
  }, [product, selectedVariant]);

  if (productQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <YStack flex={1} backgroundColor="$background">
          <LoadingState />
        </YStack>
      </>
    );
  }

  if (productQuery.error || !product) {
    return (
      <>
        <Stack.Screen options={{ title: "Error" }} />
        <YStack flex={1} backgroundColor="$background">
          <ErrorState
            message={productQuery.error?.message ?? "Product not found"}
            onRetry={() => productQuery.refetch()}
          />
        </YStack>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: product.name,
          headerBackTitle: "Back",
        }}
      />
      <RNScrollView
        style={{ flex: 1, backgroundColor: "#fff" }}
        showsVerticalScrollIndicator={false}
      >
        <YStack>
          {/* Product image */}
          {product.mockupTemplate
            ? (
              <Image
                source={{ uri: product.mockupTemplate }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                contentFit="cover"
                transition={200}
              />
            )
            : (
              <YStack
                width={SCREEN_WIDTH}
                height={SCREEN_WIDTH}
                backgroundColor="$gray4"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={60}>image</Text>
              </YStack>
            )}

          {/* Product details */}
          <YStack padding="$4" gap="$4">
            {/* Category badge */}
            <XStack>
              <YStack
                backgroundColor="$gray4"
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$10"
              >
                <Text fontSize="$2" color="$gray10">
                  {product.category.name}
                </Text>
              </YStack>
            </XStack>

            {/* Title and price */}
            <YStack gap="$2">
              <H1 fontSize="$8">{product.name}</H1>
              <Text fontSize="$7" fontWeight="bold" color="$blue10">
                {formatPrice(totalPrice, product.currency)}
              </Text>
            </YStack>

            {/* Description */}
            {product.description && <Paragraph color="$gray11">{product.description}</Paragraph>}

            <Separator />

            {/* Variant selector */}
            {product.variants.length > 0 && (
              <>
                <VariantSelector
                  variants={product.variants}
                  basePrice={product.retailPrice}
                  currency={product.currency}
                  selectedVariantId={selectedVariant?.id}
                  onSelect={setSelectedVariant}
                />
                <Separator />
              </>
            )}

            {/* Image selector */}
            <ImageSelector
              minWidth={product.minWidth}
              minHeight={product.minHeight}
              selectedImage={selectedImage}
              onSelect={setSelectedImage}
            />

            <Separator />

            {/* Custom text */}
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="bold" fontSize="$4">
                  Custom Text
                </Text>
                <Text fontSize="$2" color="$gray10">
                  (optional)
                </Text>
              </XStack>
              <TextInput
                value={customText}
                onChangeText={setCustomText}
                placeholder="Add any custom text for your product..."
                maxLength={100}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
              <Text fontSize="$2" color="$gray10">
                {customText.length}/100 characters
              </Text>
            </YStack>

            <Separator />

            {/* Add to cart button */}
            <Button
              size="$5"
              theme="blue"
              onPress={handleAddToCart}
              disabled={addToCartMutation.isPending || !selectedImage}
              icon={addToCartMutation.isPending
                ? <Spinner size="small" color="white" />
                : <FontAwesome name="shopping-cart" size={18} color="white" />}
            >
              {addToCartMutation.isPending
                ? "Adding..."
                : `Add to Cart - ${formatPrice(totalPrice, product.currency)}`}
            </Button>

            {/* Shipping info */}
            <Text textAlign="center" color="$gray10" fontSize="$3">
              Free UK shipping on orders over 55 GBP
            </Text>

            {/* Spacer for safe area */}
            <YStack height={32} />
          </YStack>
        </YStack>
      </RNScrollView>
    </>
  );
}
