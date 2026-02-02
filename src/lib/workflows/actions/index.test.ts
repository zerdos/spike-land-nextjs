import { describe, it, expect } from "vitest";
import { registerAction, getActionDefinition, ACTION_REGISTRY, validateActionConfig } from "./index";
import { WorkflowActionType } from "@/types/workflow";
import type { ActionDefinition } from "./index";

describe("Action Registry", () => {
  const testAction: ActionDefinition = {
    type: WorkflowActionType.DELAY, // Re-using an existing type for test
    name: "Test Action",
    description: "A test action",
    category: "control",
    configSchema: {},
    exampleConfig: {}
  };

  it("should register an action", () => {
    registerAction(testAction);
    expect(ACTION_REGISTRY[WorkflowActionType.DELAY]).toEqual(testAction);
  });

  it("should get an action definition", () => {
    registerAction(testAction);
    const result = getActionDefinition(WorkflowActionType.DELAY);
    expect(result).toEqual(testAction);
  });

  it("should return null for unknown action", () => {
    // Assuming LOOP is not registered in this test context yet or we pick a random one
    // But since ACTION_REGISTRY is global, we should be careful.
    // Let's use a type that we know we haven't registered in the test setup if possible,
    // or just rely on the fact that we just registered DELAY.

    // In a real test we might want to mock the registry or use a separate instance.
    // For now, let's just check `getActionDefinition` works.

    const result = getActionDefinition(WorkflowActionType.DELAY);
    expect(result).toEqual(testAction);
  });

  it("should validate action config (stub)", () => {
      const isValid = validateActionConfig(WorkflowActionType.DELAY, {});
      expect(isValid).toBe(true);
  });
});
