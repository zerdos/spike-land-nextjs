import { generateAgentResponse } from "@/lib/ai/gemini-client";
import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";
import { retry } from "./retry";

// Define the input schema for the call-ai-agent action
const CallAiAgentInputSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
});

// Define the input and output types for the action
export interface CallAiAgentInput extends ActionInput {
  prompt: string;
  systemPrompt?: string;
}

export interface CallAiAgentOutput extends ActionOutput {
  response?: string;
}

// Implement the call-ai-agent action
export const callAiAgentAction: WorkflowAction<
  CallAiAgentInput,
  CallAiAgentOutput
> = {
  type: "call_ai_agent",

  validate: (input) => {
    CallAiAgentInputSchema.parse(input);
  },

  execute: async (input) => {
    return retry(async () => {
      const response = await generateAgentResponse({
        messages: [{ role: "user", content: input.prompt }],
        systemPrompt: input.systemPrompt,
      });

      return {
        success: true,
        response,
      };
    });
  },
};
