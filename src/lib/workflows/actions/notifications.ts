import { WorkflowActionType } from "@/types/workflow";
import type { ActionDefinition } from "./registry";
import { registerAction } from "./registry";

export const sendEmailAction: ActionDefinition = {
  type: WorkflowActionType.SEND_EMAIL,
  name: "Send Email",
  description: "Send an email to one or more recipients",
  category: "notification",
  configSchema: {
    type: "object",
    required: ["to", "subject", "body"],
    properties: {
      to: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
      subject: { type: "string" },
      body: { type: "string" },
      templateId: { type: "string" }
    }
  },
  exampleConfig: {
    actionType: "SEND_EMAIL",
    to: "user@example.com",
    subject: "Notification",
    body: "This is a notification."
  }
};

// Register actions
registerAction(sendEmailAction);
