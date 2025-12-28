/**
 * BeforeAfterSlider Component
 * Interactive image comparison slider with gesture support
 */

import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Dimensions, LayoutChangeEvent, StyleSheet, View as RNView } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Card, Text, View } from "tamagui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DEFAULT_SLIDER_WIDTH = SCREEN_WIDTH - 32;

interface BeforeAfterSliderProps {
  /**
   * URL for the "before" image
   */
  beforeImageUrl: string;
  /**
   * URL for the "after" image
   */
  afterImageUrl: string;
  /**
   * Height of the slider container
   */
  height?: number;
  /**
   * Border radius for the slider container
   */
  borderRadius?: number;
  /**
   * Label for the "before" side
   */
  beforeLabel?: string;
  /**
   * Label for the "after" side
   */
  afterLabel?: string;
  /**
   * Optional test ID for testing
   */
  testID?: string;
}

export function BeforeAfterSlider({
  beforeImageUrl,
  afterImageUrl,
  height = 220,
  borderRadius = 16,
  beforeLabel = "Before",
  afterLabel = "After",
  testID,
}: BeforeAfterSliderProps) {
  const [containerWidth, setContainerWidth] = useState(DEFAULT_SLIDER_WIDTH);
  const sliderPosition = useSharedValue(containerWidth / 2);
  const isDragging = useSharedValue(false);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    sliderPosition.value = width / 2;
  }, [sliderPosition]);

  // Pan gesture for dragging the slider
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      const newPosition = Math.max(0, Math.min(containerWidth, event.x));
      sliderPosition.value = newPosition;
    })
    .onFinalize(() => {
      isDragging.value = false;
    });

  // Tap gesture for quick positioning
  const tapGesture = Gesture.Tap().onEnd((event) => {
    const newPosition = Math.max(0, Math.min(containerWidth, event.x));
    sliderPosition.value = newPosition;
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Animated style for the "before" image container (clipped)
  const beforeContainerStyle = useAnimatedStyle(() => ({
    width: sliderPosition.value,
    overflow: "hidden",
  }));

  // Animated style for the slider handle
  const sliderHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderPosition.value - 20 }],
  }));

  // Animated style for the slider line
  const sliderLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderPosition.value - 1 }],
  }));

  return (
    <Card
      elevate
      bordered
      overflow="hidden"
      borderRadius={borderRadius}
      testID={testID}
      onLayout={handleLayout}
    >
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.container, { height }]}>
          {/* After Image (Full width, underneath) */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: afterImageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              testID={`${testID}-after-image`}
            />
            {/* After Label */}
            <View style={[styles.label, styles.afterLabel]}>
              <Text
                fontSize="$2"
                fontWeight="600"
                color="white"
                backgroundColor="rgba(0, 0, 0, 0.6)"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$4"
                testID={`${testID}-after-label`}
              >
                {afterLabel}
              </Text>
            </View>
          </View>

          {/* Before Image (Clipped) */}
          <Animated.View
            style={[styles.beforeContainer, beforeContainerStyle]}
            testID={`${testID}-before-container`}
          >
            <Image
              source={{ uri: beforeImageUrl }}
              style={[styles.image, { width: containerWidth }]}
              contentFit="cover"
              transition={200}
              testID={`${testID}-before-image`}
            />
            {/* Before Label */}
            <View style={[styles.label, styles.beforeLabel]}>
              <Text
                fontSize="$2"
                fontWeight="600"
                color="white"
                backgroundColor="rgba(0, 0, 0, 0.6)"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$4"
                testID={`${testID}-before-label`}
              >
                {beforeLabel}
              </Text>
            </View>
          </Animated.View>

          {/* Slider Line */}
          <Animated.View
            style={[styles.sliderLine, sliderLineStyle]}
            testID={`${testID}-slider-line`}
          />

          {/* Slider Handle */}
          <Animated.View
            style={[styles.sliderHandle, sliderHandleStyle]}
            testID={`${testID}-slider-handle`}
          >
            {/* Left Arrow */}
            <RNView style={styles.arrow}>
              <Text color="white" fontSize={10} fontWeight="700">
                {"<"}
              </Text>
            </RNView>
            {/* Center Spark Icon */}
            <RNView style={styles.sparkContainer}>
              <Text color="#001830" fontSize={12} fontWeight="700">
                *
              </Text>
            </RNView>
            {/* Right Arrow */}
            <RNView style={styles.arrow}>
              <Text color="white" fontSize={10} fontWeight="700">
                {">"}
              </Text>
            </RNView>
          </Animated.View>
        </View>
      </GestureDetector>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  beforeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1,
  },
  label: {
    position: "absolute",
    top: 12,
  },
  beforeLabel: {
    left: 12,
  },
  afterLabel: {
    right: 12,
  },
  sliderLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#00E5FF",
    zIndex: 2,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  sliderHandle: {
    position: "absolute",
    top: "50%",
    width: 40,
    height: 40,
    marginTop: -20,
    borderRadius: 20,
    backgroundColor: "#00E5FF",
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  arrow: {
    width: 12,
    alignItems: "center",
  },
  sparkContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#00E5FF",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BeforeAfterSlider;
