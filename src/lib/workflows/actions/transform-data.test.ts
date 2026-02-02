import { describe, expect, it } from "vitest";
import { transformDataAction } from "./transform-data";

describe("transformDataAction", () => {
  it("should transform data using template", async () => {
    const result = await transformDataAction.execute({
      source: { user: { name: "John" } },
      template: { greeting: "Hello {{user.name}}" },
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ greeting: "Hello John" });
  });

  it("should handle array source", async () => {
     // Assuming implementation wraps array in { items: [...] } logic or similar if needed,
     // or just interpolates if template refers to indices.
     // My implementation: if source is array, context = { items: source }
     const result = await transformDataAction.execute({
       source: ["a", "b"],
       template: { first: "{{items.0}}" },
     });

     expect(result.success).toBe(true);
     expect(result.result).toEqual({ first: "a" });
   });
});
