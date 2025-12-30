import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONSENT_CHANGED_EVENT, CONSENT_KEY } from "@/lib/tracking/consent";

import { CookieConsent } from "./CookieConsent";

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

    it("should dispatch consent-changed event when auto-accepting", () => {
      const eventHandler = vi.fn();
      window.addEventListener(CONSENT_CHANGED_EVENT, eventHandler);

      render(<CookieConsent />);

      expect(eventHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener(CONSENT_CHANGED_EVENT, eventHandler);
    });

    it("should not dispatch event when consent already stored", () => {
      localStorage.setItem(CONSENT_KEY, "accepted");
      const eventHandler = vi.fn();
      window.addEventListener(CONSENT_CHANGED_EVENT, eventHandler);

      render(<CookieConsent />);

      expect(eventHandler).not.toHaveBeenCalled();

      window.removeEventListener(CONSENT_CHANGED_EVENT, eventHandler);
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

      it("should dispatch consent-changed event when Accept is clicked", async () => {
        const user = userEvent.setup();
        const eventHandler = vi.fn();
        window.addEventListener(CONSENT_CHANGED_EVENT, eventHandler);

        render(<CookieConsent />);
        await user.click(screen.getByRole("button", { name: "Accept" }));

        expect(eventHandler).toHaveBeenCalledTimes(1);

        window.removeEventListener(CONSENT_CHANGED_EVENT, eventHandler);
      });

      it("should dispatch consent-changed event when Decline is clicked", async () => {
        const user = userEvent.setup();
        const eventHandler = vi.fn();
        window.addEventListener(CONSENT_CHANGED_EVENT, eventHandler);

        render(<CookieConsent />);
        await user.click(screen.getByRole("button", { name: "Decline" }));

        expect(eventHandler).toHaveBeenCalledTimes(1);

        window.removeEventListener(CONSENT_CHANGED_EVENT, eventHandler);
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
