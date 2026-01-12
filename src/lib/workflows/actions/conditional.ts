import type { Values } from "expr-eval-fork";
import { Parser } from "expr-eval-fork";
import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

// Define the input schema for the conditional action
const ConditionalInputSchema = z.object({
  expression: z.string(),
  context: z.record(z.string(), z.unknown()),
});

// Define the input and output types for the action
export interface ConditionalInput extends ActionInput {
  expression: string;
  context: Record<string, unknown>;
}

export interface ConditionalOutput extends ActionOutput {
  result: boolean;
}

// Implement the conditional action
export const conditionalAction: WorkflowAction<
  ConditionalInput,
  ConditionalOutput
> = {
  type: "conditional",

  validate: (input) => {
    ConditionalInputSchema.parse(input);
  },

  execute: async (input) => {
    try {
      const parser = new Parser();
      const expr = parser.parse(input.expression);
      // Convert context to the expected type for expr-eval
      // Note: expr-eval doesn't support booleans, so convert them to numbers
      const evalContext: Values = {};
      for (const [key, value] of Object.entries(input.context)) {
        if (typeof value === "number" || typeof value === "string") {
          evalContext[key] = value;
        } else if (typeof value === "boolean") {
          evalContext[key] = value ? 1 : 0;
        }
      }
      const result = expr.evaluate(evalContext);

      return {
        success: true,
        result: !!result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        result: false,
      };
    }
  },
};
