/**
 * Button Component
 *
 * A styled button component matching the web app's design system.
 * Supports multiple variants, sizes, and states.
 *
 * @example
 * // Primary button (default)
 * <Button onPress={() => {}}>Click me</Button>
 *
 * // Destructive button with loading state
 * <Button variant="destructive" loading>Deleting...</Button>
 *
 * // Ghost button, small size
 * <Button variant="ghost" size="sm">Cancel</Button>
 */

import React from "react";
import { ActivityIndicator } from "react-native";
import { GetProps, Stack, styled, Text } from "tamagui";
import { borderRadius, colors, spacing } from "../../constants/theme";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

/**
 * Base button frame with all variant and size styles
 */
const ButtonFrame = styled(Stack, {
  name: "Button",
  tag: "button",
  role: "button",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing[2],
  borderRadius: borderRadius.lg,
  cursor: "pointer",

  // Animation
  animation: "press",
  pressStyle: {
    scale: 0.97,
    opacity: 0.9,
  },

  // Focus state
  focusStyle: {
    outlineWidth: 2,
    outlineColor: colors.ring,
    outlineStyle: "solid",
    outlineOffset: 2,
  },

  // Variants
  variants: {
    variant: {
      primary: {
        backgroundColor: colors.primary,
        borderWidth: 0,
        hoverStyle: {
          backgroundColor: colors.primary,
          opacity: 0.9,
        },
      },
      secondary: {
        backgroundColor: colors.secondary,
        borderWidth: 0,
        hoverStyle: {
          backgroundColor: colors.secondary,
          opacity: 0.9,
        },
      },
      destructive: {
        backgroundColor: colors.destructive,
        borderWidth: 0,
        hoverStyle: {
          backgroundColor: colors.destructive,
          opacity: 0.9,
        },
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: colors.border,
        hoverStyle: {
          backgroundColor: colors.muted,
        },
      },
      ghost: {
        backgroundColor: "transparent",
        borderWidth: 0,
        hoverStyle: {
          backgroundColor: colors.muted,
        },
      },
    },
    size: {
      sm: {
        height: 36,
        paddingHorizontal: spacing[3],
      },
      md: {
        height: 44,
        paddingHorizontal: spacing[4],
      },
      lg: {
        height: 52,
        paddingHorizontal: spacing[6],
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        cursor: "not-allowed",
        pointerEvents: "none",
      },
    },
    fullWidth: {
      true: {
        width: "100%",
      },
    },
  } as const,

  // Default variants
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

/**
 * Button text with variant-aware styling
 */
const ButtonText = styled(Text, {
  name: "ButtonText",
  fontFamily: "$body",
  fontWeight: "600",
  textAlign: "center",

  variants: {
    variant: {
      primary: {
        color: colors.primaryForeground,
      },
      secondary: {
        color: colors.secondaryForeground,
      },
      destructive: {
        color: colors.destructiveForeground,
      },
      outline: {
        color: colors.foreground,
      },
      ghost: {
        color: colors.foreground,
      },
    },
    size: {
      sm: {
        fontSize: 14,
        lineHeight: 20,
      },
      md: {
        fontSize: 16,
        lineHeight: 24,
      },
      lg: {
        fontSize: 18,
        lineHeight: 28,
      },
    },
    disabled: {
      true: {
        opacity: 0.7,
      },
    },
  } as const,

  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

// ============================================================================
// TYPES
// ============================================================================

export type ButtonVariant = "primary" | "secondary" | "destructive" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonFrameProps = GetProps<typeof ButtonFrame>;

export interface ButtonProps extends Omit<ButtonFrameProps, "disabled"> {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Button text content */
  children: React.ReactNode;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button should take full width */
  fullWidth?: boolean;
  /** Left icon element */
  iconLeft?: React.ReactNode;
  /** Right icon element */
  iconRight?: React.ReactNode;
  /** Press handler */
  onPress?: () => void;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Button component with multiple variants and states
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  onPress,
  accessibilityLabel,
  testID,
  ...props
}) => {
  const isDisabled = disabled || loading;

  // Get spinner color based on variant
  const getSpinnerColor = (): string => {
    switch (variant) {
      case "primary":
        return colors.primaryForeground;
      case "secondary":
        return colors.secondaryForeground;
      case "destructive":
        return colors.destructiveForeground;
      case "outline":
      case "ghost":
        return colors.foreground;
      default:
        return colors.primaryForeground;
    }
  };

  // Get spinner size based on button size
  const getSpinnerSize = (): "small" | "large" => {
    return size === "lg" ? "large" : "small";
  };

  // Wrap onPress to guard against disabled state
  const handlePress = () => {
    if (!isDisabled && onPress) {
      onPress();
    }
  };

  return (
    <ButtonFrame
      variant={variant}
      size={size}
      disabled={isDisabled}
      fullWidth={fullWidth}
      onPress={isDisabled ? undefined : handlePress}
      pointerEvents={isDisabled ? "none" : "auto"}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ||
        (typeof children === "string" ? children : undefined)}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      {...props}
    >
      {loading
        ? (
          <ActivityIndicator
            size={getSpinnerSize()}
            color={getSpinnerColor()}
            testID={`${testID}-spinner`}
          />
        )
        : (
          <>
            {iconLeft}
            {typeof children === "string"
              ? (
                <ButtonText variant={variant} size={size} disabled={isDisabled}>
                  {children}
                </ButtonText>
              )
              : children}
            {iconRight}
          </>
        )}
    </ButtonFrame>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export { ButtonFrame, ButtonText };
