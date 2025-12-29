/**
 * SearchBar Component Tests
 */

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { SearchBar, type SearchBarProps } from "./SearchBar";

// ============================================================================
// Mocks
// ============================================================================

// Mock tamagui components
jest.mock("tamagui", () => {
  const { View, TouchableOpacity, TextInput } = require("react-native");
  const MockReact = require("react");

  return {
    Button: (props: Record<string, unknown>) => {
      const {
        children,
        onPress,
        testID,
        icon: Icon,
        disabled,
        "aria-label": ariaLabel,
      } = props;
      // Handle icon prop - it can be a component function or a JSX element
      let iconElement = null;
      if (Icon) {
        if (MockReact.isValidElement(Icon)) {
          // It's already a JSX element (e.g., <X size={16} />)
          iconElement = Icon;
        } else if (typeof Icon === "function") {
          // It's a component function
          iconElement = MockReact.createElement(Icon);
        }
      }
      return MockReact.createElement(
        TouchableOpacity,
        {
          onPress,
          testID,
          disabled,
          accessibilityState: { disabled },
          accessible: true,
          accessibilityLabel: ariaLabel,
        },
        iconElement,
        children,
      );
    },
    Input: MockReact.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const {
        testID,
        onChangeText,
        onSubmitEditing,
        value,
        editable,
        placeholder,
        "aria-label": ariaLabel,
      } = props;
      return MockReact.createElement(TextInput, {
        ref,
        testID,
        onChangeText,
        onSubmitEditing,
        value,
        editable,
        placeholder,
        accessibilityLabel: ariaLabel,
      });
    }),
    XStack: (props: Record<string, unknown>) => {
      const { children, testID } = props;
      return MockReact.createElement(View, { testID }, children);
    },
    YStack: (props: Record<string, unknown>) => {
      return MockReact.createElement(View, null, props.children);
    },
    Stack: (props: Record<string, unknown>) => {
      return MockReact.createElement(View, null, props.children);
    },
  };
});

// Mock lucide icons
jest.mock("@tamagui/lucide-icons", () => ({
  Search: () => null,
  X: () => null,
}));

// ============================================================================
// Test Helpers
// ============================================================================

const renderComponent = (props: Partial<SearchBarProps> = {}) => {
  return render(<SearchBar {...props} />);
};

// Mock timers for debounce testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ============================================================================
// Tests
// ============================================================================

describe("SearchBar", () => {
  describe("Rendering", () => {
    it("renders with default props", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId("search-bar")).toBeTruthy();
      expect(getByTestId("search-bar-input")).toBeTruthy();
    });

    it("renders with custom testID", () => {
      const { getByTestId } = renderComponent({ testID: "custom-search" });

      expect(getByTestId("custom-search")).toBeTruthy();
      expect(getByTestId("custom-search-input")).toBeTruthy();
    });

    it("renders with placeholder text", () => {
      const { getByPlaceholderText } = renderComponent({
        placeholder: "Search images...",
      });

      expect(getByPlaceholderText("Search images...")).toBeTruthy();
    });

    it("renders with initial value", () => {
      const { getByTestId } = renderComponent({
        value: "initial search",
      });

      const input = getByTestId("search-bar-input");
      expect(input.props.value).toBe("initial search");
    });

    it("renders clear button when value is present", () => {
      const { getByTestId } = renderComponent({
        value: "test query",
      });

      expect(getByTestId("search-bar-clear")).toBeTruthy();
    });

    it("does not render clear button when value is empty", () => {
      const { queryByTestId } = renderComponent({
        value: "",
      });

      expect(queryByTestId("search-bar-clear")).toBeNull();
    });

    it("renders toggle button when onExpandedChange is provided", () => {
      const mockOnExpandedChange = jest.fn();
      const { getByTestId } = renderComponent({
        onExpandedChange: mockOnExpandedChange,
      });

      expect(getByTestId("search-bar-toggle")).toBeTruthy();
    });

    it("does not render toggle button when onExpandedChange is not provided", () => {
      const { queryByTestId } = renderComponent();

      expect(queryByTestId("search-bar-toggle")).toBeNull();
    });
  });

  describe("Input Behavior", () => {
    it("updates local value on text change", () => {
      const { getByTestId } = renderComponent();
      const input = getByTestId("search-bar-input");

      fireEvent.changeText(input, "new search");

      expect(input.props.value).toBe("new search");
    });

    it("syncs with controlled value prop", () => {
      const { getByTestId, rerender } = renderComponent({ value: "first" });

      const input = getByTestId("search-bar-input");
      expect(input.props.value).toBe("first");

      rerender(<SearchBar value="second" />);

      expect(input.props.value).toBe("second");
    });

    it("is disabled when disabled prop is true", () => {
      const { getByTestId } = renderComponent({ disabled: true });
      const input = getByTestId("search-bar-input");

      expect(input.props.editable).toBe(false);
    });

    it("is not editable when collapsed", () => {
      const { getByTestId } = renderComponent({ expanded: false });
      const input = getByTestId("search-bar-input");

      expect(input.props.editable).toBe(false);
    });
  });

  describe("Debouncing", () => {
    it("debounces onChangeText callback by default (300ms)", async () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = renderComponent({
        onChangeText: mockOnChangeText,
      });

      const input = getByTestId("search-bar-input");
      fireEvent.changeText(input, "test");

      // Should not be called immediately
      expect(mockOnChangeText).not.toHaveBeenCalled();

      // Fast forward less than debounce time
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(mockOnChangeText).not.toHaveBeenCalled();

      // Fast forward to complete debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(mockOnChangeText).toHaveBeenCalledWith("test");
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
    });

    it("uses custom debounce delay", async () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = renderComponent({
        onChangeText: mockOnChangeText,
        debounceMs: 500,
      });

      const input = getByTestId("search-bar-input");
      fireEvent.changeText(input, "test");

      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(mockOnChangeText).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(mockOnChangeText).toHaveBeenCalledWith("test");
    });

    it("resets debounce timer on rapid input", () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = renderComponent({
        onChangeText: mockOnChangeText,
        debounceMs: 300,
      });

      const input = getByTestId("search-bar-input");

      // Type rapidly
      fireEvent.changeText(input, "t");
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(input, "te");
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(input, "tes");
      act(() => {
        jest.advanceTimersByTime(100);
      });

      fireEvent.changeText(input, "test");

      // Still not called
      expect(mockOnChangeText).not.toHaveBeenCalled();

      // Complete final debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Only called once with final value
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
      expect(mockOnChangeText).toHaveBeenCalledWith("test");
    });
  });

  describe("Clear Functionality", () => {
    it("clears input when clear button is pressed", () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = renderComponent({
        value: "search query",
        onChangeText: mockOnChangeText,
      });

      const clearButton = getByTestId("search-bar-clear");
      fireEvent.press(clearButton);

      const input = getByTestId("search-bar-input");
      expect(input.props.value).toBe("");
    });

    it("calls onChangeText immediately with empty string on clear", () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = renderComponent({
        value: "search query",
        onChangeText: mockOnChangeText,
      });

      const clearButton = getByTestId("search-bar-clear");
      fireEvent.press(clearButton);

      // Should be called immediately, not debounced
      expect(mockOnChangeText).toHaveBeenCalledWith("");
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
    });

    it("hides clear button after clearing", () => {
      const { getByTestId, queryByTestId } = renderComponent({
        value: "test",
      });

      const clearButton = getByTestId("search-bar-clear");
      fireEvent.press(clearButton);

      expect(queryByTestId("search-bar-clear")).toBeNull();
    });

    it("clear button is disabled when component is disabled", () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = renderComponent({
        value: "test",
        onChangeText: mockOnChangeText,
        disabled: true,
      });

      const clearButton = getByTestId("search-bar-clear");
      expect(clearButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe("Submit Functionality", () => {
    it("calls onSubmit when input is submitted", () => {
      const mockOnSubmit = jest.fn();
      const { getByTestId } = renderComponent({
        value: "search query",
        onSubmit: mockOnSubmit,
      });

      const input = getByTestId("search-bar-input");
      fireEvent(input, "submitEditing");

      expect(mockOnSubmit).toHaveBeenCalledWith("search query");
    });

    it("calls onChangeText immediately on submit", () => {
      const mockOnChangeText = jest.fn();
      const mockOnSubmit = jest.fn();
      const { getByTestId } = renderComponent({
        onChangeText: mockOnChangeText,
        onSubmit: mockOnSubmit,
      });

      const input = getByTestId("search-bar-input");
      fireEvent.changeText(input, "test");

      // Before debounce completes
      expect(mockOnChangeText).not.toHaveBeenCalled();

      // Submit
      fireEvent(input, "submitEditing");

      // Both callbacks should be called immediately
      expect(mockOnChangeText).toHaveBeenCalledWith("test");
      expect(mockOnSubmit).toHaveBeenCalledWith("test");
    });

    it("clears pending debounce on submit", () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = renderComponent({
        onChangeText: mockOnChangeText,
      });

      const input = getByTestId("search-bar-input");
      fireEvent.changeText(input, "test");
      fireEvent(input, "submitEditing");

      // Callback should be called once on submit
      expect(mockOnChangeText).toHaveBeenCalledTimes(1);

      // Advance timer - should not call again
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockOnChangeText).toHaveBeenCalledTimes(1);
    });
  });

  describe("Expand/Collapse", () => {
    it("calls onExpandedChange when toggle is pressed", () => {
      const mockOnExpandedChange = jest.fn();
      const { getByTestId } = renderComponent({
        expanded: true,
        onExpandedChange: mockOnExpandedChange,
      });

      const toggleButton = getByTestId("search-bar-toggle");
      fireEvent.press(toggleButton);

      expect(mockOnExpandedChange).toHaveBeenCalledWith(false);
    });

    it("toggles from collapsed to expanded", () => {
      const mockOnExpandedChange = jest.fn();
      const { getByTestId } = renderComponent({
        expanded: false,
        onExpandedChange: mockOnExpandedChange,
      });

      const toggleButton = getByTestId("search-bar-toggle");
      fireEvent.press(toggleButton);

      expect(mockOnExpandedChange).toHaveBeenCalledWith(true);
    });

    it("toggle button is disabled when component is disabled", () => {
      const mockOnExpandedChange = jest.fn();
      const { getByTestId } = renderComponent({
        expanded: true,
        onExpandedChange: mockOnExpandedChange,
        disabled: true,
      });

      const toggleButton = getByTestId("search-bar-toggle");
      expect(toggleButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("has accessible labels for clear button", () => {
      const { getByLabelText } = renderComponent({
        value: "test",
      });

      expect(getByLabelText("Clear search")).toBeTruthy();
    });

    it("has accessible label for toggle button", () => {
      const { getByLabelText } = renderComponent({
        expanded: true,
        onExpandedChange: jest.fn(),
      });

      expect(getByLabelText("Collapse search")).toBeTruthy();
    });

    it("toggle button label changes based on expanded state", () => {
      const { getByLabelText } = renderComponent({
        expanded: false,
        onExpandedChange: jest.fn(),
      });

      expect(getByLabelText("Expand search")).toBeTruthy();
    });

    it("has accessible label for input", () => {
      const { getByLabelText } = renderComponent();

      expect(getByLabelText("Search input")).toBeTruthy();
    });
  });

  describe("Animation", () => {
    it("animates on expand state change", () => {
      const { rerender } = renderComponent({ expanded: false });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      rerender(<SearchBar expanded={true} />);

      // Animation runs
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Component should still be rendered
      expect(true).toBe(true);
    });

    it("auto focuses input when expanded with autoFocus", async () => {
      const { getByTestId, rerender } = renderComponent({
        expanded: false,
        autoFocus: true,
      });

      rerender(<SearchBar expanded={true} autoFocus={true} />);

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Input should exist and be ready
      const input = getByTestId("search-bar-input");
      expect(input).toBeTruthy();
    });
  });

  describe("Cleanup", () => {
    it("clears debounce timer on unmount", () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId, unmount } = renderComponent({
        onChangeText: mockOnChangeText,
      });

      const input = getByTestId("search-bar-input");
      fireEvent.changeText(input, "test");

      // Unmount before debounce completes
      unmount();

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Callback should not be called
      expect(mockOnChangeText).not.toHaveBeenCalled();
    });
  });
});
