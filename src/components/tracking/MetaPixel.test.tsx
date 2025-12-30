/**
 * Meta Pixel Component Tests
 *
 * Tests for the Meta Pixel tracking component.
 */

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hasConsent } from "@/lib/tracking/consent";

// Mock next/script
vi.mock("next/script", () => ({
  default: ({ id, children, dangerouslySetInnerHTML, nonce, ...props }: {
    id?: string;
    children?: React.ReactNode;
    dangerouslySetInnerHTML?: { __html: string; };
    strategy?: string;
    nonce?: string;
  }) => (
    <script
      id={id}
      data-testid={id}
      data-strategy={props.strategy}
      nonce={nonce}
      dangerouslySetInnerHTML={dangerouslySetInnerHTML}
    >
      {children}
    </script>
  ),
}));

// Mock consent module
vi.mock("@/lib/tracking/consent", () => ({
  hasConsent: vi.fn().mockReturnValue(true),
  CONSENT_KEY: "cookie-consent",
  CONSENT_CHANGED_EVENT: "consent-changed",
}));

describe("MetaPixel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("when NEXT_PUBLIC_META_PIXEL_ID is not set", () => {
    it("should render nothing", async () => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "";

      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      expect(container.innerHTML).toBe("");
    });

    it("should render nothing when env var is undefined", async () => {
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;

      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      expect(container.innerHTML).toBe("");
    });
  });

  describe("when NEXT_PUBLIC_META_PIXEL_ID is set", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890123456";
    });

    it("should render script tag", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script).toBeInTheDocument();
    });

    it("should include pixel initialization code", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script?.innerHTML).toContain("fbq('init'");
      expect(script?.innerHTML).toContain("1234567890123456");
    });

    it("should include PageView tracking", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script?.innerHTML).toContain("fbq('track', 'PageView')");
    });

    it("should include Facebook events.js script", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script?.innerHTML).toContain(
        "https://connect.facebook.net/en_US/fbevents.js",
      );
    });

    it("should render noscript fallback", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const noscript = container.querySelector("noscript");
      expect(noscript).toBeInTheDocument();
    });

    // Note: noscript innerHTML is not accessible in jsdom/React testing
    // The noscript content is validated by rendering in a real browser
    // The component code correctly includes the tracking image with:
    // - src with pixel ID, PageView event, and noscript=1 param
    // - 1x1 dimensions
    // - display: none style
    // - empty alt attribute

    it("should use afterInteractive strategy", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script).toHaveAttribute("data-strategy", "afterInteractive");
    });
  });

  describe("with different pixel IDs", () => {
    it("should use the correct pixel ID in script", async () => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "9876543210987654";

      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script?.innerHTML).toContain("9876543210987654");
    });
  });

  describe("with nonce prop", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890123456";
    });

    it("should apply nonce attribute to script tag", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const testNonce = "test-nonce-value";
      const { container } = render(<MetaPixel nonce={testNonce} />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script).toHaveAttribute("nonce", testNonce);
    });

    it("should work without nonce prop", async () => {
      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      const script = container.querySelector('script[id="meta-pixel"]');
      expect(script).toBeInTheDocument();
      expect(script).not.toHaveAttribute("nonce");
    });
  });

  describe("reactive consent listening", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890123456";
    });

    describe("same-tab consent changes (custom event)", () => {
      it("should render pixel when consent is granted after mount", async () => {
        vi.mocked(hasConsent).mockReturnValue(false);

        const { MetaPixel } = await import("./MetaPixel");
        const { container, rerender } = render(<MetaPixel />);

        // Initially no script
        expect(
          container.querySelector('script[id="meta-pixel"]'),
        ).not.toBeInTheDocument();

        // Simulate consent being granted
        vi.mocked(hasConsent).mockReturnValue(true);

        await act(async () => {
          window.dispatchEvent(new CustomEvent("consent-changed"));
        });

        rerender(<MetaPixel />);
        expect(
          container.querySelector('script[id="meta-pixel"]'),
        ).toBeInTheDocument();
      });

      it("should hide pixel when consent is revoked", async () => {
        vi.mocked(hasConsent).mockReturnValue(true);

        const { MetaPixel } = await import("./MetaPixel");
        const { container, rerender } = render(<MetaPixel />);

        // Initially renders
        expect(
          container.querySelector('script[id="meta-pixel"]'),
        ).toBeInTheDocument();

        // Simulate consent being revoked
        vi.mocked(hasConsent).mockReturnValue(false);

        await act(async () => {
          window.dispatchEvent(new CustomEvent("consent-changed"));
        });

        rerender(<MetaPixel />);
        expect(
          container.querySelector('script[id="meta-pixel"]'),
        ).not.toBeInTheDocument();
      });
    });

    describe("cross-tab consent changes (storage event)", () => {
      it("should sync consent when storage event is fired", async () => {
        vi.mocked(hasConsent).mockReturnValue(false);

        const { MetaPixel } = await import("./MetaPixel");
        const { container, rerender } = render(<MetaPixel />);

        expect(
          container.querySelector('script[id="meta-pixel"]'),
        ).not.toBeInTheDocument();

        // Simulate cross-tab consent change
        vi.mocked(hasConsent).mockReturnValue(true);

        await act(async () => {
          const storageEvent = new StorageEvent("storage", {
            key: "cookie-consent",
            newValue: "accepted",
            oldValue: null,
            storageArea: localStorage,
          });
          window.dispatchEvent(storageEvent);
        });

        rerender(<MetaPixel />);
        expect(
          container.querySelector('script[id="meta-pixel"]'),
        ).toBeInTheDocument();
      });

      it("should ignore storage events for different keys", async () => {
        vi.mocked(hasConsent).mockReturnValue(false);

        const { MetaPixel } = await import("./MetaPixel");
        const { container } = render(<MetaPixel />);

        await act(async () => {
          const storageEvent = new StorageEvent("storage", {
            key: "other-key",
            newValue: "some-value",
            storageArea: localStorage,
          });
          window.dispatchEvent(storageEvent);
        });

        // Should still not render since hasConsent is still false
        expect(
          container.querySelector('script[id="meta-pixel"]'),
        ).not.toBeInTheDocument();
      });
    });

    describe("cleanup", () => {
      it("should clean up event listeners on unmount", async () => {
        const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

        const { MetaPixel } = await import("./MetaPixel");
        const { unmount } = render(<MetaPixel />);

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          "consent-changed",
          expect.any(Function),
        );
        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          "storage",
          expect.any(Function),
        );

        removeEventListenerSpy.mockRestore();
      });
    });
  });

  describe("consent not given", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890123456";
    });

    it("should not render when consent is not given", async () => {
      vi.mocked(hasConsent).mockReturnValue(false);

      const { MetaPixel } = await import("./MetaPixel");
      const { container } = render(<MetaPixel />);

      expect(container.innerHTML).toBe("");
    });
  });
});
