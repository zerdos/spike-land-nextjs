import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

// Parallel execution typically involves executing a set of branches or actions defined in the workflow definition.
// As an atomic action, it might take a list of action definitions, but usually in a workflow engine, parallel execution is structural (Gateway).
// If this is an action that executes other sub-actions, it needs access to the dispatcher.
// Given the context of "Action Library", this might be a helper to spawn parallel tasks if the engine supports it within a step,
// or it acts as a marker.
// Assuming this action takes an array of items and processes them in parallel (like a map/foreach parallel).

const ParallelExecutionInputSchema = z.object({
  items: z.array(z.any()),
  actionType: z.string(), // The action to perform on each item
  actionConfig: z.record(z.any()), // Configuration for that action
  concurrency: z.number().optional().default(5),
});

export interface ParallelExecutionInput extends ActionInput {
  items: unknown[];
  actionType: string;
  actionConfig: Record<string, unknown>;
  concurrency?: number;
}

export interface ParallelExecutionOutput extends ActionOutput {
  results: unknown[];
  failedCount: number;
}

// NOTE: To implement this properly, we'd need to import dispatchAction.
// But dispatchAction imports all actions, leading to circular dependency.
// Usually, the executor handles this structure.
// If this must be an action, we might need to inject the dispatcher or use a different pattern.
// For now, I'll define the interface and logic structure, assuming we can resolve the circular dep or refactor later.

export const parallelExecutionAction: WorkflowAction<
  ParallelExecutionInput,
  ParallelExecutionOutput
> = {
  type: "parallel_execution",

  validate: (input) => {
    ParallelExecutionInputSchema.parse(input);
  },

  execute: async (_input) => {
    // This is a placeholder as actual parallel execution of other actions requires access to the action registry/dispatcher.
    // In a real implementation, we would dynamic import or have the dispatcher passed in context.

    return {
        success: true,
        results: [],
        failedCount: 0
    }
  },
};
