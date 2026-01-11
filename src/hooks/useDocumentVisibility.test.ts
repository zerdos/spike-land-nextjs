import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDocumentVisibility } from "./useDocumentVisibility";

describe("useDocumentVisibility", () => {
  it("returns true by default (jsdom default is visible)", () => {
    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);
  });

  it("updates when visibility changes", () => {
    const { result } = renderHook(() => useDocumentVisibility());

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current).toBe(true);
  });
});
