/**
 * Canvas/Slideshow View
 * Full-screen image viewer with swipe navigation, sharing, and download
 */

import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Pressable, StatusBar, StyleSheet } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";

import { ImageActions } from "@/components/ImageActions";
import { ShareSheet } from "@/components/ShareSheet";
import { useGalleryStore } from "@/stores";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================================================
// Toast Component (inline for simplicity)
// ============================================================================

interface ToastProps {
  visible: boolean;
  message: string;
  type: "success" | "error";
}

function Toast({ visible, message, type }: ToastProps) {
  // Use fallback for testing environments where useSharedValue may return undefined
  const rawOpacity = useSharedValue(0);
  const opacity = useMemo(() => rawOpacity ?? { value: 0 }, [rawOpacity]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible && (opacity.value ?? 0) === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.toast, animatedStyle]} pointerEvents="none">
      <XStack
        backgroundColor={type === "success" ? "$green10" : "$red10"}
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderRadius="$4"
        shadowColor="black"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.25}
        shadowRadius={4}
        elevation={5}
      >
        <Text color="white" fontWeight="600">
          {message}
        </Text>
      </XStack>
    </Animated.View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

// Default insets for testing environments
const DEFAULT_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export default function CanvasScreen() {
  const router = useRouter();
  const { albumId: _albumId } = useLocalSearchParams<{ albumId: string; }>();
  const insets = useSafeAreaInsets() ?? DEFAULT_INSETS;

  // UI State
  const [showControls, setShowControls] = useState(true);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<
    { visible: boolean; message: string; type: "success" | "error"; }
  >({
    visible: false,
    message: "",
    type: "success",
  });

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store state
  const {
    images,
    slideshowIndex: currentSlideshowIndex,
    goToSlide,
    removeImage,
  } = useGalleryStore();
  const setCurrentSlideshowIndex = goToSlide;

  // Current image
  const currentImage = useMemo(() => {
    return images[currentSlideshowIndex] || null;
  }, [images, currentSlideshowIndex]);

  // Animation values - use fallback objects for testing environments
  const defaultSharedValue = useMemo(() => ({ value: 0 }), []);
  const rawScale = useSharedValue(1);
  const rawSavedScale = useSharedValue(1);
  const rawTranslateX = useSharedValue(0);
  const rawSavedTranslateX = useSharedValue(0);
  const rawTranslateY = useSharedValue(0);
  const rawSavedTranslateY = useSharedValue(0);

  const scale = useMemo(() => rawScale ?? { ...defaultSharedValue, value: 1 }, [
    rawScale,
    defaultSharedValue,
  ]);
  const savedScale = useMemo(
    () => rawSavedScale ?? { ...defaultSharedValue, value: 1 },
    [
      rawSavedScale,
      defaultSharedValue,
    ],
  );
  const translateX = useMemo(() => rawTranslateX ?? defaultSharedValue, [
    rawTranslateX,
    defaultSharedValue,
  ]);
  const savedTranslateX = useMemo(
    () => rawSavedTranslateX ?? defaultSharedValue,
    [
      rawSavedTranslateX,
      defaultSharedValue,
    ],
  );
  const translateY = useMemo(() => rawTranslateY ?? defaultSharedValue, [
    rawTranslateY,
    defaultSharedValue,
  ]);
  const savedTranslateY = useMemo(
    () => rawSavedTranslateY ?? defaultSharedValue,
    [
      rawSavedTranslateY,
      defaultSharedValue,
    ],
  );

  // ============================================================================
  // Toast Helper
  // ============================================================================

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      // Clear any existing toast timeout
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }

      setToast({ visible: true, message, type });

      toastTimeout.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
    },
    [],
  );

  // Cleanup toast timeout
  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  // ============================================================================
  // Zoom Reset on Image Change
  // ============================================================================

  useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    currentSlideshowIndex,
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
  ]);

  // ============================================================================
  // Controls Visibility
  // ============================================================================

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setShowControls(true);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [resetControlsTimeout]);

  // ============================================================================
  // Navigation
  // ============================================================================

  const goToPrevious = useCallback(() => {
    if (currentSlideshowIndex > 0) {
      setCurrentSlideshowIndex(currentSlideshowIndex - 1);
      resetControlsTimeout();
    }
  }, [currentSlideshowIndex, setCurrentSlideshowIndex, resetControlsTimeout]);

  const goToNext = useCallback(() => {
    if (currentSlideshowIndex < images.length - 1) {
      setCurrentSlideshowIndex(currentSlideshowIndex + 1);
      resetControlsTimeout();
    }
  }, [
    currentSlideshowIndex,
    images.length,
    setCurrentSlideshowIndex,
    resetControlsTimeout,
  ]);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleOpenShareSheet = useCallback(() => {
    setShowShareSheet(true);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleCloseShareSheet = useCallback(() => {
    setShowShareSheet(false);
  }, []);

  const handleShareComplete = useCallback(
    (action: "share" | "download" | "copy") => {
      const messages = {
        share: "Image shared successfully!",
        download: "Image saved to gallery!",
        copy: "Link copied to clipboard!",
      };
      showToast(messages[action], "success");
    },
    [showToast],
  );

  const handleShareError = useCallback((error: string) => {
    showToast(error, "error");
  }, [showToast]);

  const handleDownload = useCallback(() => {
    handleOpenShareSheet();
  }, [handleOpenShareSheet]);

  const handleShare = useCallback(() => {
    handleOpenShareSheet();
  }, [handleOpenShareSheet]);

  const handleDelete = useCallback(async () => {
    if (!currentImage) return;

    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await removeImage(currentImage.id);
              if (success) {
                showToast("Image deleted", "success");
                // If this was the last image, go back
                if (images.length <= 1) {
                  router.back();
                } else if (currentSlideshowIndex >= images.length - 1) {
                  // If we deleted the last image, go to the previous one
                  setCurrentSlideshowIndex(
                    Math.max(0, currentSlideshowIndex - 1),
                  );
                }
              } else {
                showToast("Failed to delete image", "error");
              }
            } catch (err) {
              showToast(
                err instanceof Error ? err.message : "Failed to delete image",
                "error",
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [
    currentImage,
    currentSlideshowIndex,
    images.length,
    removeImage,
    router,
    setCurrentSlideshowIndex,
    showToast,
  ]);

  // ============================================================================
  // Gestures - wrapped in useMemo to ensure proper gesture composition
  // ============================================================================

  const composedGesture = useMemo(() => {
    // Helper to create chainable mock for testing environments where Gesture methods may not exist
    const createFallbackGesture = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mock: any = {};
      const methods = [
        "onUpdate",
        "onEnd",
        "onStart",
        "onBegin",
        "onFinalize",
        "numberOfTaps",
      ];
      for (const method of methods) {
        mock[method] = () => mock;
      }
      return mock;
    };

    const pinchGesture = (Gesture.Pinch?.() ?? createFallbackGesture())
      .onUpdate((e: { scale: number; }) => {
        scale.value = savedScale.value * e.scale;
      })
      .onEnd(() => {
        if (scale.value < 1) {
          scale.value = withSpring(1);
          savedScale.value = 1;
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        } else if (scale.value > 4) {
          scale.value = withSpring(4);
          savedScale.value = 4;
        } else {
          savedScale.value = scale.value;
        }
      });

    const panGesture = (Gesture.Pan?.() ?? createFallbackGesture())
      .onUpdate((e: { translationX: number; translationY: number; }) => {
        if (scale.value > 1) {
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        } else {
          // Swipe to navigate
          translateX.value = e.translationX;
        }
      })
      .onEnd((e: { translationX: number; }) => {
        if (scale.value > 1) {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        } else {
          // Handle swipe navigation
          const threshold = SCREEN_WIDTH * 0.3;
          if (e.translationX > threshold && currentSlideshowIndex > 0) {
            runOnJS(goToPrevious)();
          } else if (
            e.translationX < -threshold &&
            currentSlideshowIndex < images.length - 1
          ) {
            runOnJS(goToNext)();
          }
          translateX.value = withSpring(0);
        }
      });

    const doubleTapGesture = (Gesture.Tap?.() ?? createFallbackGesture())
      .numberOfTaps(2)
      .onEnd(() => {
        if (scale.value > 1) {
          scale.value = withSpring(1);
          savedScale.value = 1;
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        } else {
          scale.value = withSpring(2);
          savedScale.value = 2;
        }
      });

    const singleTapGesture = (Gesture.Tap?.() ?? createFallbackGesture())
      .onEnd(() => {
        runOnJS(setShowControls)(!showControls);
        runOnJS(resetControlsTimeout)();
      });

    // Use optional chaining for Exclusive and Simultaneous as well
    const simultaneous = Gesture.Simultaneous?.(pinchGesture, panGesture) ??
      pinchGesture;
    return Gesture.Exclusive?.(
      doubleTapGesture,
      simultaneous,
      singleTapGesture,
    ) ??
      doubleTapGesture;
  }, [
    currentSlideshowIndex,
    goToNext,
    goToPrevious,
    images.length,
    resetControlsTimeout,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    showControls,
    translateX,
    translateY,
  ]);

  // ============================================================================
  // Animated Styles
  // ============================================================================

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showControls ? 1 : 0, { duration: 200 }),
  }));

  // ============================================================================
  // Zoom Controls
  // ============================================================================

  const zoomIn = useCallback(() => {
    const newScale = Math.min(scale.value * 1.5, 4);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
    resetControlsTimeout();
  }, [scale, savedScale, resetControlsTimeout]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(scale.value / 1.5, 1);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
    if (newScale === 1) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
    resetControlsTimeout();
  }, [
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    resetControlsTimeout,
  ]);

  // ============================================================================
  // Render
  // ============================================================================

  if (!currentImage) {
    return (
      <YStack
        flex={1}
        backgroundColor="black"
        justifyContent="center"
        alignItems="center"
      >
        <Text color="white">No image to display</Text>
        <Button
          marginTop="$4"
          onPress={() => router.back()}
          testID="go-back-button"
        >
          Go Back
        </Button>
      </YStack>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden={!showControls} />

      {/* Image */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageContainer, animatedStyle]}>
          <Image
            source={{ uri: currentImage.originalUrl }}
            style={styles.image}
            contentFit="contain"
          />
        </Animated.View>
      </GestureDetector>

      {/* Controls Overlay */}
      <Animated.View
        style={[styles.controlsOverlay, controlsAnimatedStyle]}
        pointerEvents={showControls ? "auto" : "none"}
      >
        {/* Top Bar */}
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$4"
          paddingBottom="$2"
          justifyContent="space-between"
          alignItems="center"
          backgroundColor="rgba(0,0,0,0.5)"
        >
          <Button
            size="$3"
            chromeless
            circular
            icon={X}
            color="white"
            onPress={() => router.back()}
          />
          <Text color="white" fontWeight="600">
            {currentSlideshowIndex + 1} / {images.length}
          </Text>
          <XStack width={40} /> {/* Spacer for alignment */}
        </XStack>

        {/* Side Navigation */}
        {currentSlideshowIndex > 0 && (
          <Pressable
            style={[styles.navButton, styles.navLeft]}
            onPress={goToPrevious}
          >
            <ChevronLeft size={32} color="white" />
          </Pressable>
        )}
        {currentSlideshowIndex < images.length - 1 && (
          <Pressable
            style={[styles.navButton, styles.navRight]}
            onPress={goToNext}
          >
            <ChevronRight size={32} color="white" />
          </Pressable>
        )}

        {/* Bottom Bar - Zoom Controls */}
        <XStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          paddingBottom={insets.bottom + 16}
          paddingHorizontal="$4"
          paddingTop="$4"
          justifyContent="center"
          alignItems="center"
          gap="$4"
          backgroundColor="rgba(0,0,0,0.5)"
        >
          <Button
            size="$3"
            chromeless
            circular
            icon={ZoomOut}
            color="white"
            onPress={zoomOut}
          />
          <Text color="white" fontSize="$3">
            {Math.round(scale.value * 100)}%
          </Text>
          <Button
            size="$3"
            chromeless
            circular
            icon={ZoomIn}
            color="white"
            onPress={zoomIn}
          />
        </XStack>
      </Animated.View>

      {/* Image Actions Floating Bar */}
      <ImageActions
        visible={showControls && !showShareSheet}
        onDownload={handleDownload}
        onShare={handleShare}
        onDelete={handleDelete}
        isDeleting={isDeleting}
        showDelete={true}
        position="bottom"
        style={{ bottom: insets.bottom + 80 }}
      />

      {/* Share Sheet */}
      <ShareSheet
        visible={showShareSheet}
        imageId={currentImage.id}
        onClose={handleCloseShareSheet}
        onActionComplete={handleShareComplete}
        onError={handleShareError}
      />

      {/* Toast Notifications */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </GestureHandlerRootView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  navLeft: {
    left: 16,
  },
  navRight: {
    right: 16,
  },
  toast: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 200,
  },
});
