/**
 * HeroSection Component
 * Main hero section for the landing screen with animated gradient background and CTA
 */

import { Sparkles } from "@tamagui/lucide-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { useCallback } from "react";
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

  return (
    <View testID={testID} style={styles.container}>
      {/* Animated Gradient Background */}
      <Animated.View style={styles.gradientContainer}>
        <LinearGradient
          colors={["#000000", "#0f172a", "#1e1b4b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        {/* Overlay animated gradient orbs */}
        <Animated.View
          style={[
            styles.orb,
            styles.orbLeft,
          ]}
        />
        <Animated.View
          style={[
            styles.orb,
            styles.orbRight,
          ]}
        />
      </Animated.View>

      {/* Content */}
      <YStack
        paddingHorizontal="$5"
        paddingVertical="$8"
        gap="$5"
        alignItems="center"
        style={styles.content}
      >
        {/* Main Title */}
        <YStack gap="$1" alignItems="center">
          <H1
            color="white"
            textAlign="center"
            fontSize={48}
            fontWeight="800"
            lineHeight={56}
            letterSpacing={-1}
            testID={`${testID}-title`}
          >
            Old Photos.
          </H1>
          <H1
            color="#38bdf8"
            textAlign="center"
            fontSize={48}
            fontWeight="800"
            lineHeight={56}
            letterSpacing={-1}
            style={{
              textShadowColor: "rgba(56, 189, 248, 0.5)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20,
            }}
          >
            New Life.
          </H1>
        </YStack>

        {/* Subtitle */}
        <Paragraph
          color="$gray11"
          textAlign="center"
          fontSize="$5"
          lineHeight="$7"
          maxWidth={SCREEN_WIDTH * 0.9}
          testID={`${testID}-subtitle`}
          opacity={0.9}
        >
          Your iPhone 4 photos deserve iPhone 16 quality. Restore faded memories in 60 seconds.
        </Paragraph>

        {/* Secondary text */}
        <XStack alignItems="center" gap="$2" opacity={0.8}>
          <Sparkles size={16} color="#fbbf24" />
          <Paragraph
            color="$gray11"
            textAlign="center"
            fontSize="$3"
            fontWeight="500"
            testID={`${testID}-free-text`}
          >
            Free to try — no credit card required
          </Paragraph>
        </XStack>

        {/* CTA Buttons */}
        <YStack gap="$4" marginTop="$6" width="100%" maxWidth={320}>
          <Button
            size="$6"
            backgroundColor="#3b82f6"
            color="white"
            fontWeight="700"
            borderRadius="$10"
            pressStyle={{
              backgroundColor: "#2563eb",
              scale: 0.98,
            }}
            shadowColor="#3b82f6"
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.4}
            shadowRadius={16}
            onPress={handleStartEnhancing}
            icon={<Sparkles size={24} color="white" />}
            testID={`${testID}-cta`}
          >
            Restore Your Photos
          </Button>
          <Button
            size="$6"
            backgroundColor="rgba(255, 255, 255, 0.05)"
            color="#ffffff"
            fontWeight="600"
            borderRadius="$10"
            borderWidth={1}
            borderColor="rgba(255, 255, 255, 0.2)"
            pressStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              scale: 0.98,
            }}
            onPress={handleSeeExamples}
            testID={`${testID}-examples`}
          >
            See Examples
          </Button>
        </YStack>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    minHeight: 480,
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
    borderRadius: 300,
    width: 300,
    height: 300,
    opacity: 0.6,
  },
  orbLeft: {
    top: -80,
    left: -80,
    backgroundColor: "#7c3aed",
    opacity: 0.25,
    transform: [{ scale: 1.2 }],
  },
  orbRight: {
    bottom: -50,
    right: -50,
    backgroundColor: "#2563eb",
    opacity: 0.25,
    transform: [{ scale: 1.5 }],
  },
  content: {
    zIndex: 1,
    paddingTop: 80,
  },
});
