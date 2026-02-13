import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguageBanner } from "./LanguageBanner";

// Mock window.location
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("LanguageBanner", () => {
  it("renders nothing when no available languages", () => {
    const { container } = render(
      <LanguageBanner currentLang="en" availableLanguages={[]} slug="test-post" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Also available in' when viewing English", () => {
    render(
      <LanguageBanner
        currentLang="en"
        availableLanguages={["hu", "es"]}
        slug="test-post"
      />,
    );

    expect(screen.getByText("Also available in:")).toBeInTheDocument();
    expect(screen.getByText("Magyar")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
  });

  it("shows 'Reading in' and 'Switch to English' when viewing translation", () => {
    render(
      <LanguageBanner
        currentLang="hu"
        availableLanguages={["hu", "es", "de"]}
        slug="test-post"
      />,
    );

    expect(screen.getByText("Magyar")).toBeInTheDocument();
    expect(screen.getByText("Switch to English")).toBeInTheDocument();
  });

  it("shows other available languages when viewing a translation", () => {
    render(
      <LanguageBanner
        currentLang="hu"
        availableLanguages={["hu", "es", "de"]}
        slug="test-post"
      />,
    );

    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
  });

  it("navigates to English when clicking Switch to English", () => {
    mockLocation.href = "";
    render(
      <LanguageBanner
        currentLang="hu"
        availableLanguages={["hu", "es"]}
        slug="test-post"
      />,
    );

    fireEvent.click(screen.getByText("Switch to English"));

    expect(mockLocation.href).toBe("/blog/test-post");
  });

  it("navigates with lang param when clicking a language", () => {
    mockLocation.href = "";
    render(
      <LanguageBanner
        currentLang="en"
        availableLanguages={["hu", "es"]}
        slug="test-post"
      />,
    );

    fireEvent.click(screen.getByText("Magyar"));

    expect(mockLocation.href).toBe("/blog/test-post?lang=hu");
  });

  it("sets cookie when switching language", () => {
    const cookieSpy = vi.spyOn(document, "cookie", "set");
    render(
      <LanguageBanner
        currentLang="en"
        availableLanguages={["hu"]}
        slug="test-post"
      />,
    );

    fireEvent.click(screen.getByText("Magyar"));

    expect(cookieSpy).toHaveBeenCalledWith(
      expect.stringContaining("spike-lang=hu"),
    );
    cookieSpy.mockRestore();
  });

  it("stores language in localStorage when switching", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(
      <LanguageBanner
        currentLang="en"
        availableLanguages={["es"]}
        slug="test-post"
      />,
    );

    fireEvent.click(screen.getByText("Español"));

    expect(setItemSpy).toHaveBeenCalledWith("spike-lang", "es");
    setItemSpy.mockRestore();
  });

  it("dismisses banner when clicking dismiss button", () => {
    render(
      <LanguageBanner
        currentLang="en"
        availableLanguages={["hu"]}
        slug="test-post"
      />,
    );

    expect(screen.getByText("Also available in:")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss language banner"));

    expect(screen.queryByText("Also available in:")).not.toBeInTheDocument();
  });

  it("has correct aria-label for accessibility", () => {
    render(
      <LanguageBanner
        currentLang="en"
        availableLanguages={["hu"]}
        slug="test-post"
      />,
    );

    expect(screen.getByRole("complementary")).toHaveAttribute(
      "aria-label",
      "Language options",
    );
  });

  it("handles localStorage errors gracefully", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage full");
    });

    render(
      <LanguageBanner
        currentLang="en"
        availableLanguages={["hu"]}
        slug="test-post"
      />,
    );

    // Should not throw
    fireEvent.click(screen.getByText("Magyar"));

    expect(mockLocation.href).toBe("/blog/test-post?lang=hu");
    vi.restoreAllMocks();
  });
});
