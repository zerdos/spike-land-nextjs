import { WorkflowActionType } from "@/types/workflow";
import type { ActionDefinition } from "./registry";
import { registerAction } from "./registry";

export const webhookAction: ActionDefinition = {
  type: WorkflowActionType.TRIGGER_WEBHOOK,
  name: "Trigger Webhook",
  description: "Make an HTTP request to an external URL",
  category: "data",
  configSchema: {
    type: "object",
    required: ["url", "method"],
    properties: {
      url: { type: "string" },
      method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
      headers: { type: "object" },
      body: { type: "object" }
    }
  },
  exampleConfig: {
    actionType: "TRIGGER_WEBHOOK",
    url: "https://api.example.com/webhook",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { key: "value" }
  }
};

// Register actions
registerAction(webhookAction);
