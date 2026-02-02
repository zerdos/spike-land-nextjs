import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction, WorkflowActionType } from "./action-types";

const LoopInputSchema = z.object({
  items: z.array(z.any()),
  action: z.object({
    type: z.string(),
    inputTemplate: z.record(z.unknown()), // Template where we might interpolate the item
  }),
  itemVariableName: z.string().optional().default("item"),
});

export interface LoopInput extends ActionInput {
  items: any[];
  action: {
    type: WorkflowActionType;
    inputTemplate: ActionInput;
  };
  itemVariableName?: string;
}

export interface LoopOutput extends ActionOutput {
  results: ActionOutput[];
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
    const { dispatchAction } = await import("./action-dispatcher");
    const { interpolate } = await import("./interpolation");

    const results: ActionOutput[] = [];
    const itemVar = input.itemVariableName || "item";

    for (const item of input.items) {
      // Create context for interpolation
      const context = { [itemVar]: item };

      // Interpolate the input template with the current item
      const interpolatedInput = interpolate(input.action.inputTemplate, context);

      try {
        const result = await dispatchAction(input.action.type, interpolatedInput);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const hasError = results.some((r) => !r.success);

    return {
      success: !hasError,
      results,
    };
  },
};
