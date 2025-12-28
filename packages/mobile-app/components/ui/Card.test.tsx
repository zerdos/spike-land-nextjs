/**
 * Tests for Card component
 * Ensures all variants and sub-components work correctly
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";
import {
  Card,
  CardContent,
  CardContentFrame,
  CardDescription,
  CardDescriptionText,
  CardFooter,
  CardFooterFrame,
  CardFrame,
  CardHeader,
  CardHeaderFrame,
  CardTitle,
  CardTitleText,
} from "./Card";

// The TamaguiProvider is mocked in jest.setup.ts to pass through children
// So we can render components directly
const renderWithProvider = (component: React.ReactElement) => {
  return render(component);
};

describe("Card", () => {
  describe("rendering", () => {
    it("should render with default props", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="default-card">
          <CardContent>Content</CardContent>
        </Card>,
      );
      expect(getByTestId("default-card")).toBeTruthy();
    });

    it("should render children", () => {
      const { getByText } = renderWithProvider(
        <Card>
          <CardContent>
            <Text>Card Content</Text>
          </CardContent>
        </Card>,
      );
      expect(getByText("Card Content")).toBeTruthy();
    });
  });

  describe("variants", () => {
    it("should render default variant", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="default-variant" variant="default">
          <CardContent>Content</CardContent>
        </Card>,
      );
      expect(getByTestId("default-variant")).toBeTruthy();
    });

    it("should render glass variant", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="glass-variant" variant="glass">
          <CardContent>Glass Content</CardContent>
        </Card>,
      );
      expect(getByTestId("glass-variant")).toBeTruthy();
    });

    it("should render elevated variant", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="elevated-variant" variant="elevated">
          <CardContent>Elevated Content</CardContent>
        </Card>,
      );
      expect(getByTestId("elevated-variant")).toBeTruthy();
    });
  });

  describe("interactive", () => {
    it("should be interactive when prop is true", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="interactive-card" interactive>
          <CardContent>Interactive</CardContent>
        </Card>,
      );
      expect(getByTestId("interactive-card")).toBeTruthy();
    });

    it("should call onPress when interactive and pressed", () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Card testID="press-card" interactive onPress={onPress}>
          <CardContent>Pressable</CardContent>
        </Card>,
      );
      fireEvent.press(getByTestId("press-card"));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("should not call onPress when not interactive", () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <Card testID="non-interactive" onPress={onPress}>
          <CardContent>Not Interactive</CardContent>
        </Card>,
      );
      fireEvent.press(getByTestId("non-interactive"));
      expect(onPress).not.toHaveBeenCalled();
    });

    it("should have button role when interactive", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="button-role" interactive>
          <CardContent>Button Role</CardContent>
        </Card>,
      );
      const card = getByTestId("button-role");
      expect(card.props.accessibilityRole).toBe("button");
    });

    it("should not have button role when not interactive", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="no-role">
          <CardContent>No Role</CardContent>
        </Card>,
      );
      const card = getByTestId("no-role");
      expect(card.props.accessibilityRole).toBeUndefined();
    });
  });

  describe("fullWidth", () => {
    it("should apply full width styles", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="fullwidth-card" fullWidth>
          <CardContent>Full Width</CardContent>
        </Card>,
      );
      expect(getByTestId("fullwidth-card")).toBeTruthy();
    });
  });

  describe("accessibility", () => {
    it("should use custom accessibility label", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="a11y-card" interactive accessibilityLabel="Custom Card Label">
          <CardContent>Accessible</CardContent>
        </Card>,
      );
      const card = getByTestId("a11y-card");
      expect(card.props.accessibilityLabel).toBe("Custom Card Label");
    });

    it("should be accessible when interactive", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="accessible-card" interactive>
          <CardContent>Accessible</CardContent>
        </Card>,
      );
      const card = getByTestId("accessible-card");
      expect(card.props.accessible).toBe(true);
    });

    it("should not be accessible by default when not interactive", () => {
      const { getByTestId } = renderWithProvider(
        <Card testID="not-accessible">
          <CardContent>Not Accessible</CardContent>
        </Card>,
      );
      const card = getByTestId("not-accessible");
      expect(card.props.accessible).toBeFalsy();
    });
  });
});

describe("CardHeader", () => {
  it("should render with children", () => {
    const { getByText } = renderWithProvider(
      <CardHeader>
        <Text>Header Content</Text>
      </CardHeader>,
    );
    expect(getByText("Header Content")).toBeTruthy();
  });

  it("should render with testID", () => {
    const { getByTestId } = renderWithProvider(
      <CardHeader testID="card-header">
        <Text>Header</Text>
      </CardHeader>,
    );
    expect(getByTestId("card-header")).toBeTruthy();
  });
});

describe("CardTitle", () => {
  it("should render title text", () => {
    const { getByText } = renderWithProvider(<CardTitle>Card Title</CardTitle>);
    expect(getByText("Card Title")).toBeTruthy();
  });

  it("should render with testID", () => {
    const { getByTestId } = renderWithProvider(<CardTitle testID="card-title">Title</CardTitle>);
    expect(getByTestId("card-title")).toBeTruthy();
  });

  it("should have header accessibility role", () => {
    const { getByTestId } = renderWithProvider(<CardTitle testID="title-role">Title</CardTitle>);
    const title = getByTestId("title-role");
    expect(title.props.accessibilityRole).toBe("header");
  });
});

describe("CardDescription", () => {
  it("should render description text", () => {
    const { getByText } = renderWithProvider(
      <CardDescription>Card description text</CardDescription>,
    );
    expect(getByText("Card description text")).toBeTruthy();
  });

  it("should render with testID", () => {
    const { getByTestId } = renderWithProvider(
      <CardDescription testID="card-description">Description</CardDescription>,
    );
    expect(getByTestId("card-description")).toBeTruthy();
  });
});

describe("CardContent", () => {
  it("should render content", () => {
    const { getByText } = renderWithProvider(
      <CardContent>
        <Text>Content Area</Text>
      </CardContent>,
    );
    expect(getByText("Content Area")).toBeTruthy();
  });

  it("should render with testID", () => {
    const { getByTestId } = renderWithProvider(
      <CardContent testID="card-content">
        <Text>Content</Text>
      </CardContent>,
    );
    expect(getByTestId("card-content")).toBeTruthy();
  });
});

describe("CardFooter", () => {
  it("should render footer content", () => {
    const { getByText } = renderWithProvider(
      <CardFooter>
        <Text>Footer Actions</Text>
      </CardFooter>,
    );
    expect(getByText("Footer Actions")).toBeTruthy();
  });

  it("should render with testID", () => {
    const { getByTestId } = renderWithProvider(
      <CardFooter testID="card-footer">
        <Text>Footer</Text>
      </CardFooter>,
    );
    expect(getByTestId("card-footer")).toBeTruthy();
  });
});

describe("Complete Card composition", () => {
  it("should render with all sub-components", () => {
    const { getByTestId, getByText } = renderWithProvider(
      <Card testID="complete-card">
        <CardHeader testID="complete-header">
          <CardTitle testID="complete-title">Complete Card</CardTitle>
          <CardDescription testID="complete-description">
            This is a complete card example
          </CardDescription>
        </CardHeader>
        <CardContent testID="complete-content">
          <Text>Main content goes here</Text>
        </CardContent>
        <CardFooter testID="complete-footer">
          <Text>Footer actions</Text>
        </CardFooter>
      </Card>,
    );

    expect(getByTestId("complete-card")).toBeTruthy();
    expect(getByTestId("complete-header")).toBeTruthy();
    expect(getByTestId("complete-title")).toBeTruthy();
    expect(getByTestId("complete-description")).toBeTruthy();
    expect(getByTestId("complete-content")).toBeTruthy();
    expect(getByTestId("complete-footer")).toBeTruthy();
    expect(getByText("Complete Card")).toBeTruthy();
    expect(getByText("This is a complete card example")).toBeTruthy();
    expect(getByText("Main content goes here")).toBeTruthy();
    expect(getByText("Footer actions")).toBeTruthy();
  });
});

describe("Styled frame exports", () => {
  describe("CardFrame", () => {
    it("should be exported", () => {
      expect(CardFrame).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByTestId } = renderWithProvider(<CardFrame testID="card-frame" />);
      expect(getByTestId("card-frame")).toBeTruthy();
    });
  });

  describe("CardHeaderFrame", () => {
    it("should be exported", () => {
      expect(CardHeaderFrame).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByTestId } = renderWithProvider(<CardHeaderFrame testID="header-frame" />);
      expect(getByTestId("header-frame")).toBeTruthy();
    });
  });

  describe("CardTitleText", () => {
    it("should be exported", () => {
      expect(CardTitleText).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByText } = renderWithProvider(<CardTitleText>Title Text</CardTitleText>);
      expect(getByText("Title Text")).toBeTruthy();
    });
  });

  describe("CardDescriptionText", () => {
    it("should be exported", () => {
      expect(CardDescriptionText).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByText } = renderWithProvider(
        <CardDescriptionText>Description Text</CardDescriptionText>,
      );
      expect(getByText("Description Text")).toBeTruthy();
    });
  });

  describe("CardContentFrame", () => {
    it("should be exported", () => {
      expect(CardContentFrame).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByTestId } = renderWithProvider(<CardContentFrame testID="content-frame" />);
      expect(getByTestId("content-frame")).toBeTruthy();
    });
  });

  describe("CardFooterFrame", () => {
    it("should be exported", () => {
      expect(CardFooterFrame).toBeDefined();
    });

    it("should render as standalone component", () => {
      const { getByTestId } = renderWithProvider(<CardFooterFrame testID="footer-frame" />);
      expect(getByTestId("footer-frame")).toBeTruthy();
    });
  });
});
