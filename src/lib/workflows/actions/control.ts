import { WorkflowActionType } from "@/types/workflow";
import type { ActionDefinition } from "./registry";
import { registerAction } from "./registry";

export const delayAction: ActionDefinition = {
  type: WorkflowActionType.DELAY,
  name: "Delay",
  description: "Pause execution for a specified duration",
  category: "control",
  configSchema: {
    type: "object",
    required: ["duration"],
    properties: {
      duration: { type: "number", description: "Duration in milliseconds" },
      until: { type: "string", format: "date-time" }
    }
  },
  exampleConfig: {
    actionType: "DELAY",
    duration: 5000
  }
};

// Register actions
registerAction(delayAction);
