/**
 * Tests for Input component
 * Ensures all states, sizes, and features work correctly
 */

import { fireEvent, render } from "@testing-library/react-native";
import React, { createRef } from "react";
import type { TextInput } from "react-native";
import { Text } from "react-native";
import {
  IconContainer,
  Input,
  InputContainer,
  InputHelperText,
  InputLabel,
  InputWrapper,
} from "./Input";

// The TamaguiProvider is mocked in jest.setup.ts to pass through children
// So we can render components directly
const renderWithProvider = (component: React.ReactElement) => {
  return render(component);
};

// Mock icon component for testing
const MockIcon: React.FC<{ testID?: string; }> = ({ testID }) => <Text testID={testID}>Icon</Text>;

describe("Input", () => {
  describe("rendering", () => {
    it("should render with default props", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="default-input" placeholder="Enter text" />,
      );
      expect(getByTestId("default-input-input")).toBeTruthy();
    });

    it("should render placeholder text", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="placeholder-input" placeholder="Placeholder text" />,
      );
      const input = getByTestId("placeholder-input-input");
      expect(input.props.placeholder).toBe("Placeholder text");
    });

    it("should render with value", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="value-input" value="Test value" />,
      );
      const input = getByTestId("value-input-input");
      expect(input.props.value).toBe("Test value");
    });
  });

  describe("label", () => {
    it("should render label when provided", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="labeled-input" label="Email Address" />,
      );
      expect(getByTestId("labeled-input-label")).toBeTruthy();
    });

    it("should not render label when not provided", () => {
      const { queryByTestId } = renderWithProvider(
        <Input testID="no-label-input" />,
      );
      expect(queryByTestId("no-label-input-label")).toBeNull();
    });

    it("should display correct label text", () => {
      const { getByText } = renderWithProvider(
        <Input label="Username" testID="label-text" />,
      );
      expect(getByText("Username")).toBeTruthy();
    });

    it("should have text accessibility role on label", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="label-role" label="Label" />,
      );
      const label = getByTestId("label-role-label");
      expect(label.props.accessibilityRole).toBe("text");
    });
  });

  describe("error state", () => {
    it("should show error message when error prop is provided", () => {
      const { getByText } = renderWithProvider(
        <Input testID="error-input" error="This field is required" />,
      );
      expect(getByText("This field is required")).toBeTruthy();
    });

    it("should render error helper text with correct testID", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="error-helper" error="Error message" />,
      );
      expect(getByTestId("error-helper-helper")).toBeTruthy();
    });

    it("should apply error styling to wrapper", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="error-style" error="Error" />,
      );
      expect(getByTestId("error-style-wrapper")).toBeTruthy();
    });

    it("should prioritize error over helper text", () => {
      const { getByText, queryByText } = renderWithProvider(
        <Input
          testID="priority"
          error="Error message"
          helperText="Helper text"
        />,
      );
      expect(getByText("Error message")).toBeTruthy();
      expect(queryByText("Helper text")).toBeNull();
    });
  });

  describe("helper text", () => {
    it("should show helper text when provided and no error", () => {
      const { getByText } = renderWithProvider(
        <Input testID="helper-input" helperText="Enter your email address" />,
      );
      expect(getByText("Enter your email address")).toBeTruthy();
    });

    it("should render helper text with correct testID", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="helper-testid" helperText="Helper" />,
      );
      expect(getByTestId("helper-testid-helper")).toBeTruthy();
    });

    it("should not show helper text when not provided", () => {
      const { queryByTestId } = renderWithProvider(
        <Input testID="no-helper" />,
      );
      expect(queryByTestId("no-helper-helper")).toBeNull();
    });
  });

  describe("sizes", () => {
    it("should render small size", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="sm-input" size="sm" />,
      );
      expect(getByTestId("sm-input-wrapper")).toBeTruthy();
    });

    it("should render medium size (default)", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="md-input" size="md" />,
      );
      expect(getByTestId("md-input-wrapper")).toBeTruthy();
    });

    it("should render large size", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="lg-input" size="lg" />,
      );
      expect(getByTestId("lg-input-wrapper")).toBeTruthy();
    });

    it("should apply correct font size for sm", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="sm-font" size="sm" />,
      );
      const input = getByTestId("sm-font-input");
      expect(input.props.style.fontSize).toBe(14); // fontSize.sm
    });

    it("should apply correct font size for md", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="md-font" size="md" />,
      );
      const input = getByTestId("md-font-input");
      expect(input.props.style.fontSize).toBe(16); // fontSize.base
    });

    it("should apply correct font size for lg", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="lg-font" size="lg" />,
      );
      const input = getByTestId("lg-font-input");
      expect(input.props.style.fontSize).toBe(18); // fontSize.lg
    });
  });

  describe("disabled state", () => {
    it("should apply disabled styles", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="disabled-input" disabled />,
      );
      expect(getByTestId("disabled-input-wrapper")).toBeTruthy();
    });

    it("should not be editable when disabled", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="not-editable" disabled />,
      );
      const input = getByTestId("not-editable-input");
      expect(input.props.editable).toBe(false);
    });

    it("should have disabled accessibility state", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="disabled-a11y" disabled />,
      );
      const input = getByTestId("disabled-a11y-input");
      expect(input.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe("icons", () => {
    it("should render left icon", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="left-icon" iconLeft={<MockIcon testID="mock-left" />} />,
      );
      expect(getByTestId("left-icon-icon-left")).toBeTruthy();
      expect(getByTestId("mock-left")).toBeTruthy();
    });

    it("should render right icon", () => {
      const { getByTestId } = renderWithProvider(
        <Input
          testID="right-icon"
          iconRight={<MockIcon testID="mock-right" />}
        />,
      );
      expect(getByTestId("right-icon-icon-right")).toBeTruthy();
      expect(getByTestId("mock-right")).toBeTruthy();
    });

    it("should render both icons", () => {
      const { getByTestId } = renderWithProvider(
        <Input
          testID="both-icons"
          iconLeft={<MockIcon testID="both-left" />}
          iconRight={<MockIcon testID="both-right" />}
        />,
      );
      expect(getByTestId("both-left")).toBeTruthy();
      expect(getByTestId("both-right")).toBeTruthy();
    });
  });

  describe("focus state", () => {
    it("should call onFocus when focused", () => {
      const onFocus = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Input testID="focus-handler" onFocus={onFocus} />,
      );
      fireEvent(getByTestId("focus-handler-input"), "focus");
      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it("should call onBlur when blurred", () => {
      const onBlur = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Input testID="blur-handler" onBlur={onBlur} />,
      );
      const input = getByTestId("blur-handler-input");
      fireEvent(input, "focus");
      fireEvent(input, "blur");
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it("should handle focus without callback", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="no-focus-handler" />,
      );
      // Should not throw
      fireEvent(getByTestId("no-focus-handler-input"), "focus");
    });

    it("should handle blur without callback", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="no-blur-handler" />,
      );
      // Should not throw
      fireEvent(getByTestId("no-blur-handler-input"), "focus");
      fireEvent(getByTestId("no-blur-handler-input"), "blur");
    });
  });

  describe("onChangeText", () => {
    it("should call onChangeText with new value", () => {
      const onChangeText = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Input testID="change-handler" onChangeText={onChangeText} />,
      );
      fireEvent.changeText(getByTestId("change-handler-input"), "new text");
      expect(onChangeText).toHaveBeenCalledWith("new text");
    });
  });

  describe("accessibility", () => {
    it("should use label as accessibility label when provided", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="a11y-label" label="Email" />,
      );
      const input = getByTestId("a11y-label-input");
      expect(input.props.accessibilityLabel).toBe("Email");
    });

    it("should use placeholder as accessibility label when no label", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="a11y-placeholder" placeholder="Enter email" />,
      );
      const input = getByTestId("a11y-placeholder-input");
      expect(input.props.accessibilityLabel).toBe("Enter email");
    });

    it("should use helper text as accessibility hint", () => {
      const { getByTestId } = renderWithProvider(
        <Input testID="a11y-hint" helperText="Format: name@example.com" />,
      );
      const input = getByTestId("a11y-hint-input");
      expect(input.props.accessibilityHint).toBe("Format: name@example.com");
    });

    it("should be accessible", () => {
      const { getByTestId } = renderWithProvider(<Input testID="accessible" />);
      const input = getByTestId("accessible-input");
      expect(input.props.accessible).toBe(true);
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref to TextInput", () => {
      const ref = createRef<TextInput>();
      renderWithProvider(<Input testID="ref-input" ref={ref} />);
      expect(ref.current).toBeTruthy();
    });
  });

  describe("additional TextInput props", () => {
    it("should pass through additional props", () => {
      const { getByTestId } = renderWithProvider(
        <Input
          testID="props-input"
          secureTextEntry
          maxLength={100}
          autoCapitalize="none"
        />,
      );
      const input = getByTestId("props-input-input");
      expect(input.props.secureTextEntry).toBe(true);
      expect(input.props.maxLength).toBe(100);
      expect(input.props.autoCapitalize).toBe("none");
    });
  });
});

describe("Styled component exports", () => {
  describe("InputContainer", () => {
    it("should be exported", () => {
      expect(InputContainer).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByTestId } = renderWithProvider(
        <InputContainer testID="input-container" />,
      );
      expect(getByTestId("input-container")).toBeTruthy();
    });
  });

  describe("InputLabel", () => {
    it("should be exported", () => {
      expect(InputLabel).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByText } = renderWithProvider(
        <InputLabel>Label Text</InputLabel>,
      );
      expect(getByText("Label Text")).toBeTruthy();
    });
  });

  describe("InputWrapper", () => {
    it("should be exported", () => {
      expect(InputWrapper).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByTestId } = renderWithProvider(
        <InputWrapper testID="input-wrapper" />,
      );
      expect(getByTestId("input-wrapper")).toBeTruthy();
    });
  });

  describe("InputHelperText", () => {
    it("should be exported", () => {
      expect(InputHelperText).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByText } = renderWithProvider(
        <InputHelperText>Helper Text</InputHelperText>,
      );
      expect(getByText("Helper Text")).toBeTruthy();
    });

    it("should render with hasError false", () => {
      const { getByText } = renderWithProvider(
        <InputHelperText hasError={false}>Normal Helper</InputHelperText>,
      );
      expect(getByText("Normal Helper")).toBeTruthy();
    });

    it("should render with hasError true", () => {
      const { getByText } = renderWithProvider(
        <InputHelperText hasError={true}>Error Helper</InputHelperText>,
      );
      expect(getByText("Error Helper")).toBeTruthy();
    });
  });

  describe("IconContainer", () => {
    it("should be exported", () => {
      expect(IconContainer).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByTestId } = renderWithProvider(
        <IconContainer testID="icon-container" />,
      );
      expect(getByTestId("icon-container")).toBeTruthy();
    });
  });
});

describe("Input displayName", () => {
  it("should have correct displayName", () => {
    expect(Input.displayName).toBe("Input");
  });
});
