/**
 * Input Component
 *
 * A styled text input component matching the web app's design system.
 * Supports labels, placeholders, error states, and icons.
 *
 * @example
 * // Basic input
 * <Input placeholder="Enter email" />
 *
 * // Input with label and error
 * <Input
 *   label="Email"
 *   placeholder="you@example.com"
 *   error="Please enter a valid email"
 * />
 *
 * // Input with icons
 * <Input
 *   iconLeft={<SearchIcon />}
 *   iconRight={<ClearIcon />}
 *   placeholder="Search..."
 * />
 */

import React, { forwardRef, useCallback, useState } from "react";
import { TextInput, TextInputProps } from "react-native";
import { GetProps, Stack, styled, Text } from "tamagui";
import { borderRadius, colors, fontSize, spacing } from "../../constants/theme";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

/**
 * Container for the entire input component (label, input, error)
 */
const InputContainer = styled(Stack, {
  name: "InputContainer",
  gap: spacing[1.5],
  width: "100%",
});

/**
 * Label text above the input
 */
const InputLabel = styled(Text, {
  name: "InputLabel",
  fontFamily: "$body",
  fontSize: fontSize.sm,
  lineHeight: 20,
  fontWeight: "500",
  color: colors.foreground,
});

/**
 * Wrapper for the input field and icons
 */
const InputWrapper = styled(Stack, {
  name: "InputWrapper",
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: borderRadius.lg,
  paddingHorizontal: spacing[3],
  height: 44,
  gap: spacing[2],

  variants: {
    focused: {
      true: {
        borderColor: colors.ring,
        borderWidth: 2,
      },
    },
    hasError: {
      true: {
        borderColor: colors.destructive,
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        backgroundColor: colors.muted,
        cursor: "not-allowed",
      },
    },
    size: {
      sm: {
        height: 36,
        paddingHorizontal: spacing[2.5],
      },
      md: {
        height: 44,
        paddingHorizontal: spacing[3],
      },
      lg: {
        height: 52,
        paddingHorizontal: spacing[4],
      },
    },
  } as const,

  defaultVariants: {
    size: "md",
  },
});

/**
 * Helper/error text below the input
 */
const InputHelperText = styled(Text, {
  name: "InputHelperText",
  fontFamily: "$body",
  fontSize: fontSize.xs,
  lineHeight: 16,

  variants: {
    hasError: {
      true: {
        color: colors.destructive,
      },
      false: {
        color: colors.mutedForeground,
      },
    },
  } as const,

  defaultVariants: {
    hasError: false,
  },
});

/**
 * Icon container for consistent sizing
 */
const IconContainer = styled(Stack, {
  name: "IconContainer",
  justifyContent: "center",
  alignItems: "center",
  width: 20,
  height: 20,
});

// ============================================================================
// TYPES
// ============================================================================

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<TextInputProps, "style"> {
  /** Input label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Error message (shows error state when provided) */
  error?: string;
  /** Helper text (shown when no error) */
  helperText?: string;
  /** Input size variant */
  size?: InputSize;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Left icon element */
  iconLeft?: React.ReactNode;
  /** Right icon element */
  iconRight?: React.ReactNode;
  /** Value of the input */
  value?: string;
  /** Change handler */
  onChangeText?: (text: string) => void;
  /** Focus handler */
  onFocus?: () => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Input component with label, error, and icon support
 */
export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      placeholder,
      error,
      helperText,
      size = "md",
      disabled = false,
      iconLeft,
      iconRight,
      value,
      onChangeText,
      onFocus,
      onBlur,
      testID,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      onFocus?.();
    }, [onFocus]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      onBlur?.();
    }, [onBlur]);

    const hasError = Boolean(error);
    const showHelperText = error || helperText;

    // Get font size based on input size
    const getFontSize = (): number => {
      switch (size) {
        case "sm":
          return fontSize.sm;
        case "lg":
          return fontSize.lg;
        case "md":
        default:
          return fontSize.base;
      }
    };

    return (
      <InputContainer testID={testID}>
        {label && (
          <InputLabel testID={testID ? `${testID}-label` : undefined} accessibilityRole="text">
            {label}
          </InputLabel>
        )}
        <InputWrapper
          focused={isFocused && !hasError}
          hasError={hasError}
          disabled={disabled}
          size={size}
          testID={testID ? `${testID}-wrapper` : undefined}
        >
          {iconLeft && (
            <IconContainer testID={testID ? `${testID}-icon-left` : undefined}>
              {iconLeft}
            </IconContainer>
          )}
          <TextInput
            ref={ref}
            style={{
              flex: 1,
              fontSize: getFontSize(),
              color: disabled ? colors.mutedForeground : colors.foreground,
              padding: 0,
              margin: 0,
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            accessible={true}
            accessibilityLabel={label || placeholder}
            accessibilityState={{ disabled }}
            accessibilityHint={helperText}
            testID={testID ? `${testID}-input` : undefined}
            {...props}
          />
          {iconRight && (
            <IconContainer testID={testID ? `${testID}-icon-right` : undefined}>
              {iconRight}
            </IconContainer>
          )}
        </InputWrapper>
        {showHelperText && (
          <InputHelperText hasError={hasError} testID={testID ? `${testID}-helper` : undefined}>
            {error || helperText}
          </InputHelperText>
        )}
      </InputContainer>
    );
  },
);

Input.displayName = "Input";

// ============================================================================
// EXPORTS
// ============================================================================

export { IconContainer, InputContainer, InputHelperText, InputLabel, InputWrapper };

export default Input;
