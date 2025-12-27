/**
 * Canvas/Slideshow View
 * Full-screen image viewer with swipe navigation
 */

import type { EnhancedImage } from "@spike-npm-land/shared";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Platform, Pressable, StatusBar, StyleSheet } from "react-native";
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

import { useGalleryStore } from "@/stores";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CanvasScreen() {
  const router = useRouter();
  const { albumId } = useLocalSearchParams<{ albumId: string; }>();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Store state
  const { images, slideshowIndex: currentSlideshowIndex, goToSlide } = useGalleryStore();
  const setCurrentSlideshowIndex = goToSlide;

  // Current image
  const currentImage = useMemo(() => {
    return images[currentSlideshowIndex] || null;
  }, [images, currentSlideshowIndex]);

  // Animation values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset zoom when image changes
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

  // Auto-hide controls
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

  // Navigation
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
  }, [currentSlideshowIndex, images.length, setCurrentSlideshowIndex, resetControlsTimeout]);

  // Gestures
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
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

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        // Swipe to navigate
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        // Handle swipe navigation
        const threshold = SCREEN_WIDTH * 0.3;
        if (e.translationX > threshold && currentSlideshowIndex > 0) {
          runOnJS(goToPrevious)();
        } else if (e.translationX < -threshold && currentSlideshowIndex < images.length - 1) {
          runOnJS(goToNext)();
        }
        translateX.value = withSpring(0);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
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

  const singleTapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(setShowControls)(!showControls);
      runOnJS(resetControlsTimeout)();
    });

  const composedGesture = Gesture.Exclusive(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
    singleTapGesture,
  );

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

  // Zoom controls
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

  if (!currentImage) {
    return (
      <YStack flex={1} backgroundColor="black" justifyContent="center" alignItems="center">
        <Text color="white">No image to display</Text>
        <Button marginTop="$4" onPress={() => router.back()}>
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
            source={{ uri: currentImage.enhancedUrl || currentImage.originalUrl }}
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
          <XStack gap="$2">
            <Button size="$3" chromeless circular icon={Share2} color="white" />
            <Button size="$3" chromeless circular icon={Download} color="white" />
          </XStack>
        </XStack>

        {/* Side Navigation */}
        {currentSlideshowIndex > 0 && (
          <Pressable style={[styles.navButton, styles.navLeft]} onPress={goToPrevious}>
            <ChevronLeft size={32} color="white" />
          </Pressable>
        )}
        {currentSlideshowIndex < images.length - 1 && (
          <Pressable style={[styles.navButton, styles.navRight]} onPress={goToNext}>
            <ChevronRight size={32} color="white" />
          </Pressable>
        )}

        {/* Bottom Bar */}
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
          <Button size="$3" chromeless circular icon={ZoomOut} color="white" onPress={zoomOut} />
          <Text color="white" fontSize="$3">
            {Math.round(scale.value * 100)}%
          </Text>
          <Button size="$3" chromeless circular icon={ZoomIn} color="white" onPress={zoomIn} />
        </XStack>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

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
});
