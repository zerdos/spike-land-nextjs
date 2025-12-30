/**
 * HeroSection Component
 * Main hero section for the landing screen with animated gradient background and CTA
 */

import { Sparkles } from "@tamagui/lucide-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet } from "react-native";
import { Button, H1, Paragraph, View, XStack, YStack } from "tamagui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HeroSectionProps {
  /**
   * Callback when the CTA button is pressed
   */
  onStartEnhancing?: () => void;
  /**
   * Callback when the See Examples button is pressed
   */
  onSeeExamples?: () => void;
  /**
   * Optional test ID for testing
   */
  testID?: string;
}

export function HeroSection(
  { onStartEnhancing, onSeeExamples, testID }: HeroSectionProps,
) {
  const gradientPosition = useRef(new Animated.Value(0)).current;

  // Animate gradient background
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientPosition, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientPosition, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [gradientPosition]);

  const handleStartEnhancing = useCallback(() => {
    if (onStartEnhancing) {
      onStartEnhancing();
    } else {
      router.push("/enhance/upload" as Href);
    }
  }, [onStartEnhancing]);

  const handleSeeExamples = useCallback(() => {
    if (onSeeExamples) {
      onSeeExamples();
    } else {
      router.push("/gallery" as Href);
    }
  }, [onSeeExamples]);

  // Interpolate gradient colors for animation effect
  const gradientStartColor = gradientPosition.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      "rgba(0, 100, 150, 0.3)",
      "rgba(0, 150, 200, 0.4)",
      "rgba(0, 100, 150, 0.3)",
    ],
  });

  const gradientEndColor = gradientPosition.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      "rgba(0, 50, 100, 0.2)",
      "rgba(0, 100, 150, 0.3)",
      "rgba(0, 50, 100, 0.2)",
    ],
  });

  return (
    <View testID={testID} style={styles.container}>
      {/* Animated Gradient Background */}
      <Animated.View style={styles.gradientContainer}>
        <LinearGradient
          colors={["#001830", "#003060", "#001830"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        {/* Overlay animated gradient orbs */}
        <Animated.View
          style={[
            styles.orb,
            styles.orbLeft,
            {
              backgroundColor: gradientStartColor,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.orb,
            styles.orbRight,
            {
              backgroundColor: gradientEndColor,
            },
          ]}
        />
      </Animated.View>

      {/* Content */}
      <YStack
        paddingHorizontal="$5"
        paddingVertical="$8"
        gap="$4"
        alignItems="center"
        style={styles.content}
      >
        {/* Main Title - Matching web: "Old Photos. New Life." */}
        <H1
          color="white"
          textAlign="center"
          fontSize="$9"
          fontWeight="700"
          lineHeight="$9"
          testID={`${testID}-title`}
        >
          Old Photos.{"\n"}
          <H1 color="#00E5FF" fontSize="$9" fontWeight="700">
            New Life.
          </H1>
        </H1>

        {/* Subtitle - Matching web copy */}
        <Paragraph
          color="$gray10"
          textAlign="center"
          fontSize="$4"
          lineHeight="$5"
          maxWidth={SCREEN_WIDTH * 0.85}
          testID={`${testID}-subtitle`}
        >
          Your iPhone 4 photos deserve iPhone 16 quality. Restore faded memories in 60 seconds. No
          skills needed.
        </Paragraph>

        {/* Secondary text */}
        <Paragraph
          color="$gray11"
          textAlign="center"
          fontSize="$3"
          testID={`${testID}-free-text`}
        >
          Free to try — no credit card required.
        </Paragraph>

        {/* CTA Buttons - Matching web layout */}
        <XStack gap="$3" marginTop="$4" flexWrap="wrap" justifyContent="center">
          <Button
            size="$5"
            backgroundColor="#00E5FF"
            color="#001830"
            fontWeight="700"
            borderRadius="$6"
            pressStyle={{
              backgroundColor: "#00B8CC",
              scale: 0.98,
            }}
            onPress={handleStartEnhancing}
            icon={<Sparkles size={20} color="#001830" />}
            testID={`${testID}-cta`}
          >
            Restore Your Photos
          </Button>
          <Button
            size="$5"
            backgroundColor="transparent"
            color="#ffffff"
            fontWeight="600"
            borderRadius="$6"
            borderWidth={1}
            borderColor="#ffffff"
            pressStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              scale: 0.98,
            }}
            onPress={handleSeeExamples}
            testID={`${testID}-examples`}
          >
            See Examples
          </Button>
        </XStack>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    minHeight: 320,
    overflow: "hidden",
  },
  gradientContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
  },
  orb: {
    position: "absolute",
    borderRadius: 200,
    width: 200,
    height: 200,
  },
  orbLeft: {
    top: -50,
    left: -50,
  },
  orbRight: {
    bottom: -30,
    right: -30,
  },
  content: {
    zIndex: 1,
  },
});
