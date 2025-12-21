import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMounted } from "./useMounted";

describe("useMounted", () => {
  it("should return true after the component has mounted", () => {
    const { result } = renderHook(() => useMounted());

    // After renderHook completes, useEffect has run, so mounted is true
    expect(result.current).toBe(true);
  });

  it("should maintain true value across rerenders", () => {
    const { result, rerender } = renderHook(() => useMounted());

    expect(result.current).toBe(true);

    rerender();

    expect(result.current).toBe(true);
  });
});
