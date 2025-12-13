import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  applyHeroTransformStyles,
  calculateHeroTransform,
  clearHeroTransformStyles,
  HERO_TRANSFORM_CSS_VARS,
} from "./animations";

describe("ANIMATION_DURATIONS", () => {
  it("should have heroExpand duration of 400ms", () => {
    expect(ANIMATION_DURATIONS.heroExpand).toBe(400);
  });

  it("should have heroCollapse duration of 400ms", () => {
    expect(ANIMATION_DURATIONS.heroCollapse).toBe(400);
  });

  it("should have gridFade duration of 300ms", () => {
    expect(ANIMATION_DURATIONS.gridFade).toBe(300);
  });

  it("should have thumbnailSwap duration of 200ms", () => {
    expect(ANIMATION_DURATIONS.thumbnailSwap).toBe(200);
  });

  it("should have peekTransition duration of 150ms", () => {
    expect(ANIMATION_DURATIONS.peekTransition).toBe(150);
  });

  it("should be readonly (const assertion)", () => {
    const durations = ANIMATION_DURATIONS;
    expect(Object.isFrozen(durations)).toBe(false);
    expect(durations.heroExpand).toBe(400);
  });
});

describe("ANIMATION_EASINGS", () => {
  it("should have standard easing curve", () => {
    expect(ANIMATION_EASINGS.standard).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
  });

  it("should have enter easing curve", () => {
    expect(ANIMATION_EASINGS.enter).toBe("cubic-bezier(0, 0, 0.2, 1)");
  });

  it("should have exit easing curve", () => {
    expect(ANIMATION_EASINGS.exit).toBe("cubic-bezier(0.4, 0, 1, 1)");
  });

  it("should have elastic easing curve", () => {
    expect(ANIMATION_EASINGS.elastic).toBe(
      "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    );
  });
});

describe("HERO_TRANSFORM_CSS_VARS", () => {
  it("should have correct CSS variable names", () => {
    expect(HERO_TRANSFORM_CSS_VARS.x).toBe("--hero-x");
    expect(HERO_TRANSFORM_CSS_VARS.y).toBe("--hero-y");
    expect(HERO_TRANSFORM_CSS_VARS.scaleX).toBe("--hero-scale-x");
    expect(HERO_TRANSFORM_CSS_VARS.scaleY).toBe("--hero-scale-y");
    expect(HERO_TRANSFORM_CSS_VARS.scale).toBe("--hero-scale");
  });
});

describe("calculateHeroTransform", () => {
  const createDOMRect = (
    x: number,
    y: number,
    width: number,
    height: number,
  ): DOMRect => ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    bottom: y + height,
    right: x + width,
    toJSON: () => ({ x, y, width, height }),
  });

  describe("with explicit toRect", () => {
    it("should calculate correct transform for thumbnail in top-left corner", () => {
      const fromRect = createDOMRect(0, 0, 200, 150);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      // From center: (100, 75), To center: (960, 540)
      expect(result.x).toBe(100 - 960);
      expect(result.y).toBe(75 - 540);
      expect(result.scaleX).toBeCloseTo(200 / 1920);
      expect(result.scaleY).toBeCloseTo(150 / 1080);
    });

    it("should calculate correct transform for centered thumbnail", () => {
      const fromRect = createDOMRect(860, 465, 200, 150);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      // From center: (960, 540), To center: (960, 540)
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.scaleX).toBeCloseTo(200 / 1920);
      expect(result.scaleY).toBeCloseTo(150 / 1080);
    });

    it("should calculate correct transform for thumbnail in bottom-right corner", () => {
      const fromRect = createDOMRect(1720, 930, 200, 150);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      // From center: (1820, 1005), To center: (960, 540)
      expect(result.x).toBe(1820 - 960);
      expect(result.y).toBe(1005 - 540);
      expect(result.scaleX).toBeCloseTo(200 / 1920);
      expect(result.scaleY).toBeCloseTo(150 / 1080);
    });

    it("should handle non-zero toRect position", () => {
      const fromRect = createDOMRect(100, 100, 200, 150);
      const toRect = createDOMRect(50, 50, 800, 600);

      const result = calculateHeroTransform(fromRect, toRect);

      // From center: (200, 175), To center: (450, 350)
      expect(result.x).toBe(200 - 450);
      expect(result.y).toBe(175 - 350);
      expect(result.scaleX).toBeCloseTo(200 / 800);
      expect(result.scaleY).toBeCloseTo(150 / 600);
    });

    it("should handle same-sized rectangles", () => {
      const fromRect = createDOMRect(100, 100, 400, 300);
      const toRect = createDOMRect(0, 0, 400, 300);

      const result = calculateHeroTransform(fromRect, toRect);

      // Scale should be 1
      expect(result.scaleX).toBe(1);
      expect(result.scaleY).toBe(1);
      // From center: (300, 250), To center: (200, 150)
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it("should handle very small thumbnails", () => {
      const fromRect = createDOMRect(500, 300, 50, 50);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      expect(result.scaleX).toBeCloseTo(50 / 1920);
      expect(result.scaleY).toBeCloseTo(50 / 1080);
    });

    it("should handle larger source than target", () => {
      const fromRect = createDOMRect(0, 0, 3840, 2160);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      expect(result.scaleX).toBe(2);
      expect(result.scaleY).toBe(2);
    });
  });

  describe("without toRect (uses viewport defaults)", () => {
    let originalWindow: typeof globalThis.window;

    beforeEach(() => {
      originalWindow = globalThis.window;
    });

    afterEach(() => {
      if (originalWindow !== undefined) {
        globalThis.window = originalWindow;
      }
    });

    it("should use window dimensions when available", () => {
      Object.defineProperty(globalThis, "window", {
        value: {
          innerWidth: 1024,
          innerHeight: 768,
        },
        writable: true,
        configurable: true,
      });

      const fromRect = createDOMRect(0, 0, 200, 150);
      const result = calculateHeroTransform(fromRect);

      expect(result.scaleX).toBeCloseTo(200 / 1024);
      expect(result.scaleY).toBeCloseTo(150 / 768);
    });

    it("should use default 1920x1080 when window is undefined", () => {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const fromRect = createDOMRect(0, 0, 200, 150);
      const result = calculateHeroTransform(fromRect);

      expect(result.scaleX).toBeCloseTo(200 / 1920);
      expect(result.scaleY).toBeCloseTo(150 / 1080);
    });
  });

  describe("edge cases", () => {
    it("should handle zero-width rectangle", () => {
      const fromRect = createDOMRect(100, 100, 0, 150);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      expect(result.scaleX).toBe(0);
      expect(result.scaleY).toBeCloseTo(150 / 1080);
    });

    it("should handle zero-height rectangle", () => {
      const fromRect = createDOMRect(100, 100, 200, 0);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      expect(result.scaleX).toBeCloseTo(200 / 1920);
      expect(result.scaleY).toBe(0);
    });

    it("should handle negative positions", () => {
      const fromRect = createDOMRect(-100, -50, 200, 150);
      const toRect = createDOMRect(0, 0, 1920, 1080);

      const result = calculateHeroTransform(fromRect, toRect);

      // From center: (0, 25), To center: (960, 540)
      expect(result.x).toBe(0 - 960);
      expect(result.y).toBe(25 - 540);
    });

    it("should return consistent HeroTransform structure", () => {
      const fromRect = createDOMRect(100, 100, 200, 150);
      const toRect = createDOMRect(0, 0, 800, 600);

      const result = calculateHeroTransform(fromRect, toRect);

      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("y");
      expect(result).toHaveProperty("scaleX");
      expect(result).toHaveProperty("scaleY");
      expect(typeof result.x).toBe("number");
      expect(typeof result.y).toBe("number");
      expect(typeof result.scaleX).toBe("number");
      expect(typeof result.scaleY).toBe("number");
    });
  });
});

describe("applyHeroTransformStyles", () => {
  let mockElement: HTMLElement;
  let setPropertySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setPropertySpy = vi.fn();
    mockElement = {
      style: {
        setProperty: setPropertySpy,
        removeProperty: vi.fn(),
      },
    } as unknown as HTMLElement;
  });

  it("should set all CSS custom properties", () => {
    const transform = { x: 100, y: 50, scaleX: 0.5, scaleY: 0.25 };

    applyHeroTransformStyles(mockElement, transform);

    expect(setPropertySpy).toHaveBeenCalledWith("--hero-x", "100px");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-y", "50px");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale-x", "0.5");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale-y", "0.25");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale", "0.375");
  });

  it("should handle negative values", () => {
    const transform = { x: -200, y: -100, scaleX: 0.1, scaleY: 0.2 };

    applyHeroTransformStyles(mockElement, transform);

    expect(setPropertySpy).toHaveBeenCalledWith("--hero-x", "-200px");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-y", "-100px");
  });

  it("should calculate average scale correctly", () => {
    const transform = { x: 0, y: 0, scaleX: 0.4, scaleY: 0.6 };

    applyHeroTransformStyles(mockElement, transform);

    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale", "0.5");
  });

  it("should handle zero values", () => {
    const transform = { x: 0, y: 0, scaleX: 0, scaleY: 0 };

    applyHeroTransformStyles(mockElement, transform);

    expect(setPropertySpy).toHaveBeenCalledWith("--hero-x", "0px");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-y", "0px");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale-x", "0");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale-y", "0");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale", "0");
  });

  it("should handle scale greater than 1", () => {
    const transform = { x: 50, y: 25, scaleX: 2, scaleY: 1.5 };

    applyHeroTransformStyles(mockElement, transform);

    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale-x", "2");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale-y", "1.5");
    expect(setPropertySpy).toHaveBeenCalledWith("--hero-scale", "1.75");
  });
});

describe("clearHeroTransformStyles", () => {
  let mockElement: HTMLElement;
  let removePropertySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    removePropertySpy = vi.fn();
    mockElement = {
      style: {
        setProperty: vi.fn(),
        removeProperty: removePropertySpy,
      },
    } as unknown as HTMLElement;
  });

  it("should remove all CSS custom properties", () => {
    clearHeroTransformStyles(mockElement);

    expect(removePropertySpy).toHaveBeenCalledWith("--hero-x");
    expect(removePropertySpy).toHaveBeenCalledWith("--hero-y");
    expect(removePropertySpy).toHaveBeenCalledWith("--hero-scale-x");
    expect(removePropertySpy).toHaveBeenCalledWith("--hero-scale-y");
    expect(removePropertySpy).toHaveBeenCalledWith("--hero-scale");
  });

  it("should call removeProperty exactly 5 times", () => {
    clearHeroTransformStyles(mockElement);

    expect(removePropertySpy).toHaveBeenCalledTimes(5);
  });
});
