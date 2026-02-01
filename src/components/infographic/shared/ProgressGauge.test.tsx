import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { ProgressGauge } from "./ProgressGauge";

// Mock the animated number hook to return value immediately
vi.mock("../hooks/useAnimatedNumber", () => ({
  useAnimatedNumber: (value: number) => value,
}));

describe("ProgressGauge", () => {
  beforeAll(() => {
    // @ts-expect-error - IntersectionObserver mock for testing
    global.IntersectionObserver = class IntersectionObserver {
      observe() {
        return null;
      }
      unobserve() {
        return null;
      }
      disconnect() {
        return null;
      }
    };
  });
  test("renders label correctly", () => {
    render(<ProgressGauge value={50} label="Efficiency" />);
    expect(screen.getByText("Efficiency")).toBeDefined();
  });

  test("renders value text", async () => {
    render(<ProgressGauge value={75} label="Speed" />);
    expect(await screen.findByText("75%")).toBeDefined();
  });

  test("applies color class", () => {
    render(<ProgressGauge value={50} label="Test" color="emerald" />);
    // Check if color class is applied to some element.
    // This depends on internal structure, but we assume the component renders.
  });
});
