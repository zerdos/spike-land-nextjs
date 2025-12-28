/**
 * HeroSection Component
 * Main hero section for the landing screen with animated gradient background and CTA
 */

import { Sparkles } from "@tamagui/lucide-icons";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet } from "react-native";
import { Button, H1, Paragraph, View, YStack } from "tamagui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HeroSectionProps {
  /**
   * Callback when the CTA button is pressed
   */
  onStartEnhancing?: () => void;
  /**
   * Optional test ID for testing
   */
  testID?: string;
}

export function HeroSection({ onStartEnhancing, testID }: HeroSectionProps) {
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

  // Interpolate gradient colors for animation effect
  const gradientStartColor = gradientPosition.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(0, 100, 150, 0.3)", "rgba(0, 150, 200, 0.4)", "rgba(0, 100, 150, 0.3)"],
  });

  const gradientEndColor = gradientPosition.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["rgba(0, 50, 100, 0.2)", "rgba(0, 100, 150, 0.3)", "rgba(0, 50, 100, 0.2)"],
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
        {/* Main Title */}
        <H1
          color="white"
          textAlign="center"
          fontSize="$10"
          fontWeight="700"
          lineHeight="$10"
          testID={`${testID}-title`}
        >
          AI Photo{"\n"}
          <H1 color="#00E5FF" fontSize="$10" fontWeight="700">
            Restoration
          </H1>
        </H1>

        {/* Subtitle */}
        <Paragraph
          color="$gray10"
          textAlign="center"
          fontSize="$4"
          lineHeight="$5"
          maxWidth={SCREEN_WIDTH * 0.85}
          testID={`${testID}-subtitle`}
        >
          Transform old, blurry photos into crystal-clear memories. Powered by cutting-edge AI
          technology.
        </Paragraph>

        {/* CTA Button */}
        <Button
          size="$5"
          backgroundColor="#00E5FF"
          color="#001830"
          fontWeight="700"
          marginTop="$4"
          borderRadius="$6"
          pressStyle={{
            backgroundColor: "#00B8CC",
            scale: 0.98,
          }}
          onPress={handleStartEnhancing}
          icon={<Sparkles size={20} color="#001830" />}
          testID={`${testID}-cta`}
        >
          Start Enhancing
        </Button>
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

export default HeroSection;
