import { describe, expect, it } from "vitest";
import { loopAction } from "./loop";

describe("loopAction", () => {
  it("should return items and count", async () => {
    const items = [1, 2, 3];
    const result = await loopAction.execute({ items });

    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
    expect(result.items).toEqual(items);
  });
});
