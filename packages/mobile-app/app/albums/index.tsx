/**
 * Albums List Screen
 * Displays all user albums with create button
 */

import type { Album } from "@spike-npm-land/shared";
import { ArrowLeft, Plus } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, type ListRenderItemInfo, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Stack, Text, XStack, YStack } from "tamagui";

import { AlbumCard } from "@/components/gallery";
import { useGalleryStore } from "@/stores";

// ============================================================================
// Component
// ============================================================================

export default function AlbumsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Store state
  const {
    albums,
    isLoadingAlbums,
    fetchAlbums,
  } = useGalleryStore();

  // Fetch albums on mount
  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAlbums();
    setIsRefreshing(false);
  }, [fetchAlbums]);

  // Get image count for album
  const getAlbumImageCount = useCallback(
    (_albumId: string) => {
      // In a real app, this would be from the album data
      // For now, we just return 0
      return 0;
    },
    [],
  );

  // Get cover image URL for album
  const getCoverImageUrl = useCallback(
    (_album: Album) => {
      // In a real app, this would be from the album's cover image
      return undefined;
    },
    [],
  );

  // Handle album press
  const handleAlbumPress = useCallback(
    (album: Album) => {
      router.push({
        pathname: "/album/[id]",
        params: { id: album.id },
      });
    },
    [router],
  );

  // Handle album long press
  const handleAlbumLongPress = useCallback(
    (_album: Album) => {
      // Could show a context menu here
    },
    [],
  );

  // Render album card
  const renderAlbumCard = useCallback(
    ({ item: album }: ListRenderItemInfo<Album>) => (
      <Stack paddingHorizontal="$4" paddingVertical="$2">
        <AlbumCard
          album={album}
          imageCount={getAlbumImageCount(album.id)}
          coverImageUrl={getCoverImageUrl(album)}
          onPress={handleAlbumPress}
          onLongPress={handleAlbumLongPress}
        />
      </Stack>
    ),
    [getAlbumImageCount, getCoverImageUrl, handleAlbumPress, handleAlbumLongPress],
  );

  // Key extractor
  const keyExtractor = useCallback((item: Album) => item.id, []);

  // Empty component
  const ListEmptyComponent = useCallback(() => {
    if (isLoadingAlbums) return null;

    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$6"
        gap="$4"
      >
        <Text fontSize="$6" color="$gray10">
          No albums yet
        </Text>
        <Text fontSize="$3" color="$gray9" textAlign="center">
          Create your first album to organize your photos
        </Text>
        <Button
          size="$4"
          onPress={() => router.push("/albums/create")}
          marginTop="$4"
        >
          <Plus size={16} />
          <Text>Create Album</Text>
        </Button>
      </YStack>
    );
  }, [isLoadingAlbums, router]);

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$3"
        backgroundColor="$background"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
      >
        <XStack alignItems="center" gap="$2">
          <Button
            size="$3"
            chromeless
            circular
            icon={ArrowLeft}
            onPress={() => router.back()}
          />
          <Text fontSize="$6" fontWeight="700">
            Albums
          </Text>
        </XStack>

        <Button
          size="$3"
          chromeless
          circular
          icon={Plus}
          onPress={() => router.push("/albums/create")}
        />
      </XStack>

      {/* Albums List */}
      <FlatList
        data={albums}
        renderItem={renderAlbumCard}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={[
          styles.contentContainer,
          albums.length === 0 && styles.emptyContainer,
        ]}
        style={styles.list}
      />
    </YStack>
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
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
});
