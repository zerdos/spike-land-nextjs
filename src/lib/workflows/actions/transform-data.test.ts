import { describe, it, expect } from "vitest";
import { transformDataAction } from "./transform-data";

describe("transformDataAction", () => {
  it("should pick keys from an object", async () => {
    const result = await transformDataAction.execute({
      data: { a: 1, b: 2, c: 3 },
      transformation: "pick",
      config: ["a", "c"],
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ a: 1, c: 3 });
  });

  it("should omit keys from an object", async () => {
    const result = await transformDataAction.execute({
      data: { a: 1, b: 2, c: 3 },
      transformation: "omit",
      config: ["b"],
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ a: 1, c: 3 });
  });

  it("should filter an array", async () => {
    const result = await transformDataAction.execute({
      data: [
        { id: 1, status: "active" },
        { id: 2, status: "inactive" },
        { id: 3, status: "active" },
      ],
      transformation: "filter",
      config: { key: "status", value: "active" },
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual([
      { id: 1, status: "active" },
      { id: 3, status: "active" },
    ]);
  });

  it("should map an array", async () => {
      const result = await transformDataAction.execute({
        data: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
        transformation: "map",
        config: "name",
      });

      expect(result.success).toBe(true);
      expect(result.result).toEqual(["Alice", "Bob"]);
    });
});
