import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CookieConsent } from "./CookieConsent";

const CONSENT_KEY = "cookie-consent";

describe("CookieConsent", () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore NODE_ENV
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  describe("development mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("should auto-accept and not show banner in development mode", () => {
      render(<CookieConsent />);

      // Banner should not be visible
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Should have set localStorage to accepted
      expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
    });

    it("should not overwrite existing consent in development mode", () => {
      localStorage.setItem(CONSENT_KEY, "declined");
      render(<CookieConsent />);

      // Should not overwrite existing preference
      expect(localStorage.getItem(CONSENT_KEY)).toBe("declined");
    });
  });

  describe("production mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("should show banner when no consent is stored", () => {
      render(<CookieConsent />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Cookie Preferences")).toBeInTheDocument();
    });

    it("should not show banner when consent is already accepted", () => {
      localStorage.setItem(CONSENT_KEY, "accepted");
      render(<CookieConsent />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should not show banner when consent is already declined", () => {
      localStorage.setItem(CONSENT_KEY, "declined");
      render(<CookieConsent />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should have accessible structure", () => {
      render(<CookieConsent />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "cookie-consent-title");
      expect(dialog).toHaveAttribute(
        "aria-describedby",
        "cookie-consent-description",
      );
    });

    it("should have Accept and Decline buttons", () => {
      render(<CookieConsent />);

      expect(
        screen.getByRole("button", { name: "Accept" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Decline" }),
      ).toBeInTheDocument();
    });

    it("should have link to cookie policy", () => {
      render(<CookieConsent />);

      const link = screen.getByRole("link", { name: "Learn more" });
      expect(link).toHaveAttribute("href", "/cookies");
    });

    describe("user interactions", () => {
      it("should store acceptance and hide banner when Accept is clicked", async () => {
        const user = userEvent.setup();
        render(<CookieConsent />);

        await user.click(screen.getByRole("button", { name: "Accept" }));

        expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      it("should store decline and hide banner when Decline is clicked", async () => {
        const user = userEvent.setup();
        render(<CookieConsent />);

        await user.click(screen.getByRole("button", { name: "Decline" }));

        expect(localStorage.getItem(CONSENT_KEY)).toBe("declined");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("test mode (default)", () => {
    // In test mode (NODE_ENV=test), it should behave like production
    it("should show banner when no consent is stored", () => {
      render(<CookieConsent />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
