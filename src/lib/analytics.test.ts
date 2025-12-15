import { track } from "@vercel/analytics";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analytics, trackEvent } from "./analytics";

vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

describe("analytics", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("trackEvent", () => {
    it("should not track events when consent is not given", () => {
      trackEvent("wizard_started");
      expect(track).not.toHaveBeenCalled();
    });

    it("should not track events when consent is declined", () => {
      localStorage.setItem("cookie-consent", "declined");
      trackEvent("wizard_started");
      expect(track).not.toHaveBeenCalled();
    });

    it("should track events when consent is accepted", () => {
      localStorage.setItem("cookie-consent", "accepted");
      trackEvent("wizard_started", { userId: "123" });
      expect(track).toHaveBeenCalledWith("wizard_started", { userId: "123" });
    });

    it("should track events without properties", () => {
      localStorage.setItem("cookie-consent", "accepted");
      trackEvent("logout");
      expect(track).toHaveBeenCalledWith("logout", undefined);
    });

    it("should not track on server side", () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing server-side behavior
      delete global.window;

      trackEvent("wizard_started");
      expect(track).not.toHaveBeenCalled();

      global.window = originalWindow;
    });
  });

  describe("analytics.wizard", () => {
    beforeEach(() => {
      localStorage.setItem("cookie-consent", "accepted");
    });

    it("should track wizard started event", () => {
      analytics.wizard.started({ source: "homepage" });
      expect(track).toHaveBeenCalledWith("wizard_started", {
        source: "homepage",
      });
    });

    it("should track wizard step completed event", () => {
      analytics.wizard.stepCompleted(2, { stepName: "configuration" });
      expect(track).toHaveBeenCalledWith("wizard_step_completed", {
        step: 2,
        stepName: "configuration",
      });
    });

    it("should track wizard abandoned event", () => {
      analytics.wizard.abandoned(3, { reason: "timeout" });
      expect(track).toHaveBeenCalledWith("wizard_abandoned", {
        step: 3,
        reason: "timeout",
      });
    });

    it("should track wizard completed event", () => {
      analytics.wizard.completed({ duration: 120 });
      expect(track).toHaveBeenCalledWith("wizard_completed", { duration: 120 });
    });
  });

  describe("analytics.auth", () => {
    beforeEach(() => {
      localStorage.setItem("cookie-consent", "accepted");
    });

    it("should track login started event", () => {
      analytics.auth.loginStarted("github");
      expect(track).toHaveBeenCalledWith("login_started", {
        provider: "github",
      });
    });

    it("should track login started without provider", () => {
      analytics.auth.loginStarted();
      expect(track).toHaveBeenCalledWith("login_started", {
        provider: undefined,
      });
    });

    it("should track login completed event", () => {
      analytics.auth.loginCompleted("google");
      expect(track).toHaveBeenCalledWith("login_completed", {
        provider: "google",
      });
    });

    it("should track logout event", () => {
      analytics.auth.logout();
      expect(track).toHaveBeenCalledWith("logout", undefined);
    });
  });

  describe("analytics.app", () => {
    beforeEach(() => {
      localStorage.setItem("cookie-consent", "accepted");
    });

    it("should track app viewed event", () => {
      analytics.app.viewed("app-123");
      expect(track).toHaveBeenCalledWith("app_viewed", { appId: "app-123" });
    });

    it("should track app created event", () => {
      analytics.app.created("app-456");
      expect(track).toHaveBeenCalledWith("app_created", { appId: "app-456" });
    });

    it("should track app edited event", () => {
      analytics.app.edited("app-789");
      expect(track).toHaveBeenCalledWith("app_edited", { appId: "app-789" });
    });

    it("should track app deleted event", () => {
      analytics.app.deleted("app-000");
      expect(track).toHaveBeenCalledWith("app_deleted", { appId: "app-000" });
    });

    it("should track app forked event", () => {
      analytics.app.forked("app-original", "app-fork");
      expect(track).toHaveBeenCalledWith("app_forked", {
        originalAppId: "app-original",
        newAppId: "app-fork",
      });
    });
  });

  describe("analytics.error", () => {
    beforeEach(() => {
      localStorage.setItem("cookie-consent", "accepted");
    });

    it("should track error occurred event", () => {
      analytics.error.occurred("Network error", "api-call");
      expect(track).toHaveBeenCalledWith("error_occurred", {
        error: "Network error",
        context: "api-call",
      });
    });

    it("should track error occurred without context", () => {
      analytics.error.occurred("Unexpected error");
      expect(track).toHaveBeenCalledWith("error_occurred", {
        error: "Unexpected error",
        context: undefined,
      });
    });

    it("should track validation failed event", () => {
      analytics.error.validationFailed("email", "Invalid format");
      expect(track).toHaveBeenCalledWith("validation_failed", {
        field: "email",
        reason: "Invalid format",
      });
    });

    it("should track validation failed without reason", () => {
      analytics.error.validationFailed("password");
      expect(track).toHaveBeenCalledWith("validation_failed", {
        field: "password",
        reason: undefined,
      });
    });
  });
});
