import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction, WorkflowActionType } from "./action-types";

const ParallelExecutionInputSchema = z.object({
  actions: z.array(
    z.object({
      type: z.string(), // We can't validate enum easily here due to cycles, but it's WorkflowActionType
      input: z.record(z.string(), z.unknown()),
    })
  ),
  stopOnError: z.boolean().optional().default(false),
});

export interface ParallelExecutionInput extends ActionInput {
  actions: {
    type: WorkflowActionType;
    input: ActionInput;
  }[];
  stopOnError?: boolean;
}

export interface ParallelExecutionOutput extends ActionOutput {
  results: ActionOutput[];
}

export const parallelExecutionAction: WorkflowAction<
  ParallelExecutionInput,
  ParallelExecutionOutput
> = {
  type: "parallel_execution",

  validate: (input) => {
    ParallelExecutionInputSchema.parse(input);
  },

  execute: async (input) => {
    // Dynamic import to avoid circular dependency
    const { dispatchAction } = await import("./action-dispatcher");

    const results = await Promise.all(
      input.actions.map(async (actionConfig) => {
        try {
          return await dispatchAction(actionConfig.type, actionConfig.input);
        } catch (error) {
          if (input.stopOnError) {
            throw error;
          }
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const hasError = results.some((r) => !r.success);
    if (input.stopOnError && hasError) {
         // Should have been caught above if thrown, but if dispatchAction returns success:false instead of throwing:
         const firstError = results.find(r => !r.success);
         return {
             success: false,
             error: firstError?.error || "One or more actions failed",
             results
         }
    }

    return {
      success: !hasError, // Or true if we allow partial success? Let's say false if any failed.
      results,
    };
  },
};
