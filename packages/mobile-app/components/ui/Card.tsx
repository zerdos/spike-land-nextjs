/**
 * Card Component
 *
 * A styled card component with glass morphism effects matching the web design.
 * Supports header, content, footer slots and interactive (pressable) variant.
 *
 * @example
 * // Basic card
 * <Card>
 *   <CardContent>Card content here</CardContent>
 * </Card>
 *
 * // Card with all slots
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 *
 * // Interactive card
 * <Card interactive onPressCard={() => {}}>
 *   <CardContent>Pressable card</CardContent>
 * </Card>
 */

import React from "react";
import { GetProps, Stack, styled, Text } from "tamagui";
import { borderRadius, colors, glassMorphism, shadows, spacing } from "../../constants/theme";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

/**
 * Main card container with glass morphism background
 */
const CardFrame = styled(Stack, {
  name: "Card",
  backgroundColor: colors.card,
  borderRadius: borderRadius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",

  // Glass morphism effect
  // Note: React Native doesn't support backdrop-filter,
  // so we simulate with semi-transparent backgrounds
  ...shadows.md,

  variants: {
    variant: {
      default: {
        backgroundColor: colors.card,
      },
      glass: {
        backgroundColor: glassMorphism.glassCard,
        borderColor: glassMorphism.glassBorder,
      },
      elevated: {
        backgroundColor: colors.card,
        ...shadows.lg,
      },
    },
    interactive: {
      true: {
        cursor: "pointer",
        animation: "press",
        pressStyle: {
          scale: 0.98,
          opacity: 0.95,
        },
        hoverStyle: {
          borderColor: colors.primary,
          ...shadows.lg,
        },
        focusStyle: {
          outlineWidth: 2,
          outlineColor: colors.ring,
          outlineStyle: "solid",
          outlineOffset: 2,
        },
      },
    },
    fullWidth: {
      true: {
        width: "100%",
      },
    },
  } as const,

  defaultVariants: {
    variant: "default",
  },
});

/**
 * Card header section
 */
const CardHeaderFrame = styled(Stack, {
  name: "CardHeader",
  padding: spacing[4],
  paddingBottom: spacing[2],
  gap: spacing[1.5],
});

/**
 * Card title text
 */
const CardTitleText = styled(Text, {
  name: "CardTitle",
  fontFamily: "$heading",
  fontSize: 18,
  lineHeight: 24,
  fontWeight: "600",
  color: colors.foreground,
});

/**
 * Card description text
 */
const CardDescriptionText = styled(Text, {
  name: "CardDescription",
  fontFamily: "$body",
  fontSize: 14,
  lineHeight: 20,
  color: colors.mutedForeground,
});

/**
 * Card content section
 */
const CardContentFrame = styled(Stack, {
  name: "CardContent",
  padding: spacing[4],
  paddingTop: 0,
});

/**
 * Card footer section
 */
const CardFooterFrame = styled(Stack, {
  name: "CardFooter",
  flexDirection: "row",
  alignItems: "center",
  padding: spacing[4],
  paddingTop: spacing[2],
  gap: spacing[2],
});

// ============================================================================
// TYPES
// ============================================================================

export type CardVariant = "default" | "glass" | "elevated";

type CardFrameProps = GetProps<typeof CardFrame>;

export interface CardProps extends Omit<CardFrameProps, "onPress"> {
  /** Card style variant */
  variant?: CardVariant;
  /** Whether the card is interactive (pressable) */
  interactive?: boolean;
  /** Whether the card should take full width */
  fullWidth?: boolean;
  /** Card content */
  children: React.ReactNode;
  /** Press handler (only works when interactive) */
  onPressCard?: () => void;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

export interface CardHeaderProps {
  /** Header content */
  children: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

export interface CardTitleProps {
  /** Title text */
  children: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

export interface CardDescriptionProps {
  /** Description text */
  children: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

export interface CardContentProps {
  /** Content */
  children: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

export interface CardFooterProps {
  /** Footer content */
  children: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Card component with glass morphism styling
 */
export const Card: React.FC<CardProps> = ({
  variant = "default",
  interactive = false,
  fullWidth = false,
  children,
  onPressCard,
  accessibilityLabel,
  testID,
  ...props
}) => {
  // Wrap onPressCard to guard against non-interactive state
  const handlePress = () => {
    if (interactive && onPressCard) {
      onPressCard();
    }
  };

  return (
    <CardFrame
      variant={variant}
      interactive={interactive}
      fullWidth={fullWidth}
      onPress={interactive ? handlePress : undefined}
      accessible={interactive}
      accessibilityRole={interactive ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      {...props}
    >
      {children}
    </CardFrame>
  );
};

/**
 * Card header section
 */
export const CardHeader: React.FC<CardHeaderProps> = ({ children, testID }) => {
  return <CardHeaderFrame testID={testID}>{children}</CardHeaderFrame>;
};

/**
 * Card title
 */
export const CardTitle: React.FC<CardTitleProps> = ({ children, testID }) => {
  return (
    <CardTitleText testID={testID} accessibilityRole="header">
      {children}
    </CardTitleText>
  );
};

/**
 * Card description
 */
export const CardDescription: React.FC<CardDescriptionProps> = ({ children, testID }) => {
  return <CardDescriptionText testID={testID}>{children}</CardDescriptionText>;
};

/**
 * Card content section
 */
export const CardContent: React.FC<CardContentProps> = ({ children, testID }) => {
  return <CardContentFrame testID={testID}>{children}</CardContentFrame>;
};

/**
 * Card footer section
 */
export const CardFooter: React.FC<CardFooterProps> = ({ children, testID }) => {
  return <CardFooterFrame testID={testID}>{children}</CardFooterFrame>;
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CardContentFrame,
  CardDescriptionText,
  CardFooterFrame,
  CardFrame,
  CardHeaderFrame,
  CardTitleText,
};

export default Card;
