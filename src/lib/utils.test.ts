import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle conditional classes", () => {
    const result = cn("base-class", true && "conditional-true", false && "conditional-false");
    expect(result).toBe("base-class conditional-true");
  });

  it("should handle array of classes", () => {
    const result = cn(["class1", "class2"], "class3");
    expect(result).toBe("class1 class2 class3");
  });

  it("should handle objects with boolean values", () => {
    const result = cn({
      "class1": true,
      "class2": false,
      "class3": true,
    });
    expect(result).toBe("class1 class3");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle undefined and null values", () => {
    const result = cn("class1", undefined, null, "class2");
    expect(result).toBe("class1 class2");
  });

  it("should merge Tailwind classes with conflicts", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("should handle complex class merging", () => {
    const result = cn(
      "px-2 py-1 bg-red hover:bg-dark-red",
      "p-3 bg-[#B91C1C]",
    );
    expect(result).toBe("hover:bg-dark-red p-3 bg-[#B91C1C]");
  });
});
