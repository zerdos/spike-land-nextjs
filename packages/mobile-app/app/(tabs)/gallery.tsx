/**
 * Gallery Tab Screen
 * Main gallery view with masonry grid, selection mode, and album filtering
 */

import type { EnhancedImage, EnhancementTier } from "@spike-npm-land/shared";
import {
  Check,
  CheckSquare,
  ChevronDown,
  FolderPlus,
  Image as ImageIcon,
  MoreHorizontal,
  Sparkles,
  Square,
  Trash2,
  X,
} from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Popover, Separator, Sheet, Text, XStack, YStack } from "tamagui";

import { ImageGrid } from "@/components/gallery";
import { useGalleryStore } from "@/stores";

// ============================================================================
// Types
// ============================================================================

type EnhanceTier = "TIER_1K" | "TIER_2K" | "TIER_4K";

// ============================================================================
// Component
// ============================================================================

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showAlbumFilter, setShowAlbumFilter] = useState(false);
  const [showEnhanceSheet, setShowEnhanceSheet] = useState(false);
  const [showAddToAlbumSheet, setShowAddToAlbumSheet] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store state
  const {
    images,
    albums,
    isLoadingImages,
    hasMoreImages,
    isSelectionMode,
    selectedImageIds,
    selectedAlbumId,
    error,

    fetchImages,
    fetchMoreImages,
    refreshImages,
    fetchAlbums,
    setSelectedAlbum,
    toggleSelectionMode,
    toggleImageSelection,
    selectAllImages,
    clearSelection,
    batchEnhance,
    batchDelete,
    addSelectedImagesToAlbum,
    startSlideshow,
    clearError,
  } = useGalleryStore();

  // Fetch data on mount
  useEffect(() => {
    fetchImages();
    fetchAlbums();
  }, [fetchImages, fetchAlbums]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error, clearError]);

  // Get selected album name
  const selectedAlbumName = useMemo(() => {
    if (!selectedAlbumId) return "All Photos";
    const album = albums.find((a) => a.id === selectedAlbumId);
    return album?.name || "All Photos";
  }, [selectedAlbumId, albums]);

  // Selection count
  const selectionCount = selectedImageIds.size;

  // Handle image press
  const handleImagePress = useCallback(
    (image: EnhancedImage) => {
      if (isSelectionMode) {
        toggleImageSelection(image.id);
      } else {
        // Navigate to slideshow
        const index = images.findIndex((img) => img.id === image.id);
        startSlideshow(index >= 0 ? index : 0);
        router.push({
          pathname: "/canvas/[albumId]",
          params: { albumId: selectedAlbumId || "all" },
        });
      }
    },
    [isSelectionMode, toggleImageSelection, images, startSlideshow, router, selectedAlbumId],
  );

  // Handle image long press
  const handleImageLongPress = useCallback(
    (image: EnhancedImage) => {
      if (!isSelectionMode) {
        toggleSelectionMode();
        toggleImageSelection(image.id);
      }
    },
    [isSelectionMode, toggleSelectionMode, toggleImageSelection],
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshImages();
    setIsRefreshing(false);
  }, [refreshImages]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingImages && hasMoreImages) {
      fetchMoreImages();
    }
  }, [isLoadingImages, hasMoreImages, fetchMoreImages]);

  // Handle album filter select
  const handleAlbumSelect = useCallback(
    (albumId: string | null) => {
      setSelectedAlbum(albumId);
      setShowAlbumFilter(false);
    },
    [setSelectedAlbum],
  );

  // Handle batch enhance
  const handleBatchEnhance = useCallback(
    async (tier: EnhanceTier) => {
      setShowEnhanceSheet(false);
      const success = await batchEnhance(tier as EnhancementTier);
      if (success) {
        Alert.alert("Success", "Enhancement started for selected images");
      }
    },
    [batchEnhance],
  );

  // Handle batch delete
  const handleBatchDelete = useCallback(() => {
    Alert.alert(
      "Delete Images",
      `Are you sure you want to delete ${selectionCount} image${selectionCount > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await batchDelete();
          },
        },
      ],
    );
  }, [selectionCount, batchDelete]);

  // Handle add to album
  const handleAddToAlbum = useCallback(
    async (albumId: string) => {
      setShowAddToAlbumSheet(false);
      const success = await addSelectedImagesToAlbum(albumId);
      if (success) {
        Alert.alert("Success", "Images added to album");
      }
    },
    [addSelectedImagesToAlbum],
  );

  // Header component with album filter
  const ListHeaderComponent = useMemo(
    () => (
      <YStack paddingHorizontal="$3" paddingTop="$2" paddingBottom="$3" gap="$3">
        {/* Album Filter */}
        <Popover
          open={showAlbumFilter}
          onOpenChange={setShowAlbumFilter}
          placement="bottom"
        >
          <Popover.Trigger asChild>
            <Button
              size="$3"
              chromeless
              iconAfter={ChevronDown}
            >
              <Text fontWeight="600">{selectedAlbumName}</Text>
            </Button>
          </Popover.Trigger>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColor"
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
            animation={[
              "quick",
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            elevate
          >
            <YStack gap="$1" padding="$2" minWidth={200}>
              <Button
                size="$3"
                chromeless
                justifyContent="flex-start"
                onPress={() => handleAlbumSelect(null)}
                backgroundColor={!selectedAlbumId ? "$blue2" : "transparent"}
              >
                <ImageIcon size={16} />
                <Text>All Photos</Text>
              </Button>

              {albums.length > 0 && <Separator marginVertical="$2" />}

              {albums.map((album) => (
                <Button
                  key={album.id}
                  size="$3"
                  chromeless
                  justifyContent="flex-start"
                  onPress={() => handleAlbumSelect(album.id)}
                  backgroundColor={selectedAlbumId === album.id ? "$blue2" : "transparent"}
                >
                  <Text numberOfLines={1}>{album.name}</Text>
                </Button>
              ))}

              <Separator marginVertical="$2" />

              <Button
                size="$3"
                chromeless
                justifyContent="flex-start"
                onPress={() => {
                  setShowAlbumFilter(false);
                  router.push("/albums/create");
                }}
              >
                <FolderPlus size={16} />
                <Text>Create Album</Text>
              </Button>
            </YStack>
          </Popover.Content>
        </Popover>
      </YStack>
    ),
    [showAlbumFilter, selectedAlbumName, selectedAlbumId, albums, handleAlbumSelect, router],
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$2"
        backgroundColor="$background"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
      >
        {isSelectionMode
          ? (
            <>
              {/* Selection Mode Header */}
              <XStack alignItems="center" gap="$2">
                <Button
                  size="$3"
                  chromeless
                  circular
                  icon={X}
                  onPress={toggleSelectionMode}
                />
                <Text fontWeight="600">
                  {selectionCount} selected
                </Text>
              </XStack>

              <XStack gap="$2">
                <Button
                  size="$3"
                  chromeless
                  circular
                  icon={selectionCount === images.length ? Square : CheckSquare}
                  onPress={selectionCount === images.length ? clearSelection : selectAllImages}
                />
              </XStack>
            </>
          )
          : (
            <>
              {/* Normal Header */}
              <Text fontSize="$7" fontWeight="700">
                Gallery
              </Text>

              <XStack gap="$2">
                <Button
                  size="$3"
                  chromeless
                  circular
                  icon={Check}
                  onPress={toggleSelectionMode}
                />
                <Button
                  size="$3"
                  chromeless
                  circular
                  icon={MoreHorizontal}
                  onPress={() => router.push("/albums")}
                />
              </XStack>
            </>
          )}
      </XStack>

      {/* Image Grid */}
      <ImageGrid
        images={images}
        selectedImageIds={selectedImageIds}
        isSelectionMode={isSelectionMode}
        isLoading={isLoadingImages}
        isRefreshing={isRefreshing}
        hasMore={hasMoreImages}
        onImagePress={handleImagePress}
        onImageLongPress={handleImageLongPress}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        ListHeaderComponent={ListHeaderComponent}
      />

      {/* Selection Actions Bar */}
      {isSelectionMode && selectionCount > 0 && (
        <XStack
          position="absolute"
          bottom={insets.bottom + 60}
          left="$4"
          right="$4"
          backgroundColor="$gray12"
          borderRadius="$4"
          padding="$3"
          gap="$2"
          justifyContent="space-around"
          elevation={4}
        >
          <Button
            size="$3"
            chromeless
            onPress={() => setShowEnhanceSheet(true)}
          >
            <YStack alignItems="center" gap="$1">
              <Sparkles size={20} color="$gray1" />
              <Text fontSize="$1" color="$gray1">Enhance</Text>
            </YStack>
          </Button>

          <Button
            size="$3"
            chromeless
            onPress={() => setShowAddToAlbumSheet(true)}
          >
            <YStack alignItems="center" gap="$1">
              <FolderPlus size={20} color="$gray1" />
              <Text fontSize="$1" color="$gray1">Add to Album</Text>
            </YStack>
          </Button>

          <Button
            size="$3"
            chromeless
            onPress={handleBatchDelete}
          >
            <YStack alignItems="center" gap="$1">
              <Trash2 size={20} color="$red10" />
              <Text fontSize="$1" color="$red10">Delete</Text>
            </YStack>
          </Button>
        </XStack>
      )}

      {/* Enhance Tier Sheet */}
      <Sheet
        open={showEnhanceSheet}
        onOpenChange={setShowEnhanceSheet}
        snapPoints={[35]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4">
          <Sheet.Handle />
          <YStack gap="$4" paddingTop="$4">
            <Text fontSize="$6" fontWeight="600" textAlign="center">
              Select Enhancement Tier
            </Text>

            <YStack gap="$2">
              <Button
                size="$4"
                onPress={() => handleBatchEnhance("TIER_1K")}
              >
                <XStack flex={1} justifyContent="space-between" alignItems="center">
                  <Text>1K (1024px)</Text>
                  <Text color="$gray10">2 tokens/image</Text>
                </XStack>
              </Button>

              <Button
                size="$4"
                onPress={() => handleBatchEnhance("TIER_2K")}
              >
                <XStack flex={1} justifyContent="space-between" alignItems="center">
                  <Text>2K (2048px)</Text>
                  <Text color="$gray10">5 tokens/image</Text>
                </XStack>
              </Button>

              <Button
                size="$4"
                onPress={() => handleBatchEnhance("TIER_4K")}
              >
                <XStack flex={1} justifyContent="space-between" alignItems="center">
                  <Text>4K (4096px)</Text>
                  <Text color="$gray10">10 tokens/image</Text>
                </XStack>
              </Button>
            </YStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>

      {/* Add to Album Sheet */}
      <Sheet
        open={showAddToAlbumSheet}
        onOpenChange={setShowAddToAlbumSheet}
        snapPoints={[50]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4">
          <Sheet.Handle />
          <YStack gap="$4" paddingTop="$4">
            <Text fontSize="$6" fontWeight="600" textAlign="center">
              Add to Album
            </Text>

            {albums.length === 0
              ? (
                <YStack alignItems="center" gap="$4" paddingVertical="$6">
                  <Text color="$gray10">No albums yet</Text>
                  <Button
                    size="$4"
                    onPress={() => {
                      setShowAddToAlbumSheet(false);
                      router.push("/albums/create");
                    }}
                  >
                    <FolderPlus size={16} />
                    <Text>Create Album</Text>
                  </Button>
                </YStack>
              )
              : (
                <YStack gap="$2">
                  {albums.map((album) => (
                    <Button
                      key={album.id}
                      size="$4"
                      chromeless
                      justifyContent="flex-start"
                      borderWidth={1}
                      borderColor="$borderColor"
                      onPress={() => handleAddToAlbum(album.id)}
                    >
                      <Text>{album.name}</Text>
                    </Button>
                  ))}
                </YStack>
              )}
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
}
