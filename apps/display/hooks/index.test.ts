import { describe, expect, it } from "vitest";
import { useMediaStream, usePeer, usePeerConnection } from "./index";

describe("hooks/index barrel exports", () => {
  it("should export usePeer", () => {
    expect(usePeer).toBeDefined();
    expect(typeof usePeer).toBe("function");
  });

  it("should export useMediaStream", () => {
    expect(useMediaStream).toBeDefined();
    expect(typeof useMediaStream).toBe("function");
  });

  it("should export usePeerConnection", () => {
    expect(usePeerConnection).toBeDefined();
    expect(typeof usePeerConnection).toBe("function");
  });
});
