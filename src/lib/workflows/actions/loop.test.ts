import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { loopAction } from "./loop";

// Mock the action-dispatcher and interpolation modules
vi.mock("./action-dispatcher", () => ({
  dispatchAction: vi.fn(),
}));

vi.mock("./interpolation", () => ({
  interpolate: vi.fn((input, _context) => input), // Simple pass-through or custom logic
}));

import { dispatchAction } from "./action-dispatcher";
import { interpolate } from "./interpolation";

describe("loopAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should iterate over items", async () => {
    (dispatchAction as unknown as Mock).mockResolvedValue({ success: true });
    (interpolate as unknown as Mock).mockImplementation((
      input: unknown,
      context: unknown,
    ) => ({
      ...(input as Record<string, unknown>),
      ...(context as Record<string, unknown>),
    }));

    const result = await loopAction.execute({
      items: ["A", "B"],
      action: {
        type: "send_notification",
        inputTemplate: { message: "{{item}}" },
      },
      itemVariableName: "item",
    });

    expect(result.success).toBe(true);
    expect(dispatchAction).toHaveBeenCalledTimes(2);
    expect(interpolate).toHaveBeenCalledTimes(2);
  });
});
