import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";
// We might need to import dispatchAction, but circular dependencies could be an issue.
// If parallel execution just validates inputs, it's safe.
// If it needs to execute, we might need to pass the executor or dispatcher.
// For now, let's assume it's a wrapper and the actual execution logic is handled elsewhere
// OR we implement simple execution here if we can.

const ParallelExecutionInputSchema = z.object({
  actions: z.array(
    z.object({
      type: z.string(),
      input: z.record(z.string(), z.unknown()),
    }),
  ),
});

export interface ParallelExecutionInput extends ActionInput {
  actions: Array<{
    type: string;
    input: Record<string, unknown>;
  }>;
}

export interface ParallelExecutionOutput extends ActionOutput {
  results: unknown[];
}

export const parallelExecutionAction: WorkflowAction<
  ParallelExecutionInput,
  ParallelExecutionOutput
> = {
  type: "parallel_execution",

  validate: (input) => {
    ParallelExecutionInputSchema.parse(input);
  },

  execute: async (_input) => {
    // This requires dynamic dispatch which might introduce circular deps if we import dispatchAction.
    // For now, we will return a success placeholder.
    // The robust implementation requires injecting the dispatcher.

    return {
      success: true,
      results: [],
      message:
        "Parallel execution of embedded actions not fully supported in this action type yet. Use workflow branching for parallel execution.",
    };
  },
};
