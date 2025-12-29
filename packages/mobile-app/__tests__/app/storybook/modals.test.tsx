/**
 * Tests for Modals Storybook Page
 * Ensures all modal components render correctly
 */

import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import ModalsPage from "../../../app/storybook/modals";

describe("ModalsPage", () => {
  describe("rendering", () => {
    it("should render the page title", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Modals")).toBeTruthy();
    });

    it("should render the subtitle", () => {
      const { getByText } = render(<ModalsPage />);
      expect(
        getByText("Dialogs, dropdown menus, sheets, alert dialogs"),
      ).toBeTruthy();
    });
  });

  describe("Basic Dialog section", () => {
    it("should render Basic Dialog section title", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Basic Dialog")).toBeTruthy();
    });

    it("should render Basic Dialog description", () => {
      const { getByText } = render(<ModalsPage />);
      expect(
        getByText("Standard modal dialog for confirmations and information."),
      ).toBeTruthy();
    });

    it("should render Open Dialog button", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Open Dialog")).toBeTruthy();
    });

    it("should open basic modal when button is pressed", () => {
      const { getByText } = render(<ModalsPage />);
      const button = getByText("Open Dialog");
      fireEvent.press(button);
      expect(getByText("Welcome to spike.land")).toBeTruthy();
    });

    it("should close basic modal when Got it! button is pressed", () => {
      const { getByText, queryByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Open Dialog"));
      expect(getByText("Welcome to spike.land")).toBeTruthy();
      fireEvent.press(getByText("Got it!"));
      expect(queryByText("Welcome to spike.land")).toBeNull();
    });
  });

  describe("Alert Dialog section", () => {
    it("should render Alert Dialog section title", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Alert Dialog")).toBeTruthy();
    });

    it("should render Alert Dialog description", () => {
      const { getByText } = render(<ModalsPage />);
      expect(
        getByText("Confirmation dialog for destructive actions."),
      ).toBeTruthy();
    });

    it("should render Delete Item button", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Delete Item")).toBeTruthy();
    });

    it("should open alert modal when Delete Item is pressed", () => {
      const { getByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Delete Item"));
      expect(getByText("Delete this item?")).toBeTruthy();
    });

    it("should show warning message in alert modal", () => {
      const { getByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Delete Item"));
      expect(
        getByText(
          "This action cannot be undone. This will permanently delete the item from your account.",
        ),
      ).toBeTruthy();
    });

    it("should close alert modal when Cancel is pressed", () => {
      const { getByText, queryByText, getAllByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Delete Item"));
      expect(getByText("Delete this item?")).toBeTruthy();
      const cancelButtons = getAllByText("Cancel");
      fireEvent.press(cancelButtons[cancelButtons.length - 1]);
      expect(queryByText("Delete this item?")).toBeNull();
    });
  });

  describe("Bottom Sheet section", () => {
    it("should render Bottom Sheet section title", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Bottom Sheet")).toBeTruthy();
    });

    it("should render Bottom Sheet description", () => {
      const { getByText } = render(<ModalsPage />);
      expect(
        getByText("Action sheet that slides up from the bottom."),
      ).toBeTruthy();
    });

    it("should render Open Sheet button", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Open Sheet")).toBeTruthy();
    });

    it("should open bottom sheet when Open Sheet is pressed", () => {
      const { getByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Open Sheet"));
      expect(getByText("Share Image")).toBeTruthy();
    });

    it("should show share options in bottom sheet", () => {
      const { getByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Open Sheet"));
      expect(getByText("Download")).toBeTruthy();
      expect(getByText("Copy Link")).toBeTruthy();
      expect(getByText("Share to...")).toBeTruthy();
    });
  });

  describe("Dropdown Menu section", () => {
    it("should render Dropdown Menu section title", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Dropdown Menu")).toBeTruthy();
    });

    it("should render Dropdown Menu description", () => {
      const { getByText } = render(<ModalsPage />);
      expect(
        getByText("Contextual menu for additional options."),
      ).toBeTruthy();
    });

    it("should render Options trigger button", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Options")).toBeTruthy();
    });

    it("should show dropdown menu items when Options is pressed", () => {
      const { getByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Options"));
      expect(getByText("Edit")).toBeTruthy();
      expect(getByText("Duplicate")).toBeTruthy();
      expect(getByText("Share")).toBeTruthy();
      expect(getByText("Delete")).toBeTruthy();
    });

    it("should close dropdown menu when item is pressed", () => {
      const { getByText, queryByText } = render(<ModalsPage />);
      fireEvent.press(getByText("Options"));
      expect(getByText("Edit")).toBeTruthy();
      fireEvent.press(getByText("Edit"));
      expect(queryByText("Duplicate")).toBeNull();
    });
  });

  describe("Modal Anatomy section", () => {
    it("should render Modal Anatomy section title", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Modal Anatomy")).toBeTruthy();
    });

    it("should render Modal Anatomy description", () => {
      const { getByText } = render(<ModalsPage />);
      expect(
        getByText("Structure and components of a modal dialog."),
      ).toBeTruthy();
    });

    it("should render anatomy example components", () => {
      const { getByText } = render(<ModalsPage />);
      expect(getByText("Dialog Title")).toBeTruthy();
      expect(getByText("Optional subtitle or description")).toBeTruthy();
    });

    it("should render anatomy modal body content", () => {
      const { getByText } = render(<ModalsPage />);
      expect(
        getByText(
          "Modal body content goes here. It can contain text, forms, images, or any other components.",
        ),
      ).toBeTruthy();
    });

    it("should render anatomy footer buttons", () => {
      const { getAllByText } = render(<ModalsPage />);
      const cancelButtons = getAllByText("Cancel");
      expect(cancelButtons.length).toBeGreaterThan(0);
      expect(getAllByText("Confirm").length).toBeGreaterThan(0);
    });
  });
});
