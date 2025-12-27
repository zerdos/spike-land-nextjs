/**
 * ImageGrid Component
 * Reusable masonry-style grid for displaying images with selection support
 */

import type { EnhancedImage } from "@spike-npm-land/shared";
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Stack, Text, YStack } from "tamagui";

import { ImageThumbnail } from "./ImageThumbnail";

// ============================================================================
// Types
// ============================================================================

interface ImageGridProps {
  images: EnhancedImage[];
  selectedImageIds: Set<string>;
  isSelectionMode: boolean;
  isLoading: boolean;
  isRefreshing?: boolean;
  hasMore: boolean;
  columns?: number;
  spacing?: number;
  onImagePress: (image: EnhancedImage) => void;
  onImageLongPress: (image: EnhancedImage) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

// ============================================================================
// Component
// ============================================================================

export function ImageGrid({
  images,
  selectedImageIds,
  isSelectionMode,
  isLoading,
  isRefreshing = false,
  hasMore,
  columns = 3,
  spacing = 2,
  onImagePress,
  onImageLongPress,
  onRefresh,
  onLoadMore,
  ListHeaderComponent,
  ListEmptyComponent,
}: ImageGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate item size
  const itemSize = useMemo(() => {
    const totalSpacing = spacing * (columns + 1);
    return (screenWidth - totalSpacing) / columns;
  }, [screenWidth, columns, spacing]);

  // Create rows for the grid
  const rows = useMemo(() => {
    const result: EnhancedImage[][] = [];
    for (let i = 0; i < images.length; i += columns) {
      result.push(images.slice(i, i + columns));
    }
    return result;
  }, [images, columns]);

  // Render a row of images
  const renderRow = useCallback(
    ({ item: rowImages, index: rowIndex }: ListRenderItemInfo<EnhancedImage[]>) => (
      <Stack
        flexDirection="row"
        key={`row-${rowIndex}`}
        paddingHorizontal={spacing / 2}
      >
        {rowImages.map((image) => (
          <ImageThumbnail
            key={image.id}
            image={image}
            isSelected={selectedImageIds.has(image.id)}
            isSelectionMode={isSelectionMode}
            onPress={onImagePress}
            onLongPress={onImageLongPress}
            columns={columns}
            spacing={spacing}
          />
        ))}
        {/* Fill empty spaces in the last row */}
        {rowImages.length < columns &&
          Array.from({ length: columns - rowImages.length }).map((_, idx) => (
            <Stack
              key={`empty-${idx}`}
              width={itemSize}
              height={itemSize}
              margin={spacing / 2}
            />
          ))}
      </Stack>
    ),
    [selectedImageIds, isSelectionMode, onImagePress, onImageLongPress, columns, spacing, itemSize],
  );

  // Key extractor for rows
  const keyExtractor = useCallback(
    (_item: EnhancedImage[], index: number) => `row-${index}`,
    [],
  );

  // Handle end reached for pagination
  const handleEndReached = useCallback(() => {
    if (!isLoading && hasMore) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  // Default empty component
  const DefaultEmptyComponent = useCallback(() => (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
    >
      <Text fontSize="$6" color="$gray10">
        No images yet
      </Text>
      <Text fontSize="$3" color="$gray9" textAlign="center">
        Upload your first image to get started
      </Text>
    </YStack>
  ), []);

  // Footer loader
  const ListFooterComponent = useCallback(() => {
    if (!isLoading || isRefreshing) return null;
    return (
      <Stack padding="$4" alignItems="center">
        <Text color="$gray9">Loading more...</Text>
      </Stack>
    );
  }, [isLoading, isRefreshing]);

  return (
    <FlatList
      data={rows}
      renderItem={renderRow}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={!isLoading
        ? (ListEmptyComponent || DefaultEmptyComponent)
        : null}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={[
        styles.contentContainer,
        images.length === 0 && styles.emptyContainer,
      ]}
      style={styles.list}
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100, // Space for bottom tab bar
  },
  emptyContainer: {
    flex: 1,
  },
});
