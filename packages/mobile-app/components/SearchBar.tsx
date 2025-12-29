/**
 * SearchBar Component
 * Text input with search icon, clear button, and debounced onChange
 */

import { Search, X } from "@tamagui/lucide-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, type TextInput as RNTextInput } from "react-native";
import { Button, Input, XStack } from "tamagui";

// ============================================================================
// Types
// ============================================================================

export interface SearchBarProps {
  /** Current search value (controlled) */
  value?: string;
  /** Callback when search value changes (debounced) */
  onChangeText?: (text: string) => void;
  /** Callback when search is submitted */
  onSubmit?: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Whether the search bar is expanded */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Test ID for testing */
  testID?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Auto focus the input when expanded */
  autoFocus?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_MS = 300;
const ANIMATION_DURATION = 200;

// ============================================================================
// Component
// ============================================================================

export function SearchBar({
  value = "",
  onChangeText,
  onSubmit,
  placeholder = "Search...",
  debounceMs = DEFAULT_DEBOUNCE_MS,
  expanded = true,
  onExpandedChange,
  testID = "search-bar",
  disabled = false,
  autoFocus = false,
}: SearchBarProps) {
  // Local state for the input value (for controlled input)
  const [localValue, setLocalValue] = useState(value);

  // Animation value for expand/collapse
  const animatedWidth = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  // Ref for the text input
  const inputRef = useRef<RNTextInput>(null);

  // Ref to track if component is mounted
  const isMounted = useRef(true);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value with prop value
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Handle expand/collapse animation
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: expanded ? 1 : 0,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      if (expanded && autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    });
  }, [expanded, animatedWidth, autoFocus]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced change handler
  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        if (isMounted.current && onChangeText) {
          onChangeText(text);
        }
      }, debounceMs);
    },
    [debounceMs, onChangeText],
  );

  // Handle clear button press
  const handleClear = useCallback(() => {
    setLocalValue("");

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Immediately notify parent
    if (onChangeText) {
      onChangeText("");
    }

    // Focus the input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onChangeText]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    // Clear pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Immediately notify with current value
    if (onChangeText) {
      onChangeText(localValue);
    }

    if (onSubmit) {
      onSubmit(localValue);
    }
  }, [localValue, onChangeText, onSubmit]);

  // Handle expand toggle
  const handleToggleExpand = useCallback(() => {
    if (onExpandedChange) {
      onExpandedChange(!expanded);
    }
  }, [expanded, onExpandedChange]);

  // Interpolate width for animation
  const animatedStyle = {
    flex: animatedWidth.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    opacity: animatedWidth,
  };

  const showClearButton = localValue.length > 0 && expanded;

  return (
    <XStack
      alignItems="center"
      gap="$2"
      testID={testID}
      width="100%"
    >
      {/* Search Icon / Toggle Button */}
      {onExpandedChange
        ? (
          <Button
            size="$3"
            chromeless
            circular
            icon={Search}
            onPress={handleToggleExpand}
            testID={`${testID}-toggle`}
            disabled={disabled}
            aria-label={expanded ? "Collapse search" : "Expand search"}
          />
        )
        : (
          <Search
            size={20}
            color="$gray10"
            style={styles.searchIcon}
          />
        )}

      {/* Animated Input Container */}
      <Animated.View style={[styles.inputContainer, animatedStyle]}>
        <XStack
          flex={1}
          alignItems="center"
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingHorizontal="$3"
          height={40}
        >
          {!onExpandedChange && (
            <Search
              size={16}
              color="$gray10"
              style={styles.innerSearchIcon}
            />
          )}

          <Input
            ref={inputRef}
            flex={1}
            value={localValue}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor="$gray9"
            backgroundColor="transparent"
            borderWidth={0}
            padding={0}
            fontSize="$4"
            testID={`${testID}-input`}
            editable={!disabled && expanded}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            aria-label="Search input"
          />

          {/* Clear Button */}
          {showClearButton && (
            <Button
              size="$2"
              chromeless
              circular
              icon={<X size={16} color="$gray10" />}
              onPress={handleClear}
              testID={`${testID}-clear`}
              disabled={disabled}
              aria-label="Clear search"
            />
          )}
        </XStack>
      </Animated.View>
    </XStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  searchIcon: {
    marginRight: 8,
  },
  innerSearchIcon: {
    marginRight: 8,
  },
  inputContainer: {
    overflow: "hidden",
  },
});
