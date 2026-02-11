"use client";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAutoResizeTextarea } from "./useAutoResizeTextarea";

describe("useAutoResizeTextarea", () => {
  it("initializes with default min/max heights", () => {
    const { result } = renderHook(() => useAutoResizeTextarea());

    expect(result.current.textareaRef).toBeDefined();
    expect(typeof result.current.resize).toBe("function");
  });

  it("accepts custom min/max options", () => {
    const { result } = renderHook(() =>
      useAutoResizeTextarea({ minHeight: 40, maxHeight: 400 }),
    );

    expect(result.current.textareaRef).toBeDefined();
    expect(typeof result.current.resize).toBe("function");
  });

  it("resize() adjusts height based on scrollHeight", () => {
    const { result } = renderHook(() => useAutoResizeTextarea());

    // Simulate attaching a textarea element
    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", { value: 120, configurable: true });

    // Assign the ref
    Object.defineProperty(result.current.textareaRef, "current", {
      value: textarea,
      writable: true,
    });

    act(() => {
      result.current.resize();
    });

    expect(textarea.style.height).toBe("120px");
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("clamps height to minHeight when scrollHeight is smaller", () => {
    const { result } = renderHook(() =>
      useAutoResizeTextarea({ minHeight: 84, maxHeight: 224 }),
    );

    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", { value: 30, configurable: true });

    Object.defineProperty(result.current.textareaRef, "current", {
      value: textarea,
      writable: true,
    });

    act(() => {
      result.current.resize();
    });

    expect(textarea.style.height).toBe("84px");
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("clamps height to maxHeight when scrollHeight exceeds it", () => {
    const { result } = renderHook(() =>
      useAutoResizeTextarea({ minHeight: 84, maxHeight: 224 }),
    );

    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", { value: 500, configurable: true });

    Object.defineProperty(result.current.textareaRef, "current", {
      value: textarea,
      writable: true,
    });

    act(() => {
      result.current.resize();
    });

    expect(textarea.style.height).toBe("224px");
  });

  it("sets overflowY to auto when content exceeds maxHeight", () => {
    const { result } = renderHook(() =>
      useAutoResizeTextarea({ minHeight: 84, maxHeight: 224 }),
    );

    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", { value: 300, configurable: true });

    Object.defineProperty(result.current.textareaRef, "current", {
      value: textarea,
      writable: true,
    });

    act(() => {
      result.current.resize();
    });

    expect(textarea.style.overflowY).toBe("auto");
  });

  it("sets overflowY to hidden when content fits within maxHeight", () => {
    const { result } = renderHook(() =>
      useAutoResizeTextarea({ minHeight: 84, maxHeight: 224 }),
    );

    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", { value: 150, configurable: true });

    Object.defineProperty(result.current.textareaRef, "current", {
      value: textarea,
      writable: true,
    });

    act(() => {
      result.current.resize();
    });

    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("does nothing when textareaRef.current is null", () => {
    const { result } = renderHook(() => useAutoResizeTextarea());

    // resize should not throw when ref is null
    act(() => {
      result.current.resize();
    });

    expect(result.current.textareaRef.current).toBeNull();
  });

  it("resets height to auto before measuring", () => {
    const { result } = renderHook(() => useAutoResizeTextarea());

    const textarea = document.createElement("textarea");
    textarea.style.height = "999px";
    Object.defineProperty(textarea, "scrollHeight", { value: 120, configurable: true });

    Object.defineProperty(result.current.textareaRef, "current", {
      value: textarea,
      writable: true,
    });

    act(() => {
      result.current.resize();
    });

    // Final height should be based on scrollHeight, not the previous value
    expect(textarea.style.height).toBe("120px");
  });
});
