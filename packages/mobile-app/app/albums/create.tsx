/**
 * Create Album Screen
 * Form to create a new album
 */

import { Check, X } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Label, Spinner, Text, TextArea, XStack, YStack } from "tamagui";

import { useGalleryStore } from "@/stores";

export default function CreateAlbumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { createNewAlbum } = useGalleryStore();

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter an album name");
      return;
    }

    setIsCreating(true);
    try {
      const album = await createNewAlbum({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      const success = album !== null;
      if (success) {
        router.back();
      } else {
        Alert.alert("Error", "Failed to create album. Please try again.");
      }
    } catch (_error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  }, [name, description, createNewAlbum, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Button
            size="$3"
            chromeless
            circular
            icon={X}
            onPress={() => router.back()}
          />
          <Text fontSize="$5" fontWeight="600">
            New Album
          </Text>
          <Button
            size="$3"
            chromeless
            circular
            icon={isCreating ? Spinner : Check}
            disabled={!name.trim() || isCreating}
            opacity={!name.trim() || isCreating ? 0.5 : 1}
            onPress={handleCreate}
          />
        </XStack>

        {/* Form */}
        <YStack padding="$4" gap="$4">
          <YStack gap="$2">
            <Label htmlFor="name">Album Name</Label>
            <Input
              id="name"
              size="$4"
              placeholder="Enter album name"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </YStack>

          <YStack gap="$2">
            <Label htmlFor="description">Description (optional)</Label>
            <TextArea
              id="description"
              size="$4"
              placeholder="Add a description for this album"
              value={description}
              onChangeText={setDescription}
              numberOfLines={4}
            />
          </YStack>
        </YStack>

        {/* Create Button */}
        <YStack
          paddingHorizontal="$4"
          paddingBottom={insets.bottom + 16}
          marginTop="auto"
        >
          <Button
            size="$5"
            theme="active"
            disabled={!name.trim() || isCreating}
            onPress={handleCreate}
          >
            {isCreating ? <Spinner /> : "Create Album"}
          </Button>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
