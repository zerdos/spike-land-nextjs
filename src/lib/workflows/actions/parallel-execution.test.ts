import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { parallelExecutionAction } from "./parallel-execution";

// Mock the action-dispatcher module
vi.mock("./action-dispatcher", () => ({
  dispatchAction: vi.fn(),
}));

import { dispatchAction } from "./action-dispatcher";

describe("parallelExecutionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute actions in parallel", async () => {
    (dispatchAction as unknown as Mock).mockResolvedValue({ success: true });

    const result = await parallelExecutionAction.execute({
      actions: [
        { type: "send_notification", input: { message: "1" } },
        { type: "send_notification", input: { message: "2" } },
      ],
    });

    expect(result.success).toBe(true);
    expect(dispatchAction).toHaveBeenCalledTimes(2);
  });

  it("should handle failures when stopOnError is false", async () => {
    (dispatchAction as unknown as Mock)
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error("Failed"));

    const result = await parallelExecutionAction.execute({
      actions: [
        { type: "send_notification", input: { message: "1" } },
        { type: "send_notification", input: { message: "2" } },
      ],
      stopOnError: false,
    });

    expect(result.success).toBe(false); // Because one failed
    expect(result.results).toHaveLength(2);
    expect(result.results[1]?.success).toBe(false);
  });
});
