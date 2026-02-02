import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const LoopInputSchema = z.object({
  items: z.array(z.unknown()),
});

export interface LoopInput extends ActionInput {
  items: unknown[];
}

export interface LoopOutput extends ActionOutput {
  count: number;
  items: unknown[];
}

export const loopAction: WorkflowAction<LoopInput, LoopOutput> = {
  type: "loop",

  validate: (input) => {
    LoopInputSchema.parse(input);
  },

  execute: async (input) => {
    // In a real implementation, this might trigger a sub-workflow or be handled by the executor.
    // For now, it simply validates the array and returns metadata.
    return {
      success: true,
      count: input.items.length,
      items: input.items,
    };
  },
};
