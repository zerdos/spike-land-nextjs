/**
 * Tests for Avatar and AvatarGroup components
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { Avatar, AvatarGroup } from "../Avatar";

describe("Avatar", () => {
  describe("with image source", () => {
    it("renders with src", () => {
      render(<Avatar src="https://example.com/avatar.png" testID="avatar" />);
      expect(screen.getByTestId("avatar")).toBeTruthy();
    });

    it("applies custom size", () => {
      render(
        <Avatar
          src="https://example.com/avatar.png"
          size={60}
          testID="avatar"
        />,
      );
      const avatar = screen.getByTestId("avatar");
      expect(avatar.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 60, height: 60 }),
        ]),
      );
    });

    it("shows fallback when image fails to load", () => {
      render(
        <Avatar
          src="https://example.com/broken.png"
          fallback="AB"
          testID="avatar"
        />,
      );

      // Find the image and trigger onError
      const container = screen.getByTestId("avatar");
      const image = container.findByProps({
        accessibilityLabel: "User avatar",
      });

      // Trigger the error
      fireEvent(image, "error");

      // After error, fallback should be shown
      expect(screen.getByText("AB")).toBeTruthy();
    });
  });

  describe("fallback state", () => {
    it("renders fallback text when no src provided", () => {
      render(<Avatar fallback="ZE" testID="avatar" />);
      expect(screen.getByText("ZE")).toBeTruthy();
    });

    it("renders default fallback when neither src nor fallback provided", () => {
      render(<Avatar testID="avatar" />);
      expect(screen.getByText("?")).toBeTruthy();
    });

    it("applies fallback style", () => {
      render(
        <Avatar
          fallback="AB"
          fallbackStyle={{ backgroundColor: "red" }}
          testID="avatar"
        />,
      );
      const avatar = screen.getByTestId("avatar");
      expect(avatar.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: "red" }),
        ]),
      );
    });
  });

  describe("sizing", () => {
    it("uses default size of 40", () => {
      render(<Avatar fallback="X" testID="avatar" />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 40, height: 40 }),
        ]),
      );
    });

    it("calculates border radius based on size", () => {
      render(<Avatar fallback="X" size={100} testID="avatar" />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderRadius: 50 })]),
      );
    });
  });
});

describe("AvatarGroup", () => {
  it("renders all children when count is less than max", () => {
    render(
      <AvatarGroup>
        <Avatar fallback="A" testID="avatar-a" />
        <Avatar fallback="B" testID="avatar-b" />
      </AvatarGroup>,
    );
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("shows overflow indicator when children exceed max", () => {
    render(
      <AvatarGroup max={2}>
        <Avatar fallback="A" />
        <Avatar fallback="B" />
        <Avatar fallback="C" />
        <Avatar fallback="D" />
      </AvatarGroup>,
    );
    expect(screen.getByText("+2")).toBeTruthy();
  });

  it("renders exactly max children when exceeding max", () => {
    render(
      <AvatarGroup max={2}>
        <Avatar fallback="A" />
        <Avatar fallback="B" />
        <Avatar fallback="C" />
      </AvatarGroup>,
    );
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
    expect(screen.queryByText("C")).toBeNull();
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("uses default max of 4", () => {
    render(
      <AvatarGroup>
        <Avatar fallback="A" />
        <Avatar fallback="B" />
        <Avatar fallback="C" />
        <Avatar fallback="D" />
        <Avatar fallback="E" />
        <Avatar fallback="F" />
      </AvatarGroup>,
    );
    expect(screen.getByText("+2")).toBeTruthy();
  });
});
