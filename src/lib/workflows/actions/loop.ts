import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const LoopInputSchema = z.object({
  items: z.array(z.any()),
}, {});

export interface LoopInput extends ActionInput {
  items: unknown[];
}

export interface LoopOutput extends ActionOutput {
  iterations: number;
}

export const loopAction: WorkflowAction<
  LoopInput,
  LoopOutput
> = {
  type: "loop",

  validate: (input) => {
    LoopInputSchema.parse(input);
  },

  execute: async (input) => {
     // Placeholder for loop logic.
     // The workflow engine typically handles the iteration state (WorkflowRunStep).
     // This action might just return the items to be iterated over by the engine?
     // Or if it's an inline loop action.

    return {
      success: true,
      iterations: input.items.length,
    };
  },
};
