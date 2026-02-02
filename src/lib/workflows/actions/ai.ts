import { WorkflowActionType } from "@/types/workflow";
import type { ActionDefinition } from "./registry";
import { registerAction } from "./registry";

export const generateContentAction: ActionDefinition = {
  type: WorkflowActionType.GENERATE_CONTENT,
  name: "Generate Content",
  description: "Generate text content using AI",
  category: "ai",
  configSchema: {
    type: "object",
    required: ["prompt"],
    properties: {
      prompt: { type: "string" },
      maxTokens: { type: "number" },
      temperature: { type: "number" },
      outputVariable: { type: "string" }
    }
  },
  exampleConfig: {
    actionType: "GENERATE_CONTENT",
    prompt: "Write a tweet about AI.",
    maxTokens: 100,
    temperature: 0.7,
    outputVariable: "generatedTweet"
  }
};

// Register actions
registerAction(generateContentAction);
