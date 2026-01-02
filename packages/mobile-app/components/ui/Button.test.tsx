/**
 * Tests for Button component
 * Ensures all variants, sizes, and states work correctly
 */

import { fireEvent, render } from "@testing-library/react-native";

import { colors } from "../../constants/theme";
import { Button, ButtonFrame, ButtonText } from "./Button";

// The TamaguiProvider is mocked in jest.setup.ts to pass through children
// So we can render components directly
const renderWithProvider = (component: React.ReactElement) => {
  return render(component);
};

describe("Button", () => {
  describe("rendering", () => {
    it("should render with default props", () => {
      const { getByText } = renderWithProvider(<Button>Click me</Button>);
      expect(getByText("Click me")).toBeTruthy();
    });

    it("should render with testID", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="test-button">Test</Button>,
      );
      expect(getByTestId("test-button")).toBeTruthy();
    });

    it("should render children as text", () => {
      const { getByText } = renderWithProvider(<Button>Button Text</Button>);
      expect(getByText("Button Text")).toBeTruthy();
    });

    it("should render children as custom element", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="custom-button">
          <ButtonText testID="custom-text">Custom</ButtonText>
        </Button>,
      );
      expect(getByTestId("custom-button")).toBeTruthy();
      expect(getByTestId("custom-text")).toBeTruthy();
    });
  });

  describe("variants", () => {
    it("should render primary variant (default)", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="primary-button" variant="primary">
          Primary
        </Button>,
      );
      expect(getByTestId("primary-button")).toBeTruthy();
    });

    it("should render secondary variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="secondary-button" variant="secondary">
          Secondary
        </Button>,
      );
      expect(getByTestId("secondary-button")).toBeTruthy();
    });

    it("should render destructive variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="destructive-button" variant="destructive">
          Delete
        </Button>,
      );
      expect(getByTestId("destructive-button")).toBeTruthy();
    });

    it("should render outline variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="outline-button" variant="outline">
          Outline
        </Button>,
      );
      expect(getByTestId("outline-button")).toBeTruthy();
    });

    it("should render ghost variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="ghost-button" variant="ghost">
          Ghost
        </Button>,
      );
      expect(getByTestId("ghost-button")).toBeTruthy();
    });
  });

  describe("sizes", () => {
    it("should render small size", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="sm-button" size="sm">
          Small
        </Button>,
      );
      expect(getByTestId("sm-button")).toBeTruthy();
    });

    it("should render medium size (default)", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="md-button" size="md">
          Medium
        </Button>,
      );
      expect(getByTestId("md-button")).toBeTruthy();
    });

    it("should render large size", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="lg-button" size="lg">
          Large
        </Button>,
      );
      expect(getByTestId("lg-button")).toBeTruthy();
    });
  });

  describe("loading state", () => {
    it("should show spinner when loading", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="loading-button" loading>
          Loading
        </Button>,
      );
      expect(getByTestId("loading-button-spinner")).toBeTruthy();
    });

    it("should not show text when loading", () => {
      const { queryByText } = renderWithProvider(
        <Button loading>Hidden Text</Button>,
      );
      expect(queryByText("Hidden Text")).toBeNull();
    });

    it("should disable button when loading", () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Button testID="loading-disabled" loading onPress={onPress}>
          Loading
        </Button>,
      );
      const button = getByTestId("loading-disabled");
      // Verify the button is properly disabled:
      // - onPress prop is undefined (not callable)
      // - pointerEvents is "none" to prevent touches
      // - accessibilityState.disabled is true for screen readers
      expect(button.props.onPress).toBeUndefined();
      expect(button.props.pointerEvents).toBe("none");
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it("should show small spinner for sm size", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="sm-loading" size="sm" loading>
          Loading
        </Button>,
      );
      expect(getByTestId("sm-loading-spinner")).toBeTruthy();
    });

    it("should show small spinner for md size", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="md-loading" size="md" loading>
          Loading
        </Button>,
      );
      expect(getByTestId("md-loading-spinner")).toBeTruthy();
    });

    it("should show large spinner for lg size", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="lg-loading" size="lg" loading>
          Loading
        </Button>,
      );
      expect(getByTestId("lg-loading-spinner")).toBeTruthy();
    });
  });

  describe("disabled state", () => {
    it("should apply disabled styles", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="disabled-button" disabled>
          Disabled
        </Button>,
      );
      expect(getByTestId("disabled-button")).toBeTruthy();
    });

    it("should not call onPress when disabled", () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Button testID="disabled-press" disabled onPress={onPress}>
          Disabled
        </Button>,
      );
      const button = getByTestId("disabled-press");
      // Verify the button is properly disabled:
      // - onPress prop is undefined (not callable)
      // - pointerEvents is "none" to prevent touches
      expect(button.props.onPress).toBeUndefined();
      expect(button.props.pointerEvents).toBe("none");
    });

    it("should have correct accessibility state when disabled", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="disabled-a11y" disabled>
          Disabled
        </Button>,
      );
      const button = getByTestId("disabled-a11y");
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe("fullWidth", () => {
    it("should apply full width styles", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="fullwidth-button" fullWidth>
          Full Width
        </Button>,
      );
      expect(getByTestId("fullwidth-button")).toBeTruthy();
    });
  });

  describe("icons", () => {
    it("should render left icon", () => {
      const { getByTestId } = renderWithProvider(
        <Button
          testID="icon-left-button"
          iconLeft={<ButtonText testID="left-icon">L</ButtonText>}
        >
          With Left Icon
        </Button>,
      );
      expect(getByTestId("left-icon")).toBeTruthy();
    });

    it("should render right icon", () => {
      const { getByTestId } = renderWithProvider(
        <Button
          testID="icon-right-button"
          iconRight={<ButtonText testID="right-icon">R</ButtonText>}
        >
          With Right Icon
        </Button>,
      );
      expect(getByTestId("right-icon")).toBeTruthy();
    });

    it("should render both icons", () => {
      const { getByTestId } = renderWithProvider(
        <Button
          testID="both-icons-button"
          iconLeft={<ButtonText testID="both-left">L</ButtonText>}
          iconRight={<ButtonText testID="both-right">R</ButtonText>}
        >
          With Both Icons
        </Button>,
      );
      expect(getByTestId("both-left")).toBeTruthy();
      expect(getByTestId("both-right")).toBeTruthy();
    });
  });

  describe("onPress", () => {
    it("should call onPress when pressed", () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Button testID="pressable-button" onPress={onPress}>
          Press Me
        </Button>,
      );
      fireEvent.press(getByTestId("pressable-button"));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("should not call onPress when undefined", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="no-handler-button">No Handler</Button>,
      );
      // Should not throw
      fireEvent.press(getByTestId("no-handler-button"));
    });
  });

  describe("accessibility", () => {
    it("should have button role", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="a11y-role">Accessible</Button>,
      );
      const button = getByTestId("a11y-role");
      expect(button.props.accessibilityRole).toBe("button");
    });

    it("should use children as accessibility label for string children", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="a11y-label">Submit Form</Button>,
      );
      const button = getByTestId("a11y-label");
      expect(button.props.accessibilityLabel).toBe("Submit Form");
    });

    it("should use custom accessibility label", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="custom-a11y-label" accessibilityLabel="Custom Label">
          Button
        </Button>,
      );
      const button = getByTestId("custom-a11y-label");
      expect(button.props.accessibilityLabel).toBe("Custom Label");
    });

    it("should have busy state when loading", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="busy-state" loading>
          Loading
        </Button>,
      );
      const button = getByTestId("busy-state");
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it("should be marked as accessible", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="accessible-button">Accessible</Button>,
      );
      const button = getByTestId("accessible-button");
      expect(button.props.accessible).toBe(true);
    });
  });

  describe("spinner colors by variant", () => {
    it("should use primaryForeground for primary variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="primary-spinner" variant="primary" loading>
          Loading
        </Button>,
      );
      const spinner = getByTestId("primary-spinner-spinner");
      expect(spinner.props.color).toBe(colors.primaryForeground);
    });

    it("should use secondaryForeground for secondary variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="secondary-spinner" variant="secondary" loading>
          Loading
        </Button>,
      );
      const spinner = getByTestId("secondary-spinner-spinner");
      expect(spinner.props.color).toBe(colors.secondaryForeground);
    });

    it("should use destructiveForeground for destructive variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="destructive-spinner" variant="destructive" loading>
          Loading
        </Button>,
      );
      const spinner = getByTestId("destructive-spinner-spinner");
      expect(spinner.props.color).toBe(colors.destructiveForeground);
    });

    it("should use foreground for outline variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="outline-spinner" variant="outline" loading>
          Loading
        </Button>,
      );
      const spinner = getByTestId("outline-spinner-spinner");
      expect(spinner.props.color).toBe(colors.foreground);
    });

    it("should use foreground for ghost variant", () => {
      const { getByTestId } = renderWithProvider(
        <Button testID="ghost-spinner" variant="ghost" loading>
          Loading
        </Button>,
      );
      const spinner = getByTestId("ghost-spinner-spinner");
      expect(spinner.props.color).toBe(colors.foreground);
    });
  });
});

describe("ButtonFrame", () => {
  it("should be exported", () => {
    expect(ButtonFrame).toBeDefined();
  });

  it("should render as a standalone component", () => {
    const { getByTestId } = renderWithProvider(
      <ButtonFrame testID="button-frame" />,
    );
    expect(getByTestId("button-frame")).toBeTruthy();
  });
});

describe("ButtonText", () => {
  it("should be exported", () => {
    expect(ButtonText).toBeDefined();
  });

  it("should render as a standalone component", () => {
    const { getByText } = renderWithProvider(<ButtonText>Text</ButtonText>);
    expect(getByText("Text")).toBeTruthy();
  });
});
