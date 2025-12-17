/**
 * Meta Pixel Component Tests
 *
 * Tests for the Meta Pixel tracking component.
 */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/script
vi.mock("next/script", () => ({
  default: ({ id, children, dangerouslySetInnerHTML, ...props }: {
    id?: string;
    children?: React.ReactNode;
    dangerouslySetInnerHTML?: { __html: string; };
    strategy?: string;
  }) => (
    <script
      id={id}
      data-testid={id}
      data-strategy={props.strategy}
      dangerouslySetInnerHTML={dangerouslySetInnerHTML}
    >
      {children}
    </script>
  ),
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
});
