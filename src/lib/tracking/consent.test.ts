import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_CHANGED_EVENT,
  CONSENT_KEY,
  hasConsent,
  notifyConsentChanged,
  resetConsentCache,
} from "./consent";

describe("consent", () => {
  beforeEach(() => {
    localStorage.clear();
    resetConsentCache();
  });

  afterEach(() => {
    localStorage.clear();
    resetConsentCache();
  });

  describe("constants", () => {
    it("should export CONSENT_KEY as cookie-consent", () => {
      expect(CONSENT_KEY).toBe("cookie-consent");
    });

    it("should export CONSENT_CHANGED_EVENT as consent-changed", () => {
      expect(CONSENT_CHANGED_EVENT).toBe("consent-changed");
    });
  });

  describe("hasConsent", () => {
    it("should return false when no consent stored", () => {
      expect(hasConsent()).toBe(false);
    });

    it("should return true when consent is accepted", () => {
      localStorage.setItem(CONSENT_KEY, "accepted");
      expect(hasConsent()).toBe(true);
    });

    it("should return false when consent is declined", () => {
      localStorage.setItem(CONSENT_KEY, "declined");
      expect(hasConsent()).toBe(false);
    });

    it("should return false for invalid consent value", () => {
      localStorage.setItem(CONSENT_KEY, "invalid");
      expect(hasConsent()).toBe(false);
    });
  });

  describe("caching", () => {
    it("should cache the result", () => {
      // Setup initial state
      localStorage.setItem(CONSENT_KEY, "accepted");
      expect(hasConsent()).toBe(true);

      // Directly modify localStorage (simulating external change without notification)
      localStorage.setItem(CONSENT_KEY, "declined");

      // Should still return true due to cache
      expect(hasConsent()).toBe(true);
    });

    it("should update cache when notifyConsentChanged is called", () => {
      // Setup initial state
      localStorage.setItem(CONSENT_KEY, "accepted");
      expect(hasConsent()).toBe(true);

      // Modify localStorage
      localStorage.setItem(CONSENT_KEY, "declined");

      // Notify change
      notifyConsentChanged();

      // Should now return false
      expect(hasConsent()).toBe(false);
    });

    it("should clear cache when resetConsentCache is called", () => {
      // Setup initial state
      localStorage.setItem(CONSENT_KEY, "accepted");
      expect(hasConsent()).toBe(true);

      // Modify localStorage
      localStorage.setItem(CONSENT_KEY, "declined");

      // Reset cache
      resetConsentCache();

      // Should check localStorage again
      expect(hasConsent()).toBe(false);
    });
  });

  describe("notifyConsentChanged", () => {
    it("should dispatch consent-changed custom event", () => {
      const eventHandler = vi.fn();
      window.addEventListener(CONSENT_CHANGED_EVENT, eventHandler);

      notifyConsentChanged();

      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith(expect.any(CustomEvent));

      window.removeEventListener(CONSENT_CHANGED_EVENT, eventHandler);
    });

    it("should not throw on repeated calls", () => {
      expect(() => {
        notifyConsentChanged();
        notifyConsentChanged();
        notifyConsentChanged();
      }).not.toThrow();
    });
  });
});
