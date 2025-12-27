/**
 * Merch Store Tab Screen
 * Displays product grid with category filters and search
 */

import type { MerchCategory } from "@spike-land/shared";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, FlatList, RefreshControl, TextInput } from "react-native";
import {
  Button,
  Card,
  H1,
  H3,
  Paragraph,
  ScrollView,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";

import { getCategories, getProducts, type ProductWithDetails } from "@/services";
import { formatPrice } from "@/stores";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// ============================================================================
// Components
// ============================================================================

function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: MerchCategory[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      <Button
        size="$3"
        theme={selectedCategory === null ? "active" : undefined}
        backgroundColor={selectedCategory === null ? "$blue10" : "$gray4"}
        color={selectedCategory === null ? "white" : "$gray11"}
        onPress={() => onSelectCategory(null)}
        borderRadius="$10"
      >
        All Products
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          size="$3"
          theme={selectedCategory === category.slug ? "active" : undefined}
          backgroundColor={selectedCategory === category.slug ? "$blue10" : "$gray4"}
          color={selectedCategory === category.slug ? "white" : "$gray11"}
          onPress={() => onSelectCategory(category.slug)}
          borderRadius="$10"
        >
          {category.icon && <Text>{category.icon}</Text>}
          {category.name}
        </Button>
      ))}
    </ScrollView>
  );
}

function ProductCard({ product }: { product: ProductWithDetails; }) {
  const handlePress = useCallback(() => {
    router.push(`/merch/${product.id}`);
  }, [product.id]);

  const minVariantPrice = useMemo(() => {
    if (product.variants.length === 0) return product.retailPrice;
    const minDelta = Math.min(...product.variants.map((v) => v.priceDelta));
    return product.retailPrice + minDelta;
  }, [product]);

  return (
    <Card
      elevate
      size="$4"
      width={CARD_WIDTH}
      pressStyle={{ scale: 0.97 }}
      onPress={handlePress}
      animation="quick"
      marginBottom="$4"
    >
      <Card.Header padded={false}>
        {product.mockupTemplate
          ? (
            <Image
              source={{ uri: product.mockupTemplate }}
              style={{
                width: CARD_WIDTH,
                height: CARD_WIDTH,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
              contentFit="cover"
              transition={200}
            />
          )
          : (
            <YStack
              width={CARD_WIDTH}
              height={CARD_WIDTH}
              backgroundColor="$gray4"
              alignItems="center"
              justifyContent="center"
              borderTopLeftRadius={8}
              borderTopRightRadius={8}
            >
              <Text fontSize={40}>image</Text>
            </YStack>
          )}
      </Card.Header>
      <Card.Footer padded>
        <YStack gap="$1" flex={1}>
          <Text
            fontSize="$3"
            color="$gray10"
            textTransform="uppercase"
            letterSpacing={0.5}
          >
            {product.category.name}
          </Text>
          <H3 fontSize="$4" numberOfLines={2}>
            {product.name}
          </H3>
          <Text fontSize="$5" fontWeight="bold" color="$blue10">
            {formatPrice(minVariantPrice, product.currency)}
          </Text>
        </YStack>
      </Card.Footer>
    </Card>
  );
}

function ProductGrid({
  products,
  isRefreshing,
  onRefresh,
}: {
  products: ProductWithDetails[];
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const renderItem = useCallback(
    ({ item }: { item: ProductWithDetails; }) => <ProductCard product={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ProductWithDetails) => item.id, []);

  if (products.length === 0) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Text fontSize={48} marginBottom="$4">
          empty
        </Text>
        <H3 textAlign="center">No products found</H3>
        <Paragraph textAlign="center" color="$gray10">
          Try a different category or search term
        </Paragraph>
      </YStack>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
      columnWrapperStyle={{ justifyContent: "space-between" }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function SearchBar({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <XStack paddingHorizontal="$4" marginBottom="$3">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search products..."
        placeholderTextColor="#9ca3af"
        style={{
          flex: 1,
          backgroundColor: "#f3f4f6",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          fontSize: 16,
        }}
      />
    </XStack>
  );
}

function LoadingState() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Spinner size="large" color="$blue10" />
      <Text marginTop="$4" color="$gray10">
        Loading products...
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

export default function MerchScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ["merch", "categories"],
    queryFn: async () => {
      const response = await getCategories();
      if (response.error) throw new Error(response.error);
      return response.data?.categories ?? [];
    },
  });

  // Fetch products
  const productsQuery = useQuery({
    queryKey: ["merch", "products", selectedCategory, searchQuery],
    queryFn: async () => {
      const response = await getProducts({
        category: selectedCategory ?? undefined,
        search: searchQuery || undefined,
      });
      if (response.error) throw new Error(response.error);
      return response.data?.products ?? [];
    },
  });

  const handleRefresh = useCallback(() => {
    productsQuery.refetch();
    categoriesQuery.refetch();
  }, [productsQuery, categoriesQuery]);

  const handleCategorySelect = useCallback((slug: string | null) => {
    setSelectedCategory(slug);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Loading state
  if (productsQuery.isLoading && !productsQuery.data) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <LoadingState />
      </YStack>
    );
  }

  // Error state
  if (productsQuery.error && !productsQuery.data) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <ErrorState
          message={productsQuery.error.message}
          onRetry={handleRefresh}
        />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack padding="$4" paddingBottom="$2">
        <H1 fontSize="$8" marginBottom="$1">
          Photo Merchandise
        </H1>
        <Paragraph color="$gray10">
          Transform your enhanced images into premium products
        </Paragraph>
      </YStack>

      {/* Search */}
      <SearchBar value={searchQuery} onChangeText={handleSearchChange} />

      {/* Category filters */}
      {categoriesQuery.data && categoriesQuery.data.length > 0 && (
        <YStack marginBottom="$3">
          <CategoryFilter
            categories={categoriesQuery.data}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </YStack>
      )}

      {/* Product grid */}
      <ProductGrid
        products={productsQuery.data ?? []}
        isRefreshing={productsQuery.isFetching}
        onRefresh={handleRefresh}
      />
    </YStack>
  );
}
