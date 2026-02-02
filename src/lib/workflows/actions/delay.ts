import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const DelayInputSchema = z.object({
  durationMs: z.number().min(0).max(60000), // Max 1 minute for this action
});

export interface DelayInput extends ActionInput {
  durationMs: number;
}

export interface DelayOutput extends ActionOutput {
  delayed: number;
}

export const delayAction: WorkflowAction<DelayInput, DelayOutput> = {
  type: "delay",

  validate: (input) => {
    DelayInputSchema.parse(input);
  },

  execute: async (input) => {
    await new Promise((resolve) => setTimeout(resolve, input.durationMs));
    return {
      success: true,
      delayed: input.durationMs,
    };
  },
};
