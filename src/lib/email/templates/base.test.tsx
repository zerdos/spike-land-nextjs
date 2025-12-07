import { render } from "@react-email/components";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { BaseEmail, emailStyles } from "./base";

describe("BaseEmail", () => {
  it("should render email with all required elements", async () => {
    const html = await render(
      <BaseEmail preview="Test preview" heading="Test Heading">
        <p>Test content</p>
      </BaseEmail>,
    );

    expect(html).toContain("Test preview");
    expect(html).toContain("Test Heading");
    expect(html).toContain("Test content");
    expect(html).toContain("Spike Land");
    expect(html).toContain("Pixel - AI Image Enhancement");
  });

  it("should include footer links", async () => {
    const html = await render(
      <BaseEmail preview="Test preview" heading="Test Heading">
        <p>Test content</p>
      </BaseEmail>,
    );

    expect(html).toContain("Visit Website");
    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Terms of Service");
    expect(html).toContain("https://spike.land");
    expect(html).toContain("https://spike.land/privacy");
    expect(html).toContain("https://spike.land/terms");
  });

  it("should include copyright with current year", async () => {
    const currentYear = new Date().getFullYear();
    const html = await render(
      <BaseEmail preview="Test preview" heading="Test Heading">
        <p>Test content</p>
      </BaseEmail>,
    );

    expect(html).toContain("©");
    expect(html).toContain(String(currentYear));
    expect(html).toContain("Spike Land");
    expect(html).toContain("All rights reserved");
  });

  it("should render unsubscribe link when provided", async () => {
    const html = await render(
      <BaseEmail
        preview="Test preview"
        heading="Test Heading"
        unsubscribeUrl="https://spike.land/unsubscribe?token=abc123"
      >
        <p>Test content</p>
      </BaseEmail>,
    );

    expect(html).toContain("Unsubscribe");
    expect(html).toContain("https://spike.land/unsubscribe?token=abc123");
  });

  it("should not render unsubscribe link when not provided", async () => {
    const html = await render(
      <BaseEmail preview="Test preview" heading="Test Heading">
        <p>Test content</p>
      </BaseEmail>,
    );

    expect(html).not.toContain("Unsubscribe");
  });

  it("should render children content", async () => {
    const html = await render(
      <BaseEmail preview="Test preview" heading="Test Heading">
        <p>First paragraph</p>
        <p>Second paragraph</p>
        <div>Nested content</div>
      </BaseEmail>,
    );

    expect(html).toContain("First paragraph");
    expect(html).toContain("Second paragraph");
    expect(html).toContain("Nested content");
  });
});

describe("emailStyles", () => {
  it("should export all required style objects", () => {
    expect(emailStyles.main).toBeDefined();
    expect(emailStyles.container).toBeDefined();
    expect(emailStyles.header).toBeDefined();
    expect(emailStyles.logo).toBeDefined();
    expect(emailStyles.tagline).toBeDefined();
    expect(emailStyles.content).toBeDefined();
    expect(emailStyles.h1).toBeDefined();
    expect(emailStyles.footer).toBeDefined();
    expect(emailStyles.footerText).toBeDefined();
    expect(emailStyles.link).toBeDefined();
  });

  it("should export common reusable styles", () => {
    expect(emailStyles.text).toBeDefined();
    expect(emailStyles.button).toBeDefined();
    expect(emailStyles.code).toBeDefined();
    expect(emailStyles.divider).toBeDefined();
    expect(emailStyles.alert).toBeDefined();
    expect(emailStyles.alertText).toBeDefined();
    expect(emailStyles.success).toBeDefined();
    expect(emailStyles.successText).toBeDefined();
  });

  it("should use primary blue color", () => {
    expect(emailStyles.logo.color).toBe("#3b82f6");
    expect(emailStyles.link.color).toBe("#3b82f6");
    expect(emailStyles.button.backgroundColor).toBe("#3b82f6");
  });

  it("should have proper button styles", () => {
    expect(emailStyles.button.backgroundColor).toBe("#3b82f6");
    expect(emailStyles.button.color).toBe("#ffffff");
    expect(emailStyles.button.textDecoration).toBe("none");
    expect(emailStyles.button.fontWeight).toBe("bold");
  });

  it("should have alert and success styles", () => {
    expect(emailStyles.alert.backgroundColor).toBe("#fef2f2");
    expect(emailStyles.alertText.color).toBe("#991b1b");
    expect(emailStyles.success.backgroundColor).toBe("#f0fdf4");
    expect(emailStyles.successText.color).toBe("#166534");
  });
});
