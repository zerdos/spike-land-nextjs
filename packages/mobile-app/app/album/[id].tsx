/**
 * Album Detail Screen
 * Displays album images with header, settings, and batch operations
 */

import type { EnhancedImage, EnhancementTier } from "@spike-npm-land/shared";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  MoreVertical,
  Plus,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
} from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Popover, Separator, Sheet, Stack, Text, XStack, YStack } from "tamagui";

import { ImageGrid } from "@/components/gallery";
import { useGalleryStore } from "@/stores";

// ============================================================================
// Types
// ============================================================================

type EnhanceTier = "TIER_1K" | "TIER_2K" | "TIER_4K";

// ============================================================================
// Component
// ============================================================================

export default function AlbumDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string; }>();

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEnhanceSheet, setShowEnhanceSheet] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store state
  const {
    images,
    albums,
    isLoadingImages,
    hasMoreImages,
    isSelectionMode,
    selectedImageIds,
    error,

    fetchImages,
    fetchMoreImages,
    setSelectedAlbum,
    toggleSelectionMode,
    toggleImageSelection,
    selectAllImages,
    clearSelection,
    batchEnhance,
    batchDelete,
    removeAlbum,
    startSlideshow,
    clearError,
  } = useGalleryStore();

  // Get current album
  const album = useMemo(() => {
    return albums.find((a) => a.id === id);
  }, [albums, id]);

  // Fetch album images on mount
  useEffect(() => {
    if (id) {
      setSelectedAlbum(id);
    }

    return () => {
      // Clear album filter when leaving
      setSelectedAlbum(null);
    };
  }, [id, setSelectedAlbum]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error, clearError]);

  // Selection count
  const selectionCount = selectedImageIds.size;

  // Cover image URL
  const coverImageUrl = useMemo(() => {
    if (images.length > 0) {
      return images[0].originalUrl;
    }
    return null;
  }, [images]);

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
          params: { albumId: id || "all" },
        });
      }
    },
    [isSelectionMode, toggleImageSelection, images, startSlideshow, router, id],
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
    await fetchImages({ albumId: id });
    setIsRefreshing(false);
  }, [fetchImages, id]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingImages && hasMoreImages) {
      fetchMoreImages();
    }
  }, [isLoadingImages, hasMoreImages, fetchMoreImages]);

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

  // Handle delete album
  const handleDeleteAlbum = useCallback(() => {
    Alert.alert(
      "Delete Album",
      `Are you sure you want to delete "${album?.name}"? The images will not be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (id) {
              const success = await removeAlbum(id);
              if (success) {
                router.back();
              }
            }
          },
        },
      ],
    );
  }, [album?.name, id, removeAlbum, router]);

  // Header component with album info
  const ListHeaderComponent = useMemo(
    () => (
      <YStack>
        {/* Album Cover */}
        <Stack height={200} backgroundColor="$gray3">
          {coverImageUrl
            ? (
              <Image
                source={{ uri: coverImageUrl }}
                style={styles.coverImage}
                contentFit="cover"
                transition={200}
              />
            )
            : (
              <Stack flex={1} alignItems="center" justifyContent="center">
                <Text color="$gray10" fontSize="$5">No Images</Text>
              </Stack>
            )}

          {/* Overlay gradient */}
          <Stack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            height={80}
            style={{
              background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
            }}
          />
        </Stack>

        {/* Album Info */}
        <YStack padding="$4" gap="$2">
          <Text fontSize="$7" fontWeight="700" color="$gray12">
            {album?.name || "Album"}
          </Text>

          {album?.description && (
            <Text fontSize="$4" color="$gray10">
              {album.description}
            </Text>
          )}

          <XStack gap="$3" marginTop="$2">
            <Text fontSize="$3" color="$gray9">
              {images.length} {images.length === 1 ? "image" : "images"}
            </Text>
            <Text fontSize="$3" color="$gray9">
              {album?.privacy}
            </Text>
          </XStack>
        </YStack>

        <Separator />
      </YStack>
    ),
    [album, coverImageUrl, images.length],
  );

  if (!album && !isLoadingImages) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$6">
        <Text fontSize="$5" color="$gray10">Album not found</Text>
        <Button marginTop="$4" onPress={() => router.back()}>
          <ArrowLeft size={16} />
          <Text>Go Back</Text>
        </Button>
      </YStack>
    );
  }

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
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={100}
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
              <Button
                size="$3"
                chromeless
                circular
                icon={ArrowLeft}
                onPress={() => router.back()}
              />

              <XStack gap="$2">
                <Button
                  size="$3"
                  chromeless
                  circular
                  icon={Plus}
                  onPress={() => {
                    // TODO: Add images to album
                    Alert.alert("Coming Soon", "Add images feature coming soon");
                  }}
                />

                <Popover
                  open={showOptionsMenu}
                  onOpenChange={setShowOptionsMenu}
                  placement="bottom-end"
                >
                  <Popover.Trigger asChild>
                    <Button size="$3" chromeless circular icon={MoreVertical} />
                  </Popover.Trigger>

                  <Popover.Content
                    borderWidth={1}
                    borderColor="$borderColor"
                    enterStyle={{ y: -10, opacity: 0 }}
                    exitStyle={{ y: -10, opacity: 0 }}
                    animation="quick"
                    elevate
                  >
                    <YStack gap="$1" padding="$2" minWidth={180}>
                      <Button
                        size="$3"
                        chromeless
                        justifyContent="flex-start"
                        onPress={() => {
                          setShowOptionsMenu(false);
                          toggleSelectionMode();
                        }}
                      >
                        <Check size={16} />
                        <Text>Select Images</Text>
                      </Button>

                      <Button
                        size="$3"
                        chromeless
                        justifyContent="flex-start"
                        onPress={() => {
                          setShowOptionsMenu(false);
                          // TODO: Album settings
                          Alert.alert("Coming Soon", "Album settings coming soon");
                        }}
                      >
                        <Settings size={16} />
                        <Text>Album Settings</Text>
                      </Button>

                      <Separator marginVertical="$2" />

                      <Button
                        size="$3"
                        chromeless
                        justifyContent="flex-start"
                        onPress={() => {
                          setShowOptionsMenu(false);
                          handleDeleteAlbum();
                        }}
                      >
                        <Trash2 size={16} color="$red10" />
                        <Text color="$red10">Delete Album</Text>
                      </Button>
                    </YStack>
                  </Popover.Content>
                </Popover>
              </XStack>
            </>
          )}
      </XStack>

      {/* Image Grid */}
      <Stack flex={1} marginTop={insets.top + 44}>
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
      </Stack>

      {/* Selection Actions Bar */}
      {isSelectionMode && selectionCount > 0 && (
        <XStack
          position="absolute"
          bottom={insets.bottom + 20}
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
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  coverImage: {
    width: "100%",
    height: "100%",
  },
});
