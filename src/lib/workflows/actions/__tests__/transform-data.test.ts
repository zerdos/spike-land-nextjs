import { describe, it, expect } from "vitest";
import { transformDataAction } from "../transform-data";

describe("transformDataAction", () => {
  it("should extract a property from an object", async () => {
    const input = {
      data: { user: { name: "John", age: 30 } },
      transformation: "user.name",
      type: "extract" as const,
    };

    const result = await transformDataAction.execute(input);
    expect(result.success).toBe(true);
    expect(result.result).toBe("John");
  });

  it("should return undefined for missing property", async () => {
    const input = {
      data: { user: { name: "John" } },
      transformation: "user.age",
      type: "extract" as const,
    };

    const result = await transformDataAction.execute(input);
    expect(result.success).toBe(true);
    expect(result.result).toBeUndefined();
  });
});
