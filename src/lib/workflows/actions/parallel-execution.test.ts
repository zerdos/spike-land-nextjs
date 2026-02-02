import { describe, expect, it } from "vitest";
import { parallelExecutionAction } from "./parallel-execution";

describe("parallelExecutionAction", () => {
  it("should return empty results for now", async () => {
    const result = await parallelExecutionAction.execute({
      actions: [],
    });

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
  });
});
